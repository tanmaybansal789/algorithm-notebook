import { liveQuery } from 'dexie';
import { readable, type Readable } from 'svelte/store';

export function liveQueryStore<T>(query: () => T | Promise<T>, initial: T): Readable<T> {
	return readable<T>(initial, (set) => {
		const subscription = liveQuery(query).subscribe({
			next: (value) => set(value),
			error: (err) => console.error('liveQuery error', err)
		});
		return () => subscription.unsubscribe();
	});
}
