<script lang="ts">
	import type { FoodTrendsReportOutputDto } from 'client';

	import HighlightsPitchBand from '../../../components/HighlightsPitchBand.svelte';

	import { page } from '$app/state';
	import SafeJsonLd from '#components/SafeJsonLd.svelte';
	import { foodTrendsJsonLd } from '#lib/food-trends.js';
	import FoodTrendsView from '#views/food-trends/FoodTrendsView.svelte';

	let report = $derived(page.data.report as FoodTrendsReportOutputDto);
</script>

<!-- Google's rising queries are its users' words: `SafeJsonLd`, never `JsonLd`. -->
<SafeJsonLd schema={foodTrendsJsonLd(report.city, report.quarter, report.data, String(report.publishedAt))} />

<FoodTrendsView city={report.city} quarter={report.quarter} data={report.data} />
<HighlightsPitchBand cityName={report.city.name} />
