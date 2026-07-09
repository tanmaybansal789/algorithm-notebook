import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Fully client-side app (data lives in the browser's IndexedDB), so it
			// builds to static files servable from anywhere, with client-side
			// routing handled via the SPA fallback page.
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
