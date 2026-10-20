<script lang="ts">
	import { Search } from '@lucide/svelte';

	import {
		type AdminMentionOutputDto,
		type AdminVenueListItemOutputDto,
		ListVenuesParamsSortEnum
	} from 'client';

	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';

	// An admin's correction of the venue a mention was matched to. Whatever is saved here is
	// final: the matcher never touches the mention again (`manual` / `ignored`).
	interface Props {
		// Any mention row: the generated client gives each endpoint its own enum twin
		mention: Pick<
			AdminMentionOutputDto,
			'id' | 'venueName' | 'locationHint' | 'cuisine' | 'venue' | 'matchNote'
		> & { matchMethod?: string };
		active?: boolean;
		onChanged?: (mention: AdminMentionOutputDto) => void;
	}

	let { mention, active = $bindable(false), onChanged }: Props = $props();

	let q = $state('');
	let note = $state('');
	let picked = $state<AdminVenueListItemOutputDto | null>(null);
	let results = $state<AdminVenueListItemOutputDto[]>([]);

	// The most talked-about first: the likelier meaning of a name
	const search = createLoader(
		(query: string) =>
			api.admin.listVenues({
				page: 1,
				size: 8,
				q: query,
				sort: ListVenuesParamsSortEnum.MentionCountDesc
			}),
		{ debounce: 300, onSuccess: (res) => (results = res.items) }
	);

	// Seeded on every opening, so a reopened dialog never carries an abandoned edit
	$effect(() => {
		if (!active) return;
		q = mention.venueName;
		note = mention.matchNote ?? '';
		picked = null;
	});

	$effect(() => {
		if (!active) return;
		if (q.trim().length >= 2) search.load(q.trim());
		else results = [];
	});

	const saveAction = createAction(
		(body: { venueId: string | null; ignored?: boolean }) =>
			api.admin.updateMention(mention.id, { ...body, note: note.trim() || undefined }),
		{
			successNotification: (res) => ({
				title: res.matchMethod === 'ignored' ? 'Marked as not a venue' : 'Mention updated',
				text: res.venue ? `Linked to ${res.venue.name}` : 'No venue linked'
			}),
			onSuccess: (res) => {
				active = false;
				onChanged?.(res);
			}
		}
	);

	const describe = (v: AdminVenueListItemOutputDto) =>
		[v.district, v.category, `${v.mentionCount} mentions`].filter(Boolean).join(' · ');
</script>

<Dialog.Root bind:open={active}>
	<Dialog.Content class="max-w-[520px] text-sm" preventScroll>
		<Dialog.Header>
			<Dialog.Title>Venue for “{mention.venueName}”</Dialog.Title>
		</Dialog.Header>

		<div class="mt-4 flex flex-col gap-4">
			<div class="text-muted-foreground text-xs">
				{[mention.locationHint, mention.cuisine].filter(Boolean).join(' · ') || 'No location hint'}
				· now {mention.venue ? `linked to ${mention.venue.name}` : 'not linked'}
				({mention.matchMethod ?? 'not matched yet'})
			</div>

			<div class="flex flex-col gap-2">
				<Input
					bind:value={q}
					icon={Search}
					loading={search.loading}
					placeholder="Search venues by name"
					aria-label="Search venues" />
				{#if results.length}
					<ul class="border-line m-0 flex max-h-72 list-none flex-col overflow-y-auto rounded-md border p-0">
						{#each results as venue (venue.id)}
							<li class="border-line border-b last:border-b-0">
								<button
									type="button"
									class="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-tint"
									class:bg-tint={picked?.id === venue.id}
									aria-pressed={picked?.id === venue.id}
									onclick={() => (picked = picked?.id === venue.id ? null : venue)}>
									<span class="font-medium">
										{venue.name}{venue.closed ? ' (closed)' : ''}
									</span>
									<span class="text-muted-foreground text-xs">{describe(venue)}</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else if q.trim().length >= 2 && !search.loading}
					<p class="text-muted-foreground m-0 text-xs">
						No venue by that name. Look it up on Google Maps from the pipeline first.
					</p>
				{/if}
			</div>

			<Input bind:value={note} placeholder="Note (optional): why" aria-label="Note" maxlength={500} />

			<p class="text-muted-foreground m-0 text-xs">
				Matching never overwrites a correction. Rebuild the venue's report for the change to
				show in it.
			</p>
		</div>

		<Dialog.Footer class="mt-4 flex-wrap gap-1">
			<Button
				variant="ghost"
				disabled={saveAction.executing}
				onclick={() => saveAction.execute({ venueId: null, ignored: true })}>
				Not a venue
			</Button>
			{#if mention.venue}
				<Button
					variant="outline"
					disabled={saveAction.executing}
					onclick={() => saveAction.execute({ venueId: null })}>
					Unlink
				</Button>
			{/if}
			<Button
				disabled={!picked}
				loading={saveAction.executing}
				onclick={() => picked && saveAction.execute({ venueId: picked.id })}>
				Link{picked ? ` to ${picked.name}` : ''}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
