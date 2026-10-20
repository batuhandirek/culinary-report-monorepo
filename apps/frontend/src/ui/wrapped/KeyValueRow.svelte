<script lang="ts">
	import { getContext, type Snippet } from 'svelte';

	import { cn } from '#ui/lib/utils.js';
	import { KEY_VALUE_CONTEXT, type KeyValueContext } from '#ui/wrapped/key-value-context.js';

	/** One row of a `KeyValueList`. Use it as a child when the value needs markup. */
	interface Props {
		label: string;
		/** A quieter note after the label ("tahmini"). */
		hint?: string;
		value?: string | number | null;
		/** The total: a rule above it, ink label, larger bold value. */
		strong?: boolean;
		tone?: 'default' | 'success' | 'danger' | 'muted';
		class?: string;
		/** The value, when it is more than text. */
		children?: Snippet;
	}

	let {
		label,
		hint,
		value,
		strong = false,
		tone = 'default',
		class: className = '',
		children
	}: Props = $props();

	const context = getContext<KeyValueContext | undefined>(KEY_VALUE_CONTEXT);
	const columns = $derived(context?.layout === 'columns');

	const TONE = {
		default: 'text-ink',
		success: 'text-success font-semibold',
		danger: 'text-destructive font-semibold',
		muted: 'text-muted-foreground'
	};
</script>

<div
	class={cn(
		columns ? 'contents' : 'flex items-baseline justify-between gap-4',
		strong && !columns && 'border-line mt-1 border-t pt-3',
		className
	)}
>
	<dt class={cn('min-w-0', strong ? 'text-ink font-semibold' : 'text-muted-foreground')}>
		{label}
		{#if hint}
			<span class="text-faint font-normal">· {hint}</span>
		{/if}
	</dt>
	<dd
		class={cn(
			'type-meta m-0 min-w-0 break-words',
			!columns && 'text-right',
			strong ? 'text-ink text-lg font-bold' : TONE[tone]
		)}
	>
		{#if children}
			{@render children()}
		{:else}
			{value}
		{/if}
	</dd>
</div>
