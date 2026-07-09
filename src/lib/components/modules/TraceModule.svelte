<script lang="ts">
	import type { NotebookModule, TraceData } from '$lib/types';
	import { updateModule } from '$lib/db';
	import { debounce } from '$lib/utils';

	let { module }: { module: NotebookModule } = $props();

	const initial = module.data as TraceData;

	let columns = $state<string[]>([...initial.columns]);
	let rows = $state<string[][]>(initial.rows.map((r) => [...r]));

	const save = debounce(() => {
		updateModule(module.id, { data: { columns, rows } satisfies TraceData });
	}, 350);

	$effect(() => {
		columns;
		rows;
		save();
	});

	function addColumn() {
		columns = [...columns, `col ${columns.length + 1}`];
		rows = rows.map((r) => [...r, '']);
	}

	function removeColumn(i: number) {
		columns = columns.toSpliced(i, 1);
		rows = rows.map((r) => r.toSpliced(i, 1));
	}

	function setColumnName(i: number, name: string) {
		columns = columns.map((c, idx) => (idx === i ? name : c));
	}

	function addRow(duplicate = false) {
		const last = rows[rows.length - 1];
		const newRow = duplicate && last ? [...last] : columns.map(() => '');
		rows = [...rows, newRow];
	}

	function removeRow(i: number) {
		rows = rows.toSpliced(i, 1);
	}

	function setCell(r: number, c: number, value: string) {
		rows = rows.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? value : v)) : row));
	}
</script>

<div class="flex h-full flex-col gap-3 overflow-auto p-4 sm:p-6">
	<div class="flex flex-wrap items-center gap-2">
		<button class="btn btn-sm" onclick={() => addRow(false)}>+ Row</button>
		<button class="btn btn-sm btn-ghost" onclick={() => addRow(true)}>Duplicate last row</button>
		<button class="btn btn-sm btn-ghost" onclick={addColumn}>+ Column</button>
	</div>

	<div class="overflow-x-auto">
		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th class="w-10 text-center">#</th>
					{#each columns as col, c (c)}
						<th>
							<div class="flex items-center gap-1">
								<input
									class="input input-ghost input-xs min-w-0 flex-1 font-semibold focus:outline-none"
									value={col}
									oninput={(e) => setColumnName(c, (e.currentTarget as HTMLInputElement).value)}
								/>
								{#if columns.length > 1}
									<button
										class="btn btn-ghost btn-xs text-error"
										onclick={() => removeColumn(c)}
										aria-label="Remove column"
									>
										✕
									</button>
								{/if}
							</div>
						</th>
					{/each}
					<th class="w-8"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row, r (r)}
					<tr>
						<td class="text-base-content/40 text-center font-mono text-xs">{r}</td>
						{#each row as cell, c (c)}
							<td>
								<input
									class="input input-ghost input-sm w-full font-mono focus:outline-none"
									value={cell}
									oninput={(e) => setCell(r, c, (e.currentTarget as HTMLInputElement).value)}
								/>
							</td>
						{/each}
						<td>
							<button
								class="btn btn-ghost btn-xs text-error"
								onclick={() => removeRow(r)}
								aria-label="Remove row"
							>
								✕
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan={columns.length + 2} class="text-base-content/40 py-10 text-center">
							No rows yet — add one to start tracing.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
