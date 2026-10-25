<script lang="ts">
	import { Check, Plus, Sparkles, X } from '@lucide/svelte';
	import type {
		AdminCityHashtagSuggestionOutputDto,
		AdminCityOutputDto,
		AdminCitySourceYieldOutputDto
	} from 'client';

	import { AdminAddCitySourceInputDtoKindEnum as Kind } from 'client';

	import SourceSwitch from './SourceSwitch.svelte';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { api } from '#lib/api.js';
	import { compact } from '#lib/culinary.js';
	import type { Column, Filter } from '#ui/components/paginated-data-table/index.js';
	import PaginatedDataTable from '#ui/components/paginated-data-table/PaginatedDataTable.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	interface Props {
		city: AdminCityOutputDto;
	}

	let { city }: Props = $props();

	const KINDS = [
		{ value: Kind.TiktokHashtag, label: 'TikTok hashtag' },
		{ value: Kind.TiktokSearch, label: 'TikTok search' },
		{ value: Kind.InstagramHashtag, label: 'Instagram hashtag' },
		{ value: Kind.Blog, label: 'Blog' },
		{ value: Kind.TiktokAccount, label: 'TikTok creator' },
		{ value: Kind.InstagramAccount, label: 'Instagram creator' }
	];
	const isAccount = (kind: unknown) => `${kind}` === Kind.TiktokAccount || `${kind}` === Kind.InstagramAccount;
	// How a source reads in a list: a hashtag with its #, a creator with its @, a search or a
	// blog's URL as it is
	const sourceLabel = (source: { kind: unknown; value: string }) =>
		isAccount(source.kind) ? `@${source.value}`
		: `${source.kind}` === Kind.TiktokSearch || `${source.kind}` === Kind.Blog ? source.value
		: `#${source.value}`;
	// A blog's last read: the trouble, else the feed it reads
	const feedLabel = (source: AdminCitySourceYieldOutputDto) =>
		`${source.kind}` !== Kind.Blog ? ''
		: source.error ? `⚠ ${source.error}`
		: source.feedUrl ? source.feedUrl
		: 'Not read yet';
	const kindLabel = (kind: string) => KINDS.find((k) => `${k.value}` === kind)?.label ?? kind;
	const FILTERS: Filter[] = [
		{
			key: 'kind',
			name: 'Kind',
			type: 'select',
			options: KINDS.map((k) => ({ name: k.label, value: k.value }))
		},
		{ key: 'enabledOnly', name: 'Enabled only', type: 'toggle' }
	];

	// One request for every source with its yield; filtered here
	let refreshKey = $state(0);
	const listSources = async (query: { kind?: string; enabledOnly?: boolean }) => {
		const { items } = await api.admin.listCitySources(city.id);
		const rows = items.filter(
			(s) => (!query.kind || `${s.kind}` === query.kind) && (!query.enabledOnly || s.enabled)
		);
		return { items: rows, page: 1, pageSize: Math.max(rows.length, 1), totalItems: rows.length };
	};

	const COLUMNS: Column<AdminCitySourceYieldOutputDto>[] = [
		{
			type: 'component',
			name: 'On',
			component: SourceSwitch as never,
			props: (row) => ({
				checked: row.enabled,
				label: `${row.value} on`,
				onChange: async (enabled: boolean) => {
					await api.admin.updateCitySource(city.id, row.id, { enabled });
					refreshKey++;
				}
			})
		},
		{
			type: 'value',
			name: 'Kind',
			value: (row) => `${kindLabel(`${row.kind}`)}${row.suggested ? ' · suggested' : ''}`
		},
		{
			type: 'value',
			name: 'Source',
			truncate: 40,
			value: (row) => sourceLabel(row)
		},
		{ type: 'count', name: 'Posts', value: (row) => row.posts },
		{ type: 'count', name: 'With a matched venue', tone: 'success', value: (row) => row.matchedPosts },
		{ type: 'count', name: 'Only it found', value: (row) => row.uniqueMatchedPosts },
		{
			type: 'value',
			name: 'Matched share',
			numeric: true,
			value: (row) => (row.posts ? `${Math.round((100 * row.matchedPosts) / row.posts)} %` : '')
		},
		{ type: 'value', name: 'Views', numeric: true, value: (row) => (row.views ? compact(row.views) : '') },
		{ type: 'value', name: 'Feed', truncate: 40, value: (row) => feedLabel(row) },
		{ type: 'date', name: 'Last read', format: 'datetime', value: (row) => row.checkedAt },
		{ type: 'value', name: 'Note', truncate: 40, value: (row) => row.note ?? '' },
		{ type: 'date', name: 'Added', format: 'date', value: (row) => row.createdAt }
	];

	// Suggestions not reviewed yet: disabled until enabled here or in the table
	let suggestions = $state<AdminCitySourceYieldOutputDto[]>([]);
	// Before this day a post kept only its first source, so "Only it found" counts too much until
	// three months have passed
	let findsSince = $state<string | null>(null);
	const findsComplete = $derived.by(() => {
		if (!findsSince) return true;
		const [year, month, day] = findsSince.split('-').map(Number);
		return Date.UTC(year, month - 1 + 3, day) <= Date.now();
	});
	$effect(() => {
		void refreshKey;
		api.admin.listCitySources(city.id).then(({ items, allFindsSince }) => {
			suggestions = items.filter((s) => s.suggested);
			findsSince = allFindsSince;
		});
	});

	// Tags on matched posts the city doesn't scrape, from the data; the first ten until asked
	let fromData = $state<AdminCityHashtagSuggestionOutputDto[]>([]);
	let allTags = $state(false);
	const shownTags = $derived(allTags ? fromData : fromData.slice(0, 10));
	$effect(() => {
		void refreshKey;
		api.admin.listCityHashtagSuggestions(city.id).then(({ items }) => {
			fromData = items;
		});
	});
	const addTagAction = createAction(
		(tag: AdminCityHashtagSuggestionOutputDto) =>
			api.admin.addCitySource(city.id, {
				kind: `${tag.kind}` as Kind,
				value: tag.tag,
				note: `From the data: on ${tag.matchedPosts} matched posts of ${tag.brands} brands`,
				enabled: false
			}),
		{
			onSuccess: () => refreshKey++,
			successNotification: (source) => ({ title: 'Added switched off', text: `#${source.value}: turn it on in the table` })
		}
	);
	const unignoreTag = async (tag: AdminCityHashtagSuggestionOutputDto) => {
		await api.admin.updateHashtag(tag.hashtagId, { ignored: false });
		refreshKey++;
	};
	const ignoreTagAction = createAction(
		(tag: AdminCityHashtagSuggestionOutputDto) => api.admin.updateHashtag(tag.hashtagId, { ignored: true }),
		{
			onSuccess: () => refreshKey++,
			successNotification: (_, [tag]) => ({
				title: 'Ignored',
				text: `#${tag.tag} is never suggested again`,
				action: { label: 'Undo', onClick: () => unignoreTag(tag) }
			})
		}
	);
	const review = async (source: AdminCitySourceYieldOutputDto, enabled: boolean) => {
		await api.admin.updateCitySource(city.id, source.id, { enabled });
		refreshKey++;
	};
	const enableAll = createAction(
		async () => {
			for (const source of suggestions) {
				await api.admin.updateCitySource(city.id, source.id, { enabled: true });
			}
		},
		{ onFinally: () => refreshKey++ }
	);

	let cuisineNotes = $state('');
	const suggestAction = createAction(
		() =>
			api.admin.suggestCitySources(city.id, { cuisineNotes: cuisineNotes.trim() || undefined }),
		{
			onSuccess: () => refreshKey++,
			successNotification: (res) => ({
				title: `${res.items.length} suggestions to review`,
				text: res.skipped ? `${res.skipped} the city already had` : undefined
			})
		}
	);

	let kind = $state<Kind>(Kind.TiktokHashtag);
	let value = $state('');
	let note = $state('');
	const addAction = createAction(
		() =>
			api.admin.addCitySource(city.id, {
				kind,
				value: value.trim(),
				note: note.trim() || undefined
			}),
		{
			onSuccess: () => {
				value = '';
				note = '';
				refreshKey++;
			},
			successNotification: (source) => ({ title: 'Source added', text: source.value })
		}
	);
</script>

<div class="flex min-w-0 flex-col gap-5">
	<AdminPanel title="Add a source">
		<form
			class="flex flex-wrap items-end gap-3"
			onsubmit={(e) => {
				e.preventDefault();
				if (value.trim()) addAction.execute();
			}}>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Kind</span>
				<Select items={KINDS} bind:value={kind} aria-label="Kind" />
			</label>
			<label class="flex w-64 flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">
					{kind === Kind.TiktokSearch ? 'Search query'
					: kind === Kind.Blog ? 'Blog URL or feed'
					: isAccount(kind) ? 'Handle or profile URL'
					: 'Hashtag'}
				</span>
				<Input
					bind:value
					placeholder={kind === Kind.TiktokSearch ? 'munich restaurant'
					: kind === Kind.Blog ? 'https://www.berlinfoodstories.com'
					: isAccount(kind) ? '@berlingoodfood'
					: 'munichfood'} />
			</label>
			<label class="flex min-w-48 flex-1 flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Note</span>
				<Input bind:value={note} placeholder="Why it is here (optional)" />
			</label>
			<Button type="submit" icon={Plus} loading={addAction.executing} disabled={!value.trim()}>Add</Button>
		</form>
		<p class="text-muted-foreground m-0 mt-3 text-sm">
			The monthly scrape reads the enabled ones. The numbers are the last three months: posts each source
			found (a post two sources found counts for both), how many of them named a venue we matched, and how
			many of those only it found, nothing else that keeps running: what turning it off would lose. Turn
			off what brings nothing. A blog is read
			through its RSS or Atom feed every Sunday and at month end, each new article a post: give the site, a
			food section (its own feed is used) or the feed itself. A creator is a profile we scrape every Sunday
			and at month end, whatever hashtags they use: their latest posts become posts. Report brands' own
			accounts and their competitors' are watched without a source here; a creator's page says why
			anyone is watched.
		</p>
	</AdminPanel>

	<AdminPanel title="Suggest sources">
		<form
			class="flex flex-wrap items-end gap-3"
			onsubmit={(e) => {
				e.preventDefault();
				suggestAction.execute();
			}}>
			<label class="flex min-w-64 flex-1 flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">What the city eats</span>
				<Input bind:value={cuisineNotes} placeholder="Known for döner, Vietnamese, brunch (optional)" />
			</label>
			<Button type="submit" variant="outline" icon={Sparkles} loading={suggestAction.executing}>
				Suggest sources
			</Button>
		</form>
		<p class="text-muted-foreground m-0 mt-3 text-sm">
			One LLM call: twenty TikTok hashtags, twenty searches and ten Instagram hashtags in {city.language}
			and English, added switched off for you to review. Sources the city has are skipped.
		</p>
	</AdminPanel>

	{#if fromData.length}
		<AdminPanel title="Hashtags from the data" note={fromData.length}>
			<p class="text-muted-foreground m-0 mb-3 text-sm">
				Tags the city doesn't scrape that keep coming up on posts we matched, over the last three months:
				on 5+ posts of 3+ brands. Free, no LLM. Add puts one in the table switched off; ignore the noise.
			</p>
			<ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
				{#each shownTags as tag (`${tag.hashtagId} ${tag.kind}`)}
					<li class="flex items-center gap-3 border-b py-1.5 last:border-b-0">
						<span class="text-muted-foreground w-36 shrink-0 text-xs">{kindLabel(`${tag.kind}`)}</span>
						<span class="w-56 shrink-0 truncate font-medium">#{tag.tag}</span>
						<span class="text-muted-foreground min-w-0 flex-1 truncate">
							{tag.matchedPosts} posts · {tag.brands} brands: {tag.sampleBrands.join(', ')}{tag.brands > tag.sampleBrands.length ? '…' : ''}
						</span>
						<Button size="sm" variant="outline" icon={Plus} onclick={() => addTagAction.execute(tag)}>Add</Button>
						<Button size="sm" variant="ghost" icon={X} onclick={() => ignoreTagAction.execute(tag)}>Ignore</Button>
					</li>
				{/each}
			</ul>
			{#if fromData.length > shownTags.length}
				<Button class="mt-2" size="sm" variant="ghost" onclick={() => (allTags = true)}>
					Show all {fromData.length}
				</Button>
			{/if}
		</AdminPanel>
	{/if}

	{#if suggestions.length}
		<AdminPanel title="Suggestions to review" note={suggestions.length}>
			{#snippet action()}
				<Button size="sm" variant="outline" icon={Check} loading={enableAll.executing} onclick={() => enableAll.execute()}>
					Enable all
				</Button>
			{/snippet}
			<ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
				{#each suggestions as source (source.id)}
					<li class="flex items-center gap-3 border-b py-1.5 last:border-b-0">
						<span class="text-muted-foreground w-36 shrink-0 text-xs">{kindLabel(`${source.kind}`)}</span>
						<span class="w-56 shrink-0 font-medium">
							{sourceLabel(source)}
						</span>
						<span class="text-muted-foreground min-w-0 flex-1 truncate">
							{source.note?.replace(/^Suggested: /, '') ?? ''}
						</span>
						<Button size="sm" variant="outline" icon={Check} onclick={() => review(source, true)}>Enable</Button>
						<Button size="sm" variant="ghost" icon={X} onclick={() => review(source, false)}>Dismiss</Button>
					</li>
				{/each}
			</ul>
		</AdminPanel>
	{/if}

	{#if !findsComplete && findsSince}
		<p class="ink-strip m-0 text-sm">
			"Only it found" counts too much for posts from before {findsSince}: until then a post kept only the
			first source that found it. It is right for the whole window three months after that day.
		</p>
	{/if}

	<PaginatedDataTable
		key={refreshKey}
		api={listSources}
		fill={false}
		noun="sources"
		availableFilters={FILTERS}
		columns={COLUMNS} />
</div>
