export const csvEscape = (value: string | null | undefined): string =>
	(value ?? '').replace(/"/g, '""');
