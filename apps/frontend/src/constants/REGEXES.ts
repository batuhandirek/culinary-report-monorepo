export const HEX_COLOR_REGEX = /^#[0-9A-F]{6}$/i;
export const EMAIL_REGEX =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,8}$/m;
export const ZIP_REGEX = /^[0-9]{5}(?:-[0-9]{4})?$/;
export const SVG_COMMAND_REGEX = /[A-Z][0-9-. ]*/g;
