<script lang="ts">
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		Panel,
		ConnectionMode,
		MarkerType,
		addEdge,
		type Node,
		type Edge,
		type Connection
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { NotebookModule, GraphData } from '$lib/types';
	import { updateModule } from '$lib/db';
	import { debounce } from '$lib/utils';
	import GraphNode from './GraphNode.svelte';

	let { module }: { module: NotebookModule } = $props();

	const data = module.data as GraphData;
	const nodeTypes = { labeled: GraphNode };

	let nodes = $state.raw<Node[]>((data.nodes as Node[]) ?? []);
	let edges = $state.raw<Edge[]>((data.edges as Edge[]) ?? []);
	let directed = $state(true);
	let nextIndex = $state(
		(data.nodes as Node[] | undefined)?.reduce((m, n) => Math.max(m, idNum(n.id)), 0) ?? 0
	);

	function idNum(id: string) {
		const n = Number(id.replace('n', ''));
		return Number.isFinite(n) ? n : 0;
	}

	const save = debounce((n: Node[], e: Edge[]) => {
		updateModule(module.id, { data: { nodes: n, edges: e } satisfies GraphData });
	}, 500);

	$effect(() => {
		save(nodes, edges);
	});

	function addNode() {
		nextIndex += 1;
		const id = `n${nextIndex}`;
		const angle = (nextIndex * 47) % 360;
		const radius = 120;
		nodes = [
			...nodes,
			{
				id,
				type: 'labeled',
				position: {
					x: 200 + radius * Math.cos((angle * Math.PI) / 180),
					y: 180 + radius * Math.sin((angle * Math.PI) / 180)
				},
				data: { label: String(nextIndex) }
			}
		];
	}

	function onconnect(connection: Connection) {
		edges = addEdge(
			{
				...connection,
				markerEnd: directed ? { type: MarkerType.ArrowClosed } : undefined
			},
			edges
		);
	}

	function clearAll() {
		if (!confirm('Clear the whole graph?')) return;
		nodes = [];
		edges = [];
		nextIndex = 0;
	}

	// picked up by bubbling `input` events from label editors inside custom nodes
	function onInputBubble() {
		save(nodes, edges);
	}
</script>

<div class="h-full w-full" oninput={onInputBubble}>
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{onconnect}
		connectionMode={ConnectionMode.Loose}
		fitView
		colorMode="system"
		defaultEdgeOptions={{ markerEnd: directed ? { type: MarkerType.ArrowClosed } : undefined }}
	>
		<Background />
		<Controls />
		<MiniMap pannable zoomable class="!bg-base-100" />
		<Panel position="top-left">
			<div class="join bg-base-100 rounded-box shadow-sm">
				<button class="btn btn-sm join-item" onclick={addNode}>+ Node</button>
				<label class="btn btn-sm join-item gap-1.5">
					<input type="checkbox" class="toggle toggle-xs" bind:checked={directed} />
					Directed
				</label>
				<button class="btn btn-sm join-item text-error" onclick={clearAll}>Clear</button>
			</div>
		</Panel>
	</SvelteFlow>
</div>
