<script lang="ts">
	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import Logo from '#components/Logo.svelte';

	// The Munchwerk brand layer (brand skill, `design-tokens.txt`): the two brand colours as
	// fields with the only text allowed on them, the display face, stamps, stickers, hard
	// shadows and the bite. Public pages, share cards and the report are built from these.
	const BRAND = [
		{ name: 'acid', use: 'field: Heat Check, the hero bar', class: 'bg-acid' },
		{ name: 'grape', use: 'field: evening, trends, pitch bands', class: 'bg-grape' },
		{ name: 'grape-deep', use: 'field: the report cover, night', class: 'bg-grape-deep' },
		{ name: 'lavender', use: 'purple text on ink only', class: 'bg-lavender' },
		{ name: 'beet', use: 'Dish of the Month; never beside grape', class: 'bg-beet' },
		{ name: 'chili', use: 'rising marks, 24px+; never beside grape', class: 'bg-chili' }
	];
	const SHADOWS = [
		{ name: 'shadow-stamp · 4', class: 'shadow-stamp' },
		{ name: 'shadow-hard · 8', class: 'shadow-hard' },
		{ name: 'shadow-hard-grape', class: 'shadow-hard-grape' },
		{ name: 'shadow-hard-acid', class: 'shadow-hard-acid bg-ink!' }
	];
</script>

<KitSection
	id="brand"
	title="Brand"
	description="Munchwerk: bold modern pop. Oat and plum ink by day; acid lime and grape are fields, not text on light grounds. Bricolage Grotesque 800 for headlines and numbers, stamps for one or two words, hard offsets instead of soft shadows. Rules and contrast in the brand skill.">
	<KitSpecimen label="Logo" note="Logo · width, variant wordmark | stacked, tone ink | oat | acid · files in static/brand" class="gap-6">
		<Logo width={180} noNav />
		<span class="bg-acid p-3"><Logo width={140} noNav /></span>
		<span class="bg-grape p-3"><Logo width={140} noNav tone="oat" /></span>
		<span class="bg-ink p-4"><Logo width={110} variant="stacked" noNav tone="acid" /></span>
	</KitSpecimen>

	<KitSpecimen label="Brand colours" ground="paper">
		<div class="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
			{#each BRAND as c (c.name)}
				<div class="flex min-w-0 items-center gap-2.5">
					<span class={['border-ink/10 size-10 shrink-0 rounded-md border', c.class]}></span>
					<span class="flex min-w-0 flex-col">
						<span class="truncate text-sm font-semibold">{c.name}</span>
						<span class="text-muted-foreground truncate text-xs">{c.use}</span>
					</span>
				</div>
			{/each}
		</div>
	</KitSpecimen>

	<KitSpecimen
		label="Fields and their text"
		note="Ink on acid · oat or acid on grape (never ink, 2.6:1) · lavender only on ink or deep grape"
		wide
		class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<div class="bg-acid text-ink flex flex-col gap-1 p-4">
			<span class="stamp">Heat Check</span>
			<span class="type-display text-2xl">Ink on acid</span>
		</div>
		<div class="bg-grape text-sand flex flex-col gap-1 p-4">
			<span class="stamp text-acid">Trends</span>
			<span class="type-display text-2xl">Oat on grape</span>
		</div>
		<div class="bg-grape-deep text-sand flex flex-col gap-1 p-4">
			<span class="stamp text-lavender">Your report</span>
			<span class="type-display text-2xl">Oat on deep grape</span>
		</div>
		<div class="bg-ink text-sand flex flex-col gap-1 p-4">
			<span class="stamp text-acid">Posts</span>
			<span class="number-hero text-acid text-5xl">412</span>
		</div>
	</KitSpecimen>

	<KitSpecimen label="Display type" note="type-hero · type-display · number-hero" ground="paper" stack class="items-start">
		<p class="type-hero m-0 text-5xl">Your brunch got noticed</p>
		<p class="type-display m-0 text-2xl">Most talked-about places</p>
		<div class="flex items-baseline gap-4">
			<span class="number-hero text-7xl">01</span>
			<span class="type-display text-xl">Luna Ramen</span>
		</div>
		<p class="text-primary-darker type-display m-0 text-base">+12 places</p>
	</KitSpecimen>

	<KitSpecimen
		label="Stamps and stickers"
		note="stamp (11px) · stamp-l (14px) · at most two tilts per composition, never the same angle"
		stack
		class="items-start gap-5">
		<div class="flex flex-wrap items-center gap-x-8 gap-y-3">
			<span class="stamp text-beet">Heat Check · Oct 2026</span>
			<span class="stamp-l text-grape">Berlin · est. 2026</span>
		</div>
		<div class="flex flex-wrap items-center gap-6 pt-2">
			<span class="bg-acid border-ink stamp tilt-left inline-block rounded-[12px] border-[3px] px-3 py-2">Heat Check</span>
			<span class="bg-grape text-sand stamp tilt-right inline-block rounded-full px-3 py-2">New in town</span>
			<span class="bg-ink text-sand inline-block rounded-full px-3 py-1.5 text-sm font-bold">@essenmitlena</span>
		</div>
	</KitSpecimen>

	<KitSpecimen label="Hard shadows" note="Never blurred: ink by default, grape or acid under an ink shape" class="gap-6 pb-6">
		{#each SHADOWS as s (s.name)}
			<div class="flex flex-col items-center gap-3">
				<span class={['bg-paper border-ink size-14 border-[3px]', s.class]}></span>
				<span class="text-muted-foreground text-xs">{s.name}</span>
			</div>
		{/each}
	</KitSpecimen>

	<KitSpecimen label="The bite" note="A mouthful with tooth marks cut from the top-right corner, one per composition; the shadow goes on a wrapper" class="gap-8 pb-6">
		<div class="shadow-hard">
			<div class="bg-acid bite flex h-24 w-40 items-end p-3 [--bite:1rem]">
				<span class="type-display text-lg">Bitten</span>
			</div>
		</div>
		<div class="bg-grape bite text-sand flex h-16 w-28 items-center justify-center [--bite:0.65rem]">
			<span class="stamp">New</span>
		</div>
	</KitSpecimen>
</KitSection>
