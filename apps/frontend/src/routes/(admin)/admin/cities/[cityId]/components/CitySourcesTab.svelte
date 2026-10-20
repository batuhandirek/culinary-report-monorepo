<script lang="ts">
	import { Check, Plus, Sparkles, X } from '@lucide/svelte';
	import type { AdminCityOutputDto, AdminCitySourceYieldOutputDto } from 'client';

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
		{ value: Kind.InstagramHashtag, label: 'Instagram hashtag' }
	];
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
			value: (row) => (`${row.kind}` === Kind.TiktokSearch ? row.value : `#${row.value}`)
		},
		{ type: 'count', name: 'Posts', value: (row) => row.posts },
		{ type: 'count', name: 'With a matched venue', tone: 'success', value: (row) => row.matchedPosts },
		{
			type: 'value',
			name: 'Matched share',
			numeric: true,
			value: (row) => (row.posts ? `${Math.round((100 * row.matchedPosts) / row.posts)} %` : '')
		},
		{ type: 'value', name: 'Views', numeric: true, value: (row) => (row.views ? compact(row.views) : '') },
		{ type: 'value', name: 'Note', truncate: 40, value: (row) => row.note ?? '' },
		{ type: 'date', name: 'Added', format: 'date', value: (row) => row.createdAt }
	];

	// Suggestions not reviewed yet: disabled until enabled here or in the table
	let suggestions = $state<AdminCitySourceYieldOutputDto[]>([]);
	$effect(() => {
		void refreshKey;
		api.admin.listCitySources(city.id).then(({ items }) => {
			suggestions = items.filter((s) => s.suggested);
		});
	});
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
					{kind === Kind.TiktokSearch ? 'Search query' : 'Hashtag'}
				</span>
				<Input
					bind:value
					placeholder={kind === Kind.TiktokSearch ? 'munich restaurant' : 'munichfood'} />
			</label>
			<label class="flex min-w-48 flex-1 flex-col gap-1 text-sm">
				<span class="text-muted-foreground text-xs">Note</span>
				<Input bind:value={note} placeholder="Why it is here (optional)" />
			</label>
			<Button type="submit" icon={Plus} loading={addAction.executing} disabled={!value.trim()}>Add</Button>
		</form>
		<p class="text-muted-foreground m-0 mt-3 text-sm">
			The monthly scrape reads the enabled ones. The numbers are the last three months: posts each source
			found first, and how many of them named a venue we matched. Turn off what brings nothing.
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
							{`${source.kind}` === Kind.TiktokSearch ? source.value : `#${source.value}`}
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

	<PaginatedDataTable
		key={refreshKey}
		api={listSources}
		fill={false}
		noun="sources"
		availableFilters={FILTERS}
		columns={COLUMNS} />
</div>
