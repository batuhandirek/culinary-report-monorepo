<script lang="ts">
	import { Ellipsis, ExternalLink, Eye, Megaphone, Trash } from '@lucide/svelte';
	import type { Editor } from '@tiptap/core';
	import { blogExtensions, parseBlogContent, renderBlogHtml } from 'blog-content';
	import type { AdminBlogEntryOutputDto, BlogEntryOutputDto, BlogTagOutputDto } from 'client';

	import {
		AdminBlogEntryOutputDtoStateEnum,
		ChangeBlogEntryStateInputDtoStateEnum
	} from 'client';

	import BlogTagPicker from '../components/BlogTagPicker.svelte';

	import { PUBLIC_APP_URL } from '$app/env/public';
	import { at, stateVariant } from '#components/admin/admin-format.js';
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import AdminDetailTabs from '#components/admin/AdminDetailTabs.svelte';
	import BlogCtaDialog from '#dialogs/admin/BlogCtaDialog.svelte';
	import { api } from '#lib/api.js';
	import { enumToName } from '#lib/util.js';
	import Form from '#ui/components/form/form.svelte';
	import {
		createForm,
		type CustomField,
		type RichTextField,
		type SingleImageField,
		type TextAreaField,
		type TextField
	} from '#ui/components/form/index.js';
	import SomethingWentWrong from '#ui/components/SomethingWentWrong.svelte';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { useLeaveGuard } from '#ui/lib/use-leave-guard.svelte.js';
	import * as DropdownMenu from '#ui/primitives-new/dropdown-menu/index.js';
	import { Skeleton } from '#ui/primitives-new/skeleton/index.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Buttonish from '#ui/wrapped/Buttonish.svelte';
	import PopConfirm from '#ui/wrapped/PopConfirm.svelte';
	import BlogArticleView from '#views/blog/blog-article-view.svelte';

	// Enum for the loaded entry's state (comparisons/display) vs. the enum the
	// change-state endpoint accepts (action arg) — same values, distinct types.
	const EntryState = AdminBlogEntryOutputDtoStateEnum;
	const SetState = ChangeBlogEntryStateInputDtoStateEnum;
	// Cover aspect ratio matches the 1200×630 OG card. croppr expects height/width.
	const COVER_ASPECT_RATIO = 630 / 1200;

	let { data } = $props();
	// The form is seeded once, from the entry the page opened on.
	const loaded = data.entry as AdminBlogEntryOutputDto;

	let entry = $state(loaded);
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

	const updateAction = createAction(
		() =>
			api.admin.updateEntry(entry.id, {
				title: form.values.title,
				// Slug is immutable after creation — never sent on update.
				excerpt: form.values.excerpt ? form.values.excerpt : null,
				content: form.values.content,
				// data URL → upload, existing https URL → unchanged, empty → removed.
				coverImage: form.values.cover ? form.values.cover : null,
				// Names are upserted server-side (new ones created, existing reused by slug).
				tagNames: form.values.tags
			}),
		{
			successNotification: () => ({
				title: 'Saved',
				text:
					entry.state === EntryState.PUBLISHED
						? 'The published article is updated.'
						: 'Nothing is public until you publish it.'
			}),
			onSuccess: (updated) => {
				entry = updated;
				saved = snapshot();
				// The published snapshot may have changed — force a refetch next preview.
				publishedPreview = undefined;
			}
		}
	);

	const stateAction = createAction(
		(state: ChangeBlogEntryStateInputDtoStateEnum) =>
			api.admin.changeEntryState(entry.id, { state }),
		{
			successNotification: (updated) => ({
				title:
					updated.state === EntryState.PUBLISHED
						? 'Published'
						: updated.state === EntryState.REMOVED
							? 'Removed'
							: 'Moved to drafts',
				text:
					updated.state === EntryState.PUBLISHED
						? 'The article is live on the blog.'
						: 'The article is no longer public.'
			}),
			onSuccess: (updated) => {
				entry = updated;
				publishedPreview = undefined;
			}
		}
	);

	const form = createForm({
		onSubmit: async () => {
			await updateAction.execute();
		},
		fields: {
			title: {
				type: 'text',
				label: 'Title',
				value: loaded.title,
				validation: [(v) => (v?.trim() ? true : 'An article needs a title')]
			} as TextField,
			excerpt: {
				type: 'textarea',
				label: 'Excerpt',
				hint: 'Shown on cards and as the meta description. Around 160 characters reads best.',
				rows: 3,
				value: loaded.excerpt ?? ''
			} as TextAreaField,
			cover: {
				type: 'image',
				label: 'Cover image',
				placeholder: 'Upload a cover image',
				aspectRatio: COVER_ASPECT_RATIO,
				// Seed with the existing cover (a hosted URL the backend treats as "unchanged").
				value: loaded.coverImage?.url ?? ''
			} as SingleImageField,
			tags: {
				type: 'custom',
				label: 'Tags',
				value: (loaded.tags ?? []).map((t) => t.name),
				component: BlogTagPicker,
				props: { allTags }
			} as CustomField<string[]>,
			content: {
				type: 'richtext',
				label: 'Content',
				placeholder: 'Write the article…',
				contentClass: 'blog-content',
				extensions: blogExtensions,
				tools: [ctaTool],
				value: loaded.content
			} as RichTextField
		}
	});

	// ---- Unsaved changes -------------------------------------------------------------------
	const snapshot = () => JSON.stringify(form.values);
	let saved = $state(snapshot());
	const dirty = $derived(snapshot() !== saved);
	useLeaveGuard(() => !dirty, 'This article has unsaved changes. Leave without saving them?');

	// The publish and remove confirmations open from state: the remove one sits in a menu,
	// and a DropdownMenu.Item unmounts its contents when the menu closes.
	let removeOpen = $state(false);

	// ---- Preview tab -----------------------------------------------------------------------
	let tabValue = $state('edit');

	// Draft/removed entries preview the live in-memory editing state (what you're working on).
	const inMemoryPreview = $derived({
		id: entry.id,
		slug: entry.slug,
		title: form.values.title,
		excerpt: form.values.excerpt || null,
		// The public view renders `contentHtml`; render the live JSON draft the same way the
		// server would (shared renderer), so the preview matches the published output exactly.
		contentHtml: renderBlogHtml(parseBlogContent(form.values.content)),
		state: entry.state,
		publishedAt: entry.publishedAt ?? null,
		createdAt: entry.createdAt,
		viewCount: entry.viewCount,
		coverImage: form.values.cover
			? { url: form.values.cover, width: 0, height: 0, aspectRatio: 0, fileName: 'cover' }
			: undefined,
		author: entry.author
			? { id: entry.author.id, publicName: entry.author.publicName }
			: undefined,
		// Map selected names to tag objects for the preview: reuse the real tag when the name
		// matches an existing one, otherwise synthesize a lightweight one (slug only feeds a
		// preview href) for tags that will be created on save.
		tags: (form.values.tags ?? []).map(
			(name) => allTags.find((t) => t.name === name) ?? { id: name, name, slug: name }
		)
		// The admin/public state enums share values but are distinct generated types; the
		// preview view only reads presentational fields, so a structural cast is safe here.
	} as unknown as BlogEntryOutputDto);

	// Published entries preview the actual live version (public shape) from the server.
	let publishedPreview = $state<BlogEntryOutputDto | undefined>(undefined);
	let previewLoading = $state(false);
	let previewFailed = $state(false);

	const loadPreview = () => {
		previewLoading = true;
		previewFailed = false;
		api.admin
			.previewEntry(entry.id)
			.then((res) => (publishedPreview = res))
			.catch(() => (previewFailed = true))
			.finally(() => (previewLoading = false));
	};
	$effect(() => {
		if (tabValue !== 'preview' || entry.state !== EntryState.PUBLISHED) return;
		if (publishedPreview || previewLoading || previewFailed) return;
		loadPreview();
	});

	let publicUrl = $derived(`${PUBLIC_APP_URL}/blog/${entry.slug}`);
</script>

<AdminPageHeader title={entry.title}>
	{#snippet aboveTitle()}
		<span class="text-muted-foreground text-xs">
			Blog article · <span class="font-mono">/blog/{entry.slug}</span>
		</span>
	{/snippet}
	{#snippet belowTitle()}
		<div
			class="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
			<Badge pill variant={stateVariant(entry.state)}>{enumToName(entry.state)}</Badge>
			{#if dirty}
				<Badge pill variant="warning">Unsaved changes</Badge>
			{/if}
			<span class="flex items-center gap-1">
				<Eye class="size-3.5" />
				{entry.viewCount}
				{entry.viewCount === 1 ? 'view' : 'views'}
			</span>
			{#if entry.author}
				<span>by {entry.author.publicName}</span>
			{/if}
			<span>
				{entry.publishedAt
					? `Published ${at(entry.publishedAt)}`
					: `Created ${at(entry.createdAt)}`}
			</span>
		</div>
	{/snippet}
	{#snippet rightTitle()}
		<div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
			{#if entry.state === EntryState.PUBLISHED}
				<Button size="sm" variant="outline" icon={ExternalLink} href={publicUrl} newTab>
					View live
				</Button>
				<Button
					size="sm"
					variant="outline"
					loading={stateAction.executing}
					onclick={() => stateAction.execute(SetState.DRAFT)}>
					Unpublish
				</Button>
			{:else if entry.state === EntryState.REMOVED}
				<Button
					size="sm"
					variant="outline"
					loading={stateAction.executing}
					onclick={() => stateAction.execute(SetState.DRAFT)}>
					Restore as draft
				</Button>
			{/if}
			<Button
				size="sm"
				variant="secondary"
				disabled={!dirty}
				loading={updateAction.executing}
				onclick={() => form.submit()}>
				Save
			</Button>
			{#if entry.state === EntryState.DRAFT}
				<PopConfirm
					title="Publish this article?"
					description={dirty
						? 'It goes live on the blog as last saved — your unsaved changes are not included.'
						: 'It goes live on the blog right away.'}
					confirmText="Publish"
					onConfirm={() => stateAction.execute(SetState.PUBLISHED)}>
					<Buttonish size="sm">Publish</Buttonish>
				</PopConfirm>
			{/if}
			{#if entry.state !== EntryState.REMOVED}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger aria-label="More actions">
						<Buttonish
							icon={Ellipsis}
							size="icon"
							variant="outline"
							iconClass="size-4" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-52" side="bottom" align="end">
						<DropdownMenu.Item
							variant="destructive"
							onclick={() => (removeOpen = true)}>
							<Trash class="size-4" />
							Remove article…
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>
	{/snippet}
</AdminPageHeader>

<div class="flex min-w-0 flex-col gap-5 pb-12">
	<AdminDetailTabs
		tabs={[
			{ value: 'edit', label: 'Edit' },
			{ value: 'preview', label: 'Preview' }
		]}
		bind:value={tabValue} />

	<!-- The form stays mounted under the preview: unmounting it would drop the editor's undo history. -->
	<div class={tabValue === 'edit' ? 'max-w-4xl' : 'hidden'}>
		<Form {form} />
	</div>

	{#if tabValue === 'preview'}
		<div class="mx-auto w-full max-w-[800px]">
			{#if entry.state === EntryState.PUBLISHED}
				{#if dirty}
					<p class="ink-strip m-0 mb-4 w-fit">
						This is the live article. Your unsaved changes show up here once saved.
					</p>
				{/if}
				{#if publishedPreview}
					<BlogArticleView entry={publishedPreview} />
				{:else if previewFailed}
					<SomethingWentWrong description="The preview didn't load" sm />
					<div class="mt-3 flex justify-center">
						<Button size="sm" variant="outline" onclick={loadPreview}>Try again</Button>
					</div>
				{:else}
					<div class="flex flex-col gap-4">
						<Skeleton class="h-10 w-3/4" />
						<Skeleton class="aspect-[1200/630] w-full" />
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-full" />
						<Skeleton class="h-4 w-2/3" />
					</div>
				{/if}
			{:else}
				<p class="ink-strip m-0 mb-4 w-fit">
					A preview of what you have typed, saved or not. Nothing is public until you
					publish it.
				</p>
				<BlogArticleView entry={inMemoryPreview} />
			{/if}
		</div>
	{/if}
</div>

<BlogCtaDialog bind:open={ctaOpen} editor={ctaEditor} />
<PopConfirm
	bind:open={removeOpen}
	title="Remove this article?"
	description={entry.state === EntryState.PUBLISHED
		? 'It comes off the blog right away and its link stops working. You can restore it as a draft later.'
		: 'It leaves the drafts. You can restore it later.'}
	confirmText="Remove"
	destructive
	onConfirm={() => stateAction.execute(SetState.REMOVED)} />
