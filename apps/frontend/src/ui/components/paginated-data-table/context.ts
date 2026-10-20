import { getContext, setContext } from 'svelte';

const FILL = Symbol('paginated-data-table:fill');

/**
 * Called by a page whose body *is* a table (a list page): every `PaginatedDataTable`
 * under it takes the remaining height and scrolls inside itself, header pinned and
 * pager always in reach. A table inside a tab or a card never sets this and grows with
 * its rows instead.
 */
export const setDataTableFill = (fill = true) => setContext(FILL, fill);

export const getDataTableFill = (): boolean => getContext<boolean | undefined>(FILL) ?? false;
