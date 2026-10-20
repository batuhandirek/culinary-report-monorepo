import { beforeNavigate } from '$app/navigation';

const DEFAULT_MESSAGE =
	'Sayfayı terketmen durumunda seçimlerin kaybolacaktır. Sayfayı terk etmek istiyor musun?';

export function useLeaveGuard(isSafe: () => boolean, message = DEFAULT_MESSAGE) {
	function beforeUnload(e: BeforeUnloadEvent) {
		if (isSafe()) return;
		e.preventDefault();
	}

	$effect(() => {
		window.addEventListener('beforeunload', beforeUnload);
		return () => window.removeEventListener('beforeunload', beforeUnload);
	});

	beforeNavigate(({ cancel, shallow }) => {
		if (shallow) return;
		if (isSafe()) return;
		if (!confirm(message)) cancel();
	});
}
