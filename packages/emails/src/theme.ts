// The app's "Kum & Piksel" tokens (apps/frontend/src/app.css) as literals: a mail has no
// stylesheet to read them from, and most clients only honour inline styles.
export const color = {
	sand: '#F6EFE2', // the ground
	paper: '#FFFCF6', // the sheet
	line: '#E6DCCA', // hairlines, the sheet's edge
	wash: '#E9DFCB', // photo wells
	tint: '#F1E3C6', // deadline strips
	ink: '#1C1714',
	muted: '#6B5F55',
	faint: '#9C8F82',
	primary: '#FFA115', // price tags and the one button, always under ink text
	dash: '#C8BFB1', // dashed rules between facts
};

// What every client can draw. Inline styles carry these; `webFontCss` upgrades them where
// a client loads fonts.
export const font = {
	sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace",
};

// Class names the head stylesheet targets (`Layout`).
export const cls = {
	pixel: 'bk-pixel',
	mono: 'bk-mono',
	sheet: 'bk-sheet',
	photo: 'bk-photo',
	facts: 'bk-facts',
};

// How the plain-text body reads this markup (options for react-email's `toPlainText`).
// Headings stay as written: the default upper-cases them without a locale, and Turkish
// "i" comes out "I". The facts table is the one table that is data, not layout.
export const plainTextOptions = {
	selectors: [
		{ selector: 'h1', options: { uppercase: false } },
		{
			selector: `table.${cls.facts}`,
			format: 'dataTable',
			options: { uppercaseHeaderCells: false, colSpacing: 3 },
		},
	],
};

const LATIN =
	'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
// Turkish needs this half too (ğ, ş, İ, ı) and so does ₺.
const LATIN_EXT =
	'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF';

const fontFace = (family: string, weight: string, file: string, range: string) =>
	`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(https://fonts.gstatic.com/s/${file}.woff2) format('woff2');unicode-range:${range}}`;

// Onest and the pixel face, from Google Fonts (the files its css2 endpoint names). All of
// it sits inside `@media screen`: Outlook's Word engine skips media queries, and shown a
// web font it drops the whole stack for Times New Roman. Clients that strip `@font-face`
// (Gmail) fall through to the system fonts named after it.
export const webFontCss = `@media screen{${[
	fontFace('Onest', '400 700', 'onest/v11/gNMKW3F-SZuj7xmf-HYoEoey', LATIN),
	fontFace('Onest', '400 700', 'onest/v11/gNMKW3F-SZuj7xmR-HYoEoeyxMI', LATIN_EXT),
	fontFace(
		'Press Start 2P',
		'400',
		'pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81',
		LATIN,
	),
	fontFace(
		'Press Start 2P',
		'400',
		'pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nbivNm4I81PZQ',
		LATIN_EXT,
	),
	`body,table,td,p,a,span,h1,h2{font-family:Onest,${font.sans} !important}`,
	`.${cls.pixel}{font-family:'Press Start 2P',Onest,${font.sans} !important}`,
	`.${cls.mono}{font-family:${font.mono} !important}`,
].join('')}}`;

// Phones: the sheet gives its side padding back to the text.
export const responsiveCss = `@media only screen and (max-width:480px){.${cls.sheet}{padding:26px 20px 12px !important}.${cls.photo}{width:76px !important}.${cls.photo} img{width:76px !important;height:76px !important}}`;
