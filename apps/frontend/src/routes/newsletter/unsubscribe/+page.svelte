<script lang="ts">
	import type { NewsletterSubscriptionOutputDto } from 'client';

	import NewsletterCard from '../components/NewsletterCard.svelte';

	import { api } from '#lib/api.js';

	// The link in every newsletter. Unsubscribing takes a tap on the page, not the visit, so a
	// mail scanner opening the link never unsubscribes anyone.
	let { data } = $props();

	let step = $state<'ask' | 'sending' | 'done' | 'invalid'>('ask');
	let subscription = $state<NewsletterSubscriptionOutputDto | null>(null);

	const unsubscribe = async () => {
		step = 'sending';
		try {
			subscription = (await api.newsletter.unsubscribeFromNewsletter({ token: data.token })) as NewsletterSubscriptionOutputDto;
			step = 'done';
		} catch {
			step = 'invalid';
		}
	};
</script>

{#if step === 'done' && subscription}
	<NewsletterCard stamp="Newsletter" title="Done. No more e-mails.">
		<p class="m-0 text-lg leading-[1.45] font-medium">
			<strong>{subscription.email}</strong> is off the Munchwerk {subscription.city.name} list. The front page is still
			there whenever you're hungry.
		</p>
		<a href="/" class="font-display text-grape self-start text-lg font-extrabold">Back to the front page →</a>
	</NewsletterCard>
{:else if step === 'invalid' || !data.token}
	<NewsletterCard stamp="Newsletter" title="This link doesn't work.">
		<p class="m-0 text-lg leading-[1.45] font-medium">It may be cut short. Write to hello@munchwerk.com and we'll take you off the list by hand.</p>
	</NewsletterCard>
{:else}
	<NewsletterCard stamp="Newsletter" title="Unsubscribe?">
		<p class="m-0 text-lg leading-[1.45] font-medium">One tap and the monthly e-mail stops.</p>
		<button
			type="button"
			class="font-display bg-ink text-sand border-ink min-h-11 cursor-pointer self-start rounded-[6px] border-[3px] px-5 py-3 text-lg font-extrabold shadow-[4px_4px_0_var(--ink)] disabled:opacity-60"
			disabled={step === 'sending'}
			onclick={unsubscribe}>{step === 'sending' ? 'Unsubscribing…' : 'Unsubscribe'}</button>
	</NewsletterCard>
{/if}
