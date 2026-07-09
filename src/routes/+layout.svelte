<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="bg-base-200 flex min-h-screen flex-col">
	<header class="navbar bg-base-100 border-base-300 sticky top-0 z-30 border-b px-4 sm:px-6">
		<div class="flex-1">
			<a href="/" class="flex items-center gap-2 text-lg font-semibold tracking-tight">
				<span class="text-xl">📓</span>
				<span>Algorithmic Notebook</span>
			</a>
		</div>
		<div class="text-base-content/50 hidden text-xs sm:block">
			stored locally in your browser
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>
</div>
