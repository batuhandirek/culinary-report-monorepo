<script lang="ts">
	import { Search, X } from '@lucide/svelte';
	import type {
		AdminChangeTermInputDto,
		AdminTermOutputDto,
		AdminTermsOutputDto,
		AdminUpdatedTermOutputDto,
		GetTermsParamsStatusEnum
	} from 'client';

	import { untrack } from 'svelte';

	import { page } from '$app/state';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import TermDecisionEditor from '#components/admin/topics/TermDecisionEditor.svelte';
	import { api } from '#lib/api.js';
	import { topicPageHref } from '#lib/topic-format.js';
	import { edgeLabel } from '#lib/topic-kinds.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every wording the city has seen — a dish named in a review or a post, one of Google's
	// "people often mention" tags — kept as said and pointing at one main topic or none: decided
	// once, by its name when it is a topic's, else by the AI in the nightly pass, else here (an
	// admin's choice is never changed). A wording is its topic (a spelling, a translation) or
	// something narrower under it, with what else it is or has as modifiers; a row's Edit opens its
	// decision (`TermDecisionEditor`). The narrower wordings, grouped by the name the AI would give
	// each as a topic of its own, are the topics in the making: a group becomes one by itself at 15
	// uses from 5 sources, or at once from a wording's editor. A link may open the tab on a status, a
	// search, a topic or a proposal (`?status=linked&topic=pasta`, `?status=all&q=carbonara`).
	interface Props {
		cityId: string;
	}

	let { cityId }: Props = $props();

	const PAGE = 50;
	const STATUSES = [
		{ value: 'unlinked', label: 'Without a topic' },
		{ value: 'linked', label: 'With a topic' },
		{ value: 'pending', label: 'Waiting for the AI' },
		{ value: 'all', label: 'All' }
	] as const;
	type Status = (typeof STATUSES)[number]['value'];
	const initial = untrack(() => page.url.searchParams);
	let status = $state<Status>(STATUSES.find((s) => s.value === initial.get('status'))?.value ?? 'unlinked');
	let q = $state(initial.get('q') ?? '');
	let search = $state(initial.get('q')?.trim() ?? '');
	let proposal = $state<string | null>(initial.get('proposal'));
	let topic = $state<string | null>(initial.get('topic'));

	let data = $state<AdminTermsOutputDto | null>(null);
	let terms = $state<AdminTermOutputDto[]>([]);
	const query = $derived({
		cityId,
		status: status as GetTermsParamsStatusEnum,
		...(search && { q: search }),
		...(proposal && { proposal }),
		...(topic && { topicKey: topic })
	});
	const loader = createLoader(
		(params: typeof query & { offset?: number }) => api.admin.getTerms({ ...params, limit: PAGE }),
		{
			onSuccess: (res) => {
				terms = data && res.terms.length && offset ? [...terms, ...res.terms] : res.terms;
				data = res;
			}
		}
	);
	let offset = 0;
	$effect(() => {
		offset = 0;
		loader.load(query);
	});
	// The search box narrows the list a moment after typing stops
	$effect(() => {
		const value = q.trim();
		const timer = setTimeout(() => (search = value), 300);
		return () => clearTimeout(timer);
	});
	const more = () => {
		offset = terms.length;
		loader.load({ ...query, offset });
	};

	// The topic a `?topic=` filter names, as the row's own data labels it
	const topicLabel = (key: string) =>
		terms.flatMap((t) => [t.topic, ...t.modifiers]).find((t) => t?.key === key)?.label ?? key;

	// The row whose decision is open
	let editing = $state<number | null>(null);
	const merge = (row: AdminTermOutputDto, saved: AdminUpdatedTermOutputDto) =>
		(terms = terms.map((t) => (t.id === row.id ? ({ ...saved, notes: t.notes, tagVenues: t.tagVenues } as AdminTermOutputDto) : t)));
	const changeAction = createAction(
		(row: AdminTermOutputDto, change: AdminChangeTermInputDto) => api.admin.changeTerm(row.id, change),
		{
			onSuccess: (saved, [row]) => {
				merge(row, saved);
				notificationManager.addNotification({
					title: saved.topic
						? `"${row.name}" ${saved.exact ? 'is' : 'is under'} ${saved.topic.label}`
						: saved.decidedBy
							? `"${row.name}" counts for no topic`
							: `"${row.name}" waits for the AI`,
					success: true
				});
			}
		}
	);

	const DECIDED: Record<string, string> = { match: 'by its name', ai: 'by the AI', admin: 'by an admin' };
	const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
	const share = $derived(data?.summary.uses ? Math.round((data.summary.linkedUses / data.summary.uses) * 100) : 0);
</script>

<div class="grid grid-cols-1 items-start gap-5 pb-12 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
	<AdminPanel title="Terms" note={data ? data.total.toLocaleString('en-GB') : undefined}>
		{#if loader.error && !data}
			<ErrorState onRetry={() => loader.load(query)} />
		{:else if !data}
			<SkeletonRows count={8} lines={2} trailing />
		{:else if !data.summary.terms}
			<EmptyState
				title="No wordings yet"
				hint="The city's analysed reviews, posts and Google tags name nothing yet."
				ground="none"
				size="sm" />
		{:else}
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				{plural(data.summary.linkedUses, 'use')} of {data.summary.uses.toLocaleString('en-GB')} — a note naming a wording, a
				venue's Google tag carrying it — count for a topic ({share} %). Each wording is decided once: by its name when it is
				a topic's name, else by the AI in the nightly pass. What you decide here stays.
			</p>
			{#if data.summary.pendingTerms}
				<p class="ink-strip m-0 mb-3 text-sm">
					{plural(data.summary.pendingTerms, 'wording')} {data.summary.pendingTerms === 1 ? 'waits' : 'wait'} for the AI's
					nightly pass (the Data page's "LLM backlogs" runs it sooner).
				</p>
			{/if}
			<div class="mb-3 flex flex-wrap items-center gap-2">
				{#each STATUSES as s (s.value)}
					<button type="button" class="chip text-xs" aria-pressed={status === s.value} onclick={() => (status = s.value)}>
						{s.label}
					</button>
				{/each}
				{#if proposal}
					<button type="button" class="chip text-xs" aria-pressed="true" onclick={() => (proposal = null)}>
						Proposed as "{proposal}" <X class="ml-1 inline size-3" aria-hidden="true" />
					</button>
				{/if}
				{#if topic}
					<button type="button" class="chip text-xs" aria-pressed="true" onclick={() => (topic = null)}>
						{topicLabel(topic)} <X class="ml-1 inline size-3" aria-hidden="true" />
					</button>
				{/if}
				<div class="ml-auto w-56">
					<Input bind:value={q} placeholder="Find a wording" icon={Search} aria-label="Find a wording" class="h-9" />
				</div>
			</div>
			{#if !terms.length}
				<p class="text-muted-foreground m-0 border-t py-3 text-sm">No wording matches.</p>
			{:else}
				<ul class="m-0 list-none p-0">
					{#each terms as row (row.id)}
						<li class="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
							<div class="min-w-0">
								<div class="font-medium">{row.name}</div>
								<div class="text-muted-foreground text-xs">
									{plural(row.notes, 'note')}
									{#if row.tagVenues}
										· in {plural(row.tagVenues, "venue's Google tags", "venues' Google tags")}
									{/if}
									{#if row.topic}
										· {row.exact ? 'is' : 'under'}
										<a class="text-beet underline-offset-2 hover:underline" href={topicPageHref(row.topic.key, row.topic.kind)}>{row.topic.label}</a>{#each row.modifiers as m (m.key)},
											{edgeLabel(m.type)}
											<a class="text-beet underline-offset-2 hover:underline" href={topicPageHref(m.key, m.kind)}>{m.label}</a>{/each}
										{row.decidedBy ? DECIDED[row.decidedBy] : '(provisional, waiting for the AI)'}
									{:else if row.decidedBy}
										· no topic, {DECIDED[row.decidedBy]}
									{:else}
										· waiting for the AI
									{/if}
									{#if row.proposedLabel && !row.exact}
										· as a topic of its own:
										<button type="button" class="text-beet underline-offset-2 hover:underline" onclick={() => (proposal = row.proposedLabel!)}>
											{row.proposedLabel}
										</button>
									{/if}
								</div>
							</div>
							<div class="flex flex-wrap items-center justify-end gap-1.5">
								{#if row.decidedBy === 'admin'}
									<Button
										size="sm"
										variant="ghost"
										title="Back to the name match, else the AI"
										onclick={() => changeAction.execute(row, { auto: true })}>
										Automatic
									</Button>
								{/if}
								{#if !row.decidedBy || row.topic || row.modifiers.length}
									<Button
										size="sm"
										variant="ghost"
										title="Counts for no topic"
										onclick={() => changeAction.execute(row, { topicKey: null })}>
										None
									</Button>
								{/if}
								<Button size="sm" variant="outline" aria-expanded={editing === row.id} onclick={() => (editing = editing === row.id ? null : row.id)}>
									{editing === row.id ? 'Close' : 'Edit'}
								</Button>
							</div>
							{#if editing === row.id}
								<div class="bg-tint rounded-md sm:col-span-2">
									<TermDecisionEditor
										{cityId}
										term={row}
										onSaved={(saved) => {
											merge(row, saved);
											editing = null;
										}} />
								</div>
							{/if}
						</li>
					{/each}
				</ul>
				{#if terms.length < data.total}
					<Button size="sm" variant="ghost" class="mt-2" loading={loader.loading} onclick={more}>
						Show {Math.min(PAGE, data.total - terms.length)} more of {data.total.toLocaleString('en-GB')}
					</Button>
				{/if}
			{/if}
		{/if}
	</AdminPanel>

	<AdminPanel title="Topics in the making" note={data?.proposals.length || undefined}>
		{#if !data}
			<SkeletonRows count={6} lines={2} trailing />
		{:else if !data.proposals.length}
			<EmptyState
				title="No narrower wordings yet"
				hint="A wording that is something narrower than its topic is named here as the topic it would be."
				ground="none"
				size="sm" />
		{:else}
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				The city's narrower wordings, under the name the AI gives each as a topic of its own, whatever the spelling. A group
				becomes a topic by itself once it is used 15 times in 5 sources (across every city); a wording's Edit makes it one now.
			</p>
			<ul class="m-0 list-none p-0">
				{#each data.proposals as s (s.label)}
					<li class="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
						<div class="min-w-0">
							<div class="font-medium">{s.label}</div>
							<div class="text-muted-foreground truncate text-xs" title={s.examples.join(', ')}>
								{plural(s.terms, 'wording')} · {plural(s.uses, 'use')} — {s.examples.join(', ')}
							</div>
						</div>
						<Button
							size="sm"
							variant="ghost"
							onclick={() => {
								status = 'all';
								proposal = s.label;
							}}>
							Wordings
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</AdminPanel>
</div>
