import { describe, expect, it } from '@jest/globals';

import { seedIndex } from 'src/modules/food-topics/tests/factories/food-topic.factory.js';

import { captionHashtags, hashtagBrandIndex, hashtagLinks, normalizeHashtag } from '../util/hashtags.js';

describe('hashtags', () => {
	it('normalizes a tag and reads a caption’s tags in order, once each', () => {
		expect(['#BerlinFood', ' berlinfood ', '##Döner', '#'].map(normalizeHashtag)).toEqual(['berlinfood', 'berlinfood', 'döner', '']);
		expect(captionHashtags('Best #döner in town #BerlinFood #döner #fyp')).toEqual(['döner', 'BerlinFood', 'fyp']);
	});

	it('maps a brand’s name and handles to it, never a short or shared one', () => {
		const index = hashtagBrandIndex(
			[
				{ id: 'b1', name: 'Döner Pro' },
				{ id: 'b2', name: 'Bar' },
				{ id: 'b3', name: 'Mustafa’s' },
				{ id: 'b4', name: 'Mustafas' },
			],
			[{ brandId: 'b1', handle: 'doener.pro.berlin' }],
		);
		expect(index.get('donerpro')).toBe('b1');
		expect(index.get('doenerproberlin')).toBe('b1');
		expect(index.has('bar')).toBe(false);
		expect(index.get('mustafas')).toBeNull();
	});

	it('links a tag to its food topic first, a brand only with a post to back it, and a city name to nothing', () => {
		const index = seedIndex();
		const ctx = {
			index,
			brandOf: new Map([
				['donerpro', 'b1'],
				['smashburger', 'b2'],
			]),
			cityKeys: new Set(['berlin']),
			seenWith: new Set(['1 b1', '2 b2']),
		};
		// seedIndex has no ids: the topic is found, its id is not
		expect(hashtagLinks({ id: 2, tag: 'smashburger' }, ctx)).toEqual({ topicId: null, brandId: null });
		expect(hashtagLinks({ id: 1, tag: 'dönerpro' }, ctx)).toEqual({ topicId: null, brandId: 'b1' });
		expect(hashtagLinks({ id: 3, tag: 'dönerpro' }, ctx)).toEqual({ topicId: null, brandId: null });
		expect(hashtagLinks({ id: 4, tag: 'berlin' }, ctx)).toEqual({ topicId: null, brandId: null });
	});
});
