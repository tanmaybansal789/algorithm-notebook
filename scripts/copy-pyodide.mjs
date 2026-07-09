// Vendors the Pyodide core runtime into static/pyodide so the Python module
// runs same-origin instead of depending on a CDN at runtime. Runs on
// postinstall; static/pyodide is gitignored since these are build artifacts
// derived from the pinned npm "pyodide" dependency.
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, '..', 'node_modules', 'pyodide');
const dest = path.join(root, '..', 'static', 'pyodide');

const files = [
	'pyodide.js',
	'pyodide.asm.mjs',
	'pyodide.asm.wasm',
	'pyodide-lock.json',
	'python_stdlib.zip'
];

if (!existsSync(src)) {
	console.warn('[copy-pyodide] node_modules/pyodide not found, skipping.');
	process.exit(0);
}

mkdirSync(dest, { recursive: true });

for (const file of files) {
	const from = path.join(src, file);
	if (!existsSync(from)) {
		console.warn(`[copy-pyodide] missing ${file}, skipping.`);
		continue;
	}
	copyFileSync(from, path.join(dest, file));
}

console.log(`[copy-pyodide] vendored ${files.length} files into static/pyodide`);
