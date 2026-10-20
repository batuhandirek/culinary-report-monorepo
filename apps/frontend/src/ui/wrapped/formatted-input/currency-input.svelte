<script lang="ts">
	import type { FormattedInputProps } from './formatted-input.svelte';
	import FormattedInput from './formatted-input.svelte';

	import type { ValueFormatter } from '#ui/wrapped/formatted-input/types.js';

	interface CurrencyInputProps extends Omit<FormattedInputProps<number>, 'formatter'> {
		value?: number;
	}

	let { value = $bindable(), ...rest }: CurrencyInputProps = $props();

	const moneyFormatter = new Intl.NumberFormat('tr-TR', {
		style: 'currency',
		currency: 'TRY',
		minimumFractionDigits: 0
	});
	const formatMoney = (money: string | number) =>
		moneyFormatter.format(typeof money === 'string' ? Number(money) : money);

	const currencyFormatter: ValueFormatter<number> = {
		parse: (display) => {
			const cleaned = display.replaceAll('₺', '').replaceAll('.', '').trim();
			const num = Number(cleaned);
			return isNaN(num) ? null : num;
		},
		// Zero reads as empty so the placeholder ("Örn. 1.500", "Sınır yok") shows, and
		// clearing the field doesn't snap it back to "₺0". No price or offer is ever ₺0.
		format: (value) => (value ? formatMoney(value) : ''),
		validate: (value) => !isNaN(value) && value >= 0
	};
</script>

<FormattedInput bind:value formatter={currencyFormatter} {...rest} />
