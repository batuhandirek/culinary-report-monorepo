<script lang="ts" generics="T extends FieldsConfig">
	import type { Snippet } from 'svelte';

	import {
		createForm,
		type FieldsConfig,
		Form,
		type FormConfig,
		FormState,
		type InferFormValues
	} from '#ui/components/form/index.js';
	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import Button from '#ui/wrapped/Button.svelte';

	interface Props {
		active?: boolean;
		form: FormConfig<T> | FormState<T>;
		title?: string;
		description?: string;
		submitText?: string;
		cancelText?: string;
		closeOnSubmit?: boolean;
		class?: string;
		formClass?: string;
		children?: Snippet;
		foot?: Snippet;
		onSubmit?: (values: InferFormValues<T>) => void | Promise<void>;
		onCancel?: () => void;
	}

	const labels = getUiLabels();

	let {
		active = $bindable(false),
		form: formConfig,
		title = '',
		description = '',
		submitText = labels.submit,
		cancelText = labels.cancel,
		closeOnSubmit = true,
		class: className = '',
		formClass = 'gap-6 mt-6',
		children,
		foot,
		onSubmit: onSubmitCallback,
		onCancel
	}: Props = $props();

	let form = $derived(createFormState(formConfig));

	function createFormState(config: FormConfig<T> | FormState<T>) {
		return config instanceof FormState ? config : createForm(config);
	}

	function cancel() {
		onCancel?.();
		active = false;
	}

	async function submit() {
		if (!onSubmitCallback) {
			await form.submit();
			if (form.isValid() && closeOnSubmit) active = false;
			return;
		}

		form.validateAllFields();
		if (!form.isValid()) return;

		form.loading = true;
		try {
			await onSubmitCallback(form.values);
			if (closeOnSubmit) active = false;
		} finally {
			form.loading = false;
		}
	}
</script>

<Dialog.Root bind:open={active}>
	{#if children}
		<Dialog.Trigger>
			{@render children()}
		</Dialog.Trigger>
	{/if}

	<!-- `overflow-y-auto`, not `overflow-scroll`: the latter draws both scrollbar tracks
	     even when nothing overflows. -->
	<Dialog.Content class={`max-h-[85dvh] overflow-y-auto text-sm ${className}`} preventScroll>
		{#if title || description}
			<Dialog.Header>
				{#if title}
					<Dialog.Title>{title}</Dialog.Title>
				{/if}
				{#if description}
					<Dialog.Description>{description}</Dialog.Description>
				{/if}
			</Dialog.Header>
		{/if}

		<Form {form} class={formClass} noSubmit {foot} onSubmit={submit} />

		<Dialog.Footer class="gap-2">
			<Button onclick={cancel} variant="ghost" disabled={form.loading}>
				{cancelText}
			</Button>
			<Button onclick={submit} loading={form.loading}>
				{submitText}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
