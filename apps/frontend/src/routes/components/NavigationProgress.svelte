<script lang="ts">
	import { navigating } from '$app/state';
</script>

<!-- A hairline of progress under the top edge while a page's data is on its way. It only
     appears once a navigation has taken long enough to be noticed (the animation's delay),
     so instant navigations stay instant-looking. -->
{#if navigating.to}
	<div class="nav-progress" role="progressbar" aria-label="Sayfa yükleniyor"></div>
{/if}

<style>
	.nav-progress {
		position: fixed;
		top: env(safe-area-inset-top);
		left: 0;
		right: 0;
		z-index: 70;
		height: 2px;
		background: var(--primary);
		transform-origin: left;
		transform: scaleX(0);
		opacity: 0;
		pointer-events: none;
		/* Fast at first, then creeping: it never claims to be done before the page is. */
		animation: nav-progress 10s cubic-bezier(0.1, 0.7, 0.1, 1) 180ms forwards;
	}
	@keyframes nav-progress {
		from {
			transform: scaleX(0);
			opacity: 1;
		}
		to {
			transform: scaleX(0.94);
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.nav-progress {
			animation: none;
			transform: none;
			opacity: 0.6;
		}
	}
</style>
