<script lang="ts">
	import { UtensilsCrossed, X } from '@lucide/svelte';
	import type {
		AdminChangeVenueTopicInputDto,
		AdminVenueOutputDto,
		AdminVenueTopicsOutputDto
	} from 'client';

	import DetailCard from '#components/admin/detail/DetailCard.svelte';
	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createAutoLoader } from '#ui/lib/loader.svelte.js';
	import { cn } from '#ui/lib/utils.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonRows from '#ui/wrapped/SkeletonRows.svelte';

	// The kinds of food the venue is tagged with: from its Google categories, what posts by others
	// call its food, its delivery menu and Google's review tags, worked out on every read, with an
	// admin's tags and exclusions on top. Competitor suggestions compare these. The one it is known
	// for (its primary) is framed. `data` is bindable so the page can show the primary elsewhere.
	interface Props {
		venue: AdminVenueOutputDto;
		data?: AdminVenueTopicsOutputDto | null;
	}

	let { venue, data = $bindable(null) }: Props = $props();

	const loader = createAutoLoader(api.admin.getVenueTopics, [venue.id], {
		onSuccess: (res) => (data = res)
	});

	// Every topic, for "Add topic"
	let allTopics = $state<{ key: string; label: string }[]>([]);
	createAutoLoader(api.admin.getTopics, [{ cityId: venue.city.id }], {
		onSuccess: (res) =>
			(allTopics = res.topics
				.map((t) => ({ key: t.key, label: t.label }))
				.sort((a, b) => a.label.localeCompare(b.label)))
	});
	const addable = $derived(allTopics.filter((t) => !data?.tags.some((tag) => tag.key === t.key)));
	let typed = $state('');
	const typedTopic = $derived(
		addable.find((t) => t.label.toLowerCase() === typed.trim().toLowerCase() || t.key === typed.trim())
	);

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
			api.admin.changeVenueTopic(venue.id, key, {
				change: change as AdminChangeVenueTopicInputDto['change']
			}),
		{
			onSuccess: (res) => {
				data = res;
				typed = '';
			}
		}
	);
	const listId = $derived(`venue-topics-${venue.id}`);
</script>

<DetailCard title="Food topics" icon={UtensilsCrossed} note={data ? data.tags.length : undefined}>
	{#snippet aside()}
		<span
			class="text-muted-foreground"
			title="Framed: the kind of food it is known for. × on a tag that isn't an admin's keeps it off for good."
			>framed = known for</span>
	{/snippet}
	{#if loader.error && !data}
		<ErrorState onRetry={() => loader.load(venue.id)} />
	{:else if !data}
		<SkeletonRows count={1} lines={1} />
	{:else}
		<div class="flex flex-wrap items-center gap-[5px]">
			{#each data.tags as tag (tag.key)}
				<span
					class={cn(
						'group inline-flex h-6 items-center gap-[5px] rounded-full border bg-white pr-1 pl-[9px] text-xs font-medium',
						tag.primary ? 'border-primary-darker/40 bg-primary/25' : 'border-line'
					)}>
					{tag.label}
					<span class="text-faint text-[11px] font-normal"
						>{SOURCE[tag.source]}{SHARED.has(tag.source) ? ` ${Math.round(tag.score * 100)} %` : ''}</span>
					<button
						type="button"
						class="text-muted-foreground hover:bg-wash hover:text-ink flex size-[18px] cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
						aria-label={tag.source === 'manual' ? `Remove ${tag.label}` : `Not ${tag.label}`}
						title={tag.source === 'manual' ? 'Remove' : 'Not this: kept off for good'}
						onclick={() => changeAction.execute(tag.key, tag.source === 'manual' ? 'clear' : 'exclude')}>
						<X class="size-3" />
					</button>
				</span>
			{/each}
			<form
				class="contents"
				onsubmit={(e) => {
					e.preventDefault();
					if (typedTopic) changeAction.execute(typedTopic.key, 'tag');
				}}>
				<input
					class="border-line placeholder:text-faint h-6 w-[130px] rounded-full border border-dashed bg-white px-2 text-xs"
					list={listId}
					bind:value={typed}
					aria-label="Add a topic"
					placeholder="+ Add topic"
					aria-invalid={typed.trim() !== '' && !typedTopic ? true : undefined} />
				<datalist id={listId}>
					{#each addable as topic (topic.key)}<option value={topic.label}></option>{/each}
				</datalist>
			</form>
		</div>
		{#if !data.tags.length}
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Neither its Google categories, its posts, its menu nor its review tags say what it serves.
			</p>
		{/if}
		{#if data.excluded.length}
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Kept off:
				{#each data.excluded as e, i (e.key)}
					{e.label}
					<button type="button" class="text-beet cursor-pointer hover:underline" onclick={() => changeAction.execute(e.key, 'clear')}
						>undo</button>{i < data.excluded.length - 1 ? ', ' : ''}
				{/each}
			</p>
		{/if}
	{/if}
</DetailCard>
