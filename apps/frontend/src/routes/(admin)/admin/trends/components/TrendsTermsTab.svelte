<script lang="ts">
	import { Search, X } from '@lucide/svelte';
	import type { AdminChangeTermInputDto, AdminTermOutputDto, AdminTermsOutputDto, AdminTopicOutputDto, GetTermsParamsStatusEnum } from 'client';

	import { untrack } from 'svelte';

	import { page } from '$app/state';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { topicHref } from '#lib/topic-format.js';
	import { KIND_ITEMS, kindLabel } from '#lib/topic-kinds.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import ResponsiveMultiCombobox from '#ui/wrapped/ResponsiveMultiCombobox.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Every wording the city has seen — a dish named in a review or a post, one of Google's
	// "people often mention" tags, an alias — kept as said and linked to zero, one or many topics
	// of any kind (food and aspects alike): decided once, by its name when it is a topic or one of
	// its aliases, else by the AI in the nightly pass, else here (an admin's choice is never
	// changed). The AI's suggested topics for wordings no topic fits are the topics missing;
	// creating one links those wordings at once. A link may open it on a status, a search, a topic
	// or a suggestion (`?status=linked&topic=pasta`, `?status=all&q=carbonara`: a topic page's wordings)
	interface Props {
		cityId: string;
		/** Bumped by the page after a topic is saved, to reload */
		version: number;
		onNewTopic: (label: string, kind: 'dish' | 'drink') => void;
	}

	let { cityId, version, onNewTopic }: Props = $props();

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
	let suggestion = $state<string | null>(initial.get('suggestion'));
	let topic = $state<string | null>(initial.get('topic'));

	let data = $state<AdminTermsOutputDto | null>(null);
	let terms = $state<AdminTermOutputDto[]>([]);
	const query = $derived({
		cityId,
		status: status as GetTermsParamsStatusEnum,
		...(search && { q: search }),
		...(suggestion && { suggestion }),
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
		void version;
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

	// Every topic of the city, each labelled with its kind, the kinds of food first and the
	// aspects last: what a wording can be linked to
	let topics = $state<AdminTopicOutputDto[]>([]);
	$effect(() => {
		api.admin.getTopics({ cityId }).then((res) => (topics = res.topics));
	});
	const kindOrder = (kind: string) => {
		const i = KIND_ITEMS.findIndex((k) => k.value === kind);
		return i < 0 ? KIND_ITEMS.length : i;
	};
	const topicItems = $derived(
		[...topics]
			.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.label.localeCompare(b.label))
			.map((t) => ({ value: t.key, label: `${t.label} · ${kindLabel(t.kind)}` }))
	);
	const topicLabel = (key: string) => topics.find((t) => t.key === key)?.label ?? key;

	const changeAction = createAction(
		(row: AdminTermOutputDto, change: AdminChangeTermInputDto) => api.admin.changeTerm(row.id, change),
		{
			onSuccess: (saved, [row]) => {
				terms = terms.map((t) =>
					t.id === row.id
						? ({ ...t, topics: saved.topics, decidedBy: saved.decidedBy, suggestion: saved.suggestion } as AdminTermOutputDto)
						: t
				);
				notificationManager.addNotification({
					title: saved.topics.length
						? `"${row.name}" counts as ${saved.topics.map((t) => t.label).join(', ')}`
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
				venue's Google tag carrying it — count for a topic ({share} %). Each wording is sorted once: by its name when it is
				a topic or one of its aliases, else by the AI in the nightly pass. Topics you pick here stay.
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
				{#if suggestion}
					<button type="button" class="chip text-xs" aria-pressed="true" onclick={() => (suggestion = null)}>
						AI suggests "{suggestion}" <X class="ml-1 inline size-3" aria-hidden="true" />
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
									{#if row.topics.length}
										·
										{#each row.topics as t, i (t.key)}
											{i ? ', ' : ''}<a class="text-beet underline-offset-2 hover:underline" href={topicHref(t.key)}>{t.label}</a>
										{/each}
										{row.decidedBy ? DECIDED[row.decidedBy] : ''}
									{:else if row.decidedBy}
										· no topic, {DECIDED[row.decidedBy]}
									{:else}
										· waiting for the AI
									{/if}
									{#if row.suggestion && !row.topics.length}
										· AI suggests a new topic:
										<button type="button" class="text-beet underline-offset-2 hover:underline" onclick={() => (suggestion = row.suggestion!)}>
											{row.suggestion}
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
								{#if !row.decidedBy || row.topics.length}
									<Button
										size="sm"
										variant="ghost"
										title="Counts for no topic"
										onclick={() => changeAction.execute(row, { topicKeys: [] })}>
										None
									</Button>
								{/if}
								<div class="w-56">
									<ResponsiveMultiCombobox
										items={topicItems}
										selected={row.topics.map((t) => t.key)}
										placeholder="Pick topics"
										title={`Topics of "${row.name}"`}
										class="h-9"
										onChange={(keys) => changeAction.execute(row, { topicKeys: (keys ?? []).map(String) })} />
								</div>
							</div>
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

	<AdminPanel title="Topics the AI would add" note={data?.suggestions.length || undefined}>
		{#if !data}
			<SkeletonRows count={6} lines={2} trailing />
		{:else if !data.suggestions.length}
			<EmptyState
				title="Every wording fits a topic"
				hint="The AI suggests a topic when a wording fits none."
				ground="none"
				size="sm" />
		{:else}
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				Wordings with no topic yet, under the topic the AI named for them. Creating one links its wordings at once; the AI
				looks at the other wordings without a topic again in its next pass.
			</p>
			<ul class="m-0 list-none p-0">
				{#each data.suggestions as s (s.label)}
					<li class="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
						<div class="min-w-0">
							<div class="font-medium">{s.label}</div>
							<div class="text-muted-foreground truncate text-xs" title={s.examples.join(', ')}>
								{plural(s.terms, 'wording')} · {plural(s.uses, 'use')} — {s.examples.join(', ')}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Button
								size="sm"
								variant="ghost"
								onclick={() => {
									status = 'all';
									suggestion = s.label;
								}}>
								Wordings
							</Button>
							<Button size="sm" variant="outline" onclick={() => onNewTopic(s.label, 'dish')}>Create topic</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</AdminPanel>
</div>
