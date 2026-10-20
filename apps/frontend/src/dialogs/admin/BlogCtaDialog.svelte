<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { BlogCtaVariant } from 'blog-content';

	import * as Dialog from '#ui/primitives-new/dialog/index.js';
	import Label from '#ui/primitives-new/label/label.svelte';
	import Textarea from '#ui/primitives-new/textarea/textarea.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Buttonish from '#ui/wrapped/Buttonish.svelte';
	import Input from '#ui/wrapped/Input.svelte';

	// Controlled by the editor's CTA toolbar button. When a CTA node is already selected it edits
	// it (prefilled); otherwise it inserts a new one at the cursor.
	let { open = $bindable(false), editor }: { open?: boolean; editor?: Editor } = $props();

	let title = $state('');
	let description = $state('');
	let label = $state('Learn more');
	let href = $state('');
	let variant = $state<BlogCtaVariant>('primary');
	let editing = $state(false);

	// Prefill from the selected CTA (edit) or reset to defaults (insert) each time it opens.
	$effect(() => {
		if (!open || !editor) return;
		if (editor.isActive('cta')) {
			const a = editor.getAttributes('cta');
			title = (a.title as string) ?? '';
			description = (a.description as string) ?? '';
			label = (a.label as string) ?? 'Learn more';
			href = (a.href as string) ?? '';
			variant = (a.variant as BlogCtaVariant) ?? 'primary';
			editing = true;
		} else {
			title = '';
			description = '';
			label = 'Learn more';
			href = '';
			variant = 'primary';
			editing = false;
		}
	});

	const submit = () => {
		if (!editor) return;
		const attrs = { title, description, label, href, variant };
		if (editing) {
			editor.chain().focus().updateAttributes('cta', attrs).run();
		} else {
			editor.chain().focus().insertContent({ type: 'cta', attrs }).run();
		}
		open = false;
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-[440px] text-sm">
		<Dialog.Header>
			<Dialog.Title>{editing ? 'Edit CTA' : 'Insert CTA'}</Dialog.Title>
			<Dialog.Description>A titled call-to-action button embedded in the article.</Dialog.Description>
		</Dialog.Header>

		<div class="mt-4 flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Label>Title (optional)</Label>
				<Input bind:value={title} placeholder="e.g. Want the monthly report?" />
			</div>
			<div class="flex flex-col gap-2">
				<Label>Description (optional)</Label>
				<Textarea bind:value={description} rows={2} placeholder="A line of supporting copy" />
			</div>
			<div class="flex flex-col gap-2">
				<Label>Button label</Label>
				<Input bind:value={label} placeholder="Learn more" />
			</div>
			<div class="flex flex-col gap-2">
				<Label>Button URL</Label>
				<Input bind:value={href} placeholder="https://…" />
			</div>
			<div class="flex flex-col gap-2">
				<Label>Style</Label>
				<div class="flex gap-2">
					<Buttonish
						variant={variant === 'primary' ? 'default' : 'outline'}
						onclick={() => (variant = 'primary')}>
						Primary
					</Buttonish>
					<Buttonish
						variant={variant === 'secondary' ? 'default' : 'outline'}
						onclick={() => (variant = 'secondary')}>
						Secondary
					</Buttonish>
				</div>
			</div>
		</div>

		<Dialog.Footer class="mt-4 gap-1">
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={submit}>{editing ? 'Update' : 'Insert'}</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
