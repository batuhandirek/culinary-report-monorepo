import { describe, expect, it } from '@jest/globals';

import { contactPageUrls } from 'src/modules/venues/util/site-pages.js';

import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import { accountMatchIndex } from '../util/account-match.js';
import {
	type LinkedProfile,
	normalizeAccountHandle,
	profileLinks,
	profileOf,
} from '../util/accounts.js';
import {
	instagramProfileFacts,
	profileNamedAfter,
	profileProof,
	tiktokProfileFacts,
} from '../util/profile-proof.js';
import { GENERIC_PROFILE_BRANDS, siteProfileVerdicts } from '../util/site-profiles.js';

import { TWIN_INSTAGRAM_ITEMS, TWIN_TIKTOK_ITEMS } from './fixtures/twin-profile-items.js';

const IG = SocialPlatformEnum.INSTAGRAM;
const TT = SocialPlatformEnum.TIKTOK;
const ig = (handle: string): LinkedProfile => ({ platform: IG, handle });
const tt = (handle: string): LinkedProfile => ({ platform: TT, handle });

describe('profile links on a website', () => {
	it('finds every profile a page links or writes out, each once, in page order', () => {
		const html = `
			<a href="https://www.instagram.com/thebarnberlin/?hl=de">Instagram</a>
			<a href="https://instagram.com/thebarnberlin">again</a>
			<a href='https://www.tiktok.com/@mr.noodlechen?lang=de'>TikTok</a>
			<script>{"sameAs":["https:\\/\\/www.instagram.com\\/doenerpro"]}</script>
			<p>Folgt uns: instagram.com/sofithebakery.</p>
			<a href="https://instagram.com/_u/goldies______">app</a>`;
		expect(profileLinks(html)).toEqual([
			ig('thebarnberlin'),
			tt('mr.noodlechen'),
			ig('doenerpro'),
			ig('sofithebakery'),
			ig('goldies______'),
		]);
	});

	it('drops a caption’s full stop: no handle ends in a dot', () => {
		expect(normalizeAccountHandle('@SotaMesa.')).toBe('sotamesa');
		expect(normalizeAccountHandle('@shinju.berlin.')).toBe('shinju.berlin');
		expect(profileLinks('Folgt uns auf instagram.com/barra_berlin.')).toEqual([
			ig('barra_berlin'),
		]);
	});

	it('leaves posts, embeds, the CDN, app pages, placeholders and other hosts out', () => {
		const html = `
			<a href="https://www.instagram.com/p/DeuVHoXE7NI/">post</a>
			<a href="https://www.instagram.com/reel/DbBmMe4I1H1/">reel</a>
			<script src="https://www.instagram.com/embed.js"></script>
			<iframe src="https://www.instagram.com/embed"></iframe>
			<img src="https://instagram.com/o1/v/t16/f2/m86/abc.mp4">
			<a href="https://instagram.com/deinprofil">Template</a>
			<a href="https://www.tiktok.com/embed/v2/7699537184747048224">video</a>
			<a href="https://www.tiktok.com/discover/food">discover</a>
			<a href="https://notinstagram.com/cafepaula">elsewhere</a>`;
		expect(profileLinks(html)).toEqual([]);
		expect(profileOf('https://www.instagram.com/explore/locations/123/')).toBeNull();
	});
});

describe('contact pages', () => {
	it('lists the site’s own contact, Impressum and about pages, best kind first', () => {
		const html = `
			<a href="/ueber-uns">Über uns</a>
			<a href="https://www.pinoli.de/impressum">Impressum</a>
			<a href="/speisekarte">Menu</a>
			<a href="https://agency.example/kontakt">Made by Agency</a>
			<a href="mailto:hi@pinoli.de">Kontakt per Mail</a>
			<a href="/contact#form"><span>Contact</span></a>
			<a href="/contact">Contact us</a>`;
		expect(contactPageUrls(html, 'https://pinoli.de/')).toEqual([
			'https://pinoli.de/contact',
			'https://www.pinoli.de/impressum',
		]);
		expect(contactPageUrls(html, 'https://pinoli.de/', 3)).toHaveLength(3);
		expect(contactPageUrls('<a href="/">Home</a>', 'https://pinoli.de/')).toEqual([]);
	});
});

describe('what a brand’s site linking a profile says', () => {
	const names = [
		{ brandId: 'munchies', name: 'Munchies' },
		{ brandId: 'box', name: 'The Box Donut - Berlin' },
		{ brandId: 'acid', name: 'ACID P-Berg' },
		{ brandId: 'hirsch', name: 'Zum Goldenen Hirsch' },
		{ brandId: 'barn', name: 'THE BARN Café' },
	];
	const index = accountMatchIndex(names, ['Berlin', 'Mitte', 'Kreuzberg']);
	const none = {
		brandsLinking: new Map<string, number>(),
		rejected: new Map<string, Set<string>>(),
	};
	const brand = (id: string, name: string) => ({ id, name, branchNames: [] });

	it('links a profile named after the brand, one per platform', () => {
		expect(
			siteProfileVerdicts(
				brand('munchies', 'Munchies'),
				[ig('munchiesde'), tt('munchiesde')],
				index,
				none,
			),
		).toEqual([
			expect.objectContaining({ ...ig('munchiesde'), link: true }),
			expect.objectContaining({ ...tt('munchiesde'), link: true }),
		]);
		// Named by the site's rules though the matcher finds the name too short: "acid" of "ACID P-Berg"
		expect(
			siteProfileVerdicts(brand('acid', 'ACID P-Berg'), [ig('acid.cafe')], index, none),
		).toEqual([expect.objectContaining({ ...ig('acid.cafe'), link: true })]);
	});

	it('among several named profiles links the exact ones and suggests the rest', () => {
		const verdicts = siteProfileVerdicts(
			brand('box', 'The Box Donut - Berlin'),
			[
				ig('theboxdonut.berlin'),
				ig('theboxdonutdebrecen'),
				ig('theboxdonutszeged'),
				tt('theboxdonut_official'),
			],
			index,
			none,
		);
		expect(verdicts.filter(v => v.link).map(v => v.handle)).toEqual([
			'theboxdonut.berlin',
			'theboxdonut_official',
		]);
		expect(verdicts.filter(v => !v.link).map(v => v.handle)).toEqual([
			'theboxdonutdebrecen',
			'theboxdonutszeged',
		]);
	});

	it('suggests the only profile on a platform that isn’t named after the brand, and leaves one among others', () => {
		expect(
			siteProfileVerdicts(
				brand('hirsch', 'Zum Goldenen Hirsch'),
				[ig('hirsch_wirtshaus')],
				index,
				none,
			),
		).toEqual([expect.objectContaining({ ...ig('hirsch_wirtshaus'), link: false })]);
		expect(
			siteProfileVerdicts(
				brand('hirsch', 'Zum Goldenen Hirsch'),
				[ig('hirsch_wirtshaus'), ig('webagentur.berlin')],
				index,
				none,
			),
		).toEqual([]);
	});

	it('leaves a profile many sites link, and one an admin said is not the brand’s', () => {
		const brandsLinking = new Map([['instagram:thebarnberlin', GENERIC_PROFILE_BRANDS]]);
		expect(
			siteProfileVerdicts(brand('barn', 'THE BARN Café'), [ig('thebarnberlin')], index, {
				...none,
				brandsLinking,
			}),
		).toEqual([]);
		const rejected = new Map([['instagram:thebarnberlin', new Set(['barn'])]]);
		expect(
			siteProfileVerdicts(brand('barn', 'THE BARN Café'), [ig('thebarnberlin')], index, {
				...none,
				rejected,
			}),
		).toEqual([]);
		expect(
			siteProfileVerdicts(brand('barn', 'THE BARN Café'), [ig('thebarnberlin')], index, none),
		).toEqual([expect.objectContaining({ link: true })]);
	});
});

describe('a profile proving itself a brand’s', () => {
	const [instagram, missingInstagram] = TWIN_INSTAGRAM_ITEMS.map(instagramProfileFacts);
	const [missingTiktok, tiktok] = TWIN_TIKTOK_ITEMS.map(tiktokProfileFacts);
	const munchies = {
		name: 'Munchies',
		websites: ['https://www.eatmunchies.de/'],
		streets: ['Bergmannstraße 19', 'Kantstraße 107', 'Karl-Liebknecht-Str. 14'],
		account: tt('munchiesde'),
	};

	it('reads the actors’ items', () => {
		expect(instagram).toEqual({
			platform: IG,
			handle: 'munchiesde',
			exists: true,
			displayName: 'Munchies',
			followers: 16740,
			bio: expect.stringContaining('Bergmannstraße 19'),
			links: ['https://www.eatmunchies.de/home#ordernow'],
		});
		expect(tiktok).toEqual(
			expect.objectContaining({
				platform: TT,
				handle: 'munchiesde',
				exists: true,
				followers: 18500,
				links: [],
			}),
		);
		expect(missingInstagram).toEqual(
			expect.objectContaining({ handle: 'munchiesde_no_such_profile_x1', exists: false }),
		);
		expect(missingTiktok).toEqual(
			expect.objectContaining({ handle: 'munchiesde_no_such_profile_x1', exists: false }),
		);
	});

	it('proves it by its link on the brand’s site, a branch’s street in its bio, or a link back', () => {
		expect(profileProof(instagram!, munchies)).toBe('site');
		expect(profileProof(tiktok!, { ...munchies, account: ig('munchiesde') })).toBe('street');
		expect(
			profileProof(
				{ ...tiktok!, bio: 'Halal chicken · eatmunchies.de' },
				{ ...munchies, streets: [] },
			),
		).toBe('site');
		expect(
			profileProof(
				{ ...tiktok!, bio: 'IG: @munchiesde' },
				{ ...munchies, streets: [], account: ig('munchiesde') },
			),
		).toBe('account');
		expect(
			profileProof(
				{ ...tiktok!, links: ['https://instagram.com/munchiesde'], bio: '' },
				{ ...munchies, account: ig('munchiesde') },
			),
		).toBe('account');
	});

	it('proves nothing without them, and nothing for a missing profile', () => {
		const stranger = {
			...munchies,
			websites: ['https://other.de'],
			streets: ['Oranienstraße 1'],
		};
		expect(profileProof(instagram!, stranger)).toBeNull();
		expect(
			profileProof(
				{ ...tiktok!, bio: '@munchiesde fan page' },
				{ ...stranger, account: ig('munchiesde') },
			),
		).toBeNull();
		expect(profileProof(missingInstagram!, munchies)).toBeNull();
		// Named like the brand: a suggestion's worth
		expect(profileNamedAfter(instagram!, 'Munchies', new Set(['berlin']))).toBe(true);
		expect(profileNamedAfter(instagram!, 'Sori Ramen', new Set(['berlin']))).toBe(false);
	});
});
