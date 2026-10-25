import type { CityHighlightData } from 'client';
import type { Component } from 'svelte';

// An Instagram post design: a Svelte component whose props are a form. The studio
// (`/admin/instagram/[design]`) draws the form from `fields`, renders the component at the
// canvas's true pixel size and saves it as a PNG. A new design is a component under
// `designs/` plus its entry in `designs/index.ts`; nothing else changes.

/** Instagram's canvases, 1080 wide (`brand` skill). */
export const POST_FORMATS = {
	square: { width: 1080, height: 1080, label: 'Square 1:1' },
	portrait: { width: 1080, height: 1350, label: 'Portrait 4:5' },
	story: { width: 1080, height: 1920, label: 'Story 9:16' }
} as const;
export type PostFormat = keyof typeof POST_FORMATS;

type FieldBase<K extends string> = {
	key: K;
	label: string;
	/** One line under the field. */
	hint?: string;
};

/** One form control. A field's value is the component's prop of the same `key`. */
export type PostField<K extends string = string> =
	| (FieldBase<K> & { type: 'text'; placeholder?: string; maxLength?: number })
	| (FieldBase<K> & { type: 'textarea'; placeholder?: string; maxLength?: number })
	| (FieldBase<K> & { type: 'number'; min?: number; max?: number })
	| (FieldBase<K> & { type: 'select'; options: { value: string; label: string }[] })
	| (FieldBase<K> & { type: 'toggle' })
	// A photo picked from disk, kept as a downscaled JPEG data URL ('' when none): a data URL
	// survives the reload and needs no CORS to be drawn into the PNG.
	| (FieldBase<K> & { type: 'image' })
	// Repeating rows (a top-10's places). The value is an array of objects keyed by `fields`.
	| (FieldBase<K> & {
			type: 'list';
			/** What one row is called: "Place". */
			itemLabel: string;
			fields: PostField[];
			min?: number;
			max?: number;
	  });

/** What every design gets besides its own fields. */
export interface PostCanvasProps {
	format: PostFormat;
	/** Which slide of a carousel to draw, from 0. Single-image designs ignore it. */
	slide: number;
}

export type PostValues = Record<string, unknown>;

export interface PostDesign<V extends object = PostValues> {
	/** The URL slug. */
	id: string;
	name: string;
	/** One line on the gallery card: what it is for. */
	description: string;
	/** The canvases it lays out for; the first is the default. */
	formats: PostFormat[];
	fields: PostField<Extract<keyof V, string>>[];
	/** Sample content: the gallery thumbnail and a fresh draft. */
	defaults: V;
	/** A carousel's slides, named for the picker; a single image omits it. */
	slides?: (values: V) => string[];
	/** The caption a fresh draft starts from. */
	caption?: string;
	/** Ways to fill it from a city's built month (`fills.ts`), the first the default. */
	fills?: PostFill<V>[];
	component: Component<V & PostCanvasProps>;
}

/** A city's built month, as a fill reads it (`GET /admin/highlights`). */
export interface FillSource {
	cityName: string;
	citySlug: string;
	/** `YYYY-MM` */
	month: string;
	data: CityHighlightData;
	/** How many rows the admin asked for, when the fill takes a count. */
	count?: number;
}

/**
 * One way to fill a design from data. `apply` sets only what the data knows: a row's photo
 * and its credit stay as the admin left them for a row of the same name (the studio merges).
 */
export interface PostFill<V extends object = PostValues> {
	id: string;
	label: string;
	/** One line under the picker: what it puts in. */
	description: string;
	/** Row counts to offer, the first the default; a fill without them takes what the data has. */
	counts?: number[];
	/** `null` when the month has nothing for it (no rising dish, no risers). */
	apply: (source: FillSource) => { values: FillValues<V>; caption: string } | null;
}

/** What a fill sets: any of the values, a list's rows with only the keys the data knows. */
export type FillValues<V> = { [K in keyof V]?: V[K] extends (infer Row)[] ? Partial<Row>[] : V[K] };

/**
 * Keeps a design's fields, defaults and slides typed by its component's props: a field's
 * `key` must be a prop, and the defaults must fit them.
 */
export const definePostDesign = <P extends PostCanvasProps>(
	design: { component: Component<P> } & NoInfer<
		Omit<PostDesign<Omit<P, keyof PostCanvasProps>>, 'component'>
	>
) => design as unknown as PostDesign;

/** A blank value per field: a new list row, and what a filled row starts from. */
export const emptyValues = (fields: PostField[]): PostValues =>
	Object.fromEntries(
		fields.map((f) => [
			f.key,
			f.type === 'number'
				? 0
				: f.type === 'toggle'
					? false
					: f.type === 'select'
						? f.options[0]?.value
						: f.type === 'list'
							? []
							: ''
		])
	);

export const slideNames = (design: PostDesign, values: PostValues) =>
	design.slides?.(values) ?? ['Post'];

/** The `theme` field most designs share: day (oat ground) or night (ink ground). */
export const themeField = {
	key: 'theme',
	label: 'Theme',
	type: 'select',
	hint: 'Day for fresh and daytime, night for evenings, openings and stories.',
	options: [
		{ value: 'day', label: 'Day' },
		{ value: 'night', label: 'Night' }
	]
} as const satisfies PostField<'theme'>;
export type PostTheme = 'day' | 'night';
