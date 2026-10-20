<script lang="ts">
	import { setContext, type Snippet } from 'svelte';

	import { cn } from '#ui/lib/utils.js';
	import {
		KEY_VALUE_CONTEXT,
		type KeyValueContext,
		type KeyValueItem,
		type KeyValueLayout
	} from '#ui/wrapped/key-value-context.js';
	import KeyValueRow from '#ui/wrapped/KeyValueRow.svelte';

	/**
	 * Label–value pairs as a real `<dl>`: a price breakdown, an order's facts, a spec
	 * sheet. Pass `items` for plain values; add `KeyValueRow` children when a value needs
	 * markup (a struck-through amount, a link, a badge).
	 */
	interface Props {
		items?: KeyValueItem[];
		/**
		 * `between` — label left, value right-aligned: amounts and breakdowns.
		 * `columns` — a label column, then the values: facts and details.
		 */
		layout?: KeyValueLayout;
		/** A hairline between rows, for a spec sheet inside a `Panel padding="none"`. */
		divided?: boolean;
		class?: string;
		children?: Snippet;
	}

	let {
		items = [],
		layout = 'between',
		divided = false,
		class: className = '',
		children
	}: Props = $props();

	setContext<KeyValueContext>(KEY_VALUE_CONTEXT, {
		get layout() {
			return layout;
		}
	});

	const shown = $derived(
		items.filter((item) => item.value !== undefined && item.value !== null && item.value !== '')
	);
</script>

<dl
	class={cn(
		'm-0 text-sm',
		layout === 'columns'
			? 'grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-2'
			: 'flex flex-col gap-2',
		divided && layout === 'between' && 'divide-line gap-0 divide-y [&>div]:px-4 [&>div]:py-2.5',
		className
	)}
>
	{#each shown as item (item.label)}
		<KeyValueRow
			label={item.label}
			hint={item.hint}
			strong={item.strong}
			tone={item.tone}
			value={item.value}
		/>
	{/each}
	{@render children?.()}
</dl>
