<script module lang="ts">
	import { tick } from 'svelte';

	type PortalTarget = string | HTMLElement;

	export function portal(el: HTMLElement, target: PortalTarget = 'body') {
		let targetEl: HTMLElement | null = null;
		async function update(newTarget: PortalTarget) {
			target = newTarget;
			if (typeof target === 'string') {
				targetEl = document.querySelector<HTMLElement>(target);
				if (targetEl === null) {
					await tick();
					targetEl = document.querySelector<HTMLElement>(target);
				}
				if (targetEl === null) {
					throw new Error(`No element found matching css selector: "${target}"`);
				}
			} else if (target instanceof HTMLElement) {
				targetEl = target;
			} else {
				throw new TypeError(
					`Unknown portal target type: ${
						target === null ? 'null' : typeof target
					}. Allowed types: string (CSS selector) or HTMLElement.`
				);
			}
			targetEl.appendChild(el);
			el.hidden = false;
		}
		function destroy() {
			el.parentNode?.removeChild(el);
		}
		update(target);
		return {
			update,
			destroy
		};
	}
</script>

<script lang="ts">
	interface Props {
		target?: string;
		children?: import('svelte').Snippet;
	}

	let { target = 'body', children }: Props = $props();
</script>

<div use:portal={target} hidden>
	{@render children?.()}
</div>
