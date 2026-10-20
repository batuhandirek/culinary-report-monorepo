export type KeyValueLayout = 'between' | 'columns';

export interface KeyValueItem {
	label: string;
	/** A row whose value is `null`, `undefined` or `''` is left out. */
	value?: string | number | null;
	/** A quieter note after the label ("tahmini"). */
	hint?: string;
	/** The total: a rule above it, ink label, larger bold value. */
	strong?: boolean;
	tone?: 'default' | 'success' | 'danger' | 'muted';
}

/** How `KeyValueList` tells its `KeyValueRow`s which layout they are in. */
export const KEY_VALUE_CONTEXT = Symbol('key-value-list');

export interface KeyValueContext {
	readonly layout: KeyValueLayout;
}
