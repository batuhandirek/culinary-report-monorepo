<script lang="ts">
	import { Eye, EyeOff } from '@lucide/svelte';
	import { nanoid } from 'nanoid';

	import type { HTMLInputAttributes } from 'svelte/elements';

	import { cn } from '#ui/lib/utils.js';
	import Input from '#ui/primitives-new/input/input.svelte';

	interface Props extends Omit<HTMLInputAttributes, 'files' | 'type' | 'value'> {
		id?: string;
		value: string | undefined;
		class?: string;
	}

	let { id = nanoid(), value = $bindable(undefined), class: className = '', ...rest }: Props = $props();

	let isVisible = $state(false);
</script>

<!-- One <input> whose `type` flips: re-creating it (a `{#key}`) would drop focus and the
     caret every time the eye is pressed. -->
<div class="relative flex w-full items-center">
	<Input
		type={isVisible ? 'text' : 'password'}
		{id}
		bind:value
		autocapitalize="off"
		spellcheck={false}
		class={cn('pr-11', className)}
		{...rest} />
	<button
		type="button"
		class="text-muted-foreground hover:text-ink focus-visible:ring-ring/50 absolute right-0.5 grid size-10 place-items-center rounded-md outline-none transition-colors focus-visible:ring-[3px]"
		aria-label={isVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
		aria-pressed={isVisible}
		aria-controls={id}
		onclick={() => (isVisible = !isVisible)}>
		{#if isVisible}
			<EyeOff class="size-4" />
		{:else}
			<Eye class="size-4" />
		{/if}
	</button>
</div>
