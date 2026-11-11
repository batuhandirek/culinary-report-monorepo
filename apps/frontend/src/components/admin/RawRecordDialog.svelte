<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';

	import { rawJson } from '#components/admin/AdminRawJson.svelte';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import Button from '#ui/wrapped/Button.svelte';

	// A record as the API returned it, for a field the page doesn't show: opened from a page's header,
	// secrets blanked as `AdminRawJson` does.
	interface Props {
		value: unknown;
		active?: boolean;
	}

	let { value, active = $bindable(false) }: Props = $props();

	const json = $derived(active ? rawJson(value) : '');
	let copied = $state(false);
	const copy = async () => {
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	};
</script>

<Dialog.Root bind:open={active}>
	<Dialog.Content class="max-w-[calc(100%-2rem)] text-sm sm:max-w-3xl" preventScroll>
		<Dialog.Header>
			<Dialog.Title>Raw record</Dialog.Title>
		</Dialog.Header>
		<div class="border-line bg-paper relative min-w-0 rounded-md border">
			<Button size="xs" variant="outline" icon={copied ? Check : Copy} class="absolute top-2 right-2" onclick={copy}>
				{copied ? 'Copied' : 'Copy'}
			</Button>
			<pre class="m-0 max-h-[65vh] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{json}</pre>
		</div>
	</Dialog.Content>
</Dialog.Root>
