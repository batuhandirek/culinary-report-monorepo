// The Munchwerk brand tokens (`.claude/skills/brand/design-tokens.txt`, day theme) as
// literals: a mail has no stylesheet to read them from, and most clients only honour inline
// styles. Acid is a fill with ink on it, never text on light; grape is text (links) on paper.
export const color = {
	sand: '#F2EDE3', // oat: the ground
	paper: '#FBF9F4', // the sheet
	line: '#DAD7D5', // hairline: ink at 15% on paper, solid (Outlook draws no alpha)
	wash: '#E8E1D3', // photo wells
	tint: '#EBF1CC', // brine: deadline strips
	ink: '#1F1724', // plum-black: text, rules, the stamp's frame and offset
	muted: '#5E556A', // ink-muted: 6.7:1 on paper
	faint: '#5E556A', // the footer's last line: ink-muted too (anything lighter fails on oat)
	primary: '#C6F135', // acid: the one button and the wordmark, always under ink text
	grape: '#6A2BEA', // text-purple: links (6.3:1 on paper)
	dash: '#C4C0C0', // dashed rules between facts: ink at 25% on paper
};

// What every client can draw. Inline styles carry these; `webFontCss` upgrades them where
// a client loads fonts. `display` is the headline face: Bricolage Grotesque 800 where it
// loads, a heavy system sans where it doesn't.
export const font = {
	sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	display: "'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif",
	mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace",
};

// Class names the head stylesheet targets (`Layout`).
export const cls = {
	pixel: 'bk-pixel',
	display: 'bk-display',
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

// Onest, Bricolage Grotesque 800 and the pixel face, from Google Fonts (the files its css2 endpoint names). All of
// it sits inside `@media screen`: Outlook's Word engine skips media queries, and shown a
// web font it drops the whole stack for Times New Roman. Clients that strip `@font-face`
// (Gmail) fall through to the system fonts named after it.
export const webFontCss = `@media screen{${[
	fontFace('Onest', '400 700', 'onest/v11/gNMKW3F-SZuj7xmf-HYoEoey', LATIN),
	fontFace('Onest', '400 700', 'onest/v11/gNMKW3F-SZuj7xmR-HYoEoeyxMI', LATIN_EXT),
	fontFace(
		'Bricolage Grotesque',
		'800',
		'bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvZvl-Molss4MHt0GOQ',
		LATIN,
	),
	fontFace(
		'Bricolage Grotesque',
		'800',
		'bricolagegrotesque/v9/3y9U6as8bTXq_nANBjzKo3IeZx8z6up5BeSl5jBNz_19PpbpMXuECpwUxJBOm_OJWiaaD30YfKfjZZoLvZvl-MQlss4MHt0GOSj5',
		LATIN_EXT,
	),
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
	`.${cls.display}{font-family:${font.display} !important}`,
	`.${cls.pixel}{font-family:'Press Start 2P',Onest,${font.sans} !important}`,
	`.${cls.mono}{font-family:${font.mono} !important}`,
].join('')}}`;

// Phones: the sheet gives its side padding back to the text.
export const responsiveCss = `@media only screen and (max-width:480px){.${cls.sheet}{padding:26px 20px 12px !important}.${cls.photo}{width:76px !important}.${cls.photo} img{width:76px !important;height:76px !important}}`;
