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
	<div
		class="bg-paper border-line shadow-sticker flex flex-col gap-5 rounded-md border p-5 md:flex-row md:items-center md:justify-between md:gap-8 md:p-8">
		<div class="min-w-0">
			<div class="eyebrow text-beet">For owners</div>
			<h2 id="highlights-pitch" class="type-title text-ink mt-2 mb-0 text-xl md:text-2xl">
				Run a place in {cityName}? See your own month
			</h2>
			<p class="text-muted-foreground mt-2 mb-0 max-w-[52ch] text-sm leading-relaxed">
				A monthly report on what TikTok, Instagram and your guests' reviews said about your
				venue: who posted, what they praised, what to answer.
			</p>
		</div>
		<div class="flex shrink-0">
			<Button href="/" size="lg" suffixIcon={ArrowRight}>See the report</Button>
		</div>
	</div>
</section>
