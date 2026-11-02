<script lang="ts">
	import type { ReportAspect, ReportClaim, ReportPost } from 'client';
	import { renderSVG } from 'uqr';

	import { authorLabel } from '#lib/culinary.js';

	// Media coverage: each blog article that wrote about the brand this month, newest first, in a
	// block of its own: the blog, the headline, what it says about the brand, its praise,
	// complaints and noted facts by theme, and a QR code of the link so the printed report leads to it.
	interface Props {
		// The report's blog articles
		articles: ReportPost[];
		// How many get a block; the rest are named in one line
		limit: number;
		/** The aspect vocabulary at the build (`ReportData.aspects`): the themes' labels */
		aspects?: ReportAspect[];
	}

	let { articles, limit, aspects }: Props = $props();

	const byKey = $derived(new Map((aspects ?? []).map((a) => [a.key, a])));

	const sorted = $derived([...articles].sort((a, b) => b.postedAt.localeCompare(a.postedAt)));
	const shown = $derived(sorted.slice(0, limit));
	const rest = $derived(sorted.slice(limit));
	const blogs = $derived(new Set(articles.map((a) => a.author ?? a.url)).size);

	const dateLabel = (iso: string) =>
		new Date(iso).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC'
		});

	// What a claim is about: its aspect as the report's own vocabulary labels it (its root when it
	// has no aspect), the key itself in a report built before the vocabulary was kept
	const claimLabel = (p: ReportClaim) => byKey.get(p.theme ?? p.topic)?.label ?? p.theme ?? p.topic;

	// One row per theme and side, with how the article put it; "Noted" is what it said that is
	// neither praise nor complaint (absent in reports built before it was kept)
	const claimRows = (post: ReportPost) =>
		(
			[
				['Praise', post.praise],
				['Complaint', post.complaints],
				['Noted', post.noted ?? []]
			] as const
		).flatMap(([side, claims]) => {
			const byLabel: Record<string, string[]> = {};
			for (const p of claims) (byLabel[claimLabel(p)] ??= []).push(p.detail);
			return Object.entries(byLabel).map(([label, details]) => ({ side, label, details }));
		});

	// Drawn locally, so printing needs no network; no quiet zone, the frame pads it
	const qr = (url: string) => renderSVG(url, { ecc: 'M', border: 0, pixelSize: 1 });
</script>

<div>
	<p class="text-muted-foreground m-0 mb-4 text-xs">
		{articles.length}
		{articles.length === 1 ? 'article' : 'articles'} on {blogs}
		{blogs === 1 ? 'blog' : 'blogs'} wrote about you this month. Scan a code to read one.
	</p>

	<div class="flex flex-col gap-3">
		{#each shown as article (article.postId)}
			{@const rows = claimRows(article)}
			<article
				class="bg-paper border-line grid grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-md border p-4 break-inside-avoid">
				<div class="min-w-0">
					<p class="eyebrow text-beet m-0">
						{authorLabel(article.platform, article.author)} · {dateLabel(
							article.postedAt
						)}
					</p>
					<!-- Reports built before headlines were kept have none: the blog's name above says it -->
					{#if article.title}
						<h3 class="m-0 mt-1 text-base leading-snug font-semibold">
							<a
								href={article.url}
								target="_blank"
								rel="noreferrer"
								class="text-ink no-underline">{article.title}</a>
						</h3>
					{/if}

					<p class="text-muted-foreground m-0 mt-3 text-[11px] font-semibold">
						What they say about you
					</p>
					<p class="text-reading-ink m-0 mt-0.5 text-[13px] leading-snug">
						{article.said.join(' · ')}
					</p>

					{#if rows.length}
						<ul class="m-0 mt-3 flex list-none flex-col gap-1.5 p-0">
							{#each rows as row (`${row.side}:${row.label}`)}
								<li class="flex items-baseline gap-2 text-xs">
									<span
										class={[
											'shrink-0 rounded-full px-2 py-px text-[11px] font-semibold whitespace-nowrap',
											row.side === 'Praise'
												? 'bg-primary-darker text-white'
												: row.side === 'Complaint'
													? 'bg-beet text-white'
													: 'bg-wash text-ink'
										]}>{row.side}: {row.label}</span>
									<span class="text-muted-foreground min-w-0"
										>{row.details.join('; ')}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<a
					href={article.url}
					target="_blank"
					rel="noreferrer"
					class="flex w-24 flex-col items-center gap-1 self-start no-underline"
					aria-label="Open the article">
					<span class="qr bg-paper border-line block w-full rounded-md border p-1.5">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- an SVG drawn here from the article's URL -->
						{@html qr(article.url)}
					</span>
					<span class="text-muted-foreground text-[10px]">Scan to read</span>
				</a>
			</article>
		{/each}
	</div>

	{#if rest.length}
		<p class="text-muted-foreground m-0 mt-2 text-xs">
			Also: {rest
				.map((a) => `${a.title ?? 'an article'} (${authorLabel(a.platform, a.author)})`)
				.join(', ')}.
		</p>
	{/if}
</div>

<style>
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
