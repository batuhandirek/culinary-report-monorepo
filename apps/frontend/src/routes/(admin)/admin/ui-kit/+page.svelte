<script lang="ts">
	import { onMount } from 'svelte';

	import BlocksSection from './components/BlocksSection.svelte';
	import ButtonsSection from './components/ButtonsSection.svelte';
	import ChoiceSection from './components/ChoiceSection.svelte';
	import FeedbackSection from './components/FeedbackSection.svelte';
	import FieldsSection from './components/FieldsSection.svelte';
	import FoundationsSection from './components/FoundationsSection.svelte';
	import NavigationSection from './components/NavigationSection.svelte';
	import OverlaysSection from './components/OverlaysSection.svelte';

	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { scrollEdges } from '#ui/lib/scroll-edges.js';

	/**
	 * The living catalogue of `#ui`: every wrapped control in every variant, size and state.
	 * A change to a shared component is checked here first, in both viewports, before it is
	 * checked on the pages that use it. One section component per group; a new shared
	 * component gets a specimen in the section it belongs to.
	 */
	const SECTIONS = [
		{ id: 'foundations', name: 'Foundations' },
		{ id: 'buttons', name: 'Buttons' },
		{ id: 'fields', name: 'Fields' },
		{ id: 'choice', name: 'Choice' },
		{ id: 'navigation', name: 'Tabs' },
		{ id: 'feedback', name: 'Feedback' },
		{ id: 'overlays', name: 'Overlays' },
		{ id: 'blocks', name: 'Blocks' }
	];

	let active = $state(SECTIONS[0].id);
	let root = $state<HTMLElement | null>(null);

	// Scrolls the admin content area only: `scrollIntoView` would also drag the app shell
	// (an `overflow: hidden` box is still scrollable from script) up with it.
	const jump = (id: string) => {
		const target = document.getElementById(id);
		const scroller = root?.closest<HTMLElement>('.overflow-auto');
		if (!target || !scroller) return;
		const top =
			target.getBoundingClientRect().top -
			scroller.getBoundingClientRect().top +
			scroller.scrollTop -
			NAV_CLEARANCE;
		scroller.scrollTo({ top, behavior: 'smooth' });
	};
	// The sticky section nav, plus a little air.
	const NAV_CLEARANCE = 72;

	onMount(() => {
		// The section nearest the top of the scroller is the current one.
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) active = entry.target.id;
				}
			},
			{ rootMargin: '-15% 0px -75% 0px' }
		);
		root?.querySelectorAll('section[id]').forEach((s) => observer.observe(s));
		return () => observer.disconnect();
	});
</script>

<svelte:head>
	<title>UI kit | Culinary Report Admin</title>
</svelte:head>

<div class="flex flex-col pb-24" bind:this={root}>
	<AdminPageHeader
		title="UI kit"
		description="The design system as it actually renders: every shared control, in every state. Check a change here before checking the pages." />

	<nav
		aria-label="Sections"
		class="bg-sand/95 border-line sticky -top-4 z-20 -mx-1 mb-6 border-b px-1 pt-6 pb-2.5 backdrop-blur">
		<div
			use:scrollEdges={{ axis: 'x', follow: '[aria-current="page"]' }}
			class="scroll-fade-x no-scrollbar flex gap-2 overflow-x-auto">
			{#each SECTIONS as s (s.id)}
				<button
					type="button"
					class="chip pop pop-press shrink-0"
					aria-current={active === s.id ? 'page' : undefined}
					onclick={() => jump(s.id)}>
					{s.name}
				</button>
			{/each}
		</div>
	</nav>

	<div class="flex flex-col gap-14">
		<FoundationsSection />
		<ButtonsSection />
		<FieldsSection />
		<ChoiceSection />
		<NavigationSection />
		<FeedbackSection />
		<OverlaysSection />
		<BlocksSection />
	</div>
</div>
