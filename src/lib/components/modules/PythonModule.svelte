<script lang="ts">
	import type { NotebookModule, PythonData, TestCase } from '$lib/types';
	import { updateModule } from '$lib/db';
	import { debounce } from '$lib/utils';
	import { getPyodide } from '$lib/pyodide';
	import { v4 as uuid } from 'uuid';
	import { onMount } from 'svelte';

	let { module }: { module: NotebookModule } = $props();

	const initial = module.data as PythonData;

	let code = $state(initial.code);
	let testCases = $state<TestCase[]>(initial.testCases.map((t) => ({ ...t })));

	const save = debounce(() => {
		updateModule(module.id, { data: $state.snapshot({ code, testCases }) satisfies PythonData });
	}, 400);

	$effect(() => {
		code;
		testCases;
		save();
	});

	type RuntimeStatus = 'idle' | 'loading' | 'ready' | 'error';
	let status = $state<RuntimeStatus>('idle');
	let statusError = $state('');

	onMount(() => {
		status = 'loading';
		getPyodide()
			.then(() => (status = 'ready'))
			.catch((e) => {
				status = 'error';
				statusError = e instanceof Error ? e.message : String(e);
			});
	});

	let scratchStdin = $state('');
	let running = $state(false);
	let output = $state<{ stdout: string; stderr: string } | null>(null);

	const PRELUDE = `
import builtins as __builtins
def __make_input(lines):
    it = iter(lines)
    def _input(prompt=''):
        try:
            return str(next(it))
        except StopIteration:
            raise EOFError('EOF when reading a line')
    return _input
`;

	async function execute(userCode: string, stdin: string): Promise<{ stdout: string; stderr: string }> {
		const pyodide = await getPyodide();
		let stdout = '';
		let stderr = '';
		pyodide.setStdout({ batched: (s) => (stdout += s + '\n') });
		pyodide.setStderr({ batched: (s) => (stderr += s + '\n') });
		try {
			await pyodide.runPythonAsync(PRELUDE);
			pyodide.globals.set('_stdin_lines', stdin.split('\n'));
			await pyodide.runPythonAsync(
				'__builtins.input = __make_input(_stdin_lines)\n' + userCode
			);
		} catch (e) {
			stderr += e instanceof Error ? e.message : String(e);
		}
		return { stdout: stdout.trim(), stderr: stderr.trim() };
	}

	async function runScratch() {
		if (status !== 'ready' || running) return;
		running = true;
		output = null;
		output = await execute(code, scratchStdin);
		running = false;
	}

	let activeTab = $state<'console' | 'tests'>('console');

	function addTestCase() {
		testCases = [...testCases, { id: uuid(), name: `Test ${testCases.length + 1}`, stdin: '', expected: '' }];
		activeTab = 'tests';
	}

	function removeTestCase(id: string) {
		testCases = testCases.filter((t) => t.id !== id);
	}

	function patchTestCase(id: string, patch: Partial<TestCase>) {
		testCases = testCases.map((t) => (t.id === id ? { ...t, ...patch } : t));
	}

	type TestResult = { stdout: string; stderr: string; pass: boolean };
	let results = $state<Record<string, TestResult>>({});
	let runningAll = $state(false);

	async function runTest(t: TestCase) {
		if (status !== 'ready') return;
		const res = await execute(code, t.stdin);
		results = {
			...results,
			[t.id]: { ...res, pass: !res.stderr && res.stdout === t.expected.trim() }
		};
	}

	async function runAllTests() {
		if (status !== 'ready' || runningAll) return;
		runningAll = true;
		for (const t of testCases) {
			await runTest(t);
		}
		runningAll = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Tab') {
			e.preventDefault();
			const el = e.currentTarget as HTMLTextAreaElement;
			const { selectionStart, selectionEnd, value } = el;
			code = value.slice(0, selectionStart) + '    ' + value.slice(selectionEnd);
			requestAnimationFrame(() => {
				el.selectionStart = el.selectionEnd = selectionStart + 4;
			});
		} else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			runScratch();
		}
	}
</script>

<div class="flex h-full flex-col">
	<div class="border-base-300 flex items-center gap-2 border-b px-4 py-2 sm:px-6">
		<button
			class="btn btn-primary btn-sm"
			disabled={status !== 'ready' || running}
			onclick={runScratch}
		>
			{#if running}
				<span class="loading loading-spinner loading-xs"></span>
			{/if}
			Run <kbd class="kbd kbd-xs">⌘⏎</kbd>
		</button>
		{#if status === 'loading'}
			<span class="text-base-content/50 flex items-center gap-2 text-xs">
				<span class="loading loading-spinner loading-xs"></span> booting Python runtime (first run
				downloads ~10MB)…
			</span>
		{:else if status === 'error'}
			<span class="text-error text-xs">Failed to load Python runtime: {statusError}</span>
		{:else if status === 'ready'}
			<span class="text-success text-xs">Python ready</span>
		{/if}
	</div>

	<div class="grid min-h-0 flex-1 grid-rows-2">
		<textarea
			class="textarea h-full w-full resize-none rounded-none border-0 border-b p-4 font-mono text-sm focus:outline-none border-base-300"
			spellcheck="false"
			value={code}
			oninput={(e) => (code = (e.currentTarget as HTMLTextAreaElement).value)}
			onkeydown={onKeydown}
		></textarea>

		<div class="flex min-h-0 flex-col">
			<div class="tabs tabs-lift px-4 pt-2 sm:px-6">
				<button
					class="tab {activeTab === 'console' ? 'tab-active' : ''}"
					onclick={() => (activeTab = 'console')}>Console</button
				>
				<button
					class="tab {activeTab === 'tests' ? 'tab-active' : ''}"
					onclick={() => (activeTab = 'tests')}
				>
					Test cases {testCases.length ? `(${testCases.length})` : ''}
				</button>
			</div>

			<div class="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
				{#if activeTab === 'console'}
					<div class="flex h-full flex-col gap-2">
						<label class="text-base-content/50 text-xs" for="scratch-stdin">stdin (one value per line, read via input())</label>
						<textarea
							id="scratch-stdin"
							class="textarea textarea-bordered h-16 w-full font-mono text-xs"
							bind:value={scratchStdin}
							placeholder={'5\n1 2 3 4 5'}
						></textarea>
						<div class="bg-base-200 flex-1 overflow-auto rounded-box p-3 font-mono text-xs whitespace-pre-wrap">
							{#if output}
								{#if output.stdout}{output.stdout}{/if}
								{#if output.stderr}<span class="text-error">{output.stderr}</span>{/if}
								{#if !output.stdout && !output.stderr}<span class="text-base-content/40"
										>(no output)</span
									>{/if}
							{:else}
								<span class="text-base-content/40">Run your code to see output here.</span>
							{/if}
						</div>
					</div>
				{:else}
					<div class="flex flex-col gap-3">
						<div class="flex items-center gap-2">
							<button class="btn btn-sm" onclick={addTestCase}>+ Add test case</button>
							<button
								class="btn btn-sm btn-ghost"
								disabled={status !== 'ready' || runningAll || testCases.length === 0}
								onclick={runAllTests}
							>
								{#if runningAll}<span class="loading loading-spinner loading-xs"></span>{/if}
								Run all
							</button>
						</div>
						{#each testCases as t (t.id)}
							{@const result = results[t.id]}
							<div class="card bg-base-100 border-base-300 border">
								<div class="card-body gap-2 p-3">
									<div class="flex items-center gap-2">
										<input
											class="input input-ghost input-sm flex-1 font-medium focus:outline-none"
											value={t.name}
											oninput={(e) =>
												patchTestCase(t.id, { name: (e.currentTarget as HTMLInputElement).value })}
										/>
										{#if result}
											<span class="badge {result.pass ? 'badge-success' : 'badge-error'} badge-sm">
												{result.pass ? 'pass' : 'fail'}
											</span>
										{/if}
										<button
											class="btn btn-ghost btn-xs"
											disabled={status !== 'ready'}
											onclick={() => runTest(t)}
										>
											Run
										</button>
										<button
											class="btn btn-ghost btn-xs text-error"
											onclick={() => removeTestCase(t.id)}
										>
											✕
										</button>
									</div>
									<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
										<label class="flex flex-col gap-1">
											<span class="text-base-content/50 text-xs">stdin</span>
											<textarea
												class="textarea textarea-bordered h-16 font-mono text-xs"
												value={t.stdin}
												oninput={(e) =>
													patchTestCase(t.id, { stdin: (e.currentTarget as HTMLTextAreaElement).value })}
											></textarea>
										</label>
										<label class="flex flex-col gap-1">
											<span class="text-base-content/50 text-xs">expected stdout</span>
											<textarea
												class="textarea textarea-bordered h-16 font-mono text-xs"
												value={t.expected}
												oninput={(e) =>
													patchTestCase(t.id, {
														expected: (e.currentTarget as HTMLTextAreaElement).value
													})}
											></textarea>
										</label>
									</div>
									{#if result && !result.pass}
										<div class="bg-base-200 rounded-box p-2 font-mono text-xs whitespace-pre-wrap">
											<span class="text-base-content/50">got: </span>{result.stdout || '(empty)'}
											{#if result.stderr}<br /><span class="text-error">{result.stderr}</span>{/if}
										</div>
									{/if}
								</div>
							</div>
						{:else}
							<p class="text-base-content/40 py-6 text-center text-sm">
								No test cases yet. Add one to check your solution against expected output.
							</p>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
