<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';

	import Button from '#ui/wrapped/Button.svelte';

	// The record as the API returned it, for the field the designed view doesn't show. Closed
	// by default — it is a debugging aid, not the page — and with secrets blanked, since the
	// page gets screenshotted into support threads.
	interface Props {
		value: unknown;
		label?: string;
		/** Top-level keys left out (a nested record that has its own page). */
		omit?: string[];
	}

	let { value, label = 'Raw record', omit = [] }: Props = $props();

	const SECRET = /password|secret|token|^code$/i;

	const json = $derived(
		JSON.stringify(
			value,
			(key, nested) => {
				if (omit.includes(key)) return undefined;
				if (SECRET.test(key) && typeof nested === 'string') return '•••';
				return nested;
			},
			2
		)
	);

	let open = $state(false);
	let copied = $state(false);
	const copy = async () => {
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	};
</script>

<details class="border-line bg-paper group rounded-md border text-sm" bind:open>
	<summary
		class="text-muted-foreground hover:text-ink flex min-h-11 cursor-pointer items-center gap-2 px-4 select-none">
		<span class="flex-1">{label}</span>
		<span class="text-xs group-open:hidden">Show</span>
		<span class="hidden text-xs group-open:inline">Hide</span>
	</summary>
	{#if open}
		<div class="border-line relative border-t">
			<Button
				size="sm"
				variant="outline"
				icon={copied ? Check : Copy}
				class="absolute top-2 right-2"
				onclick={copy}>
				{copied ? 'Copied' : 'Copy'}
			</Button>
			<pre
				class="m-0 max-h-[60vh] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{json}</pre>
		</div>
	{/if}
</details>
