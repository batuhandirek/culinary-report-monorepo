<script lang="ts">
	import { REGEXP_ONLY_DIGITS } from 'bits-ui';

	import * as InputOTP from '#ui/primitives-new/input-otp/index.js';

	/**
	 * A one-time code, one cell per character. Digits by default (the numeric keypad on a
	 * phone, and iOS/Android offer the code straight from the SMS); pass `pattern` for
	 * anything else.
	 */
	interface Props {
		value?: string;
		maxlength?: number;
		pattern?: string;
		disabled?: boolean;
		invalid?: boolean;
		class?: string;
		onComplete?: (v: string) => void;
	}

	let {
		value = $bindable(''),
		maxlength = 6,
		pattern = REGEXP_ONLY_DIGITS,
		disabled = false,
		invalid = false,
		onComplete,
		class: className
	}: Props = $props();
</script>

<InputOTP.Root
	{maxlength}
	{pattern}
	{disabled}
	inputmode={pattern === REGEXP_ONLY_DIGITS ? 'numeric' : 'text'}
	autocomplete="one-time-code"
	aria-invalid={invalid || undefined}
	class={[className]}
	bind:value
	onComplete={() => {
		onComplete?.(value);
	}}>
	{#snippet children({ cells })}
		<InputOTP.Group class="w-full gap-2">
			{#each cells as cell, i (i)}
				<InputOTP.Slot
					{cell}
					aria-invalid={invalid || undefined}
					class="bg-paper h-12 w-full max-w-12 flex-1 rounded-md border text-lg font-semibold first:rounded-md last:rounded-md" />
			{/each}
		</InputOTP.Group>
	{/snippet}
</InputOTP.Root>
