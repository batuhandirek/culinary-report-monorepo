import { EMAIL_REGEX, PHONE_REGEX } from '../constants/REGEXES';

// Validators take any field's value. `any` on purpose: `createForm` infers each field's type
// from its initial value *and* its validators, so a concrete type here (`unknown`, a union)
// would widen every field that uses the validator.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FieldValue = any;

export const ensureExists = (value: FieldValue) => {
	if (value === undefined || value === null || value === '') return `Zorunlu`;
	else return true;
};
export const isLength = (length: number) => (value: FieldValue) => {
	if (value && value.length !== length) return `${length} karakter olmalı`;
	else return true;
};
export const minLength = (min: number) => (value: FieldValue) => {
	if (value === '' || (value && value.length < min)) return `En az ${min} karakter olmalı`;
	else return true;
};
export const maxLength = (max: number) => (value: FieldValue) => {
	if (value && value.length > max) return `En fazla ${max} karakter olmalı`;
	else return true;
};
export const oneOf = (arr: unknown[]) => (value: FieldValue) => {
	if (value && !arr.includes(value)) return `Listedeki seçeneklerden biri olmalı`;
	else return true;
};
export const isEmail = (value: FieldValue) => {
	if (value && !value.match(EMAIL_REGEX)) return `Geçerli bir e-posta adresi yaz`;
	else return true;
};
export const isPhoneNumber = (value: FieldValue) => {
	if (value && !value.match(PHONE_REGEX)) return `Geçerli bir telefon numarası yaz`;
	else return true;
};
export const isNumber = (value: FieldValue) => {
	if (value && Number.isNaN(Number(value))) return `Sayı olmalı`;
	else return true;
};
export const isInteger = (value: FieldValue) => {
	if (value && !Number.isInteger(Number(value))) return `Tam sayı olmalı`;
	else return true;
};
export const biggerThan = (min: number) => (value: number) => {
	const numberErr = isNumber(value);
	if (typeof numberErr === 'string') return numberErr;
	if (value < min) return `En az ${min} olmalı`;
	return true;
};
export const smallerThan = (max: number) => (value: number) => {
	const numberErr = isNumber(value);
	if (typeof numberErr === 'string') return numberErr;
	if (value > max) return `En fazla ${max} olmalı`;
	return true;
};
