<script lang="ts">
	import type { CityHighlightOutputDto } from 'client';

	import HighlightsPitchBand from '../../components/HighlightsPitchBand.svelte';

	import { page } from '$app/state';
	import SafeJsonLd from '#components/SafeJsonLd.svelte';
	import { highlightJsonLd } from '#lib/highlights.js';
	import CityHighlightView from '#views/highlights/CityHighlightView.svelte';

	let highlight = $derived(page.data.highlight as CityHighlightOutputDto);
</script>

<!-- Place names come from Google and posts: `SafeJsonLd`, never `JsonLd`. -->
<SafeJsonLd
	schema={highlightJsonLd(highlight.city, highlight.month, highlight.data, String(highlight.publishedAt))} />

<CityHighlightView city={highlight.city} month={highlight.month} data={highlight.data} />
<HighlightsPitchBand cityName={highlight.city.name} />
