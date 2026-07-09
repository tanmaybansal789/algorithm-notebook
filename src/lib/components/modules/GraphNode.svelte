<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { data }: NodeProps = $props();

	function onInput(e: Event) {
		data.label = (e.currentTarget as HTMLInputElement).value;
	}

	const handleClass = '!h-2 !w-2 !border-0 !bg-primary/50 hover:!bg-primary';
</script>

<div
	class="bg-base-100 border-primary/40 relative flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-sm"
>
	<Handle type="source" position={Position.Top} id="t" class={handleClass} />
	<Handle type="source" position={Position.Right} id="r" class={handleClass} />
	<Handle type="source" position={Position.Bottom} id="b" class={handleClass} />
	<Handle type="source" position={Position.Left} id="l" class={handleClass} />
	<input
		class="w-9 bg-transparent text-center text-sm font-medium focus:outline-none"
		value={data.label as string}
		oninput={onInput}
	/>
</div>
