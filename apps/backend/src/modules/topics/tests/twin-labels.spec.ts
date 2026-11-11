import { groupTwins, twinKeys } from '../util/twin-labels.js';

describe('twin labels', () => {
	const shared = (a: string, b: string) => twinKeys(a).some(k => twinKeys(b).includes(k));

	it('takes words run together, another word order, accents and plurals as one thing', () => {
		expect(shared('Hotdog', 'Hot dog')).toBe(true);
		expect(shared('Corndog', 'corn dogs')).toBe(true);
		expect(shared('Pizza margherita', 'Margherita pizza')).toBe(true);
		expect(shared('Spätzle', 'spatzle')).toBe(true);
	});

	it('keeps different things apart', () => {
		expect(shared('Bao', 'Bao buns')).toBe(false);
		expect(shared('Garlic parmesan wings', 'Parmesan wings')).toBe(false);
		expect(shared('Hot dog', 'Hot chocolate')).toBe(false);
		expect(twinKeys('  ')).toEqual([]);
	});

	it('groups twins through any chain and keeps the order items came in', () => {
		const groups = groupTwins(
			['hot dog', 'Pizza margherita', 'hotdog', 'kumpir', 'margherita pizza', '', 'Hot dogs'],
			s => s,
		);
		expect(groups).toEqual([['hot dog', 'hotdog', 'Hot dogs'], ['Pizza margherita', 'margherita pizza'], ['kumpir']]);
	});

	it('merges two groups that a later name joins', () => {
		// "dog hot" shares the word order of "hot dog", "doghot" its run: one group in the end
		expect(groupTwins(['doghot', 'hot dog', 'dog hot'], s => s)).toEqual([['doghot', 'hot dog', 'dog hot']]);
	});
});
