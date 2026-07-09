<script lang="ts">
	import React from 'react';
	import { createRoot, type Root } from 'react-dom/client';
	import { Excalidraw } from '@excalidraw/excalidraw';
	import '@excalidraw/excalidraw/index.css';
	import type { NotebookModule, ExcalidrawData } from '$lib/types';
	import { updateModule } from '$lib/db';
	import { debounce } from '$lib/utils';
	import { onMount, onDestroy } from 'svelte';

	let { module }: { module: NotebookModule } = $props();
	const initial = module.data as ExcalidrawData;

	let container: HTMLDivElement | undefined = $state();
	let root: Root | null = null;

	// Only a curated, JSON-safe subset of appState is persisted — the rest
	// (collaborators map, transient UI refs, etc.) isn't serializable or useful.
	const APP_STATE_KEYS = [
		'viewBackgroundColor',
		'currentItemStrokeColor',
		'currentItemBackgroundColor',
		'currentItemFillStyle',
		'currentItemStrokeWidth',
		'currentItemStrokeStyle',
		'currentItemRoughness',
		'currentItemOpacity',
		'currentItemFontFamily',
		'currentItemFontSize',
		'currentItemTextAlign',
		'gridSize',
		'scrollX',
		'scrollY',
		'zoom'
	] as const;

	function pickAppState(appState: object) {
		const src = appState as Record<string, unknown>;
		const out: Record<string, unknown> = {};
		for (const key of APP_STATE_KEYS) {
			if (key in src) out[key] = src[key];
		}
		return out;
	}

	const save = debounce((elements: readonly unknown[], appState: object, files: object) => {
		updateModule(module.id, {
			data: {
				elements: elements as unknown[],
				appState: pickAppState(appState),
				files: files as Record<string, unknown>
			} satisfies ExcalidrawData
		});
	}, 700);

	onMount(() => {
		if (!container) return;
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root = createRoot(container);
		root.render(
			React.createElement(Excalidraw, {
				initialData: {
					elements: (initial.elements as never[]) ?? [],
					appState: { ...(initial.appState as object), collaborators: new Map() },
					files: (initial.files as never) ?? {}
				},
				theme: prefersDark ? 'dark' : 'light',
				onChange: (elements: readonly unknown[], appState: object, files: object) =>
					save(elements, appState, files)
			})
		);
	});

	onDestroy(() => {
		root?.unmount();
	});
</script>

<div bind:this={container} class="h-full w-full"></div>
