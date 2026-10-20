<script lang="ts">
	import type { Snippet } from 'svelte';

	import Panel from '#ui/wrapped/Panel.svelte';

	// One block of an admin page: the design system's `Panel` in its dense form. Kept as a
	// name of its own so a detail page reads `AdminPanel` and never chooses a density.
	interface Props {
		title?: string;
		/** A quieter word after the title: a count, a unit. */
		note?: string | number;
		/** Right of the title: a link, a button. */
		action?: Snippet;
		class?: string;
		children?: Snippet;
	}

	let { title, note, action, class: className = '', children }: Props = $props();
</script>

<Panel dense {title} {note} actions={action} class={className}>
	{@render children?.()}
</Panel>
