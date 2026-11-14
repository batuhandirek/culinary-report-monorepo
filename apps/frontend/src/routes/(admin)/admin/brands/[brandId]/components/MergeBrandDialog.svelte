<script lang="ts">
	import { Search } from '@lucide/svelte';
	import type { AdminBrandListItemOutputDto, AdminBrandOutputDto } from 'client';

	import { api } from '#lib/api.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { createLoader } from '#ui/lib/loader.svelte.js';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import RadioRows from '#ui/wrapped/RadioRows.svelte';

	// Merges another brand into this one, whatever their names: for a chain whose branches the
	// name rules never put together ("ZAGROS Veggie Kebabs", "ZAGROS Gemüsekebap"). This brand
	// keeps its id and page; the other's places and records move here and it is deleted.
	interface Props {
		brand: AdminBrandOutputDto;
		open?: boolean;
		onMerged: (brand: AdminBrandOutputDto) => void;
	}

	let { brand, open = $bindable(false), onMerged }: Props = $props();

	let q = $state('');
	let results = $state<AdminBrandListItemOutputDto[]>([]);
	let picked = $state<AdminBrandListItemOutputDto | null>(null);
	let name = $state<'this' | 'other'>('this');

	const search = createLoader(
		(query: string) => api.admin.searchBrands({ q: query, excludeId: brand.id }),
		{ debounce: 300, onSuccess: (res) => (results = res) }
	);

	// Seeded on every opening, so a reopened dialog never carries an abandoned pick
	$effect(() => {
		if (!open) return;
		q = '';
		results = [];
		picked = null;
		name = 'this';
	});

	$effect(() => {
		if (!open) return;
		if (q.trim().length >= 2) search.load(q.trim());
		else results = [];
	});

	const mergeAction = createAction(
		(other: AdminBrandListItemOutputDto, newName?: string) =>
			api.admin.mergeBrand(brand.id, { brandId: other.id, ...(newName && { name: newName }) }),
		{
			successNotification: (_, [other]) => ({
				title: 'Brands merged',
				text: `${other.name} is a part of this brand now. Its mentions are matched again in the background.`
			}),
			onSuccess: (merged) => {
				open = false;
				onMerged(merged);
			}
		}
	);

	const places = (b: AdminBrandListItemOutputDto) => {
		const open = b.branches.filter((v) => !v.closed).length;
		const closed = b.branches.length - open;
		return `${open} open place${open === 1 ? '' : 's'}${closed ? `, ${closed} closed` : ''}`;
	};
	const where = (b: AdminBrandListItemOutputDto) =>
		b.branches
			.slice(0, 3)
			.map((v) => [v.street, v.city.name].filter(Boolean).join(', '))
			.join(' · ') + (b.branches.length > 3 ? ` · ${b.branches.length - 3} more` : '');
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-[560px] text-sm" preventScroll>
		<Dialog.Header>
			<Dialog.Title>Merge another brand into {brand.name}</Dialog.Title>
		</Dialog.Header>

		<div class="mt-4 flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Input
					bind:value={q}
					icon={Search}
					loading={search.loading}
					placeholder="Search brands by their name or a place's"
					aria-label="Search brands" />
				{#if results.length}
					<ul class="border-line m-0 flex max-h-72 list-none flex-col overflow-y-auto rounded-md border p-0">
						{#each results as other (other.id)}
							<li class="border-line border-b last:border-b-0">
								<button
									type="button"
									class="hover:bg-tint flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
									class:bg-tint={picked?.id === other.id}
									aria-pressed={picked?.id === other.id}
									onclick={() => (picked = picked?.id === other.id ? null : other)}>
									<span class="font-medium">{other.name}</span>
									<span class="text-muted-foreground text-xs">
										{places(other)}{other.branches.length ? ` · ${where(other)}` : ''}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{:else if q.trim().length >= 2 && !search.loading}
					<p class="text-muted-foreground m-0 text-xs">No other brand by that name.</p>
				{/if}
			</div>

			{#if picked && picked.name !== brand.name}
				<RadioRows
					label="Name of the merged brand"
					joined
					value={name}
					onChange={(v) => v && (name = v)}
					options={[
						{ value: 'this', label: brand.name, hint: 'This brand’s name' },
						{ value: 'other', label: picked.name, hint: 'The other brand’s name' }
					]} />
			{/if}

			<p class="text-muted-foreground m-0 text-xs">
				{#if picked}
					{picked.name}’s {picked.branches.length === 1 ? 'place' : `${picked.branches.length} places`},
					mentions, own accounts, reports, members and sales record move to this brand, and
					{picked.name} is deleted. A report of a month both have keeps this brand’s.
				{:else}
					Pick the brand that is the same business. Its places become this brand’s branches.
				{/if}
				A place taken off again in Places becomes a brand of its own; the moved records stay here.
			</p>
		</div>

		<Dialog.Footer class="mt-4 gap-1">
			<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
			<Button
				disabled={!picked}
				loading={mergeAction.executing}
				onclick={() =>
					picked && mergeAction.execute(picked, name === 'other' ? picked.name : undefined)}>
				Merge{picked ? ` ${picked.name}` : ''}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
