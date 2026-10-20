<script lang="ts">
	import { Search } from '@lucide/svelte';
	import type { AdminFoodTopicOutputDto, AdminFoodTopicsOutputDto, AdminTrendsTopicOutputDto } from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import Button from '#ui/wrapped/Button.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// Words posts give a venue's food, or food venues' Google categories, that no topic knows: each
	// with the venues it was said of, so its meaning is clear before it joins a topic ("Add") or
	// becomes one ("New"). A word left here counts for nothing in trends, tags or competitors
	interface Props {
		cityId: string;
		onNewTopic: (label: string) => void;
		/** Bumped by the page after a topic is saved, to reload */
		version: number;
	}

	let { cityId, onNewTopic, version }: Props = $props();

	let data = $state<AdminFoodTopicsOutputDto | null>(null);
	const loader = createLoader((query: { cityId: string }) => api.admin.getFoodTopics(query), {
		onSuccess: (res) => (data = res)
	});
	$effect(() => {
		void version;
		if (cityId) loader.load({ cityId });
	});

	const SHOWN = 15;
	let all = $state(false);
	const topicItems = $derived(
		(data?.topics ?? []).map((t) => ({ value: t.id, label: t.label })).sort((a, b) => a.label.localeCompare(b.label))
	);

	let mapTo = $state<Record<string, string>>({});
	const mapAction = createAction(
		(topic: AdminFoodTopicOutputDto, key: string) =>
			api.admin.updateFoodTopic(topic.id, { aliases: [...topic.aliases, key] }),
		{
			onSuccess: (saved) => {
				notificationManager.addNotification({ title: `Now counts as ${saved.label}`, success: true });
				loader.load({ cityId });
			}
		}
	);

	// "No kind of food" (supermarket, takeout): off the list in every city, undone from the toast
	const ignoreAction = createAction(
		(word: string, ignored: boolean) => api.admin.setIgnoredWord({ word, ignored }),
		{
			onSuccess: () => loader.load({ cityId }),
			successNotification: (_res, [word, ignored]) =>
				ignored
					? {
							title: `Dismissed "${word}"`,
							success: true,
							action: { label: 'Undo', onClick: () => ignoreAction.execute(word, false) }
						}
					: { title: `"${word}" is back`, success: true }
		}
	);

	// Google Trends ids for some words, from Trends' autocomplete
	let lookupQ = $state('');
	let suggestions = $state<AdminTrendsTopicOutputDto[] | null>(null);
	const lookupAction = createAction((q: string) => api.admin.lookupTrendsTopics({ q }), {
		onSuccess: (res) => (suggestions = res.topics)
	});
	const copy = async (id: string) => {
		await navigator.clipboard.writeText(id);
		notificationManager.addNotification({ title: `Copied ${id}`, success: true });
	};
	const trendsUrl = (id: string) => `https://trends.google.com/trends/explore?cat=71&q=${encodeURIComponent(id)}`;
</script>

<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
	<AdminPanel title="Unrecognised words" note={data ? `${data.unmapped.length}` : undefined}>
		{#if loader.error && !data}
			<ErrorState onRetry={() => loader.load({ cityId })} />
		{:else if !data}
			<SkeletonRows count={6} lines={2} trailing />
		{:else if !data.unmapped.length}
			<EmptyState
				title="Every word maps to a topic"
				hint="What posts call each venue's food and its Google categories all count somewhere."
				ground="none"
				size="sm" />
		{:else}
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				Until a word maps, posts and venues using it count for no topic. Add it to the topic it means, make it a
				topic, or dismiss it when it is no kind of food ("supermarket", "takeout").
			</p>
			<ul class="m-0 list-none p-0">
				{#each all ? data.unmapped : data.unmapped.slice(0, SHOWN) as row (row.key)}
					<li class="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-t py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
						<div class="min-w-0">
							<div class="font-medium">{row.key}</div>
							<div
								class="text-muted-foreground truncate text-xs"
								title={row.examples.length ? row.examples.join(', ') : undefined}>
								{[row.mentions && `${row.mentions} posts`, row.venues && `${row.venues} venues`].filter(Boolean).join(' · ')}
								{#if row.examples.length}— {row.examples.join(', ')}{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Select
								items={topicItems}
								bind:value={mapTo[row.key]}
								placeholder="Means…"
								aria-label={`Topic "${row.key}" means`}
								size="sm"
								width={160} />
							<Button
								size="sm"
								variant="outline"
								disabled={!mapTo[row.key]}
								loading={mapAction.executing}
								onclick={() => {
									const topic = data?.topics.find((t) => t.id === mapTo[row.key]);
									if (topic) mapAction.execute(topic, row.key);
								}}>
								Add
							</Button>
							<Button size="sm" variant="ghost" onclick={() => onNewTopic(row.key)}>New topic</Button>
							<Button
								size="sm"
								variant="ghost"
								loading={ignoreAction.executing}
								onclick={() => ignoreAction.execute(row.key, true)}>
								Dismiss
							</Button>
						</div>
					</li>
				{/each}
			</ul>
			{#if data.unmapped.length > SHOWN}
				<Button size="sm" variant="ghost" class="mt-2" onclick={() => (all = !all)}>
					{all ? 'Show fewer' : `Show all ${data.unmapped.length}`}
				</Button>
			{/if}
		{/if}
	</AdminPanel>

	<AdminPanel title="Find a Google Trends id">
		<p class="text-muted-foreground m-0 mb-3 text-sm">
			For a new topic: Google searches a topic by its id in every language ("vietnamesisch essen" and "vietnamese
			restaurant" both count for Vietnamese cuisine). Pick a cuisine, dish or food, not a restaurant somewhere else.
		</p>
		<form
			class="flex gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				if (lookupQ.trim().length >= 2) lookupAction.execute(lookupQ.trim());
			}}>
			<Input bind:value={lookupQ} placeholder="vietnamese cuisine" icon={Search} aria-label="Words to look up" />
			<Button type="submit" variant="outline" loading={lookupAction.executing}>Look up</Button>
		</form>
		{#if suggestions}
			{#if !suggestions.length}
				<p class="text-muted-foreground m-0 mt-3 text-sm">Google suggests nothing for these words.</p>
			{:else}
				<ul class="m-0 mt-3 list-none p-0 text-sm">
					{#each suggestions as s (s.id)}
						<li class="flex items-center justify-between gap-3 border-t py-1.5">
							<span class="min-w-0">
								<span class="font-medium">{s.title}</span>
								<span class="text-muted-foreground ml-1 text-xs">{s.type || 'Topic'}</span>
							</span>
							<span class="flex shrink-0 items-center gap-2">
								<a class="text-beet text-xs tabular-nums" href={trendsUrl(s.id)} target="_blank" rel="noreferrer">{s.id}</a>
								<Button size="sm" variant="ghost" onclick={() => copy(s.id)}>Copy</Button>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</AdminPanel>
</div>
