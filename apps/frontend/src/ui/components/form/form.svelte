<script lang="ts" generics="T extends Record<string, FormField>">
	import { type Snippet, tick } from 'svelte';

	import type { FormState } from './create-form.svelte';
	import type { FormField } from './types';

	import type { EmailField, FieldInputAttrs, TextField } from '#ui/components/form/types.js';
	import ImageInput from '#ui/components/image-input/image-input.svelte';
	import type { ImageFile } from '#ui/components/image-input/types.js';
	import RichTextEditor from '#ui/components/rich-text-editor/rich-text-editor.svelte';
	import SingleImageInput from '#ui/components/single-image-input/single-image-input.svelte';
	import { TagsInput } from '#ui/components/tags-input/index.js';
	import { getUiLabels } from '#ui/lib/ui-labels.js';
	import { cn } from '#ui/lib/utils.js';
	import Label from '#ui/primitives-new/label/label.svelte';
	import * as RadioGroup from '#ui/primitives-new/radio-group/index.js';
	import Textarea from '#ui/primitives-new/textarea/textarea.svelte';
	import Autocomplete from '#ui/wrapped/autocomplete/autocomplete.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import CurrencyInput from '#ui/wrapped/formatted-input/currency-input.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import PasswordInput from '#ui/wrapped/PasswordInput.svelte';

	interface Props {
		form: FormState<T>;
		gap?: number;
		submitText?: string;
		class?: string;
		foot?: Snippet;
		submit?: Snippet;
		noSubmit?: boolean;
		// Overrides what Enter / the submit button runs. Callers that wrap the form with their own
		// submit pipeline (FormDialog) pass theirs so keyboard submit takes the same path as the button.
		onSubmit?: () => unknown;
	}

	// The words nobody passed: Turkish, unless a layout above said otherwise.
	const labels = getUiLabels();

	let {
		form,
		gap = 4,
		submitText = labels.submit,
		class: className = '',
		noSubmit = false,
		foot,
		submit,
		onSubmit
	}: Props = $props();

	// Two forms on one page (a login page and the login dialog over it) share field names;
	// the ids must not collide or a label focuses the other form's input.
	const uid = $props.id();
	const fieldId = (key: string) => `${uid}-${key}`;

	// Spelled out so Tailwind can see them: a class assembled at runtime is never generated.
	const GAP: Record<number, string> = {
		0: 'gap-0',
		1: 'gap-1',
		2: 'gap-2',
		3: 'gap-3',
		4: 'gap-4',
		5: 'gap-5',
		6: 'gap-6',
		8: 'gap-8'
	};
	const COL: Record<number, string> = {
		1: 'md:col-span-1',
		2: 'md:col-span-2',
		3: 'md:col-span-3',
		4: 'md:col-span-4',
		5: 'md:col-span-5',
		6: 'md:col-span-6',
		7: 'md:col-span-7',
		8: 'md:col-span-8',
		9: 'md:col-span-9',
		10: 'md:col-span-10',
		11: 'md:col-span-11',
		12: 'md:col-span-12'
	};

	const INPUT_ATTRS = [
		'autocomplete',
		'inputmode',
		'maxlength',
		'name',
		'readonly',
		'enterkeyhint',
		'autocapitalize',
		'spellcheck'
	] as const;

	// The attributes a field may pass straight to its `<input>` / `<textarea>`.
	const inputAttrs = (field: FormField): FieldInputAttrs => {
		const source = field as unknown as Record<string, unknown>;
		const picked: Record<string, unknown> = {};
		for (const name of INPUT_ATTRS) {
			if (source[name] !== undefined) picked[name] = source[name];
		}
		return picked as FieldInputAttrs;
	};

	let formEl = $state<HTMLFormElement>();

	// A refused submit should not leave the visitor hunting for the red field, least of
	// all in a long form on a phone: go to the first one.
	const focusFirstInvalid = async () => {
		const key = form.firstInvalidKey();
		if (key === undefined) return;
		await tick();
		const control = formEl?.querySelector<HTMLElement>(`#${CSS.escape(fieldId(String(key)))}`);
		if (!control) return;
		control.scrollIntoView({ block: 'center', behavior: 'smooth' });
		const focusable = control.matches('input, textarea, button, [tabindex]')
			? control
			: control.querySelector<HTMLElement>('input, textarea, button, [tabindex]');
		focusable?.focus({ preventScroll: true });
	};

	// Keyboard submit: the browser fires `submit` on Enter in any field, but only when the form
	// owns a submit button — hence the hidden one below whenever ours isn't rendered.
	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (form.loading) return;
		try {
			if (onSubmit) await onSubmit();
			else await form.submit();
		} finally {
			if (!form.isValid()) focusFirstInvalid();
		}
	}
</script>

<form
	bind:this={formEl}
	novalidate
	class={cn('grid grid-cols-12', GAP[gap] ?? 'gap-4', className)}
	onsubmit={handleSubmit}>
	{#each Object.entries(form.fields) as [key, fieldEntry] (key)}
		{@const field = fieldEntry as FormField}
		{@const id = fieldId(key)}
		{@const error = form.errors[key]?.[0]}
		{@const invalid = !!error}
		{@const classBase = invalid ? 'border-error' : ''}
		{@const describedBy = invalid ? `${id}-error` : field.hint ? `${id}-hint` : undefined}
		{@const aria = {
			'aria-invalid': invalid || undefined,
			'aria-describedby': describedBy,
			'aria-required': field.required || undefined
		}}
		<div
			class={cn(
				'col-span-12 flex min-w-0 flex-col gap-2',
				field.class,
				COL[field.col ?? 12] ?? 'md:col-span-12'
			)}>
			{#if field.label}
				<Label for={id} class="gap-1.5">
					{field.label}
					{#if field.required}
						<span class="text-chili" aria-hidden="true">*</span>
					{:else if field.optional}
						<span class="text-muted-foreground font-normal">{labels.optional}</span>
					{/if}
				</Label>
			{/if}
			<div class="flex flex-col gap-1.5">
				{#if field.type === 'email'}
					{@const parsedField = field as EmailField}
					<Input
						{id}
						type="email"
						inputmode="email"
						autocomplete="email"
						autocapitalize="none"
						spellcheck={false}
						placeholder={parsedField.placeholder || ''}
						bind:value={form.values[key] as EmailField['value']}
						onchange={() => form.validateField(key)}
						oninput={() => form.validateIfErrored(key)}
						class={cn(field.class, classBase)}
						{...aria}
						{...inputAttrs(field)} />
				{:else if field.type === 'text'}
					<Input
						{id}
						type="text"
						placeholder={field.placeholder || ''}
						bind:value={form.values[key] as TextField['value']}
						onchange={() => form.validateField(key)}
						oninput={() => form.validateIfErrored(key)}
						class={cn(field.class, classBase)}
						disabled={field.disabled}
						icon={field.icon}
						{...aria}
						{...inputAttrs(field)} />
				{:else if field.type === 'number'}
					<Input
						{id}
						type="number"
						inputmode="decimal"
						min={field.min}
						max={field.max}
						step={field.step}
						placeholder={field.placeholder || ''}
						bind:value={form.values[key] as number}
						onchange={() => form.validateField(key)}
						oninput={() => form.validateIfErrored(key)}
						class={cn(field.class, classBase)}
						{...aria}
						{...inputAttrs(field)} />
				{:else if field.type === 'password'}
					<PasswordInput
						{id}
						autocomplete="current-password"
						placeholder={field.placeholder || ''}
						bind:value={form.values[key] as string}
						onchange={() => form.validateField(key)}
						oninput={() => form.validateIfErrored(key)}
						class={cn(field.class, classBase)}
						{...aria}
						{...inputAttrs(field)} />
				{:else if field.type === 'textarea'}
					{@const length = ((form.values[key] as string | undefined) ?? '').length}
					<Textarea
						{id}
						rows={field.rows}
						maxlength={field.maxlength}
						name={field.name}
						readonly={field.readonly}
						enterkeyhint={field.enterkeyhint}
						placeholder={field.placeholder || ''}
						bind:value={form.values[key] as string}
						onchange={() => form.validateField(key)}
						oninput={() => form.validateIfErrored(key)}
						class={cn(field.class, classBase)}
						{...aria} />
					{#if field.counter && field.maxlength}
						<div
							class={cn(
								'type-meta -mb-0.5 self-end text-xs',
								length >= Number(field.maxlength)
									? 'text-destructive'
									: 'text-muted-foreground'
							)}
							aria-hidden="true">
							{length} / {field.maxlength}
						</div>
					{/if}
				{:else if field.type === 'autocomplete'}
					<Autocomplete
						{...field}
						class={cn(field.class, classBase)}
						{id}
						bind:value={form.values[key] as string}
						onChange={(v) => {
							form.validateField(key);
							field.onChange?.(v);
						}} />
				{:else if field.type === 'currencyInput'}
					<CurrencyInput
						{id}
						inputmode="numeric"
						autocomplete="off"
						placeholder={field.placeholder || ''}
						bind:value={form.values[key] as number}
						onChange={() => form.validateField(key)}
						onInput={() => form.validateIfErrored(key)}
						class={cn(field.class, classBase)}
						{...aria} />
				{:else if field.type === 'select'}
					<!-- Every option on screen as a full-width row: the lists are short, and a
					     popover would open a second sheet over the dialog's own on touch. -->
					<RadioGroup.Root
						{id}
						class="grid grid-cols-1 gap-2 sm:grid-cols-2"
						disabled={field.disabled}
						bind:value={form.values[key] as string}
						onValueChange={() => form.validateField(key)}
						{...aria}>
						{#each field.items as item (item.value)}
							<label
								class={cn(
									'border-line bg-paper text-ink flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
									'has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-tint',
									'has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]',
									classBase
								)}>
								<RadioGroup.Item value={item.value} />
								{item.label}
							</label>
						{/each}
					</RadioGroup.Root>
				{:else if field.type === 'checkbox'}
					<div class="flex w-full items-center gap-2">
						<Checkbox
							{id}
							bind:checked={form.values[key] as boolean}
							onCheckedChange={() => {
								form.validateField(key);
							}}
							{...aria}>
							<!-- Written by us, never by a visitor: the consent lines carry links. -->
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html field.message}
						</Checkbox>
					</div>
				{:else if field.type === 'images'}
					<ImageInput
						{id}
						bind:images={form.values[key] as ImageFile[]}
						maxImage={field.maxImage}
						galleryType={field.galleryType} />
				{:else if field.type === 'image'}
					<SingleImageInput
						bind:value={form.values[key] as string}
						aspectRatio={field.aspectRatio}
						placeholder={field.placeholder}
						onValueChange={() => form.validateField(key)} />
				{:else if field.type === 'richtext'}
					<RichTextEditor
						bind:value={form.values[key] as string}
						placeholder={field.placeholder}
						contentClass={field.contentClass}
						extensions={field.extensions}
						tools={field.tools} />
				{:else if field.type === 'tags'}
					<TagsInput
						{id}
						bind:value={form.values[key] as string[]}
						placeholder={field.placeholder}
						validate={field.validate}
						oninput={() => form.validateIfErrored(key)}
						class={classBase}
						disabled={field.disabled}
						{...aria} />
				{:else if field.type === 'custom'}
					{@const Custom = field.component}
					<Custom
						{...field.props ?? {}}
						value={form.values[key]}
						onChange={(v: unknown) => {
							(form.values as Record<string, unknown>)[key] = v;
							form.validateField(key);
							field.onChange?.(v);
						}} />
				{/if}
				{#if error}
					<p id={`${id}-error`} role="alert" class="text-destructive m-0 text-xs font-semibold">
						{error}
					</p>
				{:else if field.hint}
					<p id={`${id}-hint`} class="text-muted-foreground m-0 text-sm">
						{field.hint}
					</p>
				{/if}
			</div>
		</div>
	{/each}
	{#if foot}
		<div class="col-span-12">
			{@render foot()}
		</div>
	{/if}
	{#if submit}
		<div class="col-span-12">
			{@render submit()}
		</div>
	{:else if !noSubmit}
		<div class="col-span-12">
			<Button type="submit" loading={form.loading} class="w-full">
				{submitText}
			</Button>
		</div>
	{/if}
	{#if submit || noSubmit}
		<button type="submit" class="hidden" tabindex={-1} aria-hidden="true"></button>
	{/if}
</form>
