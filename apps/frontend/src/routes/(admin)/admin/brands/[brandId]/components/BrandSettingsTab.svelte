<script lang="ts">
	import { Split } from '@lucide/svelte';

	import {
		type AdminBrandOutputDto,
		AdminUpdateBrandInputDtoReportScopeEnum as ReportScope
	} from 'client';

	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import { api } from '#lib/api.js';
	import { branchesByCity } from '#lib/brands.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// What an admin decides about a brand: how its reports are cut, and
	// undoing a chain. Its own social accounts are on the Signals tab.
	interface Props {
		brand: AdminBrandOutputDto;
		onChange: (brand: AdminBrandOutputDto) => void;
	}

	let { brand, onChange: set }: Props = $props();

	const cities = $derived(branchesByCity(brand.branches));
	const chain = $derived(brand.branches.length > 1);

	// A brand in several cities: one report per city, or one across all of them (built by the
	// last city's monthly run)
	const SCOPES = [
		{ value: ReportScope.City, label: 'A report per city' },
		{ value: ReportScope.All, label: 'One across all cities' }
	];
	let reportScope = $derived<string>(brand.reportScope);
	const scopeAction = createAction(
		(value: string) => api.admin.updateBrand(brand.id, { reportScope: value as ReportScope }),
		{
			onSuccess: set,
			successNotification: (b) => ({
				title: b.reportScope === 'all' ? 'One report across all cities' : 'A report per city',
				text: 'From the next monthly run on.'
			})
		}
	);

	let splitting = $state(false);
	const splitAction = createAction(() => api.admin.splitBrand(brand.id), {
		onSuccess: set,
		successNotification: (b) => ({
			title: 'Chain split',
			text: `${b.name} keeps its reports and prospect; the other places are brands of their own`
		})
	});
</script>

<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
	<div class="flex min-w-0 flex-col gap-5 xl:col-span-2 xl:max-w-3xl">
		{#if cities.length > 1}
			<AdminPanel title="Reports">
				<div class="flex flex-col gap-3">
					<div class="w-56">
						<Select
							items={SCOPES}
							bind:value={reportScope}
							aria-label="Reports"
							onValueChange={(v) => v && v !== brand.reportScope && scopeAction.execute(v)} />
					</div>
					<p class="text-muted-foreground m-0 text-xs">
						It has places in {cities.map((c) => c.cityName).join(' and ')}: a report per
						city, or one across all of them that the last city's monthly run builds.
					</p>
				</div>
			</AdminPanel>
		{/if}

		{#if chain}
			<AdminPanel title="Undo the chain">
				<div class="flex flex-col items-start gap-3">
					<p class="text-muted-foreground m-0 text-sm">
						The most reviewed place keeps the brand with its reports, sales record and
						portal. Every other place becomes a brand of its own.
					</p>
					<Button size="sm" variant="outline" icon={Split} onclick={() => (splitting = true)}
						>Split {brand.name}</Button>
				</div>
			</AdminPanel>
		{/if}
	</div>

</div>

<AdminRawJson value={brand} />

<PopConfirm
	bind:open={splitting}
	title={`Split ${brand.name}?`}
	description="The most reviewed place keeps the brand with its reports, prospect and portal. Every other place becomes a brand of its own, and they are never merged or suggested as one again."
	confirmText="Split the chain"
	destructive
	onConfirm={() => splitAction.execute()} />
