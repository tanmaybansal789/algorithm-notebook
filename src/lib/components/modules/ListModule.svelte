<script lang="ts">
	import type { NotebookModule, ListData } from '$lib/types';
	import { updateModule } from '$lib/db';
	import { debounce } from '$lib/utils';

	let { module }: { module: NotebookModule } = $props();

	const initial = module.data as ListData;

	let label = $state(initial.label || 'array');
	let items = $state<string[]>([...initial.items]);
	let highlighted = $state<number[]>([...initial.highlighted]);
	let bulkOpen = $state(false);
	let bulkText = $state(initial.items.join(', '));

	const save = debounce(() => {
		updateModule(module.id, {
			data: { label, items, highlighted } satisfies ListData
		});
	}, 350);

	$effect(() => {
		// track deps
		label;
		items;
		highlighted;
		save();
	});

	function addItem() {
		items = [...items, ''];
	}

	function removeAt(i: number) {
		items = items.toSpliced(i, 1);
		highlighted = highlighted.filter((h) => h !== i).map((h) => (h > i ? h - 1 : h));
	}

	function setValue(i: number, value: string) {
		items = items.map((v, idx) => (idx === i ? value : v));
	}

	function toggleHighlight(i: number) {
		highlighted = highlighted.includes(i)
			? highlighted.filter((h) => h !== i)
			: [...highlighted, i];
	}

	function clearAll() {
		items = [];
		highlighted = [];
	}

	function applyBulk() {
		items = bulkText
			.split(/[,\s]+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		highlighted = [];
		bulkOpen = false;
	}
</script>

<div class="flex h-full flex-col gap-4 p-4 sm:p-6">
	<div class="flex flex-wrap items-center gap-2">
		<input
			class="input input-sm w-40 font-mono"
			bind:value={label}
			aria-label="Array name"
			placeholder="array name"
		/>
		<button class="btn btn-sm" onclick={addItem}>+ Element</button>
		<button class="btn btn-sm btn-ghost" onclick={() => (bulkOpen = !bulkOpen)}>
			Paste values
		</button>
		<button class="btn btn-sm btn-ghost text-error" onclick={clearAll}>Clear</button>
		<span class="text-base-content/40 text-xs">click the dot to mark a pointer/index</span>
	</div>

	{#if bulkOpen}
		<div class="flex items-center gap-2">
			<input
				class="input input-sm flex-1 font-mono"
				bind:value={bulkText}
				placeholder="4, 2, 7, 1, 9  (comma or space separated)"
				onkeydown={(e) => e.key === 'Enter' && applyBulk()}
			/>
			<button class="btn btn-sm btn-primary" onclick={applyBulk}>Apply</button>
		</div>
	{/if}

	<div class="flex flex-1 flex-wrap content-start items-start gap-3 overflow-auto">
		{#each items as value, i (i)}
			<div class="group relative flex flex-col items-center gap-1">
				<button
					class="btn btn-circle btn-ghost btn-xs absolute -top-3 -right-3 opacity-0 transition group-hover:opacity-100"
					onclick={() => removeAt(i)}
					aria-label="Remove element"
				>
					✕
				</button>
				<span class="text-base-content/40 font-mono text-xs">{i}</span>
				<input
					class="input input-bordered w-16 text-center font-mono {highlighted.includes(i)
						? 'input-primary ring-primary/30 ring-2'
						: ''}"
					value={value}
					oninput={(e) => setValue(i, (e.currentTarget as HTMLInputElement).value)}
				/>
				<button
					class="badge badge-xs cursor-pointer {highlighted.includes(i)
						? 'badge-primary'
						: 'badge-ghost'}"
					onclick={() => toggleHighlight(i)}
					aria-label="Toggle pointer"
				></button>
			</div>
		{:else}
			<p class="text-base-content/40 py-10 text-sm">
				Empty. Add elements or paste values to visualize an array.
			</p>
		{/each}
	</div>
</div>
