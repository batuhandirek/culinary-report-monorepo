<script lang="ts">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import type { AdminReportOutputDto, ReportAnalysisPublic } from 'client';

	import RatingSparkline from './RatingSparkline.svelte';
	import ReportAnalysis from './ReportAnalysis.svelte';
	import ReportAppendix from './ReportAppendix.svelte';
	import ReportBranches from './ReportBranches.svelte';
	import ReportBusyness from './ReportBusyness.svelte';
	import ReportCityTrends from './ReportCityTrends.svelte';
	import ReportComments from './ReportComments.svelte';
	import ReportMedia from './ReportMedia.svelte';
	import ReportNeighbourhoodChanges from './ReportNeighbourhoodChanges.svelte';
	import ReportOwnAccounts from './ReportOwnAccounts.svelte';
	import ReportPatterns from './ReportPatterns.svelte';
	import ReportPress from './ReportPress.svelte';
	import ReportPrices from './ReportPrices.svelte';
	import ReportReviewPlatforms from './ReportReviewPlatforms.svelte';
	import ReportSearchRanks from './ReportSearchRanks.svelte';
	import Stars from './Stars.svelte';
	import TopicBars from './TopicBars.svelte';

	import { calendarLine } from '#lib/city-calendar.js';
	import {
		authorLabel,
		compact,
		monthLabel,
		PLATFORM_LABELS,
		TOPIC_LABELS,
		viewsLabel
	} from '#lib/culinary.js';
	import {
		CoverKpi,
		FULL_SECTIONS,
		PlacePart,
		platformsLabel,
		postsSummary,
		type Section,
		SectionKind
	} from '#lib/report-sections.js';

	// A brand's monthly report, laid out as a document: on screen in a sheet, in print on A4
	// pages (the `/print/report` page sets the page box). Grids switch at `sm`, which an A4
	// page's 182mm column clears, so print gets the two-column layout. The brand's figures come
	// first; each branch's place figures (popular times, tables, prices, the neighbourhood,
	// Google Maps searches) follow, one branch after another, all of them in print too.
	// Which sections it shows, in which order and with which settings, is the report's
	// `sections` (its type's at the build); the cover comes first and the appendix last.
	interface Props {
		report: Pick<AdminReportOutputDto, 'data' | 'highlights'> & {
			sections?: AdminReportOutputDto['sections'];
			/** What moved, and why it might have; absent in reports built before it */
			analysis?: ReportAnalysisPublic;
		};
	}

	let { report }: Props = $props();
	const data = $derived(report.data);
	// The month in the city: rainy weekends, holidays, events (absent in older reports)
	const contextLine = $derived(calendarLine(data.context));
	const social = $derived(data.social);
	const reviews = $derived(data.reviews);
	const highlights = $derived(report.highlights);

	const layout = $derived<Section[]>(report.sections?.length ? report.sections : FULL_SECTIONS);
	const sectionOf = (kind: SectionKind) => layout.find((s) => s.kind === kind);
	const cover = $derived(sectionOf(SectionKind.Cover));
	// The posts section's platforms (none picked: every one) and how many posts get a card
	const postsSection = $derived(sectionOf(SectionKind.Posts));
	const shownPosts = $derived(
		postsSection?.platforms?.length
			? data.posts.filter((p) => (postsSection.platforms as string[]).includes(p.platform))
			: data.posts
	);
	// Its counts: the month's own unless some platforms are left out
	const postStats = $derived(postsSection?.platforms?.length ? postsSummary(shownPosts) : social);
	const POSTS_SHOWN = $derived(postsSection?.limit ?? 6);
	const placeParts = $derived(sectionOf(SectionKind.Places)?.parts ?? []);
	// Media coverage: the month's blog articles, each in a block of its own
	const articles = $derived(data.posts.filter((p) => p.platform === 'blog'));
	const ARTICLES_SHOWN = $derived(sectionOf(SectionKind.Media)?.limit ?? 6);

	const issue = $derived(data.month.slice(5));
	const branches = $derived(data.branches);
	const chain = $derived(branches.length > 1);
	// A one-branch brand's place: its address and Google details go on the cover
	const only = $derived(branches.length === 1 ? branches[0] : undefined);
	const facts = $derived([data.brand.category, only?.district].filter(Boolean).join(' · '));
	// The brand's all-time Google stars: one place's own, a chain's over all its places' reviews
	const allTime = $derived.by(() => {
		const rated = branches.filter((b) => b.rating !== undefined && b.reviewsCount);
		const count = rated.reduce((sum, b) => sum + b.reviewsCount!, 0);
		return count
			? rated.reduce((sum, b) => sum + b.rating! * b.reviewsCount!, 0) / count
			: undefined;
	});
	const placeLabel = (b: (typeof branches)[number]) =>
		chain ? (b.street ?? b.name) : data.brand.name;
	// A place's all-time rating among its district's and its kind of food's venues (20+ reviews);
	// absent in reports built before it
	const benchmarkParts = (b: (typeof branches)[number]) => {
		const r = b.ratingBenchmark;
		if (!r) return [];
		return [
			r.district &&
				`above ${r.district.percentile} % of ${r.district.label}'s ${r.district.venues} food venues`,
			r.topic &&
				`above ${r.topic.percentile} % of ${r.topic.city}'s ${r.topic.venues} ${r.topic.label} places`
		].filter((p): p is string => !!p);
	};
	const districts = $derived(
		[...new Set(branches.map((b) => b.district).filter(Boolean))].join(', ')
	);

	// Against the month before: absent for a first report, and review figures only when that
	// month's reviews were collected
	const previous = $derived(data.previous);
	const prevMonth = $derived(
		previous
			? new Date(`${previous.month}-01T00:00:00Z`).toLocaleString('en', {
					month: 'short',
					timeZone: 'UTC'
				})
			: ''
	);
	type Delta = { text: string; dir: 'up' | 'down' | 'flat' };
	const delta = (
		now: number | undefined,
		before: number | undefined,
		kind: 'count' | 'stars' | 'share'
	): Delta | undefined => {
		if (now === undefined || before === undefined) return undefined;
		const diff = now - before;
		const dir = Math.abs(diff) < 1e-9 ? 'flat' : diff > 0 ? 'up' : 'down';
		const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
		const abs = Math.abs(diff);
		const text =
			kind === 'stars'
				? `${sign}${abs.toFixed(1)}`
				: kind === 'share'
					? `${sign}${Math.round(abs * 100)} pts`
					: before > 0
						? `${sign}${Math.round((abs / before) * 100)}%`
						: `${sign}${compact(abs)}`;
		return { text, dir };
	};
	const was = (text: string | undefined) => (text && prevMonth ? ` · ${prevMonth}: ${text}` : '');
	const pct = (share: number | undefined) =>
		share === undefined ? undefined : `${Math.round(share * 100)}%`;

	// Google Maps details on the cover; both absent when no scrape carried them (unknown)
	const AMENITY_PILLS = 8;
	const amenities = $derived(only?.amenities ?? []);
	const starShape = $derived.by(() => {
		const dist = only?.reviewsDistribution;
		if (!dist) return [];
		const rows = [
			{ stars: 5, count: dist.fiveStar },
			{ stars: 4, count: dist.fourStar },
			{ stars: 3, count: dist.threeStar },
			{ stars: 2, count: dist.twoStar },
			{ stars: 1, count: dist.oneStar }
		];
		const total = rows.reduce((sum, r) => sum + r.count, 0);
		return total ? rows.map((r) => ({ ...r, share: r.count / total })) : [];
	});

	const trend = $derived(only?.ratingTrend ?? []);
	const trendNote = $derived.by(() => {
		const rated = trend.filter((p) => p.rating !== undefined);
		if (rated.length < 2) return '';
		const first = rated[0];
		const firstMonth = new Date(`${first.month}-01T00:00:00Z`).toLocaleString('en', {
			month: 'short',
			timeZone: 'UTC'
		});
		return ` · ${first.rating!.toFixed(1)} in ${firstMonth}`;
	});

	const allKpis = $derived([
		{
			key: CoverKpi.Views,
			value: compact(social.views),
			label: 'Views',
			note:
				`of ${social.postCount} ${social.postCount === 1 ? 'post' : 'posts'} by others` +
				was(
					previous &&
						`${compact(previous.social.views)} from ${previous.social.postCount} ${previous.social.postCount === 1 ? 'post' : 'posts'}`
				),
			delta: delta(social.views, previous?.social.views, 'count')
		},
		{
			key: CoverKpi.Creators,
			value: `${social.creators}`,
			label: social.creators === 1 ? 'Creator' : 'Creators',
			note:
				([
					social.tiktokCount ? `${social.tiktokCount} TikTok` : '',
					social.instagramCount ? `${social.instagramCount} Instagram` : '',
					social.promotional ? `${social.promotional} paid` : ''
				]
					.filter(Boolean)
					.join(' · ') || 'no posts this month') +
				was(previous && `${previous.social.creators}`),
			delta: delta(social.creators, previous?.social.creators, 'count')
		},
		{
			key: CoverKpi.Interactions,
			value: compact(social.engagements),
			label: 'Interactions',
			note:
				'likes, comments, saves, shares' +
				was(previous && compact(previous.social.engagements)),
			delta: delta(social.engagements, previous?.social.engagements, 'count')
		},
		{
			key: CoverKpi.Stars,
			value: reviews.avgStars ? reviews.avgStars.toFixed(1) : '—',
			label: 'Stars this month',
			note:
				(allTime !== undefined
					? `${allTime.toFixed(1)} all time on Google${chain ? ` over ${branches.length} places` : trendNote}`
					: 'on Google') + was(previous?.reviews?.avgStars?.toFixed(1)),
			delta: delta(reviews.avgStars, previous?.reviews?.avgStars, 'stars'),
			spark: trend
		},
		{
			key: CoverKpi.Reviews,
			value: `${reviews.count}`,
			label: reviews.count === 1 ? 'Google review' : 'Google reviews',
			note:
				`${reviews.written} with text` +
				was(previous?.reviews && `${previous.reviews.count}`),
			delta: delta(reviews.count, previous?.reviews?.count, 'count')
		},
		{
			key: CoverKpi.Answered,
			value:
				reviews.replyRate === undefined ? '—' : `${Math.round(reviews.replyRate * 100)}%`,
			label: 'Answered',
			note: 'by you, of this month’s reviews' + was(pct(previous?.reviews?.replyRate)),
			delta: delta(reviews.replyRate, previous?.reviews?.replyRate, 'share')
		}
	]);
	// The cover's tiles, in the type's order
	const kpis = $derived(
		(cover?.kpis ?? Object.values(CoverKpi)).flatMap((key) =>
			allKpis.filter((k) => k.key === key)
		)
	);

	// The comparison only says something with enough reviews on both sides
	const split = $derived(reviews.split);
	const showSplit = $derived(split.fiveStar.written >= 3 && split.belowFive.written >= 3);
	const topTopics = (counts: Record<string, number>) =>
		Object.entries(counts)
			.filter(([topic]) => topic !== 'other')
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4);
	const sampleDetails = (
		points: { topic: string; detail: string }[],
		counts: Record<string, number>
	) => {
		const order = topTopics(counts).map(([t]) => t);
		const sorted = points
			.filter((p) => order.includes(p.topic))
			.sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic));
		return [...new Map(sorted.map((p) => [p.detail.toLowerCase(), p])).values()].slice(0, 5);
	};

	const sentimentParts = $derived([
		{ label: 'Positive', n: postStats.sentiment.positive, cls: 'bg-primary-darker' },
		{
			label: 'Mixed or neutral',
			n: postStats.sentiment.mixed + postStats.sentiment.neutral,
			cls: 'bg-strip-muted'
		},
		{ label: 'Negative', n: postStats.sentiment.negative, cls: 'bg-beet' }
	]);
	const sentimentTotal = $derived(sentimentParts.reduce((sum, p) => sum + p.n, 0));
	const maxStars = $derived(Math.max(1, ...reviews.stars.map((s) => s.count)));

	// What guests noticed changed, by what changed ("Portion size: 3 reviews")
	const changeThemes = $derived(reviews.changeThemes ?? []);

	const dishes = $derived(data.dishes.slice(0, sectionOf(SectionKind.Dishes)?.limit ?? 12));
	const maxDish = $derived(Math.max(1, ...dishes.map((d) => d.count)));

	// Each place ranked among its district's neighbours, by views of the posts that named it
	const rankingOf = (branch: (typeof branches)[number]) =>
		[
			...branch.neighbours.map((n) => ({ ...n, self: false })),
			{
				venueId: branch.venueId,
				name: placeLabel(branch),
				category: branch.category,
				posts: branch.social.postCount,
				views: branch.social.views,
				self: true
			}
		].sort((a, b) => b.views - a.views);
	const changesOf = (branch: (typeof branches)[number]) => {
		const c = branch.neighbourhood?.changes;
		return c && c.opened + c.closed + c.reopened > 0 ? c : undefined;
	};

	// The venue next to the competitors its owner picked, on the same month's numbers
	const competitors = $derived(data.competitors ?? []);
	const compareRows = $derived([
		{
			venueId: data.brand.id,
			// A chain compares as the whole brand; its places' tables and foot traffic are under each place
			name: data.brand.name,
			self: true,
			rating: allTime,
			social: social,
			reviewsTracked: true,
			reviews: reviews,
			demand: only?.demand && {
				booked: only.demand.booked,
				evenings: only.demand.evenings.length
			},
			busyness: only?.busyness && {
				index: only.busyness.index,
				previousIndex: only.busyness.previous?.index
			}
		},
		// A whole chain says how many places it counts; one picked for a branch says which
		...competitors.map((c) => ({
			...c,
			name: [
				c.branches ? `${c.name} (${c.branches} places)` : c.name,
				c.against && `vs ${c.against}`
			]
				.filter(Boolean)
				.join(' · '),
			self: false
		}))
	]);
	// Booked out compares as a level (the same question asked of each venue); busyness only as
	// each venue's change on the month before, since Google scales it to the venue's own peak
	const trafficChange = (row: (typeof compareRows)[number]) =>
		row.busyness?.previousIndex !== undefined
			? Math.round(row.busyness.index - row.busyness.previousIndex)
			: undefined;
	const showTables = $derived(compareRows.some((row) => row.demand));
	const showTraffic = $derived(compareRows.some((row) => trafficChange(row) !== undefined));
	const best = (pick: (row: (typeof compareRows)[number]) => number | undefined) =>
		Math.max(...compareRows.map((row) => pick(row) ?? -Infinity));
	const MIN_WRITTEN = 5;
	// Rows with enough written reviews for a share to mean something
	const reviewRows = $derived(
		compareRows.filter((row) => row.reviewsTracked && row.reviews.written >= MIN_WRITTEN)
	);
	// The topics that separate them most: the highest share any of them reached
	const topicColumns = (kind: 'praise' | 'complaints') =>
		Object.keys(TOPIC_LABELS)
			.filter((t) => t !== 'other')
			.map((t) => ({
				topic: t,
				max: Math.max(
					0,
					...reviewRows.map((row) => (row.reviews[kind][t] ?? 0) / row.reviews.written)
				)
			}))
			.filter((c) => c.max > 0)
			.sort((a, b) => b.max - a.max)
			.slice(0, 4)
			.map((c) => c.topic);

	const creators = $derived(data.creators ?? []);
	const creatorsNearby = $derived(
		sectionOf(SectionKind.Creators)?.nearby === false ? [] : (data.creatorsNearby ?? [])
	);
	const replyDrafts = $derived(
		(reviews.replyDrafts ?? []).flatMap((d) => {
			const review = (reviews.list ?? []).find((r) => r.reviewId === d.reviewId);
			return review ? [{ ...d, review }] : [];
		})
	);

	// The competitors a place is compared with: the whole brand's and the ones picked for it
	const competitorsOf = (branch: (typeof branches)[number]) =>
		competitors.filter((c) => !c.branchId || c.branchId === branch.venueId);

	// A place's block, when it has data
	const placeKey = (part: PlacePart, b: (typeof branches)[number]) => {
		switch (part) {
			case PlacePart.Busyness:
				return (b.busyness || b.demand) && `busyness:${b.venueId}`;
			case PlacePart.Prices:
				return b.prices && `prices:${b.venueId}`;
			case PlacePart.Neighbourhood:
				return (b.neighbours.length || changesOf(b)) && `nearby:${b.venueId}`;
			case PlacePart.SearchRanks:
				return b.searchRanks?.length && `search:${b.venueId}`;
		}
	};
	// A section is drawn when it has something to show
	const isVisible = (section: Section): boolean => {
		switch (section.kind) {
			case SectionKind.Analysis:
				return !!report.analysis?.observations.length;
			case SectionKind.Stars:
				return showSplit;
			case SectionKind.Branches:
				return chain;
			case SectionKind.Competitors:
				return competitors.length > 0;
			case SectionKind.Actions:
				return highlights.actions.length > 0;
			case SectionKind.OwnAccounts:
				return !!(data.ownPosts.length || data.ownAccounts?.length);
			case SectionKind.Comments:
				return !!data.comments;
			case SectionKind.Press:
				return !!data.press;
			case SectionKind.Media:
				return articles.length > 0;
			case SectionKind.Creators:
				return !!(creators.length || creatorsNearby.length);
			case SectionKind.Reviews:
				return reviews.count > 0;
			case SectionKind.Replies:
				return replyDrafts.length > 0;
			case SectionKind.Dishes:
				return dishes.length > 0;
			case SectionKind.Places:
				return placeParts.length > 0;
			case SectionKind.Patterns:
				return !!data.correlations;
			case SectionKind.City:
				return !!data.city;
			default:
				return true;
		}
	};
	// What is drawn between the cover and the appendix, in the type's order
	const body = $derived(
		layout.filter(
			(s) => s.kind !== SectionKind.Cover && s.kind !== SectionKind.Appendix && isVisible(s)
		)
	);
	const showAppendix = $derived(!!sectionOf(SectionKind.Appendix));
	// Own accounts, comments and press read as part of the posts section when they follow it
	const SOCIAL_KINDS: string[] = [
		SectionKind.Posts,
		SectionKind.OwnAccounts,
		SectionKind.Comments,
		SectionKind.Press
	];
	const followsSocial = (i: number) => i > 0 && SOCIAL_KINDS.includes(body[i - 1].kind);

	// Sections are numbered in the order they appear; empty ones drop out
	const NUMBER_KEYS: Partial<Record<SectionKind, string>> = {
		[SectionKind.Analysis]: 'moved',
		[SectionKind.Stars]: 'stars',
		[SectionKind.Branches]: 'branches',
		[SectionKind.Competitors]: 'compare',
		[SectionKind.Actions]: 'next',
		[SectionKind.Posts]: 'social',
		[SectionKind.Media]: 'media',
		[SectionKind.Creators]: 'creators',
		[SectionKind.Reviews]: 'reviews',
		[SectionKind.Replies]: 'replies',
		[SectionKind.Dishes]: 'menu',
		[SectionKind.Patterns]: 'patterns',
		[SectionKind.City]: 'city'
	};
	const sections = $derived(
		body.flatMap((section) =>
			section.kind === SectionKind.Places
				? branches.flatMap((b) =>
						placeParts.map((part) => placeKey(part, b)).filter((k): k is string => !!k)
					)
				: (NUMBER_KEYS[section.kind] ?? [])
		)
	);
	const num = (key: string) => String(sections.indexOf(key) + 2).padStart(2, '0');
</script>

{#snippet sectionHead(key: string, kicker: string, title: string)}
	<header class="border-ink mb-6 flex items-end gap-3 border-b-4 pb-3 break-after-avoid">
		<span
			class="bg-acid border-ink text-ink number-hero grid h-11 min-w-11 shrink-0 place-items-center rounded-[6px] border-2 px-1.5 text-[24px]">
			{num(key)}
		</span>
		<div class="min-w-0">
			<p class="stamp text-beet m-0">{kicker}</p>
			<h2 class="type-display m-0 mt-1 text-[26px]">{title}</h2>
		</div>
	</header>
{/snippet}

{#snippet benchmarkLine(rating: number, parts: string[])}
	<p class="m-0 mt-2 text-sm leading-snug">
		<span class="font-semibold tabular-nums">{rating.toFixed(1)} ★</span>
		{#each parts as part (part)}
			<!-- An expression keeps the leading space, which Svelte trims from plain text in an {#each} -->
			<span class="text-muted-foreground">{` · ${part}`}</span>
		{/each}
		<span class="text-muted-foreground text-[11px]">
			(all-time Google rating, against venues with 20+ reviews)</span>
	</p>
{/snippet}

{#snippet pill(text: string)}
	<span
		class="border-line text-muted-foreground rounded-full border px-1.5 py-px text-[10px] font-medium whitespace-nowrap">
		{text}
	</span>
{/snippet}

{#snippet coverSection()}
	<!-- Cover: who, when, the story, the numbers, the findings -->
	<section class="flex flex-col gap-5 break-after-page">
		<!-- The cover block: deep grape with oat, acid and lavender on it (10.9 / 9.8 / 6.9:1),
		     the brand's one bite in its top-right corner, so nothing sits up there -->
		<div
			class="bite bg-grape-deep text-sand flex flex-col gap-6 rounded-[12px] px-6 pt-6 pb-7 break-inside-avoid sm:px-8 sm:pt-7 sm:pb-8"
			style="--bite: 2.5rem;">
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2 pr-12">
				<span
					class="bg-acid text-ink font-display inline-block rounded-[6px] px-2 pt-[0.3em] pb-[0.32em] text-[18px] leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap">
					Munchwerk
				</span>
				<span class="stamp text-lavender">No. {issue}</span>
			</div>

			<div class="flex flex-col gap-3">
				<p class="stamp-l text-acid m-0">Your Munchwerk report · {monthLabel(data.month)}</p>
				{#if facts}<p class="stamp text-lavender m-0">{facts}</p>{/if}
				<h1 class="type-hero text-sand m-0 text-[2.75rem] text-balance sm:text-[3.75rem]">
					{data.brand.name}
				</h1>
				{#if chain}
					<p class="text-sand/85 m-0">
						{branches.length} places: posts and reviews cover all of them, and each place has
						its own pages
					</p>
				{:else if only?.street}
					<p class="text-sand/85 m-0">{only.street}</p>
				{/if}
			</div>

			<div class="border-sand/25 border-t pt-5">
				<p class="stamp text-lavender m-0 mb-3">
					{highlights.kind === 'quiet' ? 'A quiet month' : 'The story of the month'}
				</p>
				<p class="type-display text-acid m-0 text-[28px] text-balance sm:text-[34px]">
					{highlights.title}
				</p>
				<p class="text-sand/85 m-0 mt-3 max-w-[56ch] text-sm leading-snug">
					{highlights.headline}
				</p>
			</div>
		</div>

		<!-- The letter: the editor's read of the month, in prose (absent in reports built before it) -->
		{#if highlights.letter?.length}
			<div class="border-ink border-l-4 pl-4 break-inside-avoid sm:pl-5">
				<p class="stamp text-beet m-0 mb-2">The letter</p>
				<div class="flex max-w-[62ch] flex-col gap-3">
					{#each highlights.letter as paragraph, i (i)}
						<p class="text-reading-ink m-0 text-[15px] leading-relaxed">{paragraph}</p>
					{/each}
				</div>
			</div>
		{/if}

		<div>
			{#if only?.ratingBenchmark}
				{@render benchmarkLine(only.ratingBenchmark.rating, benchmarkParts(only))}
			{/if}
			{#if amenities.length}
				<div class="mt-3 flex flex-wrap gap-1" aria-label="On Google Maps">
					{#each amenities.slice(0, AMENITY_PILLS) as amenity (amenity)}
						{@render pill(amenity)}
					{/each}
					{#if amenities.length > AMENITY_PILLS}
						{@render pill(`+${amenities.length - AMENITY_PILLS} more`)}
					{/if}
				</div>
			{/if}
			{#if starShape.length}
				<div class="mt-3 flex max-w-sm flex-col gap-1">
					<div class="bg-wash flex h-1.5 overflow-hidden rounded-full">
						{#each starShape as row (row.stars)}
							<span
								class="bg-ink h-full"
								style={`width: ${row.share * 100}%; opacity: ${0.2 + (row.stars - 1) * 0.2}`}
							></span>
						{/each}
					</div>
					<p class="text-muted-foreground m-0 text-[11px] tabular-nums">
						All-time Google stars:
						{starShape
							.map((r) => `${r.stars}★ ${Math.round(r.share * 100)}%`)
							.join(' · ')}
					</p>
				</div>
			{/if}
		</div>

		<div
			class="bg-line border-line grid grid-cols-2 gap-px overflow-hidden rounded-md border break-inside-avoid sm:grid-cols-3">
			{#each kpis as kpi (kpi.label)}
				<div class="bg-paper flex flex-col gap-0.5 px-4 py-3">
					<div class="mb-1 flex items-end justify-between gap-2">
						<span class="flex items-baseline gap-1.5">
							<span
								class="font-display text-[28px] leading-none font-extrabold tracking-[-0.02em] tabular-nums"
								>{kpi.value}</span>
							{#if kpi.delta}
								<span
									class={[
										'inline-flex items-center gap-px text-[11px] font-semibold whitespace-nowrap tabular-nums',
										kpi.delta.dir === 'up' && 'text-primary-darker',
										kpi.delta.dir === 'down' && 'text-muted-foreground',
										kpi.delta.dir === 'flat' && 'text-muted-foreground'
									]}
									aria-label={`${kpi.delta.text} against ${prevMonth}`}>
									{#if kpi.delta.dir === 'up'}<ArrowUpIcon class="size-3" />{/if}
									{#if kpi.delta.dir === 'down'}<ArrowDownIcon
											class="size-3" />{/if}
									{kpi.delta.text}
								</span>
							{/if}
						</span>
						{#if kpi.spark}<RatingSparkline points={kpi.spark} />{/if}
					</div>
					<span class="text-ink text-xs font-semibold">{kpi.label}</span>
					<span class="text-muted-foreground text-[11px] leading-snug">{kpi.note}</span>
				</div>
			{/each}
		</div>
		{#if contextLine}
			<p class="text-muted-foreground m-0 -mt-2 text-xs leading-snug">
				The month in {data.city?.cityName ?? 'the city'}: {contextLine}.
			</p>
		{/if}

		{#if highlights.highlights.length}
		<div>
			<p class="stamp text-beet m-0 mb-2">Worth your attention</p>
			<ol class="m-0 flex list-none flex-col p-0">
				{#each highlights.highlights as point, i (i)}
					<li
						class="border-line grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 border-t py-3 break-inside-avoid">
						<span class="number-hero text-ink text-[28px]"
							>{String(i + 1).padStart(2, '0')}</span>
						<div>
							<p class="m-0 text-[15px] leading-snug font-semibold">{point.title}</p>
							<p class="text-reading-ink m-0 mt-0.5 text-[13px] leading-normal">
								{point.text}
							</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
		{/if}
	</section>
{/snippet}

{#snippet starsSection()}
	<!-- 5 stars against the rest -->
	{#if showSplit}
		<section>
			{@render sectionHead('stars', 'Google reviews', 'What decides the stars')}
			<p class="text-reading-ink m-0 mb-5 max-w-[62ch]">
				What five-star guests praise next to what keeps the others from giving five. Where
				the same topic tops both lists, it is the one that decides the rating.
			</p>
			<div class="grid grid-cols-1 gap-4 break-inside-avoid sm:grid-cols-2">
				{#each [{ group: split.fiveStar, title: `${split.fiveStar.count} five-star reviews`, kicker: 'Praised in', counts: split.fiveStar.praise, details: sampleDetails(split.fiveStar.praiseDetails, split.fiveStar.praise), bar: 'bg-primary-darker', stars: 5 }, { group: split.belowFive, title: `${split.belowFive.count} reviews below five`, kicker: 'Criticised in', counts: split.belowFive.complaints, details: sampleDetails(split.belowFive.complaintDetails, split.belowFive.complaints), bar: 'bg-beet', stars: 3 }] as side (side.kicker)}
					{@const top = topTopics(side.counts)}

					<div class="bg-paper border-line flex flex-col rounded-md border p-5">
						<p class="eyebrow text-muted-foreground m-0">{side.kicker}</p>
						<p class="m-0 mt-1 flex items-center gap-2 text-base font-semibold">
							<Stars value={side.stars} size={12} />{side.title}
						</p>
						<p class="text-muted-foreground m-0 mt-0.5 mb-4 text-xs">
							{side.group.written} with text; bars show the share of those
						</p>
						{#if top.length}
							<div
								class="grid grid-cols-[6rem_minmax(0,1fr)_2.5rem] items-center gap-x-3 gap-y-1.5">
								{#each top as [topic, n] (topic)}
									{@const share = n / Math.max(1, side.group.written)}
									<span class="text-sm">{TOPIC_LABELS[topic] ?? topic}</span>
									<div class="bg-wash h-3 overflow-hidden rounded-[3px]">
										<span
											class="{side.bar} block h-full"
											style:width={`${share * 100}%`}></span>
									</div>
									<span class="text-right text-xs font-medium tabular-nums"
										>{Math.round(share * 100)}%</span>
								{/each}
							</div>
							<ul
								class="border-line m-0 mt-4 flex list-none flex-col gap-1.5 border-t p-0 pt-3">
								{#each side.details as point (point.detail)}
									<li class="text-reading-ink text-[13px] leading-snug">
										“{point.detail}”
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-muted-foreground m-0 text-sm">Nothing specific.</p>
						{/if}
					</div>
				{/each}
			</div>
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Share of each group's written reviews that raised the topic.
			</p>
		</section>
	{/if}
{/snippet}

{#snippet branchesSection()}
	<!-- A chain's branches side by side -->
	{#if chain}
		<section>
			{@render sectionHead('branches', 'Your branches', 'Branch by branch')}
			<ReportBranches
				{branches}
				brandName={data.brand.name}
				brandOnlyPosts={data.brand.brandOnlyPosts}
				month={data.month} />
		</section>
	{/if}
{/snippet}

{#snippet competitorsSection()}
	<!-- The competition -->
	{#if competitors.length}
		<section>
			{@render sectionHead('compare', 'Your competition', 'How you compare')}
			<div class="border-line overflow-x-auto rounded-md border break-inside-avoid">
				<table class="w-full border-collapse text-[13px]">
					<thead class="bg-wash/60 text-muted-foreground text-[11px]">
						<tr>
							<th class="px-3 py-2 text-left font-medium">This month</th>
							<th class="px-2 py-2 text-right font-medium">Posts</th>
							<th class="px-2 py-2 text-right font-medium">Views</th>
							<th class="px-2 py-2 text-right font-medium">Creators</th>
							<th class="px-2 py-2 text-right font-medium">Reviews</th>
							<th class="px-2 py-2 text-right font-medium">Stars</th>
							{#if showTables}
								<th
									class="px-2 py-2 text-right font-medium"
									title="Friday and Saturday evenings booked out"
									>Weekend tables</th>
							{/if}
							{#if showTraffic}
								<th
									class="px-2 py-2 text-right font-medium"
									title="Busyness change on the month before, in points"
									>Foot traffic</th>
							{/if}
							<th class="px-3 py-2 text-right font-medium">All time</th>
						</tr>
					</thead>
					<tbody>
						{#each compareRows as row (row.venueId)}
							{@const cells = [
								{
									v: row.social.postCount,
									best: best((r) => r.social.postCount),
									text: `${row.social.postCount}`
								},
								{
									v: row.social.views,
									best: best((r) => r.social.views),
									text: compact(row.social.views)
								},
								{
									v: row.social.creators,
									best: best((r) => r.social.creators),
									text: `${row.social.creators}`
								},
								{
									v: row.reviewsTracked ? row.reviews.count : undefined,
									best: best((r) =>
										r.reviewsTracked ? r.reviews.count : undefined
									),
									text: row.reviewsTracked ? `${row.reviews.count}` : '—'
								},
								{
									v: row.reviewsTracked ? row.reviews.avgStars : undefined,
									best: best((r) =>
										r.reviewsTracked ? r.reviews.avgStars : undefined
									),
									text:
										row.reviewsTracked && row.reviews.avgStars
											? row.reviews.avgStars.toFixed(1)
											: '—'
								},
								...(showTables
									? [
											{
												v: row.demand?.booked,
												best: best((r) => r.demand?.booked),
												text: row.demand ? `${row.demand.booked} %` : '—'
											}
										]
									: []),
								...(showTraffic
									? [
											{
												v: undefined,
												best: 0,
												text: (() => {
													const change = trafficChange(row);
													return change === undefined
														? ''
														: change > 0
															? `+${change}`
															: change < 0
																? `−${-change}`
																: '0';
												})()
											}
										]
									: [])
							]}
							<tr class={['border-line border-t', row.self && 'bg-primary/35']}>
								<td class="px-3 py-2">
									<span class={['block truncate', row.self && 'font-semibold']}
										>{row.name}</span>
									{#if !row.reviewsTracked}
										<span class="text-muted-foreground block text-[10px]"
											>Reviews not tracked yet</span>
									{/if}
								</td>
								{#each cells as cell, i (i)}
									<td
										class={[
											'px-2 py-2 text-right tabular-nums',
											cell.v !== undefined &&
												cell.v === cell.best &&
												cell.v > 0 &&
												'font-semibold'
										]}>
										{cell.text}
									</td>
								{/each}
								<td class="text-muted-foreground px-3 py-2 text-right tabular-nums">
									{row.rating ? row.rating.toFixed(1) : '—'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Posts by other people and Google reviews from {monthLabel(data.month)}; the leader
				in each column is bold. All time is the Google rating.{#if showTables}{' '}
					Weekend tables is the share of Friday and Saturday 18:00–22:00 start times with no
					table for two.{/if}{#if showTraffic}{' '}
					Foot traffic is the change in Google's busyness index on the month before, in points:
					Google scales each venue to its own peak, so compare the changes, not the levels.{/if}
			</p>

			{#if reviewRows.length >= 2}
				<div class="mt-8 grid grid-cols-1 gap-7">
					{#each [{ kind: 'complaints' as const, title: 'What guests criticise', bar: 'bg-beet' }, { kind: 'praise' as const, title: 'What guests praise', bar: 'bg-primary-darker' }] as matrix (matrix.kind)}
						{@const columns = topicColumns(matrix.kind)}
						{#if columns.length}
							<div class="break-inside-avoid">
								<h3 class="m-0 mb-3 text-base font-semibold">{matrix.title}</h3>
								<div
									class="grid items-end gap-x-2 gap-y-2 text-[12px]"
									style:grid-template-columns={`minmax(0,1fr) repeat(${columns.length}, minmax(0,6.5rem))`}>
									<span></span>
									{#each columns as topic (topic)}
										<span
											class="text-muted-foreground text-center text-[11px] leading-tight">
											{TOPIC_LABELS[topic]}
										</span>
									{/each}
									{#each reviewRows as row (row.venueId)}
										<span
											class={[
												'truncate text-[13px]',
												row.self && 'font-semibold'
											]}>{row.name}</span>
										{#each columns as topic (topic)}
											{@const share =
												(row.reviews[matrix.kind][topic] ?? 0) /
												row.reviews.written}
											<div class="flex flex-col items-center gap-0.5">
												<span class="tabular-nums"
													>{Math.round(share * 100)}%</span>
												<span
													class="bg-wash block h-1.5 w-full overflow-hidden rounded-full">
													<span
														class="{matrix.bar} block h-full"
														style:width={`${share * 100}%`}></span>
												</span>
											</div>
										{/each}
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				</div>
				<p class="text-muted-foreground m-0 mt-2 text-xs">
					Share of each place's written Google reviews that raised the topic. Places with
					fewer than {MIN_WRITTEN} written reviews this month are left out.
				</p>
			{/if}
		</section>
	{/if}
{/snippet}

{#snippet actionsSection()}
	<!-- What to do -->
	<section>
		{@render sectionHead('next', 'Try this', 'What to do next')}
		<div class="grid grid-cols-1 gap-3">
			{#each highlights.actions as action, i (i)}
				<div
					class="bg-tint border-ink/15 flex gap-4 rounded-md border px-5 py-3.5 break-inside-avoid">
					<span
						class="bg-ink text-acid number-hero grid size-9 shrink-0 place-items-center rounded-[6px] text-[20px]">
						{i + 1}
					</span>
					<div>
						<p class="m-0 text-[15px] leading-snug font-semibold">{action.title}</p>
						<p class="text-reading-ink m-0 mt-0.5 text-[13px] leading-normal">
							{action.text}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/snippet}

{#snippet postsSection_()}
	<!-- Social media -->
	<section>
		{@render sectionHead(
			'social',
			platformsLabel(postsSection?.platforms),
			'What people posted'
		)}
		{#if sentimentTotal}
			<div class="mb-7 break-inside-avoid">
				<div class="flex h-4 gap-0.5 overflow-hidden rounded-[3px]">
					{#each sentimentParts.filter((p) => p.n > 0) as part (part.label)}
						<span class={part.cls} style:flex={part.n}></span>
					{/each}
				</div>
				<ul class="m-0 mt-2 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-xs">
					{#each sentimentParts as part (part.label)}
						<li class="flex items-center gap-1.5">
							<span class="{part.cls} size-2.5 rounded-sm"></span>
							<span class="text-muted-foreground">{part.label}</span>
							<strong class="tabular-nums">{part.n}</strong>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if shownPosts.length}
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each shownPosts.slice(0, POSTS_SHOWN) as post, i (post.postId)}
					<a
						href={post.url}
						target="_blank"
						rel="noreferrer"
						class="bg-paper border-line hover:border-ink/40 flex flex-col gap-2 rounded-md border p-4 no-underline break-inside-avoid">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="m-0 truncate font-semibold">
									<span class="font-pixel text-beet mr-1 text-[8px]"
										>#{i + 1}</span
									>{authorLabel(post.platform, post.author)}
								</p>
								<p class="text-muted-foreground m-0 text-[11px]">
									{PLATFORM_LABELS[post.platform]}{post.authorFans
										? ` · ${compact(post.authorFans)} followers`
										: ''}
								</p>
							</div>
							<div class="shrink-0 text-right">
								<p
									class="m-0 text-xl leading-none font-semibold tracking-tight tabular-nums">
									{viewsLabel(post.platform, post.views)}
								</p>
								<p class="text-muted-foreground m-0 text-[11px]">views</p>
							</div>
						</div>
						<p class="text-reading-ink m-0 line-clamp-4 text-[13px] leading-snug">
							{post.summary}
						</p>
						{#if post.sentiment !== 'positive' || post.promotional || !post.visited}
							<div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
								{#if post.sentiment !== 'positive'}{@render pill(
										post.sentiment
									)}{/if}
								{#if post.promotional}{@render pill('paid or gifted')}{/if}
								{#if !post.visited}{@render pill('did not visit')}{/if}
							</div>
						{/if}
					</a>
				{/each}
			</div>
			{#if shownPosts.length > POSTS_SHOWN}
				<p class="text-muted-foreground m-0 mt-2 text-xs">
					And {shownPosts.length - POSTS_SHOWN} more, with
					{compact(shownPosts.slice(POSTS_SHOWN).reduce((sum, p) => sum + p.views, 0))} views
					between them.
				</p>
			{/if}

			<div class="mt-8 break-inside-avoid">
				<h3 class="m-0 mb-3 text-base font-semibold">What came up in posts</h3>
				<TopicBars
					praise={postStats.praise}
					complaints={postStats.complaints}
					praiseThemes={postStats.praiseThemes}
					complaintThemes={postStats.complaintThemes}
					aspects={data.aspects}
					unit="posts" />
			</div>
		{:else}
			<p class="bg-paper border-line text-muted-foreground m-0 rounded-md border p-5">
				We found no {postsSection?.platforms?.length
					? `${platformsLabel(postsSection.platforms)} `
					: ''}posts about you by other people this month.
			</p>
		{/if}
	</section>
{/snippet}

{#snippet creatorsSection()}
	<!-- Creators -->
	{#if creators.length || creatorsNearby.length}
		<section>
			{@render sectionHead('creators', 'TikTok and Instagram', 'The people behind the posts')}
			{#if creators.length}
				<h3 class="m-0 mb-3 text-base font-semibold">Who posted about you</h3>
				<ol class="m-0 flex list-none flex-col p-0">
					{#each creators as creator, i (`${creator.platform}:${creator.author}`)}
						<li
							class="border-line grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 border-t py-2 break-inside-avoid">
							<span class="font-pixel text-muted-foreground text-[9px]">{i + 1}</span>
							<span class="min-w-0">
								<a
									href={creator.url}
									target="_blank"
									rel="noreferrer"
									class="text-ink block truncate text-sm font-semibold no-underline"
									>{authorLabel(creator.platform, creator.author)}</a>
								<span
									class="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px]">
									{PLATFORM_LABELS[creator.platform]}{creator.authorFans
										? ` · ${compact(creator.authorFans)} followers`
										: ''}
									{#if creator.promotional}{@render pill(
											creator.promotional === creator.posts
												? 'paid or gifted'
												: `${creator.promotional} paid`
										)}{/if}
									{#if !creator.visited}{@render pill('did not visit')}{/if}
								</span>
							</span>
							<span class="text-right">
								<span
									class="block text-base leading-none font-semibold tabular-nums"
									>{viewsLabel(creator.platform, creator.views)}</span>
								<span class="text-muted-foreground text-[11px]">
									views · {creator.posts}
									{creator.posts === 1 ? 'post' : 'posts'}
								</span>
							</span>
						</li>
					{/each}
				</ol>
			{/if}

			{#if creatorsNearby.length}
				<div class={['break-inside-avoid', creators.length && 'mt-9']}>
					<h3 class="m-0 text-base font-semibold">Worth inviting</h3>
					<p class="text-reading-ink m-0 mt-1 mb-3 max-w-[62ch] text-[13px]">
						They posted about places in {districts} this month, unpaid, but not about you.
					</p>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{#each creatorsNearby as creator (`${creator.platform}:${creator.author}`)}
							<a
								href={creator.url}
								target="_blank"
								rel="noreferrer"
								class="bg-paper border-line hover:border-ink/40 flex flex-col gap-1 rounded-md border px-4 py-3 no-underline break-inside-avoid">
								<span class="flex items-baseline justify-between gap-2">
									<span class="text-ink truncate text-sm font-semibold"
										>{authorLabel(creator.platform, creator.author)}</span>
									<span
										class="text-muted-foreground shrink-0 text-[11px] tabular-nums">
										{PLATFORM_LABELS[creator.platform]}{creator.authorFans
											? ` · ${compact(creator.authorFans)} followers`
											: ''}
									</span>
								</span>
								<span
									class="text-reading-ink line-clamp-2 text-[12px] leading-snug">
									Posted about {creator.venues.join(', ')}
								</span>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}
{/snippet}

{#snippet reviewsSection()}
	<!-- Google reviews -->
	{#if reviews.count}
		<section>
			{@render sectionHead(
				'reviews',
				reviews.byPlatform ? 'Google and TripAdvisor' : 'Google',
				'What guests wrote'
			)}
			{#if reviews.byPlatform}
				<ReportReviewPlatforms platforms={reviews.byPlatform} gaps={reviews.platformGaps} />
			{/if}

			{#if changeThemes.length}
				<div
					class="bg-tint border-chili mb-7 rounded-r-md border-l-4 px-5 py-4 break-inside-avoid">
					<p class="m-0 mb-2 text-base font-semibold">Changes guests noticed</p>
					<ul class="m-0 flex list-none flex-col gap-2 p-0">
						{#each changeThemes as group (group.theme ?? group.label)}
							<li>
								<span class="font-medium">{group.label}</span>
								<span class="text-muted-foreground text-sm">
									· {group.reviews}
									{group.reviews === 1 ? 'review' : 'reviews'}</span>
								<span class="text-muted-foreground block text-sm">
									{group.details.map((d) => `“${d}”`).join(', ')}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-8 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
				<div class="break-inside-avoid">
					<h3 class="m-0 mb-3 text-base font-semibold">What came up</h3>
					<TopicBars
						praise={reviews.praise}
						complaints={reviews.complaints}
						praiseThemes={reviews.praiseThemes}
						complaintThemes={reviews.complaintThemes}
						aspects={data.aspects}
						unit="reviews" />
					<p class="text-muted-foreground m-0 mt-1 text-xs">
						Out of {reviews.written} written {reviews.written === 1
							? 'review'
							: 'reviews'}; {reviews.count - reviews.written}
						left stars only.
					</p>
				</div>
				<div class="break-inside-avoid">
					<h3 class="m-0 mb-3 text-base font-semibold">Stars</h3>
					<div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
						{#each reviews.stars as row (row.stars)}
							<Stars value={row.stars} size={10} />
							<div class="flex items-center gap-1.5">
								<span
									class="bg-ink h-3 rounded-r-[3px]"
									style:width={`${(row.count / maxStars) * 100}%`}></span>
								<span class="text-xs font-medium tabular-nums">{row.count}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			{#if reviews.critical.length}
				<div class="mt-9">
					<h3 class="m-0 mb-3 text-base font-semibold">Critical reviews worth reading</h3>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{#each reviews.critical as review, i (i)}
							<figure
								class="bg-paper border-line m-0 flex flex-col gap-2 rounded-md border p-4 break-inside-avoid">
								<div class="flex items-center justify-between gap-2">
									<Stars value={review.stars ?? 0} />
									{#if !review.replied}{@render pill('no reply yet')}{/if}
								</div>
								<blockquote
									class="text-reading-ink m-0 line-clamp-[8] text-[13px] leading-snug">
									{review.text}
								</blockquote>
							</figure>
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}
{/snippet}

{#snippet repliesSection()}
	<!-- Reply drafts -->
	{#if replyDrafts.length}
		<section>
			{@render sectionHead('replies', 'Google reviews', 'Replies ready to post')}
			<p class="text-reading-ink m-0 mb-5 max-w-[62ch]">
				{replyDrafts.length === 1 ? 'A reply' : `${replyDrafts.length} replies`} to this month’s
				unanswered reviews, the critical ones first, in the language each guest wrote in. Read
				them over, change what you like and post them under the reviews on Google.
			</p>
			<div class="grid grid-cols-1 gap-3">
				{#each replyDrafts as item (item.reviewId)}
					<figure
						class="bg-paper border-line m-0 grid grid-cols-1 gap-3 rounded-md border p-4 break-inside-avoid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
						<div class="flex flex-col gap-1.5">
							<span class="flex items-center gap-2">
								{#if item.review.stars}<Stars value={item.review.stars} />{/if}
								{#if item.review.language}<span
										class="eyebrow text-muted-foreground"
										>{item.review.language}</span
									>{/if}
							</span>
							<blockquote
								class="text-muted-foreground m-0 line-clamp-[7] text-[12.5px] leading-snug">
								“{item.review.excerpt}”
							</blockquote>
						</div>
						<div class="bg-tint rounded-sm px-3.5 py-2.5">
							<p class="stamp text-beet m-0 mb-1">Your reply</p>
							<p class="text-ink m-0 text-[13px] leading-snug whitespace-pre-line">
								{item.draft}
							</p>
						</div>
					</figure>
				{/each}
			</div>
		</section>
	{/if}
{/snippet}

{#snippet dishesSection()}
	<!-- Dishes -->
	{#if dishes.length}
		<section class="break-inside-avoid">
			{@render sectionHead('menu', 'Posts and reviews', 'On the menu')}
			<div class="text-muted-foreground mb-2 flex gap-5 text-xs">
				<span class="flex items-center gap-1.5"
					><span class="bg-primary-darker size-2.5 rounded-sm"></span>Liked</span>
				<span class="flex items-center gap-1.5"
					><span class="bg-strip-muted size-2.5 rounded-sm"></span>Neutral or mixed</span>
				<span class="flex items-center gap-1.5"
					><span class="bg-beet size-2.5 rounded-sm"></span>Disliked</span>
			</div>
			<div
				class="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
				{#each dishes as dish (dish.name)}
					<span class="truncate text-sm first-letter:uppercase">{dish.name}</span>
					<div class="flex items-center gap-1.5">
						<div
							class="flex h-3 gap-px"
							style:width={`${(dish.count / maxDish) * 85}%`}>
							{#if dish.positive}<span
									class="bg-primary-darker rounded-l-[2px]"
									style:flex={dish.positive}></span
								>{/if}
							{#if dish.count - dish.positive - dish.negative > 0}
								<span
									class="bg-strip-muted"
									style:flex={dish.count - dish.positive - dish.negative}></span>
							{/if}
							{#if dish.negative}<span class="bg-beet" style:flex={dish.negative}
								></span
								>{/if}
						</div>
						<span class="text-xs font-medium tabular-nums">{dish.count}</span>
					</div>
				{/each}
			</div>
			<p class="text-muted-foreground m-0 mt-2 text-xs">
				Number of posts and reviews that named each item.
			</p>
		</section>
	{/if}
{/snippet}

{#snippet placesSection()}
	<!-- Each place's own figures, each only when tracked: popular times and tables, prices, the
	     neighbourhood, Google Maps searches -->
	{#each branches as branch, i (branch.venueId)}
		{@const changes = changesOf(branch)}
		{@const ranking = rankingOf(branch)}
		{@const maxViews = Math.max(1, ...ranking.map((r) => r.views))}
		{#if chain}
			<!-- Each place opens a page of its own in print ("each place has its own pages"), so its
			     header never strands at the foot of the page before -->
			<header
				class="border-ink flex flex-col gap-1 border-t-4 pt-4 break-before-page break-inside-avoid break-after-avoid">
				<p class="stamp text-beet m-0">Place {i + 1} of {branches.length}</p>
				<h2 class="type-display m-0 text-[32px]">
					{branch.street ?? branch.name}
				</h2>
				<p class="text-muted-foreground m-0 flex flex-wrap items-center gap-x-2 text-sm">
					<span
						>{[branch.name, branch.district, branch.city]
							.filter(Boolean)
							.join(' · ')}{branch.rating
							? ` · ${branch.rating.toFixed(1)} ★ all time, ${(branch.reviewsCount ?? 0).toLocaleString('en')} reviews`
							: ''}</span>
					<RatingSparkline points={branch.ratingTrend} />
				</p>
				{#if branch.ratingBenchmark}
					{@render benchmarkLine(branch.ratingBenchmark.rating, benchmarkParts(branch))}
				{/if}
				{#if branch.amenities?.length}
					<div class="mt-1 flex flex-wrap gap-1" aria-label="On Google Maps">
						{#each branch.amenities.slice(0, AMENITY_PILLS) as amenity (amenity)}
							{@render pill(amenity)}
						{/each}
					</div>
				{/if}
				{#if !placeParts.some((part) => placeKey(part, branch))}
					<p class="text-muted-foreground m-0 mt-1 text-xs">
						No popular times, tables, delivery listing or searches tracked for this
						place this month.
					</p>
				{/if}
			</header>
		{/if}

		{#each placeParts as part (part)}
			{#if part === PlacePart.Busyness}
				<ReportBusyness
					busyness={branch.busyness}
					demand={branch.demand}
					competitors={competitorsOf(branch)}
					month={data.month}
					key={`busyness:${branch.venueId}`}
					{sectionHead} />
			{:else if part === PlacePart.Prices}
				{#if branch.prices}
					<ReportPrices
						prices={branch.prices}
						key={`prices:${branch.venueId}`}
						{sectionHead} />
				{/if}
			{:else if part === PlacePart.Neighbourhood}
				<!-- The neighbourhood -->
				{#if branch.neighbours.length || changes}
					<section class="break-inside-avoid">
						{@render sectionHead(
							`nearby:${branch.venueId}`,
							branch.district ?? 'Nearby',
							'Who got talked about nearby'
						)}
						{#if branch.neighbours.length}
							<ol class="m-0 flex list-none flex-col p-0">
								{#each ranking as row, i (row.venueId)}
									<li
										class={[
											'grid grid-cols-[1.75rem_minmax(0,12rem)_minmax(0,1fr)] items-center gap-x-3 rounded-sm px-2 py-1.5',
											row.self && 'bg-primary/35'
										]}>
										<span class="font-pixel text-muted-foreground text-[9px]"
											>{i + 1}</span>
										<span class="min-w-0">
											<span
												class={[
													'block truncate text-sm',
													row.self && 'font-semibold'
												]}>{row.name}</span>
											<span
												class="text-muted-foreground block truncate text-[11px]">
												{row.posts}
												{row.posts === 1 ? 'post' : 'posts'}{row.category
													? ` · ${row.category}`
													: ''}
											</span>
										</span>
										<div class="flex items-center gap-1.5">
											<span
												class={[
													'h-3 rounded-r-[3px]',
													row.self ? 'bg-acid border-ink border-2' : 'bg-strip-muted'
												]}
												style:width={`${row.views ? Math.max(1, (row.views / maxViews) * 100) : 0}%`}
											></span>
											<span class="text-xs font-medium tabular-nums"
												>{compact(row.views)}</span>
										</div>
									</li>
								{/each}
							</ol>
							<p class="text-muted-foreground m-0 mt-2 text-xs">
								Food and drink places in {branch.district} by views of posts about them
								this month{chain
									? `; ${placeLabel(branch)} by the posts that named it`
									: ''}.
							</p>
						{/if}
						{#if changes}<ReportNeighbourhoodChanges {changes} />{/if}
					</section>
				{/if}
			{:else if part === PlacePart.SearchRanks}
				<!-- Google Maps searches -->
				{#if branch.searchRanks?.length}
					<section class="break-inside-avoid">
						{@render sectionHead(
							`search:${branch.venueId}`,
							'Google Maps',
							'Where guests find you'
						)}
						<ReportSearchRanks ranks={branch.searchRanks} />
					</section>
				{/if}
			{/if}
		{/each}
	{/each}
{/snippet}

{#snippet patternsSection()}
	<!-- What followed what: the brand's posts against every place's reviews -->
	{#if data.correlations}
		<ReportPatterns correlations={data.correlations} {sectionHead} />
	{/if}
{/snippet}

{#snippet citySection()}
	<!-- The city -->
	{#if data.city}
		<section class="break-inside-avoid">
			{@render sectionHead(
				'city',
				data.city.cityName,
				`What ${data.city.cityName} is talking about`
			)}
			<ReportCityTrends city={data.city} />
		</section>
	{/if}
{/snippet}

<article class="text-ink flex min-w-0 flex-col gap-12 text-sm leading-relaxed">
	{@render coverSection()}

	{#each body as section, i (section.kind)}
		{#if section.kind === SectionKind.Analysis && report.analysis}
			<section>
				{@render sectionHead(
					'moved',
					'This month against the last',
					'What moved, and why it might have'
				)}
				<ReportAnalysis analysis={report.analysis} limit={section.limit ?? 3} />
			</section>
		{:else if section.kind === SectionKind.Stars}
			{@render starsSection()}
		{:else if section.kind === SectionKind.Branches}
			{@render branchesSection()}
		{:else if section.kind === SectionKind.Competitors}
			{@render competitorsSection()}
		{:else if section.kind === SectionKind.Actions}
			{@render actionsSection()}
		{:else if section.kind === SectionKind.Posts}
			{@render postsSection_()}
		{:else if section.kind === SectionKind.OwnAccounts}
			<!-- Right under the posts it reads as part of them, as it always did -->
			<div class={[followsSocial(i) && '-mt-12']}>
				<ReportOwnAccounts ownPosts={data.ownPosts} accounts={data.ownAccounts} />
			</div>
		{:else if section.kind === SectionKind.Comments && data.comments}
			<div class={[followsSocial(i) && '-mt-12']}>
				<ReportComments comments={data.comments} />
			</div>
		{:else if section.kind === SectionKind.Press && data.press}
			<div class={[followsSocial(i) && '-mt-12']}>
				<ReportPress press={data.press} />
			</div>
		{:else if section.kind === SectionKind.Media}
			<section>
				{@render sectionHead('media', 'Media coverage', 'What the blogs wrote about you')}
				<ReportMedia {articles} limit={ARTICLES_SHOWN} aspects={data.aspects} />
			</section>
		{:else if section.kind === SectionKind.Creators}
			{@render creatorsSection()}
		{:else if section.kind === SectionKind.Reviews}
			{@render reviewsSection()}
		{:else if section.kind === SectionKind.Replies}
			{@render repliesSection()}
		{:else if section.kind === SectionKind.Dishes}
			{@render dishesSection()}
		{:else if section.kind === SectionKind.Places}
			{@render placesSection()}
		{:else if section.kind === SectionKind.Patterns}
			{@render patternsSection()}
		{:else if section.kind === SectionKind.City}
			{@render citySection()}
		{/if}
	{/each}

	<footer
		class="border-line text-muted-foreground border-t pt-4 text-[11px] leading-relaxed break-inside-avoid">
		<p class="m-0">
			<strong class="text-ink">How this report is made.</strong> We collect public TikTok and
			Instagram posts and Google reviews from {monthLabel(data.month)}, read them with AI and
			count what people talk about. Counts show how many posts or reviews raised a topic, not
			how many times. Posts from your own account are listed apart and never counted as word
			of mouth. We only see posts our searches find, so the real number can be higher. Every
			post and review counted is listed in the appendix.
		</p>
	</footer>

	{#if showAppendix}<ReportAppendix {data} />{/if}
</article>
