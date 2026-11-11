<script lang="ts" module>
	export interface AdminDetailTab {
		value: string;
		label: string;
		/** Shown beside the label; a zero stays visible so "nothing here" is read, not guessed. */
		count?: number;
		/** The tab cannot work for this record (nothing to compare, no conversation). */
		disabled?: boolean;
		/** Why it is disabled, as a tooltip. */
		disabledReason?: string;
		/** Drawn before the label */
		icon?: Component;
		/** Reachable by its URL (or a key elsewhere on the page) but not drawn in the row */
		hidden?: boolean;
	}
</script>

<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cn } from '#ui/lib/utils.js';
	import * as Tabs from '#ui/primitives-new/tabs/index.js';
	import * as UnderlineTabs from '#ui/primitives-new/underline-tabs/index.js';

	// The tab row of a detail page. The selection lives in the URL (`?tab=`), so a refresh, a
	// shared link and the back button all land on the same tab. Read the current one from
	// `value` and render a single body for it — don't mount one per tab.
	interface Props {
		tabs: AdminDetailTab[];
		/** The live tab. Bind it. */
		value?: string;
		/** Query parameter holding the selection. */
		param?: string;
		/** `pills` is the second level, under an underlined row. */
		variant?: 'underline' | 'pills';
		/**
		 * Parameters that outlive a change of tab: the tab rows above this one. Everything
		 * else in the query belongs to the tab being left — its second level, its table's
		 * filters, sort and page — and goes with it, so the next tab's table never inherits
		 * a `state=` or a `page=` that was not meant for it. Defaults to `['tab']` for a
		 * second level and nothing for the first.
		 */
		keeps?: string[];
		/** The detail pages' compact row: 13px labels, counts in Onest */
		dense?: boolean;
		/** Right of the row, on the hairline: the tab's scope, when it was updated */
		end?: Snippet;
		class?: string;
	}

	let {
		tabs,
		value = $bindable(''),
		param = 'tab',
		variant = 'underline',
		keeps,
		dense = false,
		end,
		class: className = ''
	}: Props = $props();

	const drawn = $derived(tabs.filter((tab) => !tab.hidden));

	const usable = $derived(tabs.filter((tab) => !tab.disabled));
	const fallback = $derived(usable[0]?.value ?? '');
	const fromUrl = $derived.by(() => {
		const requested = page.url.searchParams.get(param);
		return usable.some((tab) => tab.value === requested) ? requested! : fallback;
	});

	// The URL is the source; `value` mirrors it for the host.
	$effect(() => {
		value = fromUrl;
	});

	const select = (next: string) => {
		if (next === fromUrl) return;
		const url = new URL(page.url.href);
		const kept = keeps ?? (param === 'tab' ? [] : ['tab']);
		for (const name of [...url.searchParams.keys()]) {
			if (!kept.includes(name)) url.searchParams.delete(name);
		}
		// The first tab is the bare URL.
		if (next !== fallback) url.searchParams.set(param, next);
		goto(url, { replace: true, reset: false });
	};
</script>

{#snippet count(tab: AdminDetailTab)}
	{#if tab.count !== undefined}
		<span
			class={cn(
				dense ? 'text-[11px] font-semibold tabular-nums' : 'eyebrow tabular-nums',
				variant === 'pills'
					? 'opacity-70'
					: tab.count > 0
						? 'text-beet'
						: 'text-muted-foreground/60'
			)}>{tab.count}</span>
	{/if}
{/snippet}

{#if variant === 'pills'}
	<Tabs.Root value={fromUrl} onValueChange={select} class={cn('min-w-0', className)}>
		<Tabs.List>
			{#each drawn as tab (tab.value)}
				<Tabs.Trigger
					value={tab.value}
					disabled={tab.disabled}
					title={tab.disabled ? tab.disabledReason : undefined}>
					{tab.label}
					{@render count(tab)}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</Tabs.Root>
{:else}
	<UnderlineTabs.Root value={fromUrl} onValueChange={select} class={cn('min-w-0', className)}>
		<div class={cn('flex min-w-0 items-end gap-3', dense && 'border-line border-b')}>
			<UnderlineTabs.List class={cn('w-auto min-w-0 flex-1', dense && 'gap-0.5 border-b-0')}>
				{#each drawn as tab (tab.value)}
					<UnderlineTabs.Trigger
						value={tab.value}
						disabled={tab.disabled}
						title={tab.disabled ? tab.disabledReason : undefined}
						class={dense
							? 'mb-0 h-[33px] gap-1.5 border-b-2 px-2.5 text-[13px] font-medium data-[state=active]:font-medium [&_svg:not([class*=size-])]:size-3.5'
							: undefined}>
						{#if tab.icon}<tab.icon strokeWidth={1.8} />{/if}
						{tab.label}
						{@render count(tab)}
					</UnderlineTabs.Trigger>
				{/each}
			</UnderlineTabs.List>
			{#if end}
				<div class="text-muted-foreground flex shrink-0 items-center gap-2 pb-1 text-[11.5px]">{@render end()}</div>
			{/if}
		</div>
	</UnderlineTabs.Root>
{/if}
