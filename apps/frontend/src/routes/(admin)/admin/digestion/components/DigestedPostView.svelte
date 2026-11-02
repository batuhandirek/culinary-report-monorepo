<script lang="ts">
	import { ExternalLink } from '@lucide/svelte';
	import type { AdminDigestedPostOutputDto, AdminDigestionStatementOutputDto } from 'client';

	import DigestedClaims from './DigestedClaims.svelte';
	import PipelineStep from './PipelineStep.svelte';
	import SourceText from './SourceText.svelte';

	import { atShort } from '#components/admin/admin-format.js';
	import { authorLabel, compact, PLATFORM_LABELS, SKIP_REASON_LABELS } from '#lib/culinary.js';
	import { MATCH_METHOD_LABELS, matchMethodVariant } from '#lib/digestion.js';
	import Badge from '#ui/wrapped/Badge.svelte';

	// A post and every step the pipeline took over it: what was scraped, the gate's verdict, the
	// places agent A took from it and what matching made of each, and its claims with agent B's parts.
	interface Props {
		post: AdminDigestedPostOutputDto;
	}

	let { post }: Props = $props();

	const isBlog = $derived(post.platform === 'blog');
	const quotes = $derived(post.statements.map((s) => s.quote));
	const texts = $derived([post.text, post.subtitles]);
	const mentionsById = $derived(new Map(post.mentions.map((m) => [m.id, m])));
	const claimsAbout = (mentionId: number) => post.statements.filter((s) => s.mention?.id === mentionId).length;
	const readByB = $derived(post.statements.filter((s) => s.partsAt).length);

	const gate = $derived(
		post.skipReason
			? `Skipped: ${SKIP_REASON_LABELS[post.skipReason] ?? post.skipReason}. Not digested, so agent A took no places and no claims from it.`
			: post.gatedAt
				? `Digested: about eating or drinking out in ${post.city.name}.`
				: post.analysedAt
					? 'No verdict stored: agent A read it before the gate judged it.'
					: 'Not judged by the gate yet.'
	);

	const aboutOf = (statement: AdminDigestionStatementOutputDto) => {
		if (statement.subject === 'city') return { label: post.city.name, muted: true };
		if (statement.subject === 'none') return { label: 'nothing in particular', muted: true };
		const mention = statement.mention ? mentionsById.get(statement.mention.id) : undefined;
		if (!mention) return { label: 'a place' };
		return mention.brand
			? { label: mention.brand.name, href: `/admin/brands/${mention.brand.id}` }
			: { label: mention.venueName };
	};

	const COUNTS = $derived(
		isBlog
			? []
			: [
					{ label: 'views', n: post.views },
					{ label: 'likes', n: post.likes },
					{ label: 'comments', n: post.comments },
					{ label: 'shares', n: post.shares },
					{ label: 'saves', n: post.saves }
				]
	);
</script>

<div class="flex min-w-0 flex-col gap-6">
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<!-- What was scraped -->
		<div class="flex min-w-0 flex-col gap-3">
			<p class="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				<span class="font-semibold">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
				{#if post.account}
					<a href={`/admin/creators/${post.account.creator.id}`} class="underline-offset-4 hover:underline">
						{authorLabel(post.platform, post.author)}
					</a>
				{:else}
					<span>{authorLabel(post.platform, post.author)}</span>
				{/if}
				{#if post.authorFans}<span class="text-muted-foreground">{compact(post.authorFans)} followers</span>{/if}
				{#if post.account?.brand}
					<span>
						own account of
						<a href={`/admin/brands/${post.account.brand.id}`} class="font-medium underline-offset-4 hover:underline">{post.account.brand.name}</a>
					</span>
				{/if}
				<span class="text-muted-foreground">{post.city.name} · {atShort(post.postedAt)}</span>
				{#each COUNTS as count (count.label)}
					<span class="text-muted-foreground tabular-nums">{compact(count.n)} {count.label}</span>
				{/each}
				{#if post.isAd}<Badge variant="warning">ad</Badge>{/if}
				<a href={`/admin/posts/${post.id}`} class="font-medium underline-offset-4 hover:underline">Post page</a>
				<a href={post.url} target="_blank" rel="noopener noreferrer" class="text-muted-foreground inline-flex items-center gap-1 hover:underline">
					Original <ExternalLink class="size-3" />
				</a>
			</p>
			<SourceText label={isBlog ? 'Article' : 'Caption'} text={post.text} {quotes} note={post.text ? `${post.text.length.toLocaleString('en-GB')} characters` : undefined} />
			{#if !isBlog}
				<SourceText label="Transcript" text={post.subtitles} {quotes} note={post.subtitlesLanguage} />
			{/if}
			<dl class="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">Tagged place</dt>
				<dd class="m-0">{post.locationName ?? '—'}</dd>
				{#if post.taggedHandles?.length}
					<dt class="text-muted-foreground">Tagged</dt>
					<dd class="m-0">{post.taggedHandles.map((h) => `@${h}`).join(', ')}</dd>
				{/if}
				<dt class="text-muted-foreground">Hashtags</dt>
				<dd class="m-0 flex flex-wrap gap-x-2 gap-y-0.5">
					{#each post.hashtagLinks as link (link.hashtag.id)}
						<span class={link.hashtag.ignored ? 'text-faint' : ''}>
							#{link.hashtag.tag}{#if link.hashtag.topic}<span class="text-beet"> → {link.hashtag.topic.label}</span>{/if}{#if link.hashtag.brand}<span class="text-beet"> → {link.hashtag.brand.name}</span>{/if}
						</span>
					{:else}
						—
					{/each}
				</dd>
			</dl>
		</div>

		<!-- The gate and the places -->
		<div class="flex min-w-0 flex-col gap-5">
			<PipelineStep step={1} title="Gate" note={post.gatedAt ? `judged ${atShort(post.gatedAt)}` : undefined}>
				<p class={`m-0 text-sm ${post.skipReason ? 'ink-strip' : ''}`}>{gate}</p>
			</PipelineStep>

			<PipelineStep
				step={2}
				title="Places (agent A)"
				note={post.analysedAt
					? `read ${atShort(post.analysedAt)}${post.analysisTokens ? ` · ${post.analysisTokens.toLocaleString('en-GB')} tokens` : ''}`
					: 'not read by agent A yet'}>
				{#if post.isPromotional}
					<p class="m-0 text-sm"><Badge variant="warning">promotional</Badge> Paid, gifted or invited, as agent A read it.</p>
				{/if}
				{#if post.mentions.length}
					<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
						{#each post.mentions as mention (mention.id)}
							{@const claims = claimsAbout(mention.id)}
							<li class="flex flex-col gap-1 py-2 text-sm">
								<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
									<span class="font-semibold">“{mention.venueName}”</span>
									{#each [mention.locationHint, mention.cuisine, mention.city].filter(Boolean) as fact (fact)}
										<span class="text-muted-foreground text-xs">{fact}</span>
									{/each}
									{#if !mention.visited}<Badge variant="quiet">not visited</Badge>{/if}
									{#if mention.isNewOpening}<Badge variant="warning">new opening</Badge>{/if}
								</div>
								<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
									<Badge variant={matchMethodVariant(mention.matchMethod)} title={mention.matchNote}>
										{mention.matchMethod ? (MATCH_METHOD_LABELS[mention.matchMethod] ?? mention.matchMethod) : 'not matched yet'}
									</Badge>
									{#if mention.matchScore != null}
										<span class="text-muted-foreground tabular-nums">score {mention.matchScore.toFixed(2)}</span>
									{/if}
									{#if mention.brand}
										<a href={`/admin/brands/${mention.brand.id}`} class="font-medium underline-offset-4 hover:underline">{mention.brand.name}</a>
										<span class="text-faint">→</span>
										{#if mention.venue}
											<a href={`/admin/venues/${mention.venue.id}`} class="underline-offset-4 hover:underline">
												{mention.venue.name}{mention.venue.district ? ` (${mention.venue.district})` : ''}
											</a>
										{:else}
											<span class="text-muted-foreground">no branch named</span>
										{/if}
									{/if}
									{#if mention.unconfirmedAt}<Badge variant="warning">unconfirmed</Badge>{/if}
									<span class="text-muted-foreground">· {claims} claim{claims === 1 ? '' : 's'} about it</span>
								</div>
								{#if mention.matchNote}
									<p class="text-muted-foreground m-0 text-xs">Note: {mention.matchNote}</p>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted-foreground m-0 text-sm">
						{post.skipReason
							? 'None: the gate skipped it.'
							: post.analysedAt
								? 'Agent A found no food or drink place in it.'
								: 'Not read by agent A yet.'}
					</p>
				{/if}
			</PipelineStep>
		</div>
	</div>

	<PipelineStep
		step={3}
		title="Claims (agent A) and their parts (agent B)"
		note={post.statements.length
			? `${post.statements.length} claim${post.statements.length === 1 ? '' : 's'} · ${readByB} read by agent B`
			: undefined}>
		{#if post.skipReason && !post.statements.length}
			<p class="text-muted-foreground m-0 text-sm">None: the gate skipped it.</p>
		{:else if !post.analysedAt}
			<p class="text-muted-foreground m-0 text-sm">Not read by agent A yet.</p>
		{:else}
			<DigestedClaims statements={post.statements} {texts} {aboutOf} />
		{/if}
	</PipelineStep>
</div>
