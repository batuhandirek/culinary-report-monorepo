<script lang="ts" module>
	/** A topic or a wording the view is about, by name */
	export interface TopicPick {
		ref: string;
		label: string;
		/** What it covers (an aspect's hint) */
		hint?: string;
		/** Its parents' names, top first */
		path?: string[];
	}
</script>

<script lang="ts">
	import { X } from '@lucide/svelte';
	import type { AdminExploreBreakdownOutputDto, AdminExploreHeadOutputDto, AdminExploreTreeNodeOutputDto } from 'client';
	import type { Snippet } from 'svelte';

	import ExploreOptionList, { type Option } from './ExploreOptionList.svelte';
	import ExplorePicker from './ExplorePicker.svelte';
	import ExploreTree from './ExploreTree.svelte';

	import { api } from '#lib/api.js';
	import { EXPLORE_SIDES, type ExploreDimension, type ExploreSide, type ExploreView, SIDE_LABELS, SOURCE_LABELS, SUBJECT_LABELS } from '#lib/explore.js';
	import { KIND_LABELS } from '#lib/statements.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';

	// Everything that narrows the Explore view besides the city and the months, as pickers in three
	// groups: what (an aspect, a food or drink: claims about both when both are picked), where (a
	// brand, a branch, a district, a kind of place: each listing what the view has, with counts) and
	// which claims (side, source, kind, what a claim is about). A picked one shows its value and
	// an × that clears it; further topics a breakdown row added are chips after them.
	interface Props {
		view: ExploreView;
		head: AdminExploreHeadOutputDto | null;
		/** The view's API query, for the pickers that list what it has */
		query: Record<string, string> | null;
		aspect?: TopicPick;
		food?: TopicPick;
		/** Further topics a breakdown row added */
		extras: TopicPick[];
		tree: AdminExploreTreeNodeOutputDto[] | null;
		treeFailed: boolean;
		onRetryTree: () => void;
		onTopic: (kind: 'aspect' | 'food', ref: string | undefined) => void;
		onChange: (patch: Partial<ExploreView>) => void;
		onClearAll: () => void;
	}

	let { view, head, query, aspect, food, extras, tree, treeFailed, onRetryTree, onTopic, onChange, onClearAll }: Props = $props();

	const aspectNodes = $derived(tree?.filter((n) => n.kind === 'aspect') ?? null);
	const foodNodes = $derived(tree?.filter((n) => n.kind !== 'aspect') ?? null);
	let aspectOpen = $state(false);
	// "Service › Advice": what the picker's hover says, where the chip shows only the last name
	const fullName = (pick: TopicPick) => [...(pick.path ?? []), pick.label].join(' › ');
	let foodOpen = $state(false);

	// A scope picker lists the view's rows of its dimension, the picker's own filter left out
	const rowsOf = (by: ExploreDimension, drop: string[]) => async (): Promise<Option[]> => {
		const params: Record<string, string> = { ...(query ?? {}), by };
		for (const key of drop) delete params[key];
		const res = (await api.admin.getExploreBreakdown(params as never)) as AdminExploreBreakdownOutputDto;
		return res.rows.flatMap((r) => (r.key === undefined ? [] : [{ value: r.key, label: r.label, detail: r.detail, count: r.sources }]));
	};
	const COUNT_NOTE = 'Reviews and posts in this view';

	const titled = (label: string) => label[0].toUpperCase() + label.slice(1);
	const sideOptions = $derived(EXPLORE_SIDES.map((s) => ({ value: s, label: SIDE_LABELS[s], count: head?.sides.find((x) => x.side === s)?.sources })));
	const SOURCES = ['review', 'google_review', 'tripadvisor_review', 'post', 'tiktok', 'instagram', 'blog'];
	const SOURCE_OPTIONS = SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] ?? s }));
	const KIND_OPTIONS = Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label: titled(label) }));
	const SUBJECT_OPTIONS = Object.entries(SUBJECT_LABELS).map(([value, label]) => ({ value, label }));

	// Which picker is open; every key set, since a bound prop with a fallback can't start undefined
	let open = $state({ brand: false, venue: false, district: false, place: false, side: false, source: false, kind: false, subject: false });
	const picked = (key: keyof typeof open, patch: Partial<ExploreView>) => {
		open[key] = false;
		onChange(patch);
	};
	const narrowed = $derived(
		[aspect, food, view.brandId, view.venueId, view.district, view.place, view.side, view.source, view.kind, view.subject].filter(Boolean).length + extras.length
	);
</script>

{#snippet group(label: string, body: Snippet)}
	<div class="flex min-w-0 flex-col gap-1">
		<p class="eyebrow text-muted-foreground m-0">{label}</p>
		<div class="flex flex-wrap items-center gap-1.5">{@render body()}</div>
	</div>
{/snippet}

{#snippet what()}
	<ExplorePicker label="Aspect" value={aspect?.label} hint={aspect ? fullName(aspect) + (aspect.hint ? `: ${aspect.hint}` : '') : undefined} wide bind:open={aspectOpen} onClear={() => onTopic('aspect', undefined)}>
		{#if treeFailed && !tree}
			<ErrorState onRetry={onRetryTree} size="sm" ground="none" />
		{:else}
			<ExploreTree
				nodes={aspectNodes}
				selected={aspect?.ref}
				terms={false}
				anyLabel="Any aspect"
				onPick={(ref) => {
					aspectOpen = false;
					onTopic('aspect', ref);
				}} />
		{/if}
	</ExplorePicker>
	<ExplorePicker label="Food & drink" value={food?.label} hint={food ? fullName(food) : undefined} wide bind:open={foodOpen} onClear={() => onTopic('food', undefined)}>
		{#if treeFailed && !tree}
			<ErrorState onRetry={onRetryTree} size="sm" ground="none" />
		{:else}
			<ExploreTree
				nodes={foodNodes}
				selected={food?.ref}
				anyLabel="Any food or drink"
				onPick={(ref) => {
					foodOpen = false;
					onTopic('food', ref);
				}} />
		{/if}
	</ExplorePicker>
	{#each extras as extra (extra.ref)}
		<button type="button" class="chip flex items-center gap-1 text-xs" aria-pressed="true" title="Remove" onclick={() => onChange({ node: view.node === extra.ref ? view.with?.[0] : view.node, with: view.with?.filter((r) => r !== extra.ref) })}>
			<span class="opacity-70">and</span>{extra.label}<X class="size-3.5" aria-label="Remove" />
		</button>
	{/each}
{/snippet}

{#snippet where()}
	<ExplorePicker label="Brand" value={view.brandId ? (head?.brand?.name ?? '…') : undefined} bind:open={open.brand} onClear={() => onChange({ brandId: undefined, venueId: undefined })}>
		<ExploreOptionList load={rowsOf('brand', ['brandId', 'venueId'])} selected={view.brandId} anyLabel="Any brand" note={COUNT_NOTE} onPick={(v) => picked('brand', { brandId: v, venueId: undefined })} />
	</ExplorePicker>
	<ExplorePicker label="Branch" value={view.venueId ? (head?.venue?.name ?? '…') : undefined} bind:open={open.venue} onClear={() => onChange({ venueId: undefined })}>
		<ExploreOptionList
			load={rowsOf('venue', ['venueId'])}
			selected={view.venueId}
			anyLabel="Any branch"
			note={`${COUNT_NOTE}; posts naming no branch have none`}
			onPick={(v) => picked('venue', { venueId: v })} />
	</ExplorePicker>
	<ExplorePicker label="District" value={view.district} bind:open={open.district} onClear={() => onChange({ district: undefined })}>
		<ExploreOptionList load={rowsOf('district', ['district'])} selected={view.district} anyLabel="Any district" note={COUNT_NOTE} onPick={(v) => picked('district', { district: v })} />
	</ExplorePicker>
	<ExplorePicker label="Kind of place" value={view.place ? (head?.place?.label ?? view.place) : undefined} bind:open={open.place} onClear={() => onChange({ place: undefined })}>
		<ExploreOptionList
			load={rowsOf('place', ['place'])}
			selected={view.place}
			anyLabel="Any kind of place"
			note="The brands' main food in the city · reviews and posts in this view"
			onPick={(v) => picked('place', { place: v })} />
	</ExplorePicker>
{/snippet}

{#snippet which()}
	<ExplorePicker label="Side" value={view.side ? SIDE_LABELS[view.side] : undefined} bind:open={open.side} onClear={() => onChange({ side: undefined })}>
		<ExploreOptionList options={sideOptions} selected={view.side} anyLabel="Any side" note={COUNT_NOTE} onPick={(v) => picked('side', { side: v as ExploreSide | undefined })} />
	</ExplorePicker>
	<ExplorePicker label="Source" value={view.source ? (SOURCE_LABELS[view.source] ?? view.source) : undefined} bind:open={open.source} onClear={() => onChange({ source: undefined })}>
		<ExploreOptionList options={SOURCE_OPTIONS} selected={view.source} anyLabel="Any source" onPick={(v) => picked('source', { source: v })} />
	</ExplorePicker>
	<ExplorePicker label="Claim kind" value={view.kind ? titled(KIND_LABELS[view.kind] ?? view.kind) : undefined} bind:open={open.kind} onClear={() => onChange({ kind: undefined })}>
		<ExploreOptionList options={KIND_OPTIONS} selected={view.kind} anyLabel="Any kind" onPick={(v) => picked('kind', { kind: v })} />
	</ExplorePicker>
	<ExplorePicker label="About" value={view.subject ? (SUBJECT_LABELS[view.subject] ?? view.subject).replace(/^About /, '') : undefined} bind:open={open.subject} onClear={() => onChange({ subject: undefined })}>
		<ExploreOptionList options={SUBJECT_OPTIONS} selected={view.subject} anyLabel="About anything" onPick={(v) => picked('subject', { subject: v })} />
	</ExplorePicker>
{/snippet}

<div class="bg-paper border-line flex flex-wrap items-end gap-x-6 gap-y-3 rounded-md border px-4 py-3">
	{@render group('What', what)}
	{@render group('Where', where)}
	{@render group('Which claims', which)}
	{#if narrowed > 1}
		<Button size="sm" variant="ghost" class="ml-auto" onclick={onClearAll}>Clear all</Button>
	{/if}
</div>

