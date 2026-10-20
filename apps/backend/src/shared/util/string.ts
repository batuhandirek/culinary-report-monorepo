import slugify from 'slugify';

export const seperateCapitalLetters = (string: string): string[] | null =>
	string.match(/[A-Z][a-z]+|\d+/g);

export const slug = (str: string) =>
	slugify(
		str
			.replace(/\+/g, ' plus ') // + → -plus-
			.replace(/\&/g, ' and ') // + → -and-
			.replace(/,/g, ' ') // commas → space (slugify → dash)
			.replace(/\//g, ' '), // slashes → dash (slugify → dash)
		{
			lower: true,
			trim: true,
			remove: /[*?~&()\[\]'\"!:@%=#]/g,
		},
	);

export const namify = (str: string) =>
	slug(str)
		.split('-')
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('');

// Uppercases the first letter of every whitespace-separated word (Turkish-aware, so a
// leading "i" becomes "İ"), leaving the rest of each word untouched. Used to normalize
// user-typed blog tag names to a consistent display casing.
export const capitalizeWords = (str: string): string =>
	str
		.split(/\s+/)
		.filter(Boolean)
		.map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
		.join(' ');

export const normalizeTurkish = (str: string) =>
	str
		.toLowerCase()
		.replace(/ğ/g, 'g')
		.replace(/ü/g, 'u')
		.replace(/ş/g, 's')
		.replace(/ı/g, 'i')
		.replace(/i̇/g, 'i')
		.replace(/İ/g, 'i')
		.replace(/ö/g, 'o')
		.replace(/ç/g, 'c');

export const dedent = (
	templateStrings: TemplateStringsArray | string,
	...values: any[]
): string => {
	const matches: string[] = [];
	const strings =
		typeof templateStrings === 'string' ? [templateStrings] : templateStrings.slice();

	// 1. Remove trailing whitespace.
	strings[strings.length - 1] = strings[strings.length - 1].replace(/\r?\n([\t ]*)$/, '');

	// 2. Find all line breaks to determine the highest common indentation level.
	for (let i = 0; i < strings.length; i++) {
		const match = strings[i].match(/\n[\t ]+/g);

		if (match) {
			matches.push(...match);
		}
	}

	// 3. Remove the common indentation from all strings.
	if (matches.length) {
		const size = Math.min(...matches.map(value => value.length - 1));
		const pattern = new RegExp(`\n[\t ]{${size}}`, 'g');

		for (let i = 0; i < strings.length; i++) {
			strings[i] = strings[i].replace(pattern, '\n');
		}
	}

	// 4. Remove leading whitespace.
	strings[0] = strings[0].replace(/^\r?\n/, '');

	// 5. Perform interpolation.
	let string = strings[0];

	for (let i = 0; i < values.length; i++) {
		string += values[i] + strings[i + 1];
	}

	return string.trim();
};
