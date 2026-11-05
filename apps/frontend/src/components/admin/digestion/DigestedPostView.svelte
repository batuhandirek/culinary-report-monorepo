<script lang="ts">
	import { AtSign, Bookmark, Calendar, ExternalLink, Eye, FileText, Globe, Hash, Heart, MapPin, MessageCircle, Share2, Store, Users } from '@lucide/svelte';
	import type { AdminDigestedPostOutputDto, AdminDigestionMentionOutputDto, AdminDigestionStatementOutputDto } from 'client';
	import type { Component, Snippet } from 'svelte';

	import DigestedClaims from './DigestedClaims.svelte';
	import PipelineStrip, { type Step } from './PipelineStrip.svelte';
	import SourceText from './SourceText.svelte';

	import { atShort } from '#components/admin/admin-format.js';
	import { authorLabel, compact, PLATFORM_LABELS, SKIP_REASON_LABELS } from '#lib/culinary.js';
	import { MATCH_METHOD_LABELS, matchMethodVariant } from '#lib/digestion.js';
	import { topicHref } from '#lib/topic-format.js';
	import Badge from '#ui/wrapped/Badge.svelte';

	// A post and what the pipeline made of it: a strip of how far each step got, the post's figures
	// as icons, its texts with the claims' quotes marked on the left, and on the right what it says,
	// place by place (each place with what matching made of it, its claims under it), then about the
	// city and in general.
	interface Props {
		post: AdminDigestedPostOutputDto;
		/** The "Post page" link; off on the post page itself. */
		withPostLink?: boolean;
		/** At the end of a place's header: the post page's "change the venue". */
		mentionAction?: Snippet<[AdminDigestionMentionOutputDto]>;
		/** Under a place's header: the post page's food topics of the place. */
		mentionDetails?: Snippet<[AdminDigestionMentionOutputDto]>;
	}

	let { post, withPostLink = true, mentionAction, mentionDetails }: Props = $props();

	const isBlog = $derived(post.platform === 'blog');
	const quotes = $derived(post.statements.map((s) => s.quote));
	const texts = $derived([post.text, post.subtitles]);
	const readByB = $derived(post.statements.filter((s) => s.partsAt).length);
	const MATCHED = new Set(['exact', 'fuzzy', 'llm', 'account', 'manual']);
	const matched = $derived(post.mentions.filter((m) => m.matchMethod && MATCHED.has(m.matchMethod)).length);
	const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

	const steps = $derived.by((): Step[] => {
		const skipped = !!post.skipReason;
		const read = !!post.analysedAt && !skipped;
		const out: Step[] = [
			skipped
				? { label: 'Gate', state: 'skipped', result: SKIP_REASON_LABELS[post.skipReason!] ?? post.skipReason, hint: post.gatedAt && `judged ${atShort(post.gatedAt)}` }
				: post.gatedAt
					? { label: 'Gate', state: 'done', result: 'food', hint: `about eating or drinking out in ${post.city.name}; judged ${atShort(post.gatedAt)}` }
					: post.analysedAt
						? { label: 'Gate', state: 'partly', result: 'no verdict', hint: 'agent A read it before the gate judged it' }
						: { label: 'Gate', state: 'pending', hint: 'not judged yet' },
			{
				label: 'Places',
				state: read ? 'done' : 'pending',
				result: read ? String(post.mentions.length) : undefined,
				hint: read ? `agent A, ${atShort(post.analysedAt!)}${post.analysisTokens ? ` · ${post.analysisTokens.toLocaleString('en-GB')} tokens` : ''}` : skipped ? 'the gate skipped it' : 'not read by agent A yet'
			}
		];
		if (post.mentions.length)
			out.push({ label: 'Matched', state: matched === post.mentions.length ? 'done' : 'partly', result: `${matched} of ${post.mentions.length}`, hint: 'places matched to a brand' });
		out.push({ label: 'Claims', state: read || post.statements.length ? 'done' : 'pending', result: read || post.statements.length ? String(post.statements.length) : undefined, hint: 'split by agent A' });
		if (post.statements.length)
			out.push({
				label: 'Parts',
				state: readByB === post.statements.length ? 'done' : readByB ? 'partly' : 'pending',
				result: `${readByB} of ${post.statements.length}`,
				hint: 'claims agent B read: sentiment, kind, aspect, foods, number'
			});
		return out;
	});

	// The figures, as icons; a zero or an unknown is left out
	const STATS = $derived(
		(
			[
				{ icon: Eye, n: post.views, label: 'views' },
				{ icon: Heart, n: post.likes, label: 'likes' },
				{ icon: MessageCircle, n: post.comments, label: 'comments' },
				{ icon: Share2, n: post.shares, label: 'shares' },
				{ icon: Bookmark, n: post.saves, label: 'saves' }
			] as { icon: Component; n: number | undefined; label: string }[]
		).filter((s) => !isBlog && s.n)
	);

	// What it says, one group per place it names (in order), then the city, then nothing in particular
	const aboutPlace = (mentionId: number) => post.statements.filter((s) => s.subject === 'place' && s.mention?.id === mentionId);
	const mentionIds = $derived(new Set(post.mentions.map((m) => m.id)));
	const placeless = $derived(post.statements.filter((s) => s.subject === 'place' && !(s.mention && mentionIds.has(s.mention.id))));
	const aboutCity = $derived(post.statements.filter((s) => s.subject === 'city'));
	const aboutNothing = $derived(post.statements.filter((s) => s.subject === 'none'));
	const OTHER_GROUPS = $derived(
		[
			{ key: 'place', icon: Store, label: 'A place', statements: placeless },
			{ key: 'city', icon: Globe, label: `About ${post.city.name}`, statements: aboutCity },
			{ key: 'none', icon: FileText, label: 'In general', statements: aboutNothing }
		].filter((g) => g.statements.length)
	) as { key: string; icon: Component; label: string; statements: AdminDigestionStatementOutputDto[] }[];

	const hashtags = $derived(post.hashtagLinks.filter((l) => !l.hashtag.ignored));
	let allTags = $state(false);
	const TAGS_SHOWN = 10;
	const shownTags = $derived(allTags ? hashtags : hashtags.slice(0, TAGS_SHOWN));
</script>

<div class="flex min-w-0 flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<PipelineStrip {steps} />
		<div class="flex items-center gap-3 text-xs">
			{#if withPostLink}
				<a href={`/admin/posts/${post.id}`} class="font-medium underline-offset-4 hover:underline">Post page</a>
			{/if}
			<a href={post.url} target="_blank" rel="noopener noreferrer" class="text-muted-foreground inline-flex items-center gap-1 hover:underline">
				Original <ExternalLink class="size-3" />
			</a>
		</div>
	</div>

	<!-- Who posted it, where, when, and its figures -->
	<p class="text-muted-foreground m-0 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
		<span class="text-ink font-semibold">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
		{#if post.account}
			<a href={`/admin/creators/${post.account.creator.id}`} class="text-ink underline-offset-4 hover:underline">{authorLabel(post.platform, post.author)}</a>
		{:else}
			<span class="text-ink">{authorLabel(post.platform, post.author)}</span>
		{/if}
		{#if post.authorFans}<span class="inline-flex items-center gap-1 tabular-nums" title="followers"><Users class="size-3.5" />{compact(post.authorFans)}</span>{/if}
		{#if post.account?.brand}
			<span class="inline-flex items-center gap-1" title="The brand's own account: not word of mouth">
				<Store class="size-3.5" />own account of
				<a href={`/admin/brands/${post.account.brand.id}`} class="text-ink font-medium underline-offset-4 hover:underline">{post.account.brand.name}</a>
			</span>
		{/if}
		<span class="inline-flex items-center gap-1"><MapPin class="size-3.5" />{post.city.name}</span>
		<span class="inline-flex items-center gap-1"><Calendar class="size-3.5" />{atShort(post.postedAt)}</span>
		{#each STATS as stat (stat.label)}
			<span class="inline-flex items-center gap-1 tabular-nums" title={stat.label}><stat.icon class="size-3.5" />{compact(stat.n)}</span>
		{/each}
		{#if post.isAd}<Badge variant="warning">ad</Badge>{/if}
		{#if post.isPromotional}<span title="Paid, gifted or invited, as agent A read it"><Badge variant="warning">promotional</Badge></span>{/if}
	</p>

	<div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
		<!-- What was scraped -->
		<div class="flex min-w-0 flex-col gap-3">
			<SourceText label={isBlog ? 'Article' : 'Caption'} text={post.text} {quotes} platform={post.platform} note={post.text ? `${post.text.length.toLocaleString('en-GB')} chars` : undefined} />
			{#if !isBlog}
				<SourceText label="Transcript" text={post.subtitles} {quotes} note={post.subtitlesLanguage} />
			{/if}
			{#if post.locationName || post.taggedHandles?.length || hashtags.length}
				<div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
					{#if post.locationName}
						<span class="inline-flex items-center gap-1" title="The place the creator tagged"><MapPin class="size-3.5" /><span class="text-ink">{post.locationName}</span></span>
					{/if}
					{#each post.taggedHandles ?? [] as handle (handle)}
						<span class="inline-flex items-center gap-0.5" title="Tagged"><AtSign class="size-3" />{handle}</span>
					{/each}
					{#each shownTags as link (link.hashtag.id)}
						<span class="inline-flex items-center"
							><a href={`/admin/posts?hashtag=${encodeURIComponent(link.hashtag.tag)}`} class="inline-flex items-center hover:underline" title="The posts that carry it"><Hash class="size-3" />{link.hashtag.tag}</a
							>{#if link.hashtag.topic}<a href={topicHref(link.hashtag.topic.key)} class="text-beet hover:underline">&nbsp;→ {link.hashtag.topic.label}</a>{/if}{#if link.hashtag.brand}<a href={`/admin/brands/${link.hashtag.brand.id}`} class="text-beet hover:underline">&nbsp;→ {link.hashtag.brand.name}</a>{/if}</span>
					{/each}
					{#if hashtags.length > shownTags.length}
						<button type="button" class="text-beet" onclick={() => (allTags = true)}>+{hashtags.length - shownTags.length} more</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- What it says, place by place -->
		<div class="flex min-w-0 flex-col gap-4">
			{#if post.skipReason}
				<p class="ink-strip m-0 text-sm">
					Skipped by the gate: {SKIP_REASON_LABELS[post.skipReason] ?? post.skipReason}. No places or claims taken from it.
				</p>
			{:else if !post.analysedAt}
				<p class="text-muted-foreground m-0 text-sm">Not read by agent A yet.</p>
			{:else if !post.mentions.length && !post.statements.length}
				<p class="text-muted-foreground m-0 text-sm">Agent A found no food or drink place and no claim in it.</p>
			{/if}

			{#each post.mentions as mention (mention.id)}
				{@const claims = aboutPlace(mention.id)}
				{@const facts = [mention.locationHint, mention.cuisine, mention.city].filter(Boolean)}
				<section class="flex min-w-0 flex-col gap-1.5">
					<header class="flex flex-col gap-0.5">
						<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
							<Store class="text-muted-foreground size-4 shrink-0" />
							<span class="text-sm font-semibold">{mention.venueName}</span>
							<span title={[mention.matchScore != null ? `score ${mention.matchScore.toFixed(2)}` : '', mention.matchNote ?? ''].filter(Boolean).join(' · ') || undefined}>
								<Badge variant={matchMethodVariant(mention.matchMethod)}>
									{mention.matchMethod ? (MATCH_METHOD_LABELS[mention.matchMethod] ?? mention.matchMethod) : 'not matched yet'}
								</Badge>
							</span>
							{#if mention.brand}
								<span class="text-sm">
									<a href={`/admin/brands/${mention.brand.id}`} class="font-medium underline-offset-4 hover:underline">{mention.brand.name}</a>
									{#if mention.venue}
										<span class="text-faint">›</span>
										<a href={`/admin/venues/${mention.venue.id}`} class="underline-offset-4 hover:underline">
											{mention.venue.name}{mention.venue.district ? ` (${mention.venue.district})` : ''}
										</a>
									{:else}
										<span class="text-muted-foreground text-xs">no branch named</span>
									{/if}
								</span>
							{/if}
							{#if !mention.visited}<Badge variant="quiet">not visited</Badge>{/if}
							{#if mention.isNewOpening}<Badge variant="warning">new opening</Badge>{/if}
							{#if mention.unconfirmedAt}<Badge variant="warning">unconfirmed</Badge>{/if}
							{#if mentionAction}<span class="ml-auto">{@render mentionAction(mention)}</span>{/if}
						</div>
						{#if facts.length || mention.matchNote}
							<p class="text-muted-foreground m-0 pl-6 text-xs">
								{facts.join(' · ')}{#if mention.matchNote}{facts.length ? ' · ' : ''}<span class="italic">{mention.matchNote}</span>{/if}
							</p>
						{/if}
						{#if mentionDetails}<div class="pl-6">{@render mentionDetails(mention)}</div>{/if}
					</header>
					<div class="pl-6">
						{#if claims.length}
							<DigestedClaims statements={claims} {texts} />
						{:else}
							<p class="text-faint m-0 text-xs">No claim about it.</p>
						{/if}
					</div>
				</section>
			{/each}

			{#each OTHER_GROUPS as group (group.key)}
				<section class="flex min-w-0 flex-col gap-1.5">
					<header class="flex items-center gap-2">
						<group.icon class="text-muted-foreground size-4 shrink-0" />
						<span class="text-sm font-semibold">{group.label}</span>
						<span class="text-muted-foreground text-xs">{plural(group.statements.length, 'claim')}</span>
					</header>
					<div class="pl-6"><DigestedClaims statements={group.statements} {texts} /></div>
				</section>
			{/each}
		</div>
	</div>
</div>
