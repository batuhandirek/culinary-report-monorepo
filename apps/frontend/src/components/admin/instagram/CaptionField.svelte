<script lang="ts">
	import { Copy } from '@lucide/svelte';

	import { notificationManager } from '#ui/lib/notification-manager.js';
	import { Textarea } from '#ui/primitives-new/textarea/index.js';
	import Button from '#ui/wrapped/Button.svelte';

	// The post's caption, kept with the draft. Instagram cuts at 2,200 characters and 30
	// hashtags; the brand asks for 3–5 hashtags and at most two emoji (`brand` skill).
	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();

	const LIMIT = 2200;
	const hashtags = $derived((value.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length);
	const emoji = $derived((value.match(/\p{Extended_Pictographic}/gu) ?? []).length);
	const warnings = $derived(
		[
			value.length > LIMIT && `Over Instagram’s ${LIMIT.toLocaleString('en')} characters`,
			hashtags > 5 && `${hashtags} hashtags: the brand uses 3–5`,
			emoji > 2 && `${emoji} emoji: the brand uses two at most`
		].filter(Boolean) as string[]
	);

	const copy = async () => {
		await navigator.clipboard.writeText(value);
		notificationManager.addNotification({ title: 'Caption copied', success: true, time: 2000 });
	};
</script>

<div class="flex flex-col gap-2">
	<Textarea
		bind:value
		rows={8}
		aria-label="Caption"
		placeholder="A hook line, the list or the fact, every creator by @handle, link in bio, 3–5 hashtags." />
	<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
		<span class="text-faint font-term text-base">
			{value.length.toLocaleString('en')}/{LIMIT.toLocaleString('en')} · {hashtags} hashtags
		</span>
		<Button
			size="sm"
			variant="outline"
			icon={Copy}
			class="ml-auto"
			disabled={!value}
			onclick={copy}>Copy</Button>
	</div>
	{#each warnings as warning (warning)}
		<p class="text-beet m-0 text-xs font-semibold">{warning}</p>
	{/each}
</div>
