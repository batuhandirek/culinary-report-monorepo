<script lang="ts">
	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	// `class` is spelled out per swatch so Tailwind sees the literal utility.
	const GROUNDS = [
		{ name: 'sand', use: 'the page', class: 'bg-sand' },
		{ name: 'paper', use: 'cards, sheets, bars', class: 'bg-paper' },
		{ name: 'wash', use: 'image wells, quiet panels', class: 'bg-wash' },
		{ name: 'tint', use: 'seller notes, unread, selected', class: 'bg-tint' },
		{ name: 'line', use: 'hairlines', class: 'bg-line' },
		{ name: 'input', use: 'field borders', class: 'bg-input' }
	];
	const INKS = [
		{ name: 'ink', use: 'text, dark buttons', class: 'bg-ink' },
		{ name: 'reading-ink', use: 'long-form body', class: 'bg-reading-ink' },
		{ name: 'muted-foreground', use: 'secondary text', class: 'bg-muted-foreground' },
		{ name: 'faint', use: 'placeholders, tertiary', class: 'bg-faint' }
	];
	const ACCENTS = [
		{ name: 'primary', use: 'the one primary action, the wordmark', class: 'bg-primary' },
		{ name: 'primary-lighter', use: 'primary hover', class: 'bg-primary-lighter' },
		{ name: 'primary-darker', use: 'green text, thin marks', class: 'bg-primary-darker' },
		{ name: 'grape', use: 'links on paper, the focus ring', class: 'bg-grape' },
		{ name: 'acid', use: 'pixel labels on ink, the primary fill', class: 'bg-acid' },
		{ name: 'chili', use: 'the active tab rule', class: 'bg-chili' },
		{ name: 'beet', use: 'pixel labels on paper', class: 'bg-beet' }
	];
	const SEMANTIC = [
		{ name: 'success', use: 'done, verified', class: 'bg-success' },
		{ name: 'warning', use: 'needs attention', class: 'bg-warning' },
		{ name: 'destructive', use: 'errors, deleting', class: 'bg-destructive' }
	];
	const SCALE = [
		{ name: 'text-xs', px: 12, class: 'text-xs' },
		{ name: 'text-sm', px: 13, class: 'text-sm' },
		{ name: 'text-base', px: 15, class: 'text-base' },
		{ name: 'text-lg', px: 17, class: 'text-lg' },
		{ name: 'text-xl', px: 19, class: 'text-xl' },
		{ name: 'text-2xl', px: 22, class: 'text-2xl' },
		{ name: 'text-3xl', px: 26, class: 'text-3xl' },
		{ name: 'text-4xl', px: 32, class: 'text-4xl' }
	];
	const SHADOWS = [
		{ name: 'shadow-xs', class: 'shadow-xs' },
		{ name: 'shadow-sm', class: 'shadow-sm' },
		{ name: 'shadow-md', class: 'shadow-md' },
		{ name: 'shadow-lg', class: 'shadow-lg' },
		{ name: 'shadow-sticker', class: 'shadow-sticker' },
		{ name: 'shadow-stamp', class: 'shadow-stamp border-2 border-ink' }
	];
	const RADII = [
		{ name: 'rounded-sm · 6', class: 'rounded-sm' },
		{ name: 'rounded-md · 10', class: 'rounded-md' },
		{ name: 'rounded-lg · 12', class: 'rounded-lg' },
		{ name: 'rounded-xl · 16', class: 'rounded-xl' },
		{ name: 'rounded-full', class: 'rounded-full' }
	];
</script>

{#snippet swatches(list: { name: string; use: string; class: string }[])}
	<div class="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
		{#each list as c (c.name)}
			<div class="flex min-w-0 items-center gap-2.5">
				<span class={['border-ink/10 size-10 shrink-0 rounded-md border', c.class]}></span>
				<span class="flex min-w-0 flex-col">
					<span class="truncate text-sm font-semibold">{c.name}</span>
					<span class="text-muted-foreground truncate text-xs">{c.use}</span>
				</span>
			</div>
		{/each}
	</div>
{/snippet}

<KitSection
	id="foundations"
	title="Foundations"
	description="The app's working layer under the brand: oat ground with grain over a faint dot grid, plum ink, hairline cards. Dense screens (admin, portal) are built from these; public pages add the Brand layer above. Tokens live in `app.css`.">
	<KitSpecimen label="Grounds and lines" ground="paper">
		{@render swatches(GROUNDS)}
	</KitSpecimen>
	<KitSpecimen label="Ink" ground="paper">
		{@render swatches(INKS)}
	</KitSpecimen>
	<KitSpecimen
		label="Accents"
		note="Acid is a fill for the one primary action per view, never text on paper"
		ground="paper">
		{@render swatches(ACCENTS)}
	</KitSpecimen>
	<KitSpecimen label="Semantic" ground="paper">
		{@render swatches(SEMANTIC)}
	</KitSpecimen>

	<KitSpecimen
		label="Type scale"
		note="Onest for every sentence and price; display headlines are Bricolage (Brand)"
		ground="paper"
		stack
		class="items-start gap-1.5">
		{#each SCALE as s (s.name)}
			<div class="flex w-full items-baseline gap-4">
				<span class="text-muted-foreground w-24 shrink-0 text-xs tabular-nums"
					>{s.name} · {s.px}</span>
				<span class={['truncate font-semibold', s.class]}
					>İkinci el Çiçek Sepeti ₺12.500</span>
			</div>
		{/each}
	</KitSpecimen>

	<KitSpecimen
		label="Type roles"
		note="Weight and tracking; size comes from the scale"
		ground="paper"
		stack
		class="items-start">
		<p class="type-hero text-4xl">type-hero — Fotoğrafını çek</p>
		<p class="type-title text-2xl">type-title — Satıcının notları</p>
		<p class="type-body text-base">
			type-body — Kutusu ve faturası duruyor, pili yeni değişti.
		</p>
		<p class="type-meta text-sm">type-meta — 6 Eki 2026 · 128 görüntülenme</p>
		<p class="text-primary text-2xl font-bold">
			₺10.000 <span class="text-muted-foreground text-sm font-medium"
				>price: Onest bold, text-primary</span>
		</p>
	</KitSpecimen>

	<KitSpecimen
		label="Character utilities"
		note="The pixel faces are accents for short labels — never prose, never prices"
		wide
		stack
		class="gap-5">
		<div class="flex flex-wrap items-center gap-x-8 gap-y-3">
			<span class="eyebrow text-muted-foreground">eyebrow · muted</span>
			<span class="eyebrow text-beet">eyebrow · beet</span>
			<span class="font-term text-lg leading-none">font-term — 6 ilan · kargo dahil</span>
			<span class="ink-strip w-fit">ink-strip — alıcı koruması dahil</span>
		</div>
		<div class="section-rule">
			<h3 class="type-title text-lg">section-rule</h3>
			<a href="#foundations" class="eyebrow text-beet">Tümü</a>
		</div>
		<div class="flex flex-wrap items-center gap-6">
			<div class="bg-wash relative h-28 w-40 rounded-md">
				<span class="sticker">Yeni</span>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<span class="chip pop">chip</span>
				<span class="chip pop" aria-current="page">chip · active</span>
			</div>
			<div class="bg-paper border-line shadow-sticker rounded-md border px-4 py-3 text-sm">
				shadow-sticker card
			</div>
			<div class="bg-paper border-line pop-lift rounded-md border px-4 py-3 text-sm">
				pop-lift (hover)
			</div>
		</div>
	</KitSpecimen>

	<KitSpecimen label="Radius" note="Cards and panels are `rounded-md`" class="gap-5">
		{#each RADII as r (r.name)}
			<div class="flex flex-col items-center gap-2">
				<span class={['bg-paper border-line size-14 border', r.class]}></span>
				<span class="text-muted-foreground text-xs">{r.name}</span>
			</div>
		{/each}
	</KitSpecimen>

	<KitSpecimen
		label="Elevation"
		note="Real shadows are for things that float; `stamp` is the primary action's"
		class="gap-5">
		{#each SHADOWS as s (s.name)}
			<div class="flex flex-col items-center gap-2">
				<span class={['bg-paper size-14 rounded-md', s.class]}></span>
				<span class="text-muted-foreground text-xs">{s.name}</span>
			</div>
		{/each}
	</KitSpecimen>
</KitSection>
