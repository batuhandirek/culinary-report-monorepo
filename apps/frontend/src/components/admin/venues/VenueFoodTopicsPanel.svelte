<script lang="ts">
	import { X } from '@lucide/svelte';
	import type {
		AdminChangeVenueFoodTopicInputDto,
		AdminVenueFoodTopicsOutputDto,
		AdminVenueOutputDto
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Select from '#ui/wrapped/Select.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The kinds of food the venue is tagged with: from its Google categories, what posts by others
	// call its food, its delivery menu and Google's review tags, worked out on every read, with an
	// admin's tags and exclusions on top.
	// Competitor suggestions compare these.
	interface Props {
		venue: AdminVenueOutputDto;
	}

	let { venue }: Props = $props();

	let data = $state<AdminVenueFoodTopicsOutputDto | null>(null);
	const loader = createAutoLoader(api.admin.getVenueFoodTopics, [venue.id], {
		onSuccess: (res) => (data = res)
	});

	// Every topic, for "Add a topic"
	let allTopics = $state<{ value: string; label: string }[]>([]);
	createAutoLoader(api.admin.getFoodTopics, [{ cityId: venue.city.id }], {
		onSuccess: (res) =>
			(allTopics = res.topics
				.map((t) => ({ value: t.key, label: t.label }))
				.sort((a, b) => a.label.localeCompare(b.label)))
	});
	const addable = $derived(allTopics.filter((t) => !data?.tags.some((tag) => tag.key === t.value)));
	let picked = $state<string | undefined>();

	const SOURCE: Record<string, string> = {
		category: 'Google',
		mentions: 'posts',
		menu: 'menu',
		reviews: 'review tags',
		manual: 'admin'
	};
	// Sources whose score is a share of the venue's posts, menu items or review tags
	const SHARED = new Set(['mentions', 'menu', 'reviews']);
	const changeAction = createAction(
		(key: string, change: 'tag' | 'exclude' | 'clear') =>
			api.admin.changeVenueFoodTopic(venue.id, key, {
				change: change as AdminChangeVenueFoodTopicInputDto['change']
			}),
		{
			onSuccess: (res) => {
				data = res;
				picked = undefined;
			}
		}
	);
</script>

<AdminPanel title="Food topics" note={data ? `${data.tags.length}` : undefined}>
	{#if loader.error && !data}
		<ErrorState onRetry={() => loader.load(venue.id)} />
	{:else if !data}
		<SkeletonRows count={2} lines={1} />
	{:else}
		{#if data.tags.length}
			<ul class="m-0 flex list-none flex-wrap gap-2 p-0">
				{#each data.tags as tag (tag.key)}
					<li
						class="border-line bg-paper flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-3 text-sm {tag.primary
							? 'border-ink bg-tint'
							: ''}">
						<span class="font-medium">{tag.label}</span>
						<span class="text-muted-foreground text-xs">
							{SOURCE[tag.source]}{SHARED.has(tag.source) ? ` ${Math.round(tag.score * 100)}%` : ''}
						</span>
						<IconButton
							icon={X}
							size="icon-sm"
							variant="ghost"
							label={tag.source === 'manual' ? `Remove ${tag.label}` : `Not ${tag.label}`}
							onclick={() => changeAction.execute(tag.key, tag.source === 'manual' ? 'clear' : 'exclude')} />
					</li>
				{/each}
			</ul>
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Framed: the kind of food it is known for. × on a tag that isn't an admin's keeps it off for good.
			</p>
		{:else}
			<p class="text-muted-foreground m-0 text-sm">
				Neither its Google categories, its posts, its menu nor its review tags say what it serves. Add a topic below.
			</p>
		{/if}

		{#if data.excluded.length}
			<p class="text-muted-foreground m-0 mt-3 text-sm">
				Kept off:
				{#each data.excluded as e, i (e.key)}
					{e.label}
					<button
						type="button"
						class="text-beet underline-offset-2 hover:underline"
						onclick={() => changeAction.execute(e.key, 'clear')}>
						undo
					</button>{i < data.excluded.length - 1 ? ', ' : ''}
				{/each}
			</p>
		{/if}

		<div class="mt-4 flex gap-2">
			<Select items={addable} bind:value={picked} placeholder="Add a topic…" aria-label="Topic to add" size="sm" width={220} />
			<Button
				size="sm"
				variant="outline"
				disabled={!picked}
				loading={changeAction.executing}
				onclick={() => picked && changeAction.execute(picked, 'tag')}>
				Add
			</Button>
		</div>
	{/if}
</AdminPanel>
