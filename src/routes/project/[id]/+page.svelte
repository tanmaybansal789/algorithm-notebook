<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { db, addModule, updateProject } from '$lib/db';
	import { liveQueryStore } from '$lib/stores';
	import { MODULE_ICONS, MODULE_LABELS, type ModuleType, type NotebookModule } from '$lib/types';
	import { debounce } from '$lib/utils';
	import ModuleShell from '$lib/components/ModuleShell.svelte';
	import type { Component } from 'svelte';

	// Lazily code-split each module editor — keeps the heavy ones (Pyodide's
	// loader, React + Excalidraw, Svelte Flow) out of the initial bundle.
	const moduleLoaders: Record<ModuleType, () => Promise<{ default: Component<{ module: NotebookModule }> }>> = {
		note: () => import('$lib/components/modules/NoteModule.svelte'),
		graph: () => import('$lib/components/modules/GraphModule.svelte'),
		list: () => import('$lib/components/modules/ListModule.svelte'),
		trace: () => import('$lib/components/modules/TraceModule.svelte'),
		python: () => import('$lib/components/modules/PythonModule.svelte'),
		excalidraw: () => import('$lib/components/modules/ExcalidrawModule.svelte')
	};

	const projectId = $derived(page.params.id ?? '');

	// Distinguishes "still loading" from "confirmed not found" (both would
	// otherwise be `undefined`/`null`) while keeping the store's type as
	// `Project | null` everywhere it's read below.
	const LOADING = Symbol('loading') as unknown as null;
	const project = liveQueryStore(async () => (await db.projects.get(projectId)) ?? null, LOADING);
	const modules = liveQueryStore(
		() => db.modules.where('projectId').equals(projectId).toArray(),
		[]
	);

	let activeModuleId = $state<string | null>(null);

	const orderedModules = $derived.by(() => {
		const order = $project?.moduleOrder ?? [];
		const byId = new Map($modules.map((m) => [m.id, m]));
		const ordered = order.map((id) => byId.get(id)).filter((m) => m !== undefined);
		for (const m of $modules) if (!order.includes(m.id)) ordered.push(m);
		return ordered;
	});

	// `modules` reloads asynchronously from IndexedDB after every write, so right
	// after adding a module there's a tick where it's set as active but not yet
	// present in `orderedModules`. Only snap back to the first module when the
	// active one was previously confirmed to exist and has since disappeared
	// (i.e. deleted) — never just because it hasn't shown up yet.
	const seenModuleIds = new Set<string>();
	$effect(() => {
		const currentIds = new Set(orderedModules.map((m) => m.id));
		if (activeModuleId === null) {
			if (orderedModules.length > 0) activeModuleId = orderedModules[0].id;
		} else if (!currentIds.has(activeModuleId) && seenModuleIds.has(activeModuleId)) {
			activeModuleId = orderedModules[0]?.id ?? null;
		}
		for (const id of currentIds) seenModuleIds.add(id);
	});

	const activeModule = $derived(orderedModules.find((m) => m.id === activeModuleId));

	const moduleTypes: ModuleType[] = ['note', 'graph', 'list', 'trace', 'python', 'excalidraw'];

	async function onAddModule(type: ModuleType) {
		const module = await addModule(projectId, type);
		activeModuleId = module.id;
	}

	let nameDraft = $state('');
	$effect(() => {
		if ($project) nameDraft = $project.name;
	});
	const saveName = debounce((value: string) => {
		if (value.trim() && $project && value.trim() !== $project.name) {
			updateProject(projectId, { name: value.trim() });
		}
	}, 500);
</script>

<svelte:head><title>{$project?.name ?? 'Project'} · Algorithmic Notebook</title></svelte:head>

{#if $project === LOADING}
	<div class="flex h-[calc(100vh-4rem)] items-center justify-center">
		<span class="loading loading-spinner loading-md text-base-content/40"></span>
	</div>
{:else if $project === null}
	<div class="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3">
		<p class="text-base-content/60">Project not found.</p>
		<a href="/" class="btn btn-sm">Back home</a>
	</div>
{:else}
	<div class="flex h-[calc(100vh-4rem)] flex-col">
		<div class="border-base-300 flex flex-wrap items-center gap-3 border-b px-4 py-2 sm:px-6">
			<a href="/" class="btn btn-ghost btn-xs" aria-label="Back to projects">←</a>
			<input
				class="input input-ghost input-sm min-w-0 flex-1 text-lg font-semibold focus:outline-none"
				value={nameDraft}
				oninput={(e) => {
					nameDraft = (e.currentTarget as HTMLInputElement).value;
					saveName(nameDraft);
				}}
			/>
			{#if $project.rating}
				<span class="badge badge-outline badge-sm">{$project.rating}</span>
			{/if}
			{#each $project.tags as tag (tag)}
				<span class="badge badge-ghost badge-sm">{tag}</span>
			{/each}
			{#if $project.url}
				<a
					href={$project.url}
					target="_blank"
					rel="noreferrer"
					class="link link-hover text-base-content/50 text-xs">problem ↗</a
				>
			{/if}
		</div>

		<div class="flex min-h-0 flex-1">
			<aside class="border-base-300 bg-base-100 flex w-56 shrink-0 flex-col border-r">
				<nav class="flex-1 overflow-y-auto p-2">
					{#each orderedModules as module (module.id)}
						<button
							class="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-sm transition {activeModuleId ===
							module.id
								? 'bg-primary/10 text-primary font-medium'
								: 'hover:bg-base-200'}"
							onclick={() => (activeModuleId = module.id)}
						>
							<span aria-hidden="true">{MODULE_ICONS[module.type]}</span>
							<span class="truncate">{module.title}</span>
						</button>
					{:else}
						<p class="text-base-content/40 px-3 py-6 text-center text-sm">
							No modules yet. Add one below.
						</p>
					{/each}
				</nav>
				<div class="border-base-300 dropdown dropdown-top dropdown-end border-t p-2">
					<div tabindex="0" role="button" class="btn btn-block btn-sm btn-primary btn-soft">
						+ Add module
					</div>
					<ul class="dropdown-content menu bg-base-100 rounded-box z-10 w-52 border shadow-md border-base-300">
						{#each moduleTypes as type (type)}
							<li>
								<button onclick={() => onAddModule(type)}>
									<span aria-hidden="true">{MODULE_ICONS[type]}</span>
									{MODULE_LABELS[type]}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			</aside>

			<div class="min-w-0 flex-1">
				{#if activeModule}
					{#key activeModule.id}
						<ModuleShell module={activeModule}>
							{#await moduleLoaders[activeModule.type]()}
								<div class="flex h-full items-center justify-center">
									<span class="loading loading-spinner loading-md text-base-content/40"></span>
								</div>
							{:then mod}
								{@const Comp = mod.default}
								<Comp module={activeModule} />
							{:catch err}
								<div class="text-error flex h-full items-center justify-center p-6 text-center text-sm">
									Failed to load this module: {err instanceof Error ? err.message : String(err)}
								</div>
							{/await}
						</ModuleShell>
					{/key}
				{:else}
					<div class="flex h-full flex-col items-center justify-center gap-3 text-center">
						<span class="text-4xl">🧩</span>
						<p class="text-base-content/60">
							Add your first module — notes, a graph, a trace table, runnable Python, or a
							sketch.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
