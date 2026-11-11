<script lang="ts">
	import { CodeXml, ExternalLink } from '@lucide/svelte';
	import type { AdminSocialPostOutputDto } from 'client';

	import PlatformGlyph from './PlatformGlyph.svelte';

	import { at, onDay } from '#components/admin/admin-format.js';
	import { authorLabel, compact, PLATFORM_LABELS, SKIP_REASON_LABELS } from '#lib/culinary.js';
	import { findHref, findLabel } from '#lib/post-sources.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	// The post's head: its platform as a glyph, the author (to their creator page) with what the post
	// is and where it stands as pills (skipped or unread, the brand's own, places still to match,
	// paid), then when, where, the author's followers and what found it, each find to its source.
	// The raw record and the original on the right.
	interface Props {
		post: AdminSocialPostOutputDto;
		/** The places agent A named that still wait for a brand, of how many */
		unmatched: number;
		places: number;
		onRaw: () => void;
	}

	let { post, unmatched, places, onRaw }: Props = $props();

	const platform = $derived(PLATFORM_LABELS[post.platform] ?? post.platform);
	const FINDS_SHOWN = 3;
	let allFinds = $state(false);
	const finds = $derived(allFinds ? post.foundBy : post.foundBy.slice(0, FINDS_SHOWN));
</script>

<header class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
	<div class="flex min-w-0 flex-[1_1_420px] items-center gap-2.5">
		<span class="bg-ink text-sand flex size-[34px] flex-none items-center justify-center rounded-[9px]" title={platform}>
			<PlatformGlyph platform={post.platform} />
		</span>
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="m-0 truncate text-[19px] leading-tight font-semibold">
					{#if post.account}
						<a class="text-ink underline-offset-4 hover:underline" href={`/admin/creators/${post.account.creator.id}`}>{authorLabel(post.platform, post.author)}</a>
					{:else}
						{authorLabel(post.platform, post.author)}
					{/if}
				</h1>
				<Badge pill variant="quiet">{post.platform === 'blog' ? 'Blog article' : `${platform} post`}</Badge>
				{#if post.skipReason}
					<span title="The gate judged it is not about eating or drinking out: no places or claims taken from it">
						<Badge pill variant="quiet">Skipped: {SKIP_REASON_LABELS[post.skipReason] ?? post.skipReason}</Badge>
					</span>
				{:else if !post.analysedAt}
					<Badge pill variant="quiet">Not read yet</Badge>
				{/if}
				{#if post.account?.brand}
					<span title="The brand's own account: not word of mouth">
						<Badge pill variant="secondary" href={`/admin/brands/${post.account.brand.id}`}>Own post of {post.account.brand.name}</Badge>
					</span>
				{/if}
				{#if unmatched}
					<Badge pill variant="warning">
						{places === 1 ? 'Brand not matched' : `${unmatched} of ${places} places not matched`}
					</Badge>
				{/if}
				{#if post.isAd}<Badge pill variant="warning">Ad</Badge>{/if}
				{#if post.isPromotional}
					<span title="Paid, gifted or invited, as agent A read it"><Badge pill variant="warning">Promotional</Badge></span>
				{/if}
			</div>
			<p class="text-muted-foreground m-0 mt-px text-xs">
				{at(post.postedAt)} · <a class="text-beet underline-offset-2 hover:underline" href={`/admin/cities/${post.city.id}`}>{post.city.name}</a>
				{#if post.authorFans}· {compact(post.authorFans)} followers{/if}
				{#if post.foundBy.length}
					· found by
					{#each finds as find, i (`${find.kind} ${find.value}`)}
						{@const href = findHref(find, post.city.id)}
						{#if href}
							<a class="text-beet underline-offset-2 hover:underline" {href} title={`Found ${onDay(find.foundAt)}`}>{findLabel(find)}</a>{:else}<span title={`Found ${onDay(find.foundAt)}; no longer one of the city's sources`}>{findLabel(find)}</span>{/if}{i < finds.length - 1 ? ', ' : ''}
					{/each}
					{#if post.foundBy.length > finds.length}
						<button type="button" class="text-beet cursor-pointer hover:underline" onclick={() => (allFinds = true)}>+{post.foundBy.length - finds.length} more</button>
					{/if}
				{/if}
			</p>
		</div>
	</div>
	<div class="flex flex-wrap gap-1.5">
		<Button size="xs" variant="outline" class="border-input font-medium" icon={CodeXml} onclick={onRaw}>Raw record</Button>
		<Button size="xs" variant="outline" suffixIcon={ExternalLink} href={post.url} newTab>Open on {platform}</Button>
	</div>
</header>
