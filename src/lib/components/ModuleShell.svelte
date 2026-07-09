<script lang="ts">
	import type { NotebookModule } from '$lib/types';
	import { MODULE_ICONS, MODULE_LABELS } from '$lib/types';
	import { deleteModule, updateModule } from '$lib/db';
	import { debounce } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		module,
		children
	}: {
		module: NotebookModule;
		children: Snippet;
	} = $props();

	let title = $state(module.title);
	$effect(() => {
		title = module.title;
	});

	const saveTitle = debounce((value: string) => {
		if (value.trim() && value !== module.title) {
			updateModule(module.id, { title: value.trim() });
		}
	}, 500);

	function onTitleInput(e: Event) {
		title = (e.currentTarget as HTMLInputElement).value;
		saveTitle(title);
	}

	async function onDelete() {
		if (!confirm(`Delete module "${module.title}"?`)) return;
		await deleteModule(module.id, module.projectId);
	}
</script>

<div class="flex h-full flex-col">
	<div class="border-base-300 flex items-center gap-2 border-b px-4 py-3 sm:px-6">
		<span class="text-lg" aria-hidden="true">{MODULE_ICONS[module.type]}</span>
		<input
			class="input input-ghost input-sm w-auto min-w-0 flex-1 px-1 text-base font-medium focus:outline-none"
			value={title}
			oninput={onTitleInput}
			aria-label="Module title"
		/>
		<span class="badge badge-ghost badge-sm hidden sm:inline-flex">{MODULE_LABELS[module.type]}</span>
		<button class="btn btn-ghost btn-xs text-error" onclick={onDelete}>Delete</button>
	</div>
	<div class="min-h-0 flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
