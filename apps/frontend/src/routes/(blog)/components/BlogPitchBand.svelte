<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';

	import Button from '#ui/wrapped/Button.svelte';

	// Where every blog page ends: the product. A reader who came from search about their
	// venue's TikTok or reviews is the person the monthly report is for.
</script>

<section class="narrow pt-2 pb-14 md:pb-20" aria-labelledby="blog-pitch-band">
	<div
		class="bg-paper border-line shadow-sticker flex flex-col gap-5 rounded-md border p-5 md:flex-row md:items-center md:justify-between md:gap-8 md:p-8">
		<div class="min-w-0">
			<div class="eyebrow text-beet">Culinary Report</div>
			<h2 id="blog-pitch-band" class="type-title text-ink mt-2 mb-0 text-xl md:text-2xl">
				Know what people say about your venue
			</h2>
			<p class="text-muted-foreground mt-2 mb-0 max-w-[52ch] text-sm leading-relaxed">
				A monthly report on your venue's TikTok, Instagram and Google reviews: what guests
				praised, what they complained about, and what changed.
			</p>
		</div>
		<div class="flex shrink-0">
			<Button href="/" size="lg" suffixIcon={ArrowRight}>See the report</Button>
		</div>
	</div>
</section>
