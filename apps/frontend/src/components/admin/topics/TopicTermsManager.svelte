<script lang="ts">
	import { ArrowUpRight, Plus, Search } from '@lucide/svelte';

	import { type AdminTermOutputDto, type AdminTermsOutputDto, type AdminUpdatedTermOutputDto, type GetTermsParamsStatusEnum } from 'client';

	import TermDecisionEditor from './TermDecisionEditor.svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { TERM_STATE_ORDER, TERM_STATES, termState } from '#lib/term-status.js';
	import { topicPageHref } from '#lib/topic-format.js';
	import { edgeLabel } from '#lib/topic-kinds.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The wordings that count for one topic (food or aspect), read at a glance: a chip each with its
	// uses in the city, in three groups: the wordings that are the topic (spellings, translations),
	// the narrower things under it (candidates for a topic of their own, each with what else it is or
	// has), and the wordings of other topics that carry this one as a modifier ("vegan döner" on
	// Vegan's page). A chip's colour and icon say who decided (`lib/term-status.ts`: approved by an
	// admin, the AI, its name, or still waiting for the AI), explained in the legend under the
	// chips. A chip opens its card: its name, state and uses, then its decision as a sentence to edit
	// (`TermDecisionEditor`). Every write is an admin's decision, final for the AI. Another wording
	// the city used is given this topic from the search.
	interface Props {
		cityId: string;
		topic: { id: string; key: string; label: string; kind: string };
		/** After a wording became a topic: the page reloads its tree */
		onTopicsChanged?: () => void;
	}

	let { cityId, topic, onTopicsChanged }: Props = $props();

	const PAGE = 200;
	let data = $state<AdminTermsOutputDto | null>(null);
	let rows = $state<AdminTermOutputDto[]>([]);
	let offset = 0;
	const query = $derived({ cityId, topicKey: topic.key, status: 'linked' as GetTermsParamsStatusEnum });
	const loader = createLoader(
		(params: typeof query & { offset?: number }) => api.admin.getTerms({ ...params, limit: PAGE }),
		{
			onSuccess: (res) => {
				rows = offset ? [...rows, ...res.terms] : res.terms;
				data = res;
			}
		}
	);
	const reload = () => {
		offset = 0;
		loader.load(query);
	};
	$effect(() => {
		data = null;
		reload();
	});
	const more = () => {
		offset = rows.length;
		loader.load({ ...query, offset });
	};

	type Group = 'exact' | 'narrower' | 'modifier';
	const groupOf = (row: AdminTermOutputDto): Group => (row.topic?.key !== topic.key ? 'modifier' : row.exact ? 'exact' : 'narrower');
	const uses = (row: AdminTermOutputDto) => row.notes + row.tagVenues;
	const GROUPS: { value: Group; label: string; note: string }[] = [
		{ value: 'exact', label: 'Is it', note: 'spellings and translations' },
		{ value: 'narrower', label: 'Narrower', note: 'things under it; used enough, a topic of their own' },
		{ value: 'modifier', label: 'Carries it', note: 'wordings of another topic that are or have it' }
	];
	const groups = $derived(
		GROUPS.map((g) => ({
			...g,
			rows: rows.filter((row) => groupOf(row) === g.value).sort((a, b) => uses(b) - uses(a) || a.name.localeCompare(b.name))
		})).filter((g) => g.rows.length)
	);
	const counts = (row: Pick<AdminTermOutputDto, 'topic' | 'modifiers'>) =>
		row.topic?.key === topic.key || row.modifiers.some((m) => m.key === topic.key);

	// The chip whose card is open
	let opened = $state<number | null>(null);
	const saved = (row: AdminTermOutputDto, out: AdminUpdatedTermOutputDto) => {
		rows = counts(out) ? rows.map((r) => (r.id === row.id ? ({ ...r, ...out } as AdminTermOutputDto) : r)) : rows.filter((r) => r.id !== row.id);
		opened = null;
	};

	// Give another wording the city has seen this topic: found by its name. It becomes the topic
	// itself (a spelling); open its chip to say it is something narrower
	let q = $state('');
	let search = $state('');
	$effect(() => {
		const value = q.trim();
		const timer = setTimeout(() => (search = value), 300);
		return () => clearTimeout(timer);
	});
	let found = $state<AdminTermOutputDto[]>([]);
	$effect(() => {
		const text = search;
		if (text.length < 2) {
			found = [];
			return;
		}
		api.admin.getTerms({ cityId, status: 'all' as GetTermsParamsStatusEnum, q: text, limit: 8 }).then((res) => {
			if (text === search) found = res.terms;
		});
	});
	const linkAction = createAction((row: AdminTermOutputDto) => api.admin.changeTerm(row.id, { topicKey: topic.key, exact: true }), {
		onSuccess: (_saved, [row]) => {
			notificationManager.addNotification({ title: `"${row.name}" is ${topic.label} now`, success: true });
			q = '';
			reload();
		}
	});

	const n = (v: number) => v.toLocaleString('en-GB');
	const plural = (v: number, one: string, many = `${one}s`) => `${n(v)} ${v === 1 ? one : many}`;
	const termsTabHref = (name: string) => `/admin/trends?${new URLSearchParams({ tab: 'terms', cityId, status: 'all', q: name })}`;
	const isFood = $derived(topic.kind !== 'aspect');
</script>

<AdminPanel title="Wordings" note={data ? `${n(data.total)} in the city` : undefined}>
	{#snippet action()}
		<div class="relative w-60">
			<Input bind:value={q} placeholder="Add a wording…" icon={Search} aria-label="Give a wording the city has used this topic" class="h-9" />
			{#if search.length >= 2}
				<div class="bg-paper border-line shadow-sticker absolute top-10 right-0 z-20 w-80 rounded-md border p-1">
					{#if !found.length}
						<p class="text-muted-foreground m-0 p-2 text-sm">No wording the city used matches "{search}".</p>
					{:else}
						{#each found as row (row.id)}
							{@const linked = counts(row)}
							<button
								type="button"
								class="hover:bg-wash flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm disabled:opacity-50"
								disabled={linked || linkAction.executing}
								onclick={() => linkAction.execute(row)}>
								<span class="min-w-0 truncate">
									{row.name}
									<span class="text-muted-foreground text-xs">
										{n(uses(row))} · {row.topic ? row.topic.label : row.decidedBy ? 'no topic' : 'undecided'}
									</span>
								</span>
								{#if linked}<span class="text-muted-foreground text-xs">counts already</span>{:else}<Plus class="size-3.5 shrink-0" />{/if}
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	{/snippet}

	{#if loader.error && !data}
		<ErrorState onRetry={reload} />
	{:else if !data}
		<SkeletonRows count={3} lines={1} />
	{:else}
		{#if !rows.length}
			<p class="text-muted-foreground m-0 text-sm">No wording in the city's claims or Google tags counts for {topic.label} yet. Add one above.</p>
		{/if}
		<div class="flex flex-col gap-3">
			{#each groups as group (group.value)}
				<div class="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
					<div class="pt-1">
						<p class="m-0 text-sm font-semibold">{group.label} <span class="text-muted-foreground font-normal tabular-nums">{group.rows.length}</span></p>
						<p class="text-muted-foreground m-0 text-xs">{group.note}</p>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each group.rows as row (row.id)}
							{@const decision = TERM_STATES[termState(row.decidedBy)]}
							<span class={['hover:border-ink inline-flex h-8 items-center rounded-full border text-sm', decision.chip]} title={decision.label}>
								<ResponsivePopover
									open={opened === row.id}
									onOpenChange={(o) => (opened = o ? row.id : null)}
									title={row.name}
									hideHeader="popover"
									align="start"
									class="w-[26rem] max-w-[calc(100vw-2rem)] p-0">
									{#snippet trigger()}
										<span class="inline-flex h-8 items-center gap-1.5 pr-3 pl-2.5">
											<decision.icon class={['size-3.5 shrink-0', decision.iconClass]} aria-hidden="true" />
											<span class="max-w-48 truncate">{row.name}</span>
											{#if group.value !== 'exact'}
												{#each row.modifiers.filter((mod) => mod.key !== topic.key) as mod (mod.key)}
													<span class="text-muted-foreground text-xs">{edgeLabel(mod.type)} {mod.label}</span>
												{/each}
											{/if}
											<span class="text-muted-foreground text-xs tabular-nums">{n(uses(row))}</span>
										</span>
									{/snippet}
									<div class="flex flex-col text-sm">
										<div class="border-line border-b px-4 pt-3.5 pb-3">
											<div class="flex items-center justify-between gap-3">
												<p class="m-0 min-w-0 truncate text-base font-semibold" title={row.name}>“{row.name}”</p>
												<span class={['inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs', decision.badge]} title={decision.hint}>
													<decision.icon class="size-3" aria-hidden="true" />{decision.label}
												</span>
											</div>
											<p class="text-muted-foreground m-0 mt-1 text-xs">
												Named in {plural(row.notes, 'claim')}{row.tagVenues ? ` and ${plural(row.tagVenues, "venue's Google tags", "venues' Google tags")}` : ''}{#if row.proposedLabel}; as a topic the AI would call it “{row.proposedLabel}”{/if}{#if group.value === 'modifier' && row.topic}; its own topic is <a href={topicPageHref(row.topic.key, row.topic.kind)}>{row.topic.label}</a>{/if}.
											</p>
										</div>
										{#if opened === row.id}
											<TermDecisionEditor
												{cityId}
												term={row}
												onSaved={(out) => saved(row, out)}
												onPromoted={() => {
													reload();
													onTopicsChanged?.();
												}} />
										{/if}
										<div class="border-line flex items-center justify-end border-t px-2 py-1.5">
											<a class="inline-flex items-center gap-1 px-2 text-xs whitespace-nowrap" href={termsTabHref(row.name)}>
												In Terms <ArrowUpRight class="size-3" />
											</a>
										</div>
									</div>
								</ResponsivePopover>
							</span>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		{#if rows.length < data.total}
			<Button size="sm" variant="ghost" class="mt-2" loading={loader.loading} onclick={more}>Show the other {n(data.total - rows.length)}</Button>
		{/if}

		<div class="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
			{#each TERM_STATE_ORDER as key (key)}
				{@const entry = TERM_STATES[key]}
				<span class="inline-flex items-center gap-1.5" title={entry.hint}>
					<span class={['inline-flex size-5 items-center justify-center rounded-full border', entry.chip]}>
						<entry.icon class={['size-3', entry.iconClass]} aria-hidden="true" />
					</span>{entry.label}
				</span>
			{/each}
			<span>· the number is its uses in the city{#if isFood}; open a chip to change it{/if}</span>
		</div>
	{/if}
</AdminPanel>
