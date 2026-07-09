<script lang="ts">
	import type { NotebookModule, NoteData } from '$lib/types';
	import { updateModule } from '$lib/db';
	import { debounce } from '$lib/utils';
	import { renderMarkdown } from '$lib/markdown';

	let { module }: { module: NotebookModule } = $props();

	const data = $derived(module.data as NoteData);

	let markdown = $state(data.markdown);
	let lastModuleId = module.id;
	$effect(() => {
		if (module.id !== lastModuleId) {
			lastModuleId = module.id;
			markdown = data.markdown;
		}
	});

	const save = debounce((value: string) => {
		updateModule(module.id, { data: { ...data, markdown: value } satisfies NoteData });
	}, 400);

	function onInput(e: Event) {
		markdown = (e.currentTarget as HTMLTextAreaElement).value;
		save(markdown);
	}

	let view = $state<'split' | 'edit' | 'preview'>('split');
	const html = $derived(renderMarkdown(markdown));
</script>

<div class="flex h-full flex-col">
	<div class="border-base-300 flex items-center justify-between border-b px-4 py-2 sm:px-6">
		<p class="text-base-content/40 text-xs">
			Markdown supported. Use <code>$...$</code> for inline math and <code>$$...$$</code> for block
			math.
		</p>
		<div class="join md:hidden">
			<button
				class="btn btn-xs join-item {view === 'edit' ? 'btn-active' : ''}"
				onclick={() => (view = 'edit')}>Edit</button
			>
			<button
				class="btn btn-xs join-item {view === 'preview' ? 'btn-active' : ''}"
				onclick={() => (view = 'preview')}>Preview</button
			>
		</div>
	</div>
	<div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
		<textarea
			class="textarea h-full w-full resize-none rounded-none border-0 border-r border-base-300 p-4 font-mono text-sm focus:outline-none {view ===
			'preview'
				? 'hidden md:block'
				: ''}"
			placeholder={'Write your observations…\n\ne.g. For a tree with $n$ nodes, the diameter satisfies\n\n$$d = \\max_{u,v} \\text{dist}(u, v)$$'}
			value={markdown}
			oninput={onInput}
		></textarea>
		<div
			class="prose prose-sm dark:prose-invert h-full max-w-none overflow-auto p-4 sm:p-6 {view === 'edit'
				? 'hidden md:block'
				: ''}"
		>
			{#if markdown.trim()}
				{@html html}
			{:else}
				<p class="text-base-content/40 not-prose text-sm">Nothing written yet.</p>
			{/if}
		</div>
	</div>
</div>
