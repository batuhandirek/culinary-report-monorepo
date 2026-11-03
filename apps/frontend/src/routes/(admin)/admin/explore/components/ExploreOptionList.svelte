<script lang="ts" module>
	/** One choice of a picker: its value, its name, a quieter line under it, the reviews and posts it has */
	export interface Option {
		value: string;
		label: string;
		detail?: string;
		count?: number;
	}
</script>

<script lang="ts">
	import { Check, Search } from '@lucide/svelte';

	import { onMount } from 'svelte';

	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// A picker's choices: "any" first, then each option with its count; a search once the list is
	// long. Given `options`, or `load`, which is called when the list mounts (the picker opened), so
	// the choices are those of the view as it is now (the brands that talked about it, …).
	interface Props {
		options?: Option[];
		load?: () => Promise<Option[]>;
		selected?: string;
		/** The first row, picking nothing */
		anyLabel: string;
		/** A line over the list: what the counts are */
		note?: string;
		onPick: (value: string | undefined) => void;
	}

	let { options, load, selected, anyLabel, note, onPick }: Props = $props();

	let loaded = $state<Option[] | null>(null);
	let failed = $state(false);
	const fetch = () => {
		failed = false;
		load?.()
			.then((res) => (loaded = res))
			.catch(() => (failed = true));
	};
	onMount(() => {
		if (load) fetch();
	});

	const list = $derived(options ?? loaded);
	let query = $state('');
	const shown = $derived(
		!list ? [] : query.trim() ? list.filter((o) => `${o.label} ${o.detail ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())) : list
	);
	const n = (value: number) => value.toLocaleString('en-GB');
</script>

{#snippet row(value: string | undefined, label: string, detail?: string, count?: number)}
	{@const on = selected === value}
	<button
		type="button"
		class={['flex min-h-9 w-full items-center gap-2 rounded px-2 py-1 text-left text-sm', on ? 'bg-tint font-medium' : 'hover:bg-sand']}
		aria-pressed={on}
		onclick={() => onPick(value)}>
		<Check class={['size-3.5 shrink-0', on ? '' : 'invisible']} />
		<span class="min-w-0 flex-1">
			<span class="block truncate">{label}</span>
			{#if detail}<span class="text-muted-foreground block truncate text-xs">{detail}</span>{/if}
		</span>
		{#if count !== undefined}<span class="text-muted-foreground shrink-0 text-xs tabular-nums">{count ? n(count) : '—'}</span>{/if}
	</button>
{/snippet}

<div class="flex flex-col gap-2">
	{#if failed}
		<ErrorState onRetry={fetch} size="sm" ground="none" />
	{:else if !list}
		<SkeletonRows count={6} />
	{:else}
		{#if list.length > 8}
			<label class="border-line bg-paper flex h-9 items-center gap-2 rounded-md border px-2.5">
				<Search class="text-muted-foreground size-4 shrink-0" />
				<!-- svelte-ignore a11y_autofocus -->
				<input class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search…" bind:value={query} aria-label="Search" autofocus />
			</label>
		{/if}
		{#if note}<p class="text-muted-foreground m-0 text-xs">{note}</p>{/if}
		<div class="flex flex-col">
			{#if !query.trim()}{@render row(undefined, anyLabel)}{/if}
			{#each shown as option (option.value)}
				{@render row(option.value, option.label, option.detail, option.count)}
			{:else}
				<p class="text-muted-foreground m-0 px-2 py-1.5 text-sm">{query.trim() ? 'Nothing by that name.' : 'Nothing in this view.'}</p>
			{/each}
		</div>
	{/if}
</div>
