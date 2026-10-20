<script lang="ts">
	import type { AdminCityOutputDto, AdminSuggestedDistrictOutputDto } from 'client';

	import { invalidate } from '$app/navigation';
	import { api } from '#lib/api.js';
	import { adminCitiesStore } from '#stores/AdminCitiesStore.svelte.js';
	import Checkbox from '#ui/primitives-new/checkbox/checkbox.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	// Districts and postal codes as the city's venues place them, to review and save
	interface Props {
		city: AdminCityOutputDto;
		items: AdminSuggestedDistrictOutputDto[];
		onClose: () => void;
	}

	let { city, items, onClose }: Props = $props();

	// New names start unticked: Google's neighbourhoods are not always districts
	let keep = $state<Record<string, boolean>>({});
	$effect(() => {
		keep = Object.fromEntries(items.map((d) => [d.name, !d.isNew]));
	});

	const apply = createAction(
		() =>
			api.admin.updateCity(city.id, {
				districts: items
					.filter((d) => keep[d.name])
					.map(({ name, postalCodes, neighbours }) => ({
						name,
						postalCodes,
						neighbours: neighbours.filter((n) => keep[n] ?? true)
					}))
			}),
		{
			onSuccess: () => {
				adminCitiesStore.refresh();
				invalidate(`city:${city.id}`);
				onClose();
			},
			successNotification: { title: 'Districts saved' }
		}
	);
</script>

{#if items.length}
	<p class="text-muted-foreground m-0 mb-3 text-sm">
		Each postal code goes to the district most of its venues are in. Borders already listed stay;
		a district without any gets those the postal codes suggest. Tick what to keep, then save: the
		list replaces the city's districts.
	</p>
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead class="text-muted-foreground text-left text-xs">
				<tr>
					<th class="py-1.5 pr-3 font-normal">Keep</th>
					<th class="py-1.5 pr-3 font-normal">District</th>
					<th class="py-1.5 pr-3 text-right font-normal">Venues</th>
					<th class="py-1.5 pr-3 font-normal">Postal codes</th>
					<th class="py-1.5 font-normal">Borders</th>
				</tr>
			</thead>
			<tbody>
				{#each items as district (district.name)}
					<tr class="border-t align-top">
						<td class="py-1.5 pr-3">
							<Checkbox
								checked={keep[district.name]}
								aria-label={`Keep ${district.name}`}
								onCheckedChange={(v) => (keep[district.name] = !!v)} />
						</td>
						<td class="py-1.5 pr-3 font-medium">
							{district.name}
							{#if district.isNew}<Badge pill variant="secondary">new</Badge>{/if}
						</td>
						<td class="py-1.5 pr-3 text-right tabular-nums">{district.venues}</td>
						<td class="text-muted-foreground py-1.5 pr-3">{district.postalCodes.join(', ') || '—'}</td>
						<td class="text-muted-foreground py-1.5">{district.neighbours.join(', ') || '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="mt-3 flex gap-2">
		<Button size="sm" loading={apply.executing} onclick={() => apply.execute()}>Save districts</Button>
		<Button size="sm" variant="ghost" onclick={onClose}>Cancel</Button>
	</div>
{:else}
	<p class="text-muted-foreground m-0 text-sm">
		No venue has a district and a postal code yet: run a venue scrape of the city first.
	</p>
{/if}
