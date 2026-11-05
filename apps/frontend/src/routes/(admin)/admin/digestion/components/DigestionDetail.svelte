<script lang="ts">
	import type { AdminDigestedPostOutputDto, AdminDigestedReviewOutputDto, AdminDigestionRowOutputDto } from 'client';

	import DigestedPostView from '#components/admin/digestion/DigestedPostView.svelte';
	import DigestedReviewView from '#components/admin/digestion/DigestedReviewView.svelte';
	import { api } from '#lib/api.js';
	import ErrorState from '#ui/wrapped/ErrorState.svelte';
	import SkeletonText from '#ui/wrapped/SkeletonText.svelte';

	// An opened Digestion row: loads its source with every step's result when it opens.
	interface Props {
		row: AdminDigestionRowOutputDto;
	}

	let { row }: Props = $props();

	let post = $state<AdminDigestedPostOutputDto | null>(null);
	let review = $state<AdminDigestedReviewOutputDto | null>(null);
	let failed = $state<string | null>(null);

	const load = async () => {
		failed = null;
		try {
			if (row.post) post = (await api.admin.getDigestedPost(row.post.id)) as AdminDigestedPostOutputDto;
			else if (row.review) review = (await api.admin.getDigestedReview(row.review.id)) as AdminDigestedReviewOutputDto;
		} catch (error) {
			failed = error instanceof Error ? error.message : 'The request failed.';
		}
	};

	$effect(() => {
		void row;
		load();
	});
</script>

{#if failed}
	<ErrorState title="Couldn't load what it digested to" hint={failed} onRetry={load} size="sm" ground="none" />
{:else if post}
	<DigestedPostView {post} />
{:else if review}
	<DigestedReviewView {review} />
{:else}
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<SkeletonText lines={5} />
		<SkeletonText lines={4} />
	</div>
{/if}
