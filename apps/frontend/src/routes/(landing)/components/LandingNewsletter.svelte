<script lang="ts">
	import { LANDING_CITY } from './landing.js';

	import { api } from '#lib/api.js';
	import { turnstileStore } from '#stores/TurnstileStore.svelte.js';
	import { logFactory } from '#ui/lib/logger.js';

	// The monthly e-mail, double opt-in: the form records the address and the backend mails a
	// link; nothing is sent before that link is tapped. The answer is the same whether the address
	// was new or already on the list.
	const log = logFactory.create('LandingNewsletter');
	let email = $state('');
	let status = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');

	const submit = async (e: SubmitEvent) => {
		e.preventDefault();
		if (status === 'sending') return;
		status = 'sending';
		try {
			await api.newsletter.subscribeToNewsletter(
				{ email: email.trim(), citySlug: LANDING_CITY.slug },
				await turnstileStore.getHeaders('newsletter')
			);
			status = 'sent';
		} catch (error) {
			log.error('Newsletter sign-up failed', error);
			status = 'error';
		}
	};
</script>

<section id="newsletter" aria-labelledby="newsletter-title" class="lp-paper lp-section scroll-mt-4 border-t-4" style="border-color: var(--lp-rule)">
	<div class="lp-wrap flex flex-col gap-10">
		<h2 id="newsletter-title" class="lp-display lp-h2">In your inbox <span style="color: var(--lp-text-purple)">on the 1st.</span></h2>
		{#if status === 'sent'}
			<p class="lp-lede max-w-[720px]" role="status">
				Check your inbox: we sent a link to <strong>{email.trim()}</strong>. One tap on it and you're in. Nothing arrives
				before you tap.
			</p>
		{:else}
			<form class="flex flex-wrap items-end gap-x-8 gap-y-6" onsubmit={submit}>
				<label for="lp-email" class="lp-visually-hidden">Email address</label>
				<input
					id="lp-email"
					class="lp-input"
					type="email"
					name="email"
					placeholder="you@{LANDING_CITY.slug}.de"
					autocomplete="email"
					required
					maxlength="254"
					bind:value={email} />
				<button
					class="lp-button lp-button--green text-[clamp(20px,2vw,28px)]"
					type="submit"
					style="border-radius: 0; box-shadow: 8px 8px 0 var(--lp-rule)"
					disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Get the Heat Check'}</button>
			</form>
			{#if status === 'error'}
				<p class="m-0 text-base font-semibold" role="alert" style="color: var(--lp-chili)">That didn't go through. Check the address and try again.</p>
			{/if}
		{/if}
		<p class="lp-lede lp-muted max-w-[640px] text-[17px]">
			One email a month. The top 10, the dishes, what opened. No ads, ever. {LANDING_CITY.name} edition; other cities as they
			launch. We send a link to confirm first, and every email unsubscribes in one tap.
		</p>
	</div>
</section>
