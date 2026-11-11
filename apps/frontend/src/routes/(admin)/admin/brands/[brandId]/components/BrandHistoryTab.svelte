<script lang="ts">
	import type { AdminBrandOutputDto, AdminReportConfigOutputDto } from 'client';

	import type { BrandProspectStore } from '../stores/BrandProspectStore.svelte.js';

	import BrandReportsTab from './BrandReportsTab.svelte';
	import BrandSalesTab from './BrandSalesTab.svelte';

	// What we have done with the brand: the reports built for it (and its report configurations),
	// then its place on the sales list and the conversation with it.
	interface Props {
		brand: AdminBrandOutputDto;
		cityId?: string;
		month: string;
		configs: AdminReportConfigOutputDto[] | null;
		onBuild: (config: AdminReportConfigOutputDto) => void;
		building: boolean;
		sales: BrandProspectStore;
	}

	let { brand, cityId, month, configs, onBuild, building, sales }: Props = $props();
</script>

<div class="flex min-w-0 flex-col gap-8">
	<section class="flex min-w-0 flex-col gap-3">
		<h2 class="eyebrow text-muted-foreground m-0">Reports</h2>
		<BrandReportsTab {brand} {cityId} {month} {configs} {onBuild} {building} />
	</section>
	<section class="flex min-w-0 flex-col gap-3">
		<h2 class="eyebrow text-muted-foreground m-0">Sales</h2>
		<BrandSalesTab {brand} {sales} />
	</section>
</div>
