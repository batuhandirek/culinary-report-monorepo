<script lang="ts">
	import {
		AlignCenter,
		AlignLeft,
		AlignRight,
		Bold,
		Code,
		Heading2,
		Heading3,
		ImagePlus,
		Italic,
		Link as LinkIcon,
		List,
		ListOrdered,
		Quote,
		Redo2,
		Undo2
	} from '@lucide/svelte';
	import { Editor, type Extensions } from '@tiptap/core';
	// Side-effect imports: these register the `ChainedCommands` type augmentations for the
	// standard commands the toolbar drives (bold/heading/list/undo… from StarterKit, plus image
	// and text-align). The actual schema still comes from the `extensions` prop at runtime.
	import '@tiptap/starter-kit';
	import '@tiptap/extension-image';
	import '@tiptap/extension-text-align';

	import { onDestroy, onMount } from 'svelte';

	import { cn } from '#ui/lib/utils.js';

	import type { EditorTool } from './types';

	// A generic WYSIWYG editor over a TipTap/ProseMirror document. `value` is the document as
	// stringified JSON (two-way bound) — the format the backend stores and renders from. The
	// schema comes entirely from `extensions` (the caller passes the shared list), so this
	// component stays free of any app-specific node knowledge. `tools` lets a caller add toolbar
	// buttons that act on the live editor (e.g. "insert CTA"); `contentClass` matches the editor's
	// typography to the final render target.
	let {
		value = $bindable(''),
		placeholder = '',
		contentClass = '',
		extensions,
		tools = [],
		onValueChange
	}: {
		value?: string;
		placeholder?: string;
		contentClass?: string;
		extensions: Extensions;
		tools?: EditorTool[];
		onValueChange?: (value: string) => void;
	} = $props();

	let element = $state<HTMLDivElement>();
	let editor = $state<Editor>();
	// Bumped on every transaction so toolbar active/disabled states re-evaluate reactively.
	let tick = $state(0);

	// The stored value is stringified JSON; tolerate empty/invalid input (start blank).
	const parseDoc = (v: string) => {
		if (!v) return undefined;
		try {
			return JSON.parse(v);
		} catch {
			return undefined;
		}
	};

	// The string the editor was handed. A stored document rarely matches the editor's own
	// serialization byte for byte (default attributes, and the editor tidies as it goes: a
	// trailing paragraph after a last block that is not one), so while no edit of the
	// writer's stands, hand back what came in — or a form comparing values would call an
	// untouched document changed, and keep saying so after an undo.
	const given = value;

	// No undo step left: every edit was taken back. The editor's own tidy-ups never enter
	// the history, so they do not count. Without a history extension, nothing is "untouched".
	const untouched = (current: Editor) => {
		const canUndo = (current.can() as { undo?: () => boolean }).undo;
		return typeof canUndo === 'function' && !canUndo();
	};

	onMount(() => {
		editor = new Editor({
			element,
			extensions,
			content: parseDoc(value),
			onUpdate: ({ editor }) => {
				value = untouched(editor) ? given : JSON.stringify(editor.getJSON());
				onValueChange?.(value);
			},
			onTransaction: () => {
				// Deferred: when the editor's node is removed while focused, its blur dispatches
				// a transaction from inside Svelte's own teardown, where writing state throws.
				queueMicrotask(() => tick++);
			},
			editorProps: {
				attributes: {
					class: cn('focus:outline-none min-h-[22rem] px-4 py-3', contentClass)
				}
			}
		});
	});

	onDestroy(() => editor?.destroy());

	// `void tick` registers a reactive dependency so toolbar states re-evaluate on every
	// selection/content change (TipTap mutates its instance in place).
	const isActive = (name: string, attrs?: Record<string, unknown>) => {
		void tick;
		return editor?.isActive(name, attrs) ?? false;
	};
	const isActiveAttrs = (attrs: Record<string, unknown>) => {
		void tick;
		return editor?.isActive(attrs) ?? false;
	};
	const can = (fn: (e: Editor) => boolean) => {
		void tick;
		return editor ? fn(editor) : false;
	};

	// Inline images are inserted as data URLs; hosting them is the consumer's concern on save.
	let imageInput = $state<HTMLInputElement>();

	const onImagePicked = (event: Event) => {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file || !editor) return;
		const reader = new FileReader();
		reader.onload = () => {
			editor?.chain().focus().setImage({ src: reader.result as string, alt: file.name }).run();
		};
		reader.readAsDataURL(file);
		// Allow re-selecting the same file later.
		(event.target as HTMLInputElement).value = '';
	};

	// The link is edited in a bar under the toolbar rather than a browser prompt: the selection
	// stays visible, and the bar can offer "remove" next to "apply".
	let linkOpen = $state(false);
	let linkUrl = $state('');
	let linkInput = $state<HTMLInputElement>();

	const openLink = () => {
		if (!editor) return;
		linkUrl = (editor.getAttributes('link').href as string | undefined) ?? '';
		linkOpen = true;
	};
	$effect(() => {
		if (linkOpen) linkInput?.focus();
	});
	const closeLink = () => {
		linkOpen = false;
		editor?.chain().focus().run();
	};
	const removeLink = () => {
		editor?.chain().focus().extendMarkRange('link').unsetLink().run();
		linkOpen = false;
	};
	const applyLink = () => {
		if (!editor) return;
		const url = linkUrl.trim();
		if (!url) return removeLink();
		// A bare domain is an address someone pasted without its scheme.
		const href = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url) ? url : `https://${url}`;
		editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
		linkOpen = false;
	};
	const onLinkKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			// The editor usually sits inside a form; Enter here applies the link, not the form.
			event.preventDefault();
			applyLink();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			closeLink();
		}
	};

	type ToolButton = {
		icon: typeof Bold;
		title: string;
		run: () => void;
		active?: () => boolean;
		disabled?: () => boolean;
	};

	// Built-in formatting tools (assume a StarterKit-ish schema + Image/Link/TextAlign, which the
	// shared extension list provides).
	const baseTools: (ToolButton | 'divider')[] = [
		{
			icon: Bold,
			title: 'Bold',
			run: () => editor?.chain().focus().toggleBold().run(),
			active: () => isActive('bold')
		},
		{
			icon: Italic,
			title: 'Italic',
			run: () => editor?.chain().focus().toggleItalic().run(),
			active: () => isActive('italic')
		},
		'divider',
		{
			icon: Heading2,
			title: 'Heading 2',
			run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
			active: () => isActive('heading', { level: 2 })
		},
		{
			icon: Heading3,
			title: 'Heading 3',
			run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
			active: () => isActive('heading', { level: 3 })
		},
		'divider',
		{
			icon: AlignLeft,
			title: 'Align left',
			run: () => editor?.chain().focus().setTextAlign('left').run(),
			active: () => isActiveAttrs({ textAlign: 'left' })
		},
		{
			icon: AlignCenter,
			title: 'Align center',
			run: () => editor?.chain().focus().setTextAlign('center').run(),
			active: () => isActiveAttrs({ textAlign: 'center' })
		},
		{
			icon: AlignRight,
			title: 'Align right',
			run: () => editor?.chain().focus().setTextAlign('right').run(),
			active: () => isActiveAttrs({ textAlign: 'right' })
		},
		'divider',
		{
			icon: List,
			title: 'Bullet list',
			run: () => editor?.chain().focus().toggleBulletList().run(),
			active: () => isActive('bulletList')
		},
		{
			icon: ListOrdered,
			title: 'Numbered list',
			run: () => editor?.chain().focus().toggleOrderedList().run(),
			active: () => isActive('orderedList')
		},
		{
			icon: Quote,
			title: 'Quote',
			run: () => editor?.chain().focus().toggleBlockquote().run(),
			active: () => isActive('blockquote')
		},
		{
			icon: Code,
			title: 'Code block',
			run: () => editor?.chain().focus().toggleCodeBlock().run(),
			active: () => isActive('codeBlock')
		},
		{
			icon: LinkIcon,
			title: 'Link',
			run: openLink,
			active: () => isActive('link') || linkOpen
		},
		{
			icon: ImagePlus,
			title: 'Insert image',
			run: () => imageInput?.click()
		},
		'divider',
		{
			icon: Undo2,
			title: 'Undo',
			run: () => editor?.chain().focus().undo().run(),
			disabled: () => !can((e) => e.can().undo())
		},
		{
			icon: Redo2,
			title: 'Redo',
			run: () => editor?.chain().focus().redo().run(),
			disabled: () => !can((e) => e.can().redo())
		}
	];

	// Consumer-supplied tools act on the live editor instance.
	let extraTools = $derived(
		tools.map(
			(t): ToolButton => ({
				icon: t.icon as typeof Bold,
				title: t.title,
				run: () => editor && t.run(editor),
				active: t.active ? () => (editor ? t.active!(editor) : false) : undefined,
				disabled: t.disabled ? () => (editor ? t.disabled!(editor) : false) : undefined
			})
		)
	);

	let allTools = $derived<(ToolButton | 'divider')[]>(
		extraTools.length ? [...baseTools, 'divider', ...extraTools] : baseTools
	);
</script>

<div class="pop bg-card overflow-hidden rounded-xl">
	<div class="border-line flex flex-wrap items-center gap-1 border-b p-1">
		{#each allTools as tool, i (i)}
			{#if tool === 'divider'}
				<span class="bg-border mx-1 h-5 w-0.5"></span>
			{:else}
				{@const ActiveIcon = tool.icon}
				<button
					type="button"
					title={tool.title}
					aria-label={tool.title}
					disabled={tool.disabled?.()}
					aria-pressed={tool.active?.() ?? false}
					onclick={tool.run}
					class={cn(
						'flex h-9 w-9 items-center justify-center rounded hover:bg-muted focus-visible:ring-primary/50 focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
						tool.active?.() && 'bg-muted text-primary-darker'
					)}>
					<ActiveIcon class="h-4 w-4" />
				</button>
			{/if}
		{/each}
	</div>

	{#if linkOpen}
		<div class="border-line bg-tint flex flex-wrap items-center gap-2 border-b px-2 py-1.5">
			<label for="rte-link-url" class="text-muted-foreground pl-1 text-xs">Link to</label>
			<input
				id="rte-link-url"
				bind:this={linkInput}
				bind:value={linkUrl}
				type="url"
				inputmode="url"
				autocomplete="off"
				placeholder="https://…"
				onkeydown={onLinkKeydown}
				class="bg-paper border-line focus-visible:border-ink h-9 min-w-0 flex-1 basis-48 rounded-md border px-3 text-sm outline-none" />
			<button
				type="button"
				onclick={applyLink}
				class="bg-ink text-paper h-9 rounded-full px-4 text-sm font-medium">
				Apply
			</button>
			{#if isActive('link')}
				<button
					type="button"
					onclick={removeLink}
					class="hover:bg-muted h-9 rounded-full px-3 text-sm">
					Remove link
				</button>
			{/if}
			<button
				type="button"
				onclick={closeLink}
				class="hover:bg-muted h-9 rounded-full px-3 text-sm">
				Cancel
			</button>
		</div>
	{/if}

	<!-- Cap the editable region and let it scroll internally so the toolbar above stays in view
	     no matter how long the document grows. -->
	<div class="max-h-[60vh] overflow-y-auto">
		<div bind:this={element} data-placeholder={placeholder}></div>
	</div>

	<input
		bind:this={imageInput}
		type="file"
		accept="image/*"
		class="hidden"
		onchange={onImagePicked} />
</div>
