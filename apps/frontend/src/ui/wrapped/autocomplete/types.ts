import type { ItemOfPaginatedApi, PaginatedApi } from '#ui/types/pagination.types.js';

export interface AutocompleteProps<A extends PaginatedApi> {
	api: A;
	id?: string;
	value: string | undefined;
	selectedLabel?: string | undefined;
	onChange?: (value: string | undefined) => void;
	filters?: () => Record<string, unknown> | Record<string, unknown>;
	size?: number;
	queryKey?: string;
	labelKey: keyof ItemOfPaginatedApi<A> | ((i: ItemOfPaginatedApi<A>) => string);
	valueKey: keyof ItemOfPaginatedApi<A> | ((i: ItemOfPaginatedApi<A>) => string);
	open?: boolean;
	disabled?: boolean;
	placeholder?: string;
	searchPlaceholder?: string;
	class?: string;
}
