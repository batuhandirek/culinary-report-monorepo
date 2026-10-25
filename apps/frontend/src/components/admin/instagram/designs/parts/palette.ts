import type { PostTheme } from '../../post-design.js';

// The brand's day and night colours (`design-tokens.txt`) as CSS variables on a canvas, so a
// design writes `text-(--c-ink)` once for both themes. Acid, grape, deep grape, beet and the
// fixed ink/oat are theme-free and come from app.css (`bg-acid`, `bg-grape`, …).
export const PALETTE: Record<PostTheme, Record<string, string>> = {
	day: {
		ground: '#f2ede3',
		paper: '#fbf9f4',
		ink: '#1f1724',
		muted: '#5e556a',
		hairline: '#1f172426',
		green: '#4d7612',
		purple: '#6a2bea',
		beet: '#8c2d5c',
		bar: '#1f1724',
		shadow: '#1f1724'
	},
	night: {
		ground: '#1f1724',
		paper: '#2a2032',
		ink: '#f2ede3',
		muted: '#b8aec4',
		hairline: '#f2ede326',
		green: '#c6f135',
		purple: '#c9b3ff',
		beet: '#d6679c',
		bar: '#c9b3ff',
		shadow: '#c6f135'
	}
};

export const paletteStyle = (theme: PostTheme) =>
	Object.entries(PALETTE[theme])
		.map(([name, value]) => `--c-${name}: ${value};`)
		.join(' ');

/**
 * A headline's size from its length, so a long one still fits its box. `steps` are
 * `[most characters, px]`, shortest first; past the last one the last size holds.
 */
export const fitSize = (text: string, steps: [number, number][]) =>
	(steps.find(([max]) => text.length <= max) ?? steps.at(-1)!)[1];
