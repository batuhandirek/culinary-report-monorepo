<script lang="ts">
	import AdminPageHeader from '#components/admin/admin-page-header.svelte';
	import { POST_DESIGNS } from '#components/admin/instagram/designs/index.js';
	import { POST_FORMATS } from '#components/admin/instagram/post-design.js';
	import { loadDraft } from '#components/admin/instagram/post-draft.js';
	import PostStage from '#components/admin/instagram/PostStage.svelte';
	import { findAdminMenu } from '#constants/ADMIN_MENUS.js';

	// The designs to start a post from, each drawn with the draft this browser keeps for it
	// (its sample content until one is touched).
	const cards = POST_DESIGNS.map((design) => ({ design, draft: loadDraft(design) }));
</script>

<AdminPageHeader description={findAdminMenu('/admin/instagram')?.description} />

<div class="grid grid-cols-1 gap-5 pb-12 sm:grid-cols-2 xl:grid-cols-4">
	{#each cards as { design, draft } (design.id)}
		<a
			href={`/admin/instagram/${design.id}`}
			class="bg-paper border-line pop-lift group flex flex-col overflow-hidden rounded-md border outline-none focus-visible:ring-3 focus-visible:ring-grape">
			<div class="bg-wash flex items-center justify-center p-5">
				<div class="w-full max-w-64 shadow-[0_1px_0_var(--line)]">
					<PostStage
						{design}
						values={draft.values}
						format={draft.format}
						maxHeight="20rem"
						class="mx-auto" />
				</div>
			</div>
			<div class="flex flex-1 flex-col gap-1.5 p-4">
				<h2 class="m-0 text-base font-semibold group-hover:underline">{design.name}</h2>
				<p class="text-muted-foreground m-0 text-sm">{design.description}</p>
				<p class="eyebrow text-beet m-0 mt-auto pt-2">
					{design.slides ? 'Carousel · ' : ''}{design.formats
						.map((f) => POST_FORMATS[f].label.split(' ')[1])
						.join(' · ')}
				</p>
			</div>
		</a>
	{/each}
</div>
