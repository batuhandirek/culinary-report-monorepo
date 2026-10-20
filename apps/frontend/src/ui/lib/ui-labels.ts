import { getContext, setContext } from 'svelte';

/**
 * The words the design system falls back to when a call site names none: the submit of a
 * `Form`, the buttons of a `FormDialog` and a `PopConfirm`, a field's "optional" mark, an
 * overlay's close button, a failed load's title and retry, a spinner's name, the words of
 * a pager.
 * Turkish by default. A part of the app in another language (the admin area) sets its own
 * once, in its layout, instead of every call site passing "Cancel".
 */
export interface UiLabels {
	/** `Form` / `FormDialog` submit. */
	submit: string;
	/** `FormDialog` / `PopConfirm` cancel. */
	cancel: string;
	/** `PopConfirm` confirm. */
	confirm: string;
	/** Beside the label of a field marked `optional`. */
	optional: string;
	/** The close button of a dialog, sheet, popover sheet or dismissible `Notice`. */
	close: string;
	/** `ErrorState` / `SomethingWentWrong`: the title of a failed load nobody named. */
	loadFailed: string;
	/** …its retry button… */
	retry: string;
	/** …and the line under the title when there is a retry to offer. */
	retryHint: string;
	/** What a spinner says to a screen reader. */
	loading: string;
	/** Pagination: the visible words on the two ends… */
	previous: string;
	next: string;
	/** …and what those buttons are called. */
	previousPage: string;
	nextPage: string;
	/** An ellipsis that stands for what was left out (pages, breadcrumb steps). */
	more: string;
}

const DEFAULT_LABELS: UiLabels = {
	submit: 'Tamam',
	cancel: 'Vazgeç',
	confirm: 'Devam et',
	optional: 'isteğe bağlı',
	close: 'Kapat',
	loadFailed: 'Bir şeyler ters gitti',
	retry: 'Tekrar dene',
	retryHint: 'Bağlantını kontrol edip tekrar dene.',
	loading: 'Yükleniyor',
	previous: 'Önceki',
	next: 'Sonraki',
	previousPage: 'Önceki sayfa',
	nextPage: 'Sonraki sayfa',
	more: 'Daha fazla'
};

type Resolver = () => UiLabels;

const KEY = Symbol('ui-labels');

/**
 * Call during a layout's (or any component's) init; everything under it reads these.
 * Pass a function when the answer depends on where the layout is (a route of its own that
 * shows storefront components): it is asked at every read, so it may use reactive state.
 */
export const setUiLabels = (labels: Partial<UiLabels> | (() => Partial<UiLabels>)) => {
	const parent = getContext<Resolver | undefined>(KEY);
	setContext<Resolver>(KEY, () => ({
		...(parent?.() ?? DEFAULT_LABELS),
		...(typeof labels === 'function' ? labels() : labels)
	}));
};

/** Call during component init, before `$props()` if the labels are prop fallbacks. */
export const getUiLabels = (): UiLabels => {
	const resolve = getContext<Resolver | undefined>(KEY);
	if (!resolve) return DEFAULT_LABELS;
	// One getter per label, so a read always asks the resolver (it may be reactive).
	const labels = {} as UiLabels;
	for (const key of Object.keys(DEFAULT_LABELS) as (keyof UiLabels)[]) {
		Object.defineProperty(labels, key, { get: () => resolve()[key], enumerable: true });
	}
	return labels;
};
