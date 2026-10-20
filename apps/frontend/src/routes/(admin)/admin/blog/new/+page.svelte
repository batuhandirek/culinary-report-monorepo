<script lang="ts">
	import { Megaphone } from '@lucide/svelte';
	import type { Editor } from '@tiptap/core';
	import { blogExtensions } from 'blog-content';
	import type { BlogTagOutputDto } from 'client';

	import BlogTagPicker from '../components/BlogTagPicker.svelte';

	import { goto } from '$app/navigation';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import BlogCtaDialog from '#dialogs/admin/BlogCtaDialog.svelte';
	import { api } from '#lib/api.js';
	import Form from '#ui/components/form/form.svelte';
	import {
		createForm,
		type CustomField,
		type RichTextField,
		type SingleImageField,
		type TextAreaField,
		type TextField
	} from '#ui/components/form/index.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { useLeaveGuard } from '#ui/lib/use-leave-guard.svelte.js';
	import Button from '#ui/wrapped/Button.svelte';

	// Cover aspect ratio matches the 1200×630 OG card. croppr expects height/width.
	const COVER_ASPECT_RATIO = 630 / 1200;

	let { data } = $props();
	let allTags = $derived(data.tags.items as BlogTagOutputDto[]);

	// CTA insert/edit — the editor's toolbar button opens the dialog with the live editor.
	let ctaOpen = $state(false);
	let ctaEditor = $state<Editor>();
	const ctaTool = {
		icon: Megaphone,
		title: 'Insert / edit CTA',
		run: (editor: Editor) => {
			ctaEditor = editor;
			ctaOpen = true;
		}
	};

	// Anything typed is lost on leaving, until the draft exists.
	let created = $state(false);

	const createAction_ = createAction(
		() =>
			api.admin.createEntry({
				title: form.values.title,
				// Slug is auto-generated from the title by the backend.
				excerpt: form.values.excerpt || undefined,
				content: form.values.content ?? '',
				// Fresh crop → data URL uploaded on save; empty → no cover.
				coverImage: form.values.cover || undefined,
				// Names are upserted server-side (new ones created, existing reused by slug).
				tagNames: form.values.tags
			}),
		{
			successNotification: {
				title: 'Draft saved',
				text: 'Nothing is public until you publish it.'
			},
			onSuccess: (entry) => {
				created = true;
				goto(`/admin/blog/${entry.id}`);
			}
		}
	);

	const form = createForm({
		onSubmit: async () => {
			await createAction_.execute();
		},
		fields: {
			title: {
				type: 'text',
				label: 'Title',
				placeholder: 'What the article is called',
				hint: 'Its address is built from this once, when the draft is saved.',
				validation: [(v) => (v?.trim() ? true : 'An article needs a title')]
			} as TextField,
			excerpt: {
				type: 'textarea',
				label: 'Excerpt (optional)',
				hint: 'Shown on cards and as the meta description. Around 160 characters reads best.',
				rows: 3
			} as TextAreaField,
			cover: {
				type: 'image',
				label: 'Cover image',
				placeholder: 'Upload a cover image',
				aspectRatio: COVER_ASPECT_RATIO
			} as SingleImageField,
			tags: {
				type: 'custom',
				label: 'Tags',
				value: [],
				component: BlogTagPicker,
				props: { allTags }
			} as CustomField<string[]>,
			content: {
				type: 'richtext',
				label: 'Content',
				placeholder: 'Write the article…',
				contentClass: 'blog-content',
				extensions: blogExtensions,
				tools: [ctaTool]
			} as RichTextField
		}
	});

	const touched = $derived(
		!!(
			form.values.title?.trim() ||
			form.values.excerpt?.trim() ||
			form.values.cover ||
			form.values.tags?.length ||
			form.values.content
		)
	);
	useLeaveGuard(
		() => created || !touched,
		'This draft is not saved yet. Leave without saving it?'
	);
</script>

<AdminPageHeader
	title="New article"
	description="Saved as a draft. Nothing is public until you publish it.">
	{#snippet rightTitle()}
		<div class="flex shrink-0 items-center gap-2">
			<Button size="sm" variant="outline" href="/admin/blog">Cancel</Button>
			<Button size="sm" loading={createAction_.executing} onclick={() => form.submit()}>
				Save draft
			</Button>
		</div>
	{/snippet}
</AdminPageHeader>

<div class="max-w-4xl pb-12">
	<Form {form} submitText="Save draft" />
</div>

<BlogCtaDialog bind:open={ctaOpen} editor={ctaEditor} />
