<script lang="ts">
	import './landing.css';

	import { onMount } from 'svelte';

	import { editionView } from './components/landing.js';
	import LandingBlog from './components/LandingBlog.svelte';
	import LandingData from './components/LandingData.svelte';
	import LandingDishes from './components/LandingDishes.svelte';
	import LandingFooter from './components/LandingFooter.svelte';
	import LandingHeat from './components/LandingHeat.svelte';
	import LandingHero from './components/LandingHero.svelte';
	import LandingMarquee from './components/LandingMarquee.svelte';
	import LandingNav from './components/LandingNav.svelte';
	import LandingNew from './components/LandingNew.svelte';
	import LandingNewsletter from './components/LandingNewsletter.svelte';
	import LandingNoAds from './components/LandingNoAds.svelte';
	import LandingNow from './components/LandingNow.svelte';
	import LandingSeries from './components/LandingSeries.svelte';
	import LandingTrends from './components/LandingTrends.svelte';
	import LandingVenues from './components/LandingVenues.svelte';

	// munchwerk.com: the Berlin edition's front page, from the Claude Design mockup in
	// `munchwerk.com-version-2/`. Every place, dish, number and line is the newest published live
	// edition's (`LandingEdition`, rebuilt every five days); before the first one the page says
	// it is being counted instead of showing sample data.
	let { data } = $props();

	const view = $derived(data.edition ? editionView(data.edition) : null);
	const places = $derived(view?.places ?? []);
	const openings = $derived(view?.openings ?? []);

	// Day or night: the visitor's own pick, remembered in this browser only
	const THEME_KEY = 'munchwerk.landing.theme';
	let night = $state(false);
	onMount(() => {
		try {
			night = localStorage.getItem(THEME_KEY) === 'night';
		} catch {
			// Storage blocked: day it is
		}
	});
	const toggleTheme = () => {
		night = !night;
		try {
			localStorage.setItem(THEME_KEY, night ? 'night' : 'day');
		} catch {
			// Not remembered, still switched
		}
	};
</script>

<div class="lp min-h-dvh overflow-x-clip" data-theme={night ? 'night' : 'day'}>
	<LandingNav {night} onToggleTheme={toggleTheme} hasOpenings={openings.length > 0} />
	<main>
		<LandingHero edition={data.edition} top={places[0]} />
		<LandingNow lines={view?.ticker ?? []} />
		<LandingMarquee dishes={data.edition?.data.marquee ?? []} />
		<LandingHeat edition={data.edition} {places} monthPath={data.monthPath} />
		<LandingDishes dishes={view?.dishes ?? []} />
		<LandingTrends edition={data.edition} trends={view?.trends ?? []} />
		<LandingNew {openings} count={data.edition?.data.openingsCount ?? 0} />
		<LandingNoAds />
		<LandingSeries
			{places}
			dishOfTheMonth={view?.dishes.find((d) => d.role === 'dish_of_the_month')}
			openingsCount={data.edition?.data.openingsCount ?? 0}
			monthPath={data.monthPath}
			trendsPath={data.trendsPath} />
		<LandingData />
		<LandingBlog posts={data.posts} />
		<LandingVenues />
		<LandingNewsletter />
	</main>
	<LandingFooter monthPath={data.monthPath} trendsPath={data.trendsPath} hasOpenings={openings.length > 0} />
</div>
