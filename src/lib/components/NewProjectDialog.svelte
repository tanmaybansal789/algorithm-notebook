<script lang="ts">
	import { createProject } from '$lib/db';
	import { goto } from '$app/navigation';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let name = $state('');
	let url = $state('');
	let rating = $state<string>('');
	let tagsInput = $state('');
	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) dialogEl.showModal();
		if (!open && dialogEl.open) dialogEl.close();
	});

	function reset() {
		name = '';
		url = '';
		rating = '';
		tagsInput = '';
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (!name.trim()) return;
		const tags = tagsInput
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
		const project = await createProject({
			name: name.trim(),
			url: url.trim(),
			tags,
			rating: rating ? Number(rating) : null
		});
		open = false;
		reset();
		await goto(`/project/${project.id}`);
	}
</script>

<dialog bind:this={dialogEl} class="modal" onclose={() => (open = false)}>
	<div class="modal-box">
		<h3 class="text-lg font-semibold">New project</h3>
		<p class="text-base-content/60 mt-1 text-sm">
			One project per problem or topic. Add modules for notes, graphs, traces, code, and sketches
			once it's created.
		</p>
		<form class="mt-4 flex flex-col gap-3" onsubmit={submit}>
			<label class="floating-label">
				<span>Name</span>
				<input
					class="input w-full"
					placeholder="e.g. 1868A - Fill in the Matrix"
					bind:value={name}
					required
				/>
			</label>
			<label class="floating-label">
				<span>Problem URL</span>
				<input
					class="input w-full"
					type="url"
					placeholder="https://codeforces.com/problemset/problem/..."
					bind:value={url}
				/>
			</label>
			<div class="grid grid-cols-2 gap-3">
				<label class="floating-label">
					<span>Rating</span>
					<input class="input w-full" type="number" placeholder="1700" bind:value={rating} />
				</label>
				<label class="floating-label">
					<span>Tags</span>
					<input
						class="input w-full"
						placeholder="dp, graphs, greedy"
						bind:value={tagsInput}
					/>
				</label>
			</div>
			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={() => (open = false)}>Cancel</button
				>
				<button type="submit" class="btn btn-primary" disabled={!name.trim()}>Create</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button aria-label="close">close</button>
	</form>
</dialog>
