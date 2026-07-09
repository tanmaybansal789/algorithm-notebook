// Loads the Pyodide (CPython-in-WebAssembly) runtime, vendored at build time
// into static/pyodide (see scripts/copy-pyodide.mjs) so it runs same-origin
// with no external CDN dependency. Kept as a module-level singleton so
// switching between Python modules in the same session reuses the
// already-booted interpreter instead of reloading it.

const INDEX_URL = '/pyodide/';

export interface PyodideInterface {
	runPythonAsync(code: string): Promise<unknown>;
	globals: { set(name: string, value: unknown): void; get(name: string): unknown };
	setStdout(options: { batched: (msg: string) => void }): void;
	setStderr(options: { batched: (msg: string) => void }): void;
}

declare global {
	interface Window {
		loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
	}
}

let pyodidePromise: Promise<PyodideInterface> | null = null;

function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve();
			return;
		}
		const script = document.createElement('script');
		script.src = src;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load the Pyodide runtime script.'));
		document.head.appendChild(script);
	});
}

export function getPyodide(): Promise<PyodideInterface> {
	if (!pyodidePromise) {
		pyodidePromise = (async () => {
			await loadScript(`${INDEX_URL}pyodide.js`);
			if (!window.loadPyodide) throw new Error('Pyodide failed to initialize.');
			return window.loadPyodide({ indexURL: INDEX_URL });
		})();
	}
	return pyodidePromise;
}
