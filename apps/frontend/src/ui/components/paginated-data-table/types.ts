import type { Component, Snippet } from 'svelte';

import type { BadgeVariant } from '#ui/primitives-new/badge/index.js';

// Column Types
export interface ColumnBase<T = unknown> {
	if?: (row: T) => boolean;
	// Also the column's key: `hiddenColumns` and the `{#each}` match on it.
	name: string;
	// Header text, when it should read differently from `name`.
	label?: string;
	align?: 'left' | 'right' | 'center';
	// A figure: right-aligned in tabular numerals, so a column of them can be compared.
	numeric?: boolean;
	// Extra classes on the cell (a width, wrapping).
	class?: string;
	// Cap the cell at this many characters' width; the rest is ellipsized and the full
	// text goes in `title`. Only for plain text (`value` and `link` columns).
	truncate?: number;
	// The server sort values this column stands for: makes the header a sort toggle.
	sort?: { asc?: string; desc?: string };
}

type CellValue = number | string | { value: string | number; class?: string };

/** Never over user-written text (titles, names): use a `link` or `value` column. */
export interface HtmlColumn<T = unknown> extends ColumnBase<T> {
	type: 'html';
	html: (row: T) => string;
}

export interface LinkColumn<T = unknown> extends ColumnBase<T> {
	type: 'link';
	href: (row: T) => string;
	value: (row: T) => CellValue;
}

export interface ValueColumn<T = unknown> extends ColumnBase<T> {
	type: 'value';
	value: (row: T) => CellValue;
}

/** A timestamp: `06 Oct 2026, 17:48`, with how long ago in its tooltip (or beside it). */
export interface DateColumn<T = unknown> extends ColumnBase<T> {
	type: 'date';
	value: (row: T) => string | Date | null | undefined;
	format?: 'datetime' | 'date';
	// Show the relative time next to the timestamp instead of only in the tooltip.
	relative?: boolean;
}

/** A state: one pill shape for every table, the colour says how it stands. */
export interface BadgeColumn<T = unknown> extends ColumnBase<T> {
	type: 'badge';
	value: (row: T) => string | null | undefined;
	variant?: (row: T) => BadgeVariant;
}

/** How many: zero is faint, anything else is set in `tone`. */
export interface CountColumn<T = unknown> extends ColumnBase<T> {
	type: 'count';
	value: (row: T) => number | null | undefined;
	tone?: 'neutral' | 'success' | 'warning' | 'destructive';
}

// `Component<never>` accepts any component: a component's props are contravariant, so a
// concrete `Component<{ user: … }>` isn't assignable to `Component<Record<string, unknown>>`.
// The column's `props` are what it gets; matching them is the column author's job.
export interface ComponentColumn<T = unknown> extends ColumnBase<T> {
	type: 'component';
	component: Component<never>;
	props: (row: T) => Record<string, unknown>;
	child?: (row: T) => unknown;
}

export interface SnippetColumn<T = unknown> extends ColumnBase<T> {
	type: 'snippet';
	snippet: Snippet<[T]>;
}

export type Column<T = unknown> =
	| HtmlColumn<T>
	| ValueColumn<T>
	| ComponentColumn<T>
	| SnippetColumn<T>
	| LinkColumn<T>
	| DateColumn<T>
	| BadgeColumn<T>
	| CountColumn<T>;

// Action Types
export interface PaginatedDataTableAction<T = unknown> {
	type?: 'separator';
	icon: Component;
	label: string;
	// Either: a destination (a real link, so it opens in a new tab too) or a handler.
	href?: (row: T) => string | undefined;
	onClick?: (row: T) => void | Promise<void>;
	if?: (row: T) => boolean;
	class?: string;
}

// Filter Types
export interface FilterOption {
	name: string;
	value: string | number;
}

export interface FilterBase {
	name: string;
	key: string;
	type: 'select' | 'multiSelect' | 'text' | 'autocomplete' | 'toggle';
}

export interface SelectFilter extends FilterBase {
	type: 'select';
	options: FilterOption[];
}

export interface MultiSelectFilter extends FilterBase {
	type: 'multiSelect';
	options: FilterOption[];
}

export interface TextFilter extends FilterBase {
	type: 'text';
	placeholder?: string;
}

export interface AutocompleteFilter extends FilterBase {
	type: 'autocomplete';
	// `never`: accepts any generated client method (see `PaginatedDataTableProps.api`).
	api: (
		params: never
	) => Promise<{ items: unknown[]; page: number; pageSize: number; totalItems: number }>;
	queryKey?: string;
	labelKey?: string;
	valueKey?: string;
}

export interface ToggleFilter extends FilterBase {
	type: 'toggle';
}

export type Filter =
	SelectFilter | MultiSelectFilter | TextFilter | AutocompleteFilter | ToggleFilter;

// Sort Types
export interface Sort {
	value: string;
	name: string;
}

// Props Types
export interface PaginatedDataTableProps<
	T = unknown,
	F extends Record<string, unknown> = Record<string, unknown>
> {
	availableFilters?: Filter[];
	availableSorts?: Sort[];
	// Changing it refetches the page the table is on (after a row was changed or removed).
	key?: string | number;
	columns: Column<T>[];
	actions?: PaginatedDataTableAction<T>[];
	// `never` accepts any generated client method: their query types use the endpoint's own
	// enum twins (`…ParamsSortEnum`), which the DTO-typed `filters` can't be matched to.
	api: (
		params: never
	) => Promise<{ items: T[]; page: number; pageSize: number; totalItems: number }>;
	filters?: F;
	// Rows per page to start with. A table that fills its page starts at 25 or more.
	limit?: number;
	syncWithSearchParams?: boolean;
	onFiltersChange?: (filters: F) => void;
	onFetch?: (results: T[]) => void;
	// Where a row leads. The whole row becomes the link (cmd/ctrl-click opens a new tab)
	// and a chevron at its end is the real anchor.
	rowHref?: (row: T) => string | undefined;
	// What the table lists, for its empty state and count: "orders", "users".
	noun?: string;
	emptyTitle?: string;
	emptyDescription?: string;
	// Controls at the end of the filter bar (an export, a "new" button).
	toolbar?: Snippet;
	// Take the height the parent gives and scroll inside it, header pinned. Defaults to
	// what the page says (`setDataTableFill`); a table inside a tab or a card stays `false`.
	fill?: boolean;
	pageSizes?: number[];
	/** @deprecated The table always shows its own loading state. */
	showLoader?: boolean;
	/** @deprecated There is one paginator, in the footer. */
	hideTopPaginator?: boolean;
}

export interface PaginatedDataTableFilterAndSortProps {
	filters: Filter[];
	sorts: Sort[];
	appliedFilters: Record<string, unknown>;
	onChange: (filters: Record<string, unknown>) => void;
	// Reload the page in view.
	onRefresh?: () => void;
	refreshing?: boolean;
	toolbar?: Snippet;
	class?: string;
}

export interface PaginatedDataTableTextFilterProps {
	value: string | undefined;
	onChange: (value: string | undefined) => void;
	placeholder?: string;
	class?: string;
}

export interface PaginatedDataTableAutocompleteFilterProps {
	value: string | undefined;
	// `label` is what the picked row is called, so the bar can say it instead of an id.
	onChange: (value: string | undefined, label?: string) => void;
	api: (
		params: never
	) => Promise<{ items: unknown[]; page: number; pageSize: number; totalItems: number }>;
	queryKey?: string;
	labelKey?: string;
	valueKey?: string;
}
