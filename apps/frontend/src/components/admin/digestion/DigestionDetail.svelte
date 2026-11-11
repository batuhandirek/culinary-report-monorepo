<script lang="ts">
	import type { AdminDigestedPostOutputDto, AdminDigestedReviewOutputDto } from 'client';

	import DigestedPostView from './DigestedPostView.svelte';
	import DigestedReviewView from './DigestedReviewView.svelte';

	import { api } from '#lib/api.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';

	// An opened row of a source (Digestion, a brand's posts and reviews) or of a claim (the claims
	// tables): loads the post or review with every step's result when it opens. A claim row passes
	// its id as `focus`, so that claim is ringed and its quote marked louder in the text.
	interface Props {
		postId?: string;
		reviewId?: string;
		focus?: number;
	}

	let { postId, reviewId, focus }: Props = $props();

	let post = $state<AdminDigestedPostOutputDto | null>(null);
	let review = $state<AdminDigestedReviewOutputDto | null>(null);
	let failed = $state<string | null>(null);

	const load = async () => {
		failed = null;
		try {
			if (postId) post = (await api.admin.getDigestedPost(postId)) as AdminDigestedPostOutputDto;
			else if (reviewId) review = (await api.admin.getDigestedReview(reviewId)) as AdminDigestedReviewOutputDto;
		} catch (error) {
			failed = error instanceof Error ? error.message : 'The request failed.';
		}
	};

	$effect(() => {
		void [postId, reviewId];
		load();
	});
</script>

{#if failed}
	<ErrorState title="Couldn't load what it digested to" hint={failed} onRetry={load} size="sm" ground="none" />
{:else if post}
	<DigestedPostView {post} {focus} />
{:else if review}
	<DigestedReviewView {review} {focus} />
{:else}
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<SkeletonText lines={5} />
		<SkeletonText lines={4} />
	</div>
{/if}
