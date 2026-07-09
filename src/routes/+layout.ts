// This app stores everything in the browser's IndexedDB (Dexie) and embeds
// browser-only runtimes (Pyodide, Excalidraw/React). None of that exists on
// the server, so the whole app is rendered client-side only.
export const ssr = false;
