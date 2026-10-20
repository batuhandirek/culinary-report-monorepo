<script lang="ts">
	import dayjs from 'dayjs';
	import customParseFormat from 'dayjs/plugin/customParseFormat';
	import dayOfYear from 'dayjs/plugin/dayOfYear';
	import isoWeek from 'dayjs/plugin/isoWeek';
	import utc from 'dayjs/plugin/utc';
	import weekOfYear from 'dayjs/plugin/weekOfYear';

	import { onMount } from 'svelte';

	import { layoutStore } from '#stores/LayoutStore.svelte.js';
	import { popConfirmManager } from '#ui/components/pop-confirm/pop-confirm-manager.svelte.js';
	import { localHistory } from '#ui/lib/history.svelte.js';
	import { initKeyboardInset } from '#ui/lib/keyboard-inset.js';
	import { Toaster } from '#ui/primitives-new/sonner/index.js';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';

	dayjs.extend(customParseFormat);
	dayjs.extend(weekOfYear);
	dayjs.extend(dayOfYear);
	dayjs.extend(isoWeek);
	dayjs.extend(utc);

	// `#ui`-owned, app-wide setup lives here (Setup is mounted once in the root layout).
	// localHistory tracks navigation for smart back-nav; afterNavigate/beforeNavigate must
	// be registered at component init (no-op on the server) — not in onMount.
	localHistory.init();
	onMount(mounted);

	async function mounted() {
		onScreenResize();
		initKeyboardInset();
		initErrorHandlers();
	}

	function onScreenResize() {
		// appHeight()
		layoutStore.handleResize();
	}
	// function appHeight() {
	//     const doc = document.documentElement
	//     doc.style.setProperty('--vh', (window.innerHeight*.01) + 'px');
	// }

	function initErrorHandlers() {
		window.onerror = function () {
			return false;
		};
		window.addEventListener('error', function () {
			return false;
		});
	}
</script>

{#if popConfirmManager.showingProps}
	<PopConfirm {...popConfirmManager.showingProps} open />
{/if}
<svelte:window onresize={onScreenResize} />
<Toaster
	closeButton={false}
	richColors={false}
	position="top-right"
	offset={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
	mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 16px)' }} />
