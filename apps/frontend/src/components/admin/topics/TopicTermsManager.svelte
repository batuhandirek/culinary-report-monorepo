<script lang="ts">
	import { ArrowUpRight, Link2, Search, Unlink } from '@lucide/svelte';

	import {
		type AdminChangeTermInputDto,
		type AdminCreateTopicInputDtoKindEnum,
		type AdminTermOutputDto,
		type AdminTermsOutputDto,
		type GetTermsParamsStatusEnum
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { topicPageHref } from '#lib/topic-format.js';
	import { DECIDED_LABELS, FOOD_KIND_ITEMS, kindLabel, RELATION_ITEMS } from '#lib/topic-kinds.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import ResponsivePopover from '#ui/wrapped/ResponsivePopover.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The wordings that count for one topic (food or aspect), read at a glance: a chip each with
	// its uses in the city, grouped by how it is the topic (same, a finer kind, with it), its border
	// saying who decided (ink: an admin, plain: the AI, dashed: its name). A chip opens what can be
	// done with it: change the relation, unlink, open it in Terms, or, for a kind of food, make it a
	// topic of its own under this one (a dish by default: "menemen" under Turkish), its uses then
	// counting there and, through the parent, still here. Every write is an admin's decision
	// (`PATCH /admin/terms/:id`), final for the AI. Another wording the city used is linked from the search.
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

	type Relation = (typeof RELATION_ITEMS)[number]['value'];
	const relationOf = (row: AdminTermOutputDto): Relation => row.topics.find((t) => t.key === topic.key)?.relation ?? 'same';
	const uses = (row: AdminTermOutputDto) => row.notes + row.tagVenues;
	const groups = $derived(
		RELATION_ITEMS.map((r) => ({
			...r,
			rows: rows.filter((row) => relationOf(row) === r.value).sort((a, b) => uses(b) - uses(a) || a.name.localeCompare(b.name))
		})).filter((g) => g.rows.length)
	);

	/** The term's links as the API takes them, with this topic's changed, dropped or swapped for another */
	const change = (row: AdminTermOutputDto, next: { drop?: true; add?: true; relation?: Relation; swapTo?: string }): AdminChangeTermInputDto => {
		const keep = row.topics.filter((t) => !((next.drop || next.swapTo) && t.key === topic.key));
		const keys = keep.map((t) => t.key);
		const relations: Record<string, string> = Object.fromEntries(keep.map((t) => [t.key, t.relation]));
		if (next.add && !keys.includes(topic.key)) keys.push(topic.key);
		if (next.relation || next.add) relations[topic.key] = next.relation ?? 'same';
		if (next.swapTo) {
			keys.unshift(next.swapTo);
			relations[next.swapTo] = 'same';
		}
		return { topicKeys: keys, relations: relations as AdminChangeTermInputDto['relations'] };
	};

	// The chip whose card is open, and what its "make it a topic" row holds
	const capitalized = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);
	let opened = $state<number | null>(null);
	let newLabel = $state('');
	let newKind = $state<string>('dish');
	const open = (row: AdminTermOutputDto | null) => {
		opened = row?.id ?? null;
		if (row) {
			newLabel = capitalized(row.name);
			newKind = 'dish';
		}
	};

	const changeAction = createAction(
		(row: AdminTermOutputDto, body: AdminChangeTermInputDto) => api.admin.changeTerm(row.id, body),
		{
			onSuccess: (saved, [row]) => {
				const linked = saved.topics.some((t) => t.key === topic.key);
				rows = linked
					? rows.map((r) => (r.id === row.id ? ({ ...r, topics: saved.topics, decidedBy: saved.decidedBy } as AdminTermOutputDto) : r))
					: rows.filter((r) => r.id !== row.id);
				if (!linked) opened = null;
				notificationManager.addNotification({
					title: linked
						? `"${row.name}" saved`
						: saved.topics.length
							? `"${row.name}" no longer counts for ${topic.label}`
							: `"${row.name}" now counts for no topic`,
					success: true
				});
			}
		}
	);

	// A wording made a topic of its own under this one: the topic is created, the wording linked to
	// it as the same thing in this topic's place (its other links kept), so its uses count for the
	// new topic and, through it, still for this one
	const promoteAction = createAction(
		async (row: AdminTermOutputDto) => {
			const created = await api.admin.createTopic({
				label: newLabel.trim(),
				kind: newKind as AdminCreateTopicInputDtoKindEnum,
				parentKey: topic.key
			});
			await api.admin.changeTerm(row.id, change(row, { swapTo: created.key }));
			return created;
		},
		{
			onSuccess: (created, [row]) => {
				rows = rows.filter((r) => r.id !== row.id);
				opened = null;
				onTopicsChanged?.();
				notificationManager.addNotification({
					title: `${created.label} is a ${kindLabel(created.kind).toLowerCase()} under ${topic.label}`,
					text: `"${row.name}" counts for it now.`,
					success: true
				});
			}
		}
	);
	const isFood = $derived(topic.kind !== 'aspect');

	// Link another wording the city has seen: found by its name
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
	const linkAction = createAction((row: AdminTermOutputDto) => api.admin.changeTerm(row.id, change(row, { add: true })), {
		onSuccess: (_saved, [row]) => {
			notificationManager.addNotification({ title: `"${row.name}" now counts for ${topic.label}`, success: true });
			q = '';
			reload();
		}
	});

	const n = (v: number) => v.toLocaleString('en-GB');
	const plural = (v: number, one: string, many = `${one}s`) => `${n(v)} ${v === 1 ? one : many}`;
	const termsTabHref = (name: string) => `/admin/trends?${new URLSearchParams({ tab: 'terms', cityId, status: 'all', q: name })}`;
	const DECIDER_RING: Record<string, string> = { admin: 'border-ink', ai: 'border-line', match: 'border-line border-dashed' };
	const GROUP_NOTE: Record<Relation, string> = {
		same: 'spellings and translations',
		kind_of: 'finer kinds',
		with: 'an attribute or an ingredient'
	};
	const KIND_OPTIONS = FOOD_KIND_ITEMS.map((k) => ({ value: k.value, label: k.label }));
</script>

<AdminPanel title="Wordings" note={data ? `${n(data.total)} in the city` : undefined}>
	{#snippet action()}
		<div class="relative w-60">
			<Input bind:value={q} placeholder="Link a wording…" icon={Search} aria-label="Link a wording the city has used" class="h-9" />
			{#if search.length >= 2}
				<div class="bg-paper border-line shadow-sticker absolute top-10 right-0 z-20 w-80 rounded-md border p-1">
					{#if !found.length}
						<p class="text-muted-foreground m-0 p-2 text-sm">No wording the city used matches "{search}".</p>
					{:else}
						{#each found as row (row.id)}
							{@const linked = row.topics.some((t) => t.key === topic.key)}
							<button
								type="button"
								class="hover:bg-wash flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm disabled:opacity-50"
								disabled={linked || linkAction.executing}
								onclick={() => linkAction.execute(row)}>
								<span class="min-w-0 truncate">
									{row.name}
									<span class="text-muted-foreground text-xs">
										{n(uses(row))} · {row.topics.length ? row.topics.map((t) => t.label).join(', ') : row.decidedBy ? 'no topic' : 'undecided'}
									</span>
								</span>
								{#if linked}<span class="text-muted-foreground text-xs">linked</span>{:else}<Link2 class="size-3.5 shrink-0" />{/if}
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
			<p class="text-muted-foreground m-0 text-sm">No wording in the city's claims or Google tags counts for {topic.label} yet. Link one above.</p>
		{/if}
		<div class="flex flex-col gap-3">
			{#each groups as group (group.value)}
				<div class="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
					<div class="pt-1">
						<p class="m-0 text-sm font-semibold">{group.label} <span class="text-muted-foreground font-normal tabular-nums">{group.rows.length}</span></p>
						<p class="text-muted-foreground m-0 text-xs">{GROUP_NOTE[group.value]}</p>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each group.rows as row (row.id)}
							{@const others = row.topics.filter((t) => t.key !== topic.key)}
							<span class={['bg-paper hover:bg-wash inline-flex h-8 items-center rounded-full border text-sm', DECIDER_RING[row.decidedBy ?? 'ai']]}>
								<ResponsivePopover
									open={opened === row.id}
									onOpenChange={(o) => open(o ? row : null)}
									title={row.name}
									hideHeader="popover"
									align="start"
									class="w-[26rem] max-w-[calc(100vw-2rem)] p-0">
									{#snippet trigger()}
										<span class="inline-flex h-8 items-center gap-1.5 px-3">
											<span class="max-w-48 truncate">{row.name}</span>
											<span class="text-muted-foreground text-xs tabular-nums">{n(uses(row))}</span>
										</span>
									{/snippet}
									<div class="flex flex-col text-sm">
										<!-- What it is -->
										<div class="px-4 pt-4 pb-3">
											<div class="flex items-baseline justify-between gap-3">
												<p class="m-0 min-w-0 truncate text-base font-semibold" title={row.name}>{row.name}</p>
												<span class="text-muted-foreground shrink-0 text-xs tabular-nums">{n(uses(row))} uses</span>
											</div>
											<p class="text-muted-foreground m-0 mt-0.5 text-xs">
												{plural(row.notes, 'claim')}{row.tagVenues ? `, ${plural(row.tagVenues, "venue's Google tags", "venues' Google tags")}` : ''}.
												Decided by {DECIDED_LABELS[row.decidedBy ?? ''] ?? 'nobody yet'}.
											</p>
											{#if others.length}
												<p class="m-0 mt-1 text-xs">
													Also counts for{#each others as t, i (t.key)}{i ? ',' : ''}
														<a href={topicPageHref(t.key, t.kind)}>{t.label}</a>{/each}
												</p>
											{/if}
										</div>

										<!-- How it is this topic -->
										<div class="border-line border-t px-4 py-3">
											<p class="text-muted-foreground m-0 mb-1.5 text-xs">How it is {topic.label}</p>
											<div class="border-line grid grid-cols-3 overflow-hidden rounded-md border" role="radiogroup" aria-label={`How "${row.name}" is ${topic.label}`}>
												{#each RELATION_ITEMS as r, i (r.value)}
													{@const on = relationOf(row) === r.value}
													<button
														type="button"
														role="radio"
														aria-checked={on}
														title={r.hint}
														disabled={changeAction.executing}
														class={['h-9 text-sm whitespace-nowrap', i > 0 && 'border-line border-l', on ? 'bg-ink text-paper font-medium' : 'hover:bg-wash']}
														onclick={() => !on && changeAction.execute(row, change(row, { relation: r.value }))}>
														{r.label}
													</button>
												{/each}
											</div>
											<p class="text-muted-foreground m-0 mt-1.5 text-xs">{RELATION_ITEMS.find((r) => r.value === relationOf(row))?.hint}</p>
										</div>

										<!-- A topic of its own -->
										{#if isFood}
											<form
												class="border-line border-t px-4 py-3"
												onsubmit={(e) => {
													e.preventDefault();
													if (newLabel.trim()) promoteAction.execute(row);
												}}>
												<p class="text-muted-foreground m-0 mb-1.5 text-xs">Make it a topic of its own under {topic.label}</p>
												<div class="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
													<Input bind:value={newLabel} aria-label="New topic's name" class="h-9" />
													<Select items={KIND_OPTIONS} bind:value={newKind} size="sm" aria-label="New topic's type" />
												</div>
												<Button size="sm" type="submit" class="mt-2 w-full" loading={promoteAction.executing} disabled={!newLabel.trim()}>
													Create {kindLabel(newKind).toLowerCase()}
												</Button>
											</form>
										{/if}

										<div class="border-line flex items-center justify-between gap-2 border-t px-2 py-1.5">
											<Button size="sm" variant="ghost" icon={Unlink} onclick={() => changeAction.execute(row, change(row, { drop: true }))}>
												Unlink from {topic.label}
											</Button>
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

		<p class="text-muted-foreground m-0 mt-4 text-xs">
			The number is its uses in the city. Ink border: an admin decided; dashed: its name matched; plain: the AI.
			{#if isFood}Open a chip to make it a topic of its own.{/if}
		</p>
	{/if}
</AdminPanel>
