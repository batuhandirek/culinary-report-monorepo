<script lang="ts">
	import { Search, X } from '@lucide/svelte';
	import type { AdminDishNameOutputDto, AdminDishNamesOutputDto, GetDishNamesParamsStatusEnum } from 'client';

	import { untrack } from 'svelte';

	import { page } from '$app/state';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { topicHref } from '#lib/topic-format.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The dish and drink names the city's reviews and posts use, each with the food topic its notes
	// count for: decided once, by its name when it is a topic or one of its other names, else by the
	// AI in the nightly pass, else here (an admin's choice is never changed). The AI's suggested
	// topics for names no topic fits are the topics missing; creating one links those names at once.
	// A link may open it on a status, a search, a topic or a suggestion (`?status=linked&topic=pasta`,
	// `?status=all&q=carbonara`: a topic page's names)
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

	let data = $state<AdminDishNamesOutputDto | null>(null);
	let names = $state<AdminDishNameOutputDto[]>([]);
	const query = $derived({
		cityId,
		status: status as GetDishNamesParamsStatusEnum,
		...(search && { q: search }),
		...(suggestion && { suggestion }),
		...(topic && { topicKey: topic })
	});
	const loader = createLoader(
		(params: typeof query & { offset?: number }) => api.admin.getDishNames({ ...params, limit: PAGE }),
		{
			onSuccess: (res) => {
				names = data && res.names.length && offset ? [...names, ...res.names] : res.names;
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
		offset = names.length;
		loader.load({ ...query, offset });
	};

	// Dish and drink topics only: what a name can count for
	let topicItems = $state<{ value: string; label: string }[]>([]);
	$effect(() => {
		api.admin.getTopics({ cityId }).then((res) => {
			topicItems = res.topics
				.filter((t) => t.kind === 'dish' || t.kind === 'drink')
				.map((t) => ({ value: t.key, label: t.label }))
				.sort((a, b) => a.label.localeCompare(b.label));
		});
	});
	const AUTO = '__auto';
	const NONE = '__none';
	const itemsFor = (row: AdminDishNameOutputDto) => [
		...(row.decidedBy === 'admin' ? [{ value: AUTO, label: 'Automatic (by name, else the AI)' }] : []),
		{ value: NONE, label: 'No topic' },
		...topicItems
	];
	const valueOf = (row: AdminDishNameOutputDto) => row.foodTopic?.key ?? (row.decidedBy ? NONE : undefined);

	const changeAction = createAction(
		(row: AdminDishNameOutputDto, value: string) =>
			api.admin.updateDishName(row.id, value === AUTO ? { auto: true } : { topicKey: value === NONE ? null : value }),
		{
			onSuccess: (saved, [row]) => {
				names = names.map((n) =>
					n.id === row.id ? ({ ...n, foodTopic: saved.foodTopic, decidedBy: saved.decidedBy } as AdminDishNameOutputDto) : n
				);
				notificationManager.addNotification({
					title: saved.foodTopic
						? `"${row.name}" counts as ${saved.foodTopic.label}`
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
	const share = $derived(data?.summary.notes ? Math.round((data.summary.linkedNotes / data.summary.notes) * 100) : 0);
</script>

<div class="grid grid-cols-1 items-start gap-5 pb-12 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
	<AdminPanel title="Dish names" note={data ? data.total.toLocaleString('en-GB') : undefined}>
		{#if loader.error && !data}
			<ErrorState onRetry={() => loader.load(query)} />
		{:else if !data}
			<SkeletonRows count={8} lines={2} trailing />
		{:else if !data.summary.names}
			<EmptyState
				title="No dish names yet"
				hint="The city's analysed reviews and posts name no dish or drink."
				ground="none"
				size="sm" />
		{:else}
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				{plural(data.summary.linkedNotes, 'note')} of {data.summary.notes.toLocaleString('en-GB')} naming a dish count for a
				food topic ({share} %). Each name is sorted once: by its name when it is a topic or one of its other names, else by
				the AI in the nightly pass. A topic you pick here stays.
			</p>
			{#if data.summary.pendingNames}
				<p class="ink-strip m-0 mb-3 text-sm">
					{plural(data.summary.pendingNames, 'name')} {data.summary.pendingNames === 1 ? 'waits' : 'wait'} for the AI's nightly
					pass (the Data page's "LLM backlogs" runs it sooner).
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
						{topicItems.find((t) => t.value === topic)?.label ?? topic} <X class="ml-1 inline size-3" aria-hidden="true" />
					</button>
				{/if}
				<div class="ml-auto w-56">
					<Input bind:value={q} placeholder="Find a name" icon={Search} aria-label="Find a dish name" class="h-9" />
				</div>
			</div>
			{#if !names.length}
				<p class="text-muted-foreground m-0 border-t py-3 text-sm">No name matches.</p>
			{:else}
				<ul class="m-0 list-none p-0">
					{#each names as row (row.id)}
						<li class="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
							<div class="min-w-0">
								<div class="font-medium">{row.name}</div>
								<div class="text-muted-foreground text-xs">
									{plural(row.notes, 'note')}
									{#if row.foodTopic}
										· <a class="text-beet underline-offset-2 hover:underline" href={topicHref(row.foodTopic.key)}>{row.foodTopic.label}</a>
										{row.decidedBy ? DECIDED[row.decidedBy] : ''}
									{:else if row.decidedBy}
										· no topic, {DECIDED[row.decidedBy]}
									{:else}
										· waiting for the AI
									{/if}
									{#if row.suggestion && !row.foodTopic}
										· AI suggests a new topic:
										<button type="button" class="text-beet underline-offset-2 hover:underline" onclick={() => (suggestion = row.suggestion!)}>
											{row.suggestion}
										</button>
									{/if}
								</div>
							</div>
							<Select
								items={itemsFor(row)}
								value={valueOf(row)}
								placeholder="Pick a topic"
								aria-label={`Topic of "${row.name}"`}
								size="sm"
								width={200}
								onValueChange={(v) => v && v !== valueOf(row) && changeAction.execute(row, v)} />
						</li>
					{/each}
				</ul>
				{#if names.length < data.total}
					<Button size="sm" variant="ghost" class="mt-2" loading={loader.loading} onclick={more}>
						Show {Math.min(PAGE, data.total - names.length)} more of {data.total.toLocaleString('en-GB')}
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
				title="Every name fits a topic"
				hint="The AI suggests a topic when a dish or drink name fits none."
				ground="none"
				size="sm" />
		{:else}
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				Dishes and drinks with no topic yet, as the AI named them. Creating one links its names at once; the AI looks at
				the other names without a topic again in its next pass.
			</p>
			<ul class="m-0 list-none p-0">
				{#each data.suggestions as s (s.label)}
					<li class="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
						<div class="min-w-0">
							<div class="font-medium">{s.label}</div>
							<div class="text-muted-foreground truncate text-xs" title={s.examples.join(', ')}>
								{plural(s.names, 'name')} · {plural(s.notes, 'note')} — {s.examples.join(', ')}
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
								Names
							</Button>
							<Button size="sm" variant="outline" onclick={() => onNewTopic(s.label, 'dish')}>Create topic</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</AdminPanel>
</div>
