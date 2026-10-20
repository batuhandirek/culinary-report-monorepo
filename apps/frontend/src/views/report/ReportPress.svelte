<script lang="ts">
	import type { ReportPress } from 'client';

	// "In the press": the month's features, lists and passing mentions found by the news and web
	// search, features first.
	interface Props {
		press: ReportPress;
	}

	let { press }: Props = $props();

	const KINDS: Record<string, string> = {
		feature: 'Feature',
		listicle: 'On a list',
		passing: 'Mentioned'
	};
	const counts = $derived(
		[
			press.features && `${press.features} ${press.features === 1 ? 'feature' : 'features'}`,
			press.listicles && `${press.listicles} ${press.listicles === 1 ? 'list' : 'lists'}`,
			press.passing && `${press.passing} passing ${press.passing === 1 ? 'mention' : 'mentions'}`
		]
			.filter(Boolean)
			.join(', ')
	);
</script>

<div class="mt-8 break-inside-avoid">
	<h3 class="m-0 text-base font-semibold">In the press</h3>
	<p class="text-muted-foreground m-0 mt-0.5 mb-3 text-xs">{counts} this month</p>
	<ul class="m-0 flex list-none flex-col p-0">
		{#each press.items as item (item.url)}
			<li class="border-line border-t py-2">
				<p class="m-0 flex items-baseline gap-2 text-[13px]">
					<span class="eyebrow text-beet shrink-0">{KINDS[item.kind] ?? item.kind}</span>
					<a href={item.url} target="_blank" rel="noreferrer" class="text-ink min-w-0 font-semibold"
						>{item.title}</a>
				</p>
				<p class="text-muted-foreground m-0 mt-0.5 text-xs">
					{[item.outlet, item.publishedAt].filter(Boolean).join(' · ')}{item.summary
						? ` — ${item.summary}`
						: ''}
				</p>
			</li>
		{/each}
	</ul>
</div>
