<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';

	import Button from '#ui/wrapped/Button.svelte';

	// Where a city's month ends: the product. An owner whose place is on the list, or who wonders
	// why it is not, is the person the monthly report is for.
	interface Props {
		cityName: string;
	}

	let { cityName }: Props = $props();
</script>

<section class="mx-auto w-full max-w-[60rem] px-4 pt-2 pb-14 md:pb-20" aria-labelledby="highlights-pitch">
	<!-- The night moment: a grape field, oat text, the acid stamp. -->
	<div class="bg-grape text-sand flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:gap-10 md:p-10">
		<div class="min-w-0">
			<div class="stamp text-acid">Munchwerk for Venues</div>
			<h2 id="highlights-pitch" class="type-display mt-3 mb-0 text-2xl text-balance md:text-4xl">
				Run a place in {cityName}? See your own month
			</h2>
			<p class="mt-3 mb-0 max-w-[52ch] text-sm leading-relaxed md:text-base">
				A monthly report on what TikTok, Instagram and your guests' reviews said about your
				place: who posted, what they praised, what to answer.
			</p>
		</div>
		<div class="flex shrink-0">
			<Button href="/" size="lg" suffixIcon={ArrowRight}>See the report</Button>
		</div>
	</div>
</section>
