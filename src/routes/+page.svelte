<script lang="ts">
	import { db, deleteProject, exportProject, importProject } from '$lib/db';
	import { liveQueryStore } from '$lib/stores';
	import { relativeTime, download } from '$lib/utils';
	import NewProjectDialog from '$lib/components/NewProjectDialog.svelte';
	import { goto } from '$app/navigation';

	const projects = liveQueryStore(() => db.projects.orderBy('updatedAt').reverse().toArray(), []);

	let showNewProject = $state(false);
	let search = $state('');
	let fileInput: HTMLInputElement | undefined = $state();

	let filtered = $derived(
		$projects.filter((p) => {
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return (
				p.name.toLowerCase().includes(q) ||
				p.tags.some((t) => t.toLowerCase().includes(q))
			);
		})
	);

	async function onExport(id: string, name: string) {
		const json = await exportProject(id);
		download(`${name.replace(/[^a-z0-9-_]+/gi, '_')}.json`, json);
	}

	async function onImportFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const text = await file.text();
		const id = await importProject(text);
		input.value = '';
		await goto(`/project/${id}`);
	}

	async function onDelete(id: string, name: string) {
		if (!confirm(`Delete "${name}"? This removes all its modules permanently.`)) return;
		await deleteProject(id);
	}
</script>

<svelte:head><title>Algorithmic Notebook</title></svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Your projects</h1>
			<p class="text-base-content/60 mt-1 text-sm">
				A notebook per Codeforces problem or topic — notes, graphs, traces, runnable code, and
				sketches, saved locally.
			</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<input
				bind:this={fileInput}
				type="file"
				accept="application/json"
				class="hidden"
				onchange={onImportFile}
			/>
			<button class="btn btn-ghost btn-sm" onclick={() => fileInput?.click()}>Import</button>
			<button class="btn btn-primary btn-sm" onclick={() => (showNewProject = true)}>
				+ New project
			</button>
		</div>
	</div>

	{#if $projects.length > 0}
		<div class="mt-6">
			<input
				class="input input-bordered w-full max-w-xs"
				placeholder="Search by name or tag…"
				bind:value={search}
			/>
		</div>
	{/if}

	{#if $projects.length === 0}
		<div
			class="border-base-300 mt-10 flex flex-col items-center gap-3 rounded-box border border-dashed py-16 text-center"
		>
			<span class="text-4xl">📓</span>
			<p class="text-base-content/70">No projects yet.</p>
			<button class="btn btn-primary btn-sm" onclick={() => (showNewProject = true)}>
				Create your first project
			</button>
		</div>
	{:else}
		<div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered as project (project.id)}
				<div class="card bg-base-100 border-base-300 border shadow-sm transition hover:shadow-md">
					<div class="card-body gap-2 p-5">
						<a href={`/project/${project.id}`} class="card-title text-base leading-snug">
							{project.name}
						</a>
						{#if project.description}
							<p class="text-base-content/60 line-clamp-2 text-sm">{project.description}</p>
						{/if}
						<div class="mt-1 flex flex-wrap items-center gap-1.5">
							{#if project.rating}
								<span class="badge badge-outline badge-sm">{project.rating}</span>
							{/if}
							{#each project.tags as tag (tag)}
								<span class="badge badge-ghost badge-sm">{tag}</span>
							{/each}
						</div>
						<div class="text-base-content/40 mt-2 flex items-center justify-between text-xs">
							<span>{project.moduleOrder.length} module{project.moduleOrder.length === 1 ? '' : 's'}</span>
							<span>{relativeTime(project.updatedAt)}</span>
						</div>
						<div class="card-actions mt-3 justify-end">
							<button
								class="btn btn-ghost btn-xs"
								onclick={() => onExport(project.id, project.name)}
							>
								Export
							</button>
							<button
								class="btn btn-ghost btn-xs text-error"
								onclick={() => onDelete(project.id, project.name)}
							>
								Delete
							</button>
							<a href={`/project/${project.id}`} class="btn btn-soft btn-xs">Open</a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<NewProjectDialog bind:open={showNewProject} />
