import type { AdminDigestionTallyOutputDto, AdminMentionWithPostOutputDto } from 'client';

import PostClaimsCell from './PostClaimsCell.svelte';
import PostViewsCell from './PostViewsCell.svelte';

import PlatformIcon from '#components/admin/detail/PlatformIcon.svelte';
import { authorLabel } from '#lib/culinary.js';
import { saidOf, tallyOf } from '#lib/statements.js';
import type { Column } from '#ui/components/paginated-data-table/index.js';

// One post row for every table that lists posts (the Social page, a brand's and a branch's
// Posts tabs, a brand's most viewed): posted, platform, creator, what it says, its claims, its
// views. A table maps its rows to `PostRow` and slots its own columns in (a branch, the brands
// it names, how it was found); the row opens in place on the post (`DigestionDetail`).
export interface PostRow {
	postId: string;
	postedAt: string | Date;
	platform: string;
	/** The handle, without the @ */
	author?: string;
	/** The creator's page; the post's own page without */
	authorHref?: string;
	/** Greyed: the brand's own account posted it */
	ownAccount?: boolean;
	/** Its caption, or what it said about the brand */
	text?: string;
	views: number | null | undefined;
	status?: 'digested' | 'skipped' | 'unread';
	skipReason?: string;
	sentiments?: AdminDigestionTallyOutputDto;
	/** An overall tone, for a row without its claims */
	tone?: string;
}

interface PostColumnsOptions<T> {
	/** The text column's head: "Caption", "What they said" */
	text?: string;
	/** Said when it has no text */
	empty?: string;
	/** Without the creator column: a table of one creator's posts */
	creator?: false;
	/** The table's sort values for the date and views columns */
	sort?: { posted?: { asc?: string; desc?: string }; views?: { asc?: string; desc?: string } };
	afterCreator?: Column<T>[];
	afterText?: Column<T>[];
	end?: Column<T>[];
}

export const postColumns = <T>(of: (row: T) => PostRow, options: PostColumnsOptions<T> = {}): Column<T>[] => [
	{ type: 'date', name: 'Posted', format: 'date', value: (row) => of(row).postedAt, sort: options.sort?.posted },
	{
		type: 'component',
		name: 'Platform',
		label: '',
		class: 'pr-0',
		component: PlatformIcon as never,
		props: (row) => ({ platform: of(row).platform, tip: true, class: 'text-muted-foreground' })
	},
	...(options.creator === false ? [] : [creatorColumn(of)]),
	...(options.afterCreator ?? []),
	{
		type: 'value',
		name: options.text ?? 'Caption',
		grow: true,
		value: (row) => of(row).text || { value: options.empty ?? 'no caption', class: 'text-faint italic' }
	},
	...(options.afterText ?? []),
	{
		type: 'component',
		name: 'Claims',
		component: PostClaimsCell as never,
		props: (row) => {
			const r = of(row);
			return { status: r.status, skipReason: r.skipReason, sentiments: r.sentiments, tone: r.tone };
		}
	},
	{
		type: 'component',
		name: 'Views',
		numeric: true,
		component: PostViewsCell as never,
		props: (row) => ({ platform: of(row).platform, views: of(row).views }),
		sort: options.sort?.views
	},
	...(options.end ?? [])
];

/** The creator's handle, linked to their page (the post's own page without one) */
const creatorColumn = <T>(of: (row: T) => PostRow): Column<T> => ({
	type: 'link',
	name: 'Creator',
	truncate: 20,
	href: (row) => {
		const r = of(row);
		return r.authorHref ?? `/admin/posts/${r.postId}`;
	},
	value: (row) => {
		const r = of(row);
		if (!r.author) return '';
		const label = authorLabel(r.platform, r.author);
		return r.ownAccount ? { value: label, class: 'text-muted-foreground' } : label;
	}
});

/** A mention's row (a brand's or a branch's Posts tab): what the post said about the place */
export const mentionPostRow = (row: AdminMentionWithPostOutputDto): PostRow => ({
	postId: row.post.id,
	postedAt: row.post.postedAt,
	platform: row.post.platform,
	author: row.post.author ?? undefined,
	text: saidOf(row.statements).join(' · '),
	views: row.post.views,
	sentiments: tallyOf(row.statements)
});
