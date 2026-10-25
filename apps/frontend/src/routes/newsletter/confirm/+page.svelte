<script lang="ts">
	import type { NewsletterSubscriptionOutputDto } from 'client';

	import { onMount } from 'svelte';

	import NewsletterCard from '../components/NewsletterCard.svelte';

	import { api } from '#lib/api.js';

	// The link in the confirmation mail: confirming is what the tap on it meant, so it happens
	// on arrival. The address gets the monthly e-mail from now on.
	let { data } = $props();

	let step = $state<'confirming' | 'done' | 'invalid'>('confirming');
	let subscription = $state<NewsletterSubscriptionOutputDto | null>(null);

	onMount(async () => {
		if (!data.token) {
			step = 'invalid';
			return;
		}
		try {
			subscription = (await api.newsletter.confirmNewsletter({ token: data.token })) as NewsletterSubscriptionOutputDto;
			step = 'done';
		} catch {
			step = 'invalid';
		}
	});
</script>

{#if step === 'done' && subscription}
	<NewsletterCard stamp="Heat Check · monthly" title="You're in.">
		<p class="m-0 text-lg leading-[1.45] font-medium">
			<strong>{subscription.email}</strong> gets Munchwerk {subscription.city.name} on the 1st of every month: the
			top 10, the dishes, what opened. Every e-mail unsubscribes in one tap.
		</p>
		<a href="/" class="font-display text-grape self-start text-lg font-extrabold">See what {subscription.city.name}'s munching →</a>
	</NewsletterCard>
{:else if step === 'invalid'}
	<NewsletterCard stamp="Newsletter" title="This link doesn't work.">
		<p class="m-0 text-lg leading-[1.45] font-medium">It may be cut short, or it's an old one. Sign up again on the front page and we'll send a fresh link.</p>
		<a href="/#newsletter" class="font-display text-grape self-start text-lg font-extrabold">Sign up again →</a>
	</NewsletterCard>
{:else}
	<NewsletterCard stamp="Newsletter" title="One moment…">
		<p class="m-0 text-lg leading-[1.45] font-medium">Confirming your address.</p>
	</NewsletterCard>
{/if}
