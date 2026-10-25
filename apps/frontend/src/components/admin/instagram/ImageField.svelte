<script lang="ts">
	import { ImagePlus, Trash2 } from '@lucide/svelte';

	import { readImageFile } from './post-export.js';

	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';

	// A photo for a canvas: picked or dropped, downscaled to a JPEG data URL (`readImageFile`).
	interface Props {
		id: string;
		value: string;
	}

	let { id, value = $bindable() }: Props = $props();
	let input = $state<HTMLInputElement | null>(null);
	let reading = $state(false);
	let over = $state(false);

	const take = async (file: File | undefined) => {
		if (!file) return;
		reading = true;
		try {
			value = await readImageFile(file);
		} catch (e) {
			notificationManager.addNotification({ title: (e as Error).message, warning: true });
		} finally {
			reading = false;
			if (input) input.value = '';
		}
	};
</script>

<div
	role="group"
	class={[
		'flex items-center gap-3 rounded-md border border-dashed p-2',
		over ? 'border-ink bg-tint' : 'border-line bg-paper'
	]}
	ondragover={(e) => {
		e.preventDefault();
		over = true;
	}}
	ondragleave={() => (over = false)}
	ondrop={(e) => {
		e.preventDefault();
		over = false;
		take(e.dataTransfer?.files[0]);
	}}>
	{#if value}
		<img src={value} alt="" class="bg-wash size-16 shrink-0 rounded-sm object-cover" />
	{:else}
		<div
			class="bg-wash text-faint flex size-16 shrink-0 items-center justify-center rounded-sm">
			<ImagePlus class="size-6" aria-hidden="true" />
		</div>
	{/if}
	<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
		<Button size="sm" variant="outline" loading={reading} onclick={() => input?.click()}>
			{value ? 'Replace' : 'Choose a photo'}
		</Button>
		{#if value}
			<Button size="sm" variant="ghost" icon={Trash2} onclick={() => (value = '')}
				>Remove</Button>
		{:else}
			<span class="text-faint text-xs">or drop one here</span>
		{/if}
	</div>
	<input
		bind:this={input}
		{id}
		type="file"
		accept="image/*"
		class="sr-only"
		onchange={(e) => take(e.currentTarget.files?.[0])} />
</div>
