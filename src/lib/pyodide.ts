// Loads the Pyodide (CPython-in-WebAssembly) runtime from a CDN on first use.
// Kept as a module-level singleton so switching between Python modules in the
// same session reuses the already-booted interpreter instead of reloading it.

const PYODIDE_VERSION = '0.28.3';
const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

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
			await loadScript(`${CDN_BASE}pyodide.js`);
			if (!window.loadPyodide) throw new Error('Pyodide failed to initialize.');
			return window.loadPyodide({ indexURL: CDN_BASE });
		})();
	}
	return pyodidePromise;
}
