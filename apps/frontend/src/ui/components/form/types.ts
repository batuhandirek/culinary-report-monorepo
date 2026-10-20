import type { Extensions } from '@tiptap/core';
import type { Component } from 'svelte';

import type { HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements';

import type { ImageFile, ImageInputProps } from '#ui/components/image-input/types.js';
import type { EditorTool } from '#ui/components/rich-text-editor/types.js';
import type { TagsInputProps } from '#ui/components/tags-input/index.js';
import type { PaginatedApi } from '#ui/types/pagination.types.js';
import type { AutocompleteProps } from '#ui/wrapped/autocomplete/types.js';
import type { InputProps } from '#ui/wrapped/Input.svelte';

// types.ts
export type ValidationFn<T> = (value: T) => true | string;

export interface BaseField<T> {
	label?: string;
	placeholder?: string;
	validation?: ValidationFn<T>[];
	value?: T;
	class?: string;
	col?: number;
	/** A quiet line under the control: what to type, why we ask. Gives way to an error. */
	hint?: string;
	/**
	 * Marks the label with an asterisk and the control `aria-required`. It says so, it
	 * does not enforce it — the rule itself is a validator (`ensureExists`).
	 */
	required?: boolean | null;
	/** Marks the label "isteğe bağlı", so the name itself does not have to carry it. */
	optional?: boolean;
}

/**
 * What a typed field may hand straight to its `<input>`: the attributes that decide
 * which keyboard opens and what the browser offers to fill in.
 */
export type FieldInputAttrs = Pick<
	HTMLInputAttributes,
	| 'autocomplete'
	| 'inputmode'
	| 'maxlength'
	| 'name'
	| 'readonly'
	| 'enterkeyhint'
	| 'autocapitalize'
	| 'spellcheck'
>;

export interface TextField extends BaseField<string>, Omit<InputProps, 'value'> {
	type: 'text';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AutocompleteField<A extends PaginatedApi<any> = PaginatedApi<any>>
	extends BaseField<string>, Omit<AutocompleteProps<A>, 'value'> {
	type: 'autocomplete';
}

export interface EmailField extends BaseField<string>, FieldInputAttrs {
	type: 'email';
}

export interface PasswordField extends BaseField<string>, FieldInputAttrs {
	type: 'password';
}

export interface NumberField extends BaseField<number>, FieldInputAttrs {
	type: 'number';
	min?: number;
	max?: number;
	step?: number;
}

export interface TextAreaField
	extends
		BaseField<string>,
		Pick<HTMLTextareaAttributes, 'maxlength' | 'name' | 'readonly' | 'enterkeyhint'> {
	type: 'textarea';
	rows?: number;
	/** Show "12 / 500" under the box. Needs `maxlength`. */
	counter?: boolean;
}

export interface CurrencyInputField extends BaseField<number> {
	type: 'currencyInput';
}

export interface CheckboxField extends BaseField<boolean> {
	type: 'checkbox';
	message?: string;
}

export interface ImagesField extends BaseField<ImageFile[]>, Omit<ImageInputProps, 'images'> {
	type: 'images';
	max?: number;
}

// Single image with an always-on crop step and optional forced aspect ratio. Value is one
// image string (data URL for a new crop, or an existing hosted URL).
export interface SingleImageField extends BaseField<string> {
	type: 'image';
	aspectRatio?: number;
}

// WYSIWYG rich-text field over a TipTap document. `value` is stringified JSON. `extensions` is
// the schema (callers pass the shared list); `tools` adds toolbar buttons (e.g. insert CTA).
// `contentClass` matches the editor typography to the final render target (blog → `blog-content`).
export interface RichTextField extends BaseField<string> {
	type: 'richtext';
	extensions: Extensions;
	tools?: EditorTool[];
	contentClass?: string;
}

export interface SelectField<T extends string = string> extends BaseField<T> {
	type: 'select';
	items: Array<{ value: T; label: string }>;
	disabled?: boolean;
}

export interface MultiSelectField<T extends string = string> extends BaseField<T[]> {
	type: 'multiselect';
	items: Array<{ value: T; label: string }>;
	disabled?: boolean;
}

export interface AvatarField extends BaseField<string> {
	type: 'avatar';
	size?: number;
	identifier?: string;
}

export interface TagsField
	extends BaseField<string[]>, Omit<TagsInputProps, 'value' | 'class' | 'placeholder'> {
	type: 'tags';
}

// Escape hatch for arbitrary widgets: renders `component` as a controlled input — it receives
// the field's current `value` plus an `onChange(value)` callback that writes it back into the
// form (and runs validation). Extra static props go through `props`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CustomField<T = any> extends BaseField<T> {
	type: 'custom';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	props?: Record<string, unknown>;
	onChange?: (value: T) => void;
}

export type FormField =
	| TextField
	| EmailField
	| PasswordField
	| NumberField
	| TextAreaField
	| CurrencyInputField
	| CheckboxField
	| ImagesField
	| SingleImageField
	| RichTextField
	| SelectField
	| MultiSelectField
	| AvatarField
	| CustomField
	| AutocompleteField
	| TagsField;

// Type helpers to infer value types from field definitions
export type InferFieldValue<F extends FormField> = F extends BaseField<infer T> ? T : never;

export type InferFormValues<T extends Record<string, FormField>> = {
	[K in keyof T]: InferFieldValue<T[K]>;
};

export type FieldsConfig = Record<string, FormField>;
