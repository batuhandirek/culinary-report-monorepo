<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';

	import Button from '#ui/wrapped/Button.svelte';

	// Where every blog page ends: the product. A reader who came from search about their
	// venue's TikTok or reviews is the person the monthly report is for.
</script>

<section class="narrow pt-2 pb-14 md:pb-20" aria-labelledby="blog-pitch-band">
	<!-- The night moment: a grape field, oat text, the acid stamp. -->
	<div class="bg-grape text-sand flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-10">
		<div class="min-w-0">
			<div class="stamp text-acid">Munchwerk for Venues</div>
			<h2 id="blog-pitch-band" class="type-display mt-3 mb-0 text-2xl text-balance md:text-4xl">
				See what your guests post about you
			</h2>
			<p class="mt-3 mb-0 max-w-[52ch] text-sm leading-relaxed md:text-base">
				A monthly report on your place's TikTok, Instagram and Google reviews: who posted, what
				guests praised, what they complained about, and what changed.
			</p>
		</div>
		<div class="flex shrink-0">
			<Button href="/" size="lg" suffixIcon={ArrowRight}>See the report</Button>
		</div>
	</div>
</section>
