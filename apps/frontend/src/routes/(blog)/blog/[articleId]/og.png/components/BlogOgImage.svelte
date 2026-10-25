<svelte:options css="injected" />

<script lang="ts">
	import type { BlogEntryOutputDto } from 'client';

	import { ogWordmark } from '#lib/og-image.js';

	// An article's link card. Satori renders this statically: plain flex, literal brand colours
	// (oat ground, the ink wordmark, an acid tag, grape hashtags), the faces from `ogFonts`. The cover
	// sits in an ink frame with a hard offset, like a photo stuck on the page.
	interface Props {
		entry: BlogEntryOutputDto;
	}

	let { entry }: Props = $props();

	const INK = '#1f1724';
	const DISPLAY = "font-family: 'Bricolage Grotesque'; font-weight: 800;";

	const dateLabel = $derived(
		entry.publishedAt
			? new Date(entry.publishedAt).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				})
			: ''
	);
	const tagLabel = $derived((entry.tags ?? []).map((t) => `#${t.name}`).join('  '));
	const titleSize = $derived(entry.title.length > 60 ? 52 : 64);
	const logo = ogWordmark(INK, 34);
</script>

<div class="flex h-full w-full bg-[#f2ede3]" style={`font-family: 'Onest'; color: ${INK};`}>
	<div class="flex flex-1 flex-col justify-between" style="padding: 56px 48px 52px 64px;">
		<div class="flex flex-col items-start">
			<div class="flex items-center" style="margin-bottom: 34px;">
				<img src={logo.src} alt="Munchwerk" style={logo.style} />
				<div
					class="flex bg-[#c6f135]"
					style={`font-size: 22px; font-weight: 700; letter-spacing: 0.08em; margin-left: 18px; padding: 6px 12px; border: 3px solid ${INK}; border-radius: 6px;`}>
					BLOG
				</div>
			</div>
			<div class="flex" style={`${DISPLAY} font-size: ${titleSize}px; line-height: 0.98; letter-spacing: -0.025em;`}>
				{entry.title}
			</div>
			{#if entry.excerpt}
				<div class="flex text-[#5e556a]" style="font-size: 28px; line-height: 1.35; margin-top: 22px;">
					{entry.excerpt}
				</div>
			{/if}
		</div>

		<div class="flex flex-col">
			{#if tagLabel}
				<div class="flex text-[#6a2bea]" style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">{tagLabel}</div>
			{/if}
			<div class="flex text-[#5e556a]" style="font-size: 24px;">
				{#if entry.author?.publicName}<span>{entry.author.publicName}</span>{/if}
				{#if entry.author?.publicName && dateLabel}<span style="padding: 0 12px;">·</span>{/if}
				{#if dateLabel}<span>{dateLabel}</span>{/if}
			</div>
		</div>
	</div>

	{#if entry.coverImage}
		<div class="flex" style="padding: 48px 56px 64px 0;">
			<div class="flex" style={`border: 4px solid ${INK}; box-shadow: 8px 8px 0 ${INK};`}>
				<img
					src={entry.coverImage.url}
					width="400"
					height="510"
					alt=""
					style="object-fit: cover; width: 400px; height: 510px;" />
			</div>
		</div>
	{/if}
</div>
