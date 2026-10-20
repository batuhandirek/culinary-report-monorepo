import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge only knows Tailwind's own scale. A name `app.css` adds to the theme has
// to be declared here too, or it is misread: `shadow-stamp` as a shadow *colour* (so
// `shadow-none` would not remove it) and `text-display` as a text colour (so `text-ink`
// would drop it).
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			shadow: ['stamp', 'stamp-sm', 'sticker'],
			text: ['display', 'display-lg', 'display-sm']
		}
	}
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
