<script lang="ts">
	import { Cookie } from '@lucide/svelte';

	import { analyticsStore } from '#stores/AnalyticsStore.svelte.js';
	import Icon from '#ui/components/Icon.svelte';
	import Button from '#ui/wrapped/Button.svelte';

	const acceptAll = () => {
		analyticsStore.acceptAll();
		analyticsStore.setHasAsked(true);
	};

	const onlyNecessary = () => {
		analyticsStore.setConsent('hasAcceptedMarketing', false);
		analyticsStore.setHasAsked(true);
	};
</script>

<!-- A card in the corner, not a wall: the page stays readable and usable underneath, and
     both answers weigh the same. It steps aside while the preferences dialog is open and
     comes back if that is closed without a choice. -->
{#if !analyticsStore.isDialogVisible}
	<section
		aria-label="Çerez tercihleri"
		class="cookie-card bg-paper border-line animate-in fade-in-0 slide-in-from-bottom-2 fixed inset-x-3 z-[45] flex flex-col gap-3 rounded-md border p-4 shadow-lg duration-300 motion-reduce:animate-none sm:left-4 sm:right-auto sm:w-[26rem]"
	>
		<div class="flex items-start gap-3">
			<span class="bg-wash text-ink grid size-9 shrink-0 place-items-center rounded-full">
				<Icon icon={Cookie} size={18} strokeWidth={1.8} />
			</span>
			<div class="min-w-0">
				<h2 class="text-ink m-0 text-[0.9375rem] font-semibold leading-snug">Çerez tercihlerin</h2>
				<p class="text-muted-foreground m-0 mt-1 text-sm leading-snug">
					Sitenin çalışması için gerekli çerezleri kullanıyoruz. İzin verirsen, deneyimi
					iyileştirmek için analitik çerezleri de kullanırız.
				</p>
				<p class="text-muted-foreground m-0 mt-1.5 flex flex-wrap gap-x-3 text-sm">
					<a href="/legal/cerez-politikasi" class="hover:text-ink underline underline-offset-2">
						Çerez politikası
					</a>
					<button
						type="button"
						class="hover:text-ink underline underline-offset-2"
						onclick={analyticsStore.toggleDialog}
					>
						Tercihleri yönet
					</button>
				</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" class="flex-1 pointer-coarse:h-11" onclick={onlyNecessary}>
				Yalnızca gerekli
			</Button>
			<Button variant="secondary" size="sm" class="flex-1 pointer-coarse:h-11" onclick={acceptAll}>
				Kabul et
			</Button>
		</div>
	</section>
{/if}

<style>
	.cookie-card {
		bottom: calc(0.75rem + env(safe-area-inset-bottom));
	}
	/* On the phone the tab bar owns the bottom edge; sit just above it. */
	@media (max-width: 1023px) {
		:global(body:has(#mobile-bottom-nav):not([data-hide-bottom-nav])) .cookie-card {
			bottom: calc(62px + 0.75rem + env(safe-area-inset-bottom));
		}
	}
	@media (min-width: 640px) {
		.cookie-card {
			bottom: 1rem;
		}
	}
</style>
