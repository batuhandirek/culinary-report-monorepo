<script lang="ts">
	import type { AlertDialogRootProps } from 'bits-ui';
	import type { Snippet } from 'svelte';

	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import * as AlertDialog from '#ui/primitives-new/alert-dialog/index.js';

	export interface PopConfirmProps extends AlertDialogRootProps {
		open?: boolean;
		title: string;
		description: string;
		confirmText?: string;
		cancelText?: string;
		/** The confirm deletes or cannot be undone: it is painted red. */
		destructive?: boolean;
		class?: string;
		children?: Snippet;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	const labels = getUiLabels();

	let {
		open = $bindable(false),
		title,
		description,
		confirmText = labels.confirm,
		cancelText = labels.cancel,
		destructive = false,
		children,
		onConfirm,
		onCancel,
		...restProps
	}: PopConfirmProps = $props();

	// The Action primitive is always the orange stamp; these take it back to the red pill
	// of `Button variant="destructive"`.
	const DESTRUCTIVE =
		'bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/30 rounded-full border-0 text-white shadow-none active:translate-x-0 active:translate-y-0 active:opacity-85 active:shadow-none';

	function handleConfirm() {
		onConfirm?.();
		open = false;
	}

	function handleCancel() {
		onCancel?.();
		open = false;
	}
</script>

<AlertDialog.Root bind:open {...restProps}>
	{#if children}
		<AlertDialog.Trigger class={['flex items-center', restProps.class ?? '']}>
			{@render children()}
		</AlertDialog.Trigger>
	{/if}
	<AlertDialog.Content interactOutsideBehavior="close">
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>
				{description}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="mt-2">
			<AlertDialog.Cancel onclick={handleCancel}>
				{cancelText}
			</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleConfirm}
				class={destructive ? DESTRUCTIVE : ''}>
				{confirmText}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
