// form-state.svelte.ts
import type { FieldsConfig, FormField, InferFormValues, ValidationFn } from './types';

import { FormError } from '#ui/components/form/errors.js';

/** The value of one of a form's fields — whichever field: the union of their value types. */
type FieldValue<T extends FieldsConfig> = InferFormValues<T>[keyof T];

export interface FormConfig<T extends FieldsConfig> {
	fields: T;
	onSubmit?: (values: InferFormValues<T>) => void | Promise<void>;
	onChange?: (key: keyof T, value: FieldValue<T>) => void;
}

export class FormState<T extends FieldsConfig> {
	fields: T;
	values = $state<InferFormValues<T>>({} as InferFormValues<T>);
	errors = $state<Record<keyof T, string[]>>({} as Record<keyof T, string[]>);
	loading = $state(false);

	private onSubmitCallback?: (values: InferFormValues<T>) => void | Promise<void>;
	private onChangeCallback?: (key: keyof T, value: FieldValue<T>) => void;

	constructor(config: FormConfig<T>) {
		this.fields = $state(config.fields);
		this.onSubmitCallback = config.onSubmit;
		this.onChangeCallback = config.onChange;

		// Initialize values and errors with proper defaults
		const initialValues: Record<string, unknown> = {};
		const initialErrors: Record<string, string[]> = {};

		for (const [key, field] of Object.entries(config.fields)) {
			// Use field.value if provided, otherwise use type-appropriate defaults
			if (field.value !== undefined) {
				initialValues[key] = field.value;
			} else {
				initialValues[key] = this.getDefaultValue(field);
			}
			initialErrors[key] = [];
		}

		this.values = initialValues as InferFormValues<T>;
		this.errors = initialErrors as Record<keyof T, string[]>;
	}

	private getDefaultValue(field: FormField): unknown {
		switch (field.type) {
			case 'number':
			case 'currencyInput':
				return 0;
			case 'checkbox':
				return false;
			case 'images':
			case 'multiselect':
			case 'tags':
				return [];
			case 'text':
			case 'email':
			case 'password':
			case 'textarea':
			case 'select':
			case 'avatar':
			case 'custom':
			default:
				return '';
		}
	}

	validateField(key: keyof T) {
		const field = this.fields[key];
		// Each field type carries validators for its own value type; seen through the union
		// they only agree on `never`. The value under the same key is what they were written for.
		const validation = (field.validation ?? []) as ValidationFn<unknown>[];
		const value = this.values[key];

		const validationResult = validation
			.map((fn) => fn(value))
			.filter((result) => result !== true) as string[];

		this.errors[key] = validationResult;

		this.onChangeCallback?.(key, value);
	}

	validateIfErrored(key: keyof T) {
		if (this.errors[key]?.length > 0) {
			this.validateField(key);
		}
	}

	validateAllFields(shouldThrow = false) {
		for (const key of Object.keys(this.fields)) {
			this.validateField(key as keyof T);
		}
		if (shouldThrow && !this.isValid()) {
			throw new FormError();
		}
	}

	isValid(): boolean {
		return Object.values(this.errors).every((errs) => (errs as string[]).length === 0);
	}

	/** The first field, in the order they are laid out, that currently has an error. */
	firstInvalidKey(): keyof T | undefined {
		return Object.keys(this.fields).find((key) => (this.errors[key]?.length ?? 0) > 0);
	}

	async submit() {
		// Enter and the submit button can both land here; a second run while the first is in
		// flight would fire the request twice.
		if (this.loading) return;

		this.validateAllFields();

		if (this.isValid() && this.onSubmitCallback) {
			this.loading = true;
			try {
				await this.onSubmitCallback(this.values);
			} finally {
				this.loading = false;
			}
		}
	}

	reset(values?: Partial<InferFormValues<T>>) {
		for (const [key, field] of Object.entries(this.fields)) {
			const k = key as keyof T;
			if (values && values[k] !== undefined) {
				this.values[k] = values[k] as FieldValue<T>;
			} else if (field.value !== undefined) {
				this.values[k] = field.value as FieldValue<T>;
			} else {
				this.values[k] = this.getDefaultValue(field) as FieldValue<T>;
			}
			this.errors[k] = [];
		}
	}

	setFieldValue(key: keyof T, value: FieldValue<T>) {
		this.values[key] = value;
		this.validateIfErrored(key);
	}

	setFieldError(key: keyof T, error: string) {
		this.errors[key] = [error];
	}

	clearFieldError(key: keyof T) {
		this.errors[key] = [];
	}

	setErrors(errors: Partial<Record<keyof T, string[]>>) {
		this.errors = { ...this.errors, ...errors } as Record<keyof T, string[]>;
	}
}

export function createForm<T extends FieldsConfig>(config: FormConfig<T>) {
	return new FormState(config);
}
