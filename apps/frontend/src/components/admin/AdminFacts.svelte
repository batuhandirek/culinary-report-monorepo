<script lang="ts" module>
	export interface AdminFact {
		label: string;
		/** Nothing, `null` or an empty string reads as a dash. */
		value?: string | number | null;
		/** A quieter note beside the value: a unit, "verified", "from their share". */
		hint?: string;
		/** Makes the value a link. */
		href?: string;
		/** Ids and codes. */
		mono?: boolean;
		/** Colours the value: a failed check, a stuck amount. */
		tone?: 'danger' | 'success' | 'muted';
	}
</script>

<script lang="ts">
	import { cn } from '#ui/lib/utils.js';
	import KeyValueList from '#ui/wrapped/KeyValueList.svelte';
	import KeyValueRow from '#ui/wrapped/KeyValueRow.svelte';

	// The key–value block every admin detail page has: the design system's `KeyValueList` in
	// columns, plus what an operator's record needs — an empty value stays on the page as a
	// dash (a missing fact is a fact), values can be links or ids, hints sit beside the value.
	interface Props {
		items: AdminFact[];
		/** Right-align the values, tabular: amounts. */
		numeric?: boolean;
		class?: string;
	}

	let { items, numeric = false, class: className = '' }: Props = $props();

	const TONE = {
		danger: 'text-destructive font-medium',
		success: 'text-success',
		muted: 'text-muted-foreground'
	} as const;

	const isEmpty = (value: AdminFact['value']) =>
		value === undefined || value === null || value === '';
</script>

<KeyValueList layout="columns" class={cn('gap-y-1.5', className)}>
	{#each items as item (item.label)}
		<KeyValueRow label={item.label}>
			<span class={cn('font-normal', numeric && 'block text-right tabular-nums')}>
				{#if isEmpty(item.value)}
					<span class="text-muted-foreground">—</span>
				{:else if item.href}
					<a
						href={item.href}
						class={cn(
							'decoration-line hover:decoration-ink underline underline-offset-2',
							item.mono && 'font-mono text-xs',
							item.tone && TONE[item.tone]
						)}>{item.value}</a>
				{:else}
					<span class={cn(item.mono && 'font-mono text-xs', item.tone && TONE[item.tone])}
						>{item.value}</span>
				{/if}
				{#if item.hint}
					<span class="text-muted-foreground ml-1 text-xs">{item.hint}</span>
				{/if}
			</span>
		</KeyValueRow>
	{/each}
</KeyValueList>
