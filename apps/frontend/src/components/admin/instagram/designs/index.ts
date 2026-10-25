import { bigNumberFills, carouselFills, headlineFills, topListFills } from '../fills.js';
import { definePostDesign, type PostDesign, themeField } from '../post-design.js';

import BigNumber from './BigNumber.svelte';
import HeadlineCard from './HeadlineCard.svelte';
import ListCarousel from './ListCarousel.svelte';
import TopList from './TopList.svelte';

// The studio's designs, in the gallery's order. Defaults are sample content in the brand's
// voice (`brand` skill) with made-up places: they draw the thumbnail and seed a new draft.

const handleField = {
	key: 'handle',
	label: 'Handle',
	type: 'text',
	placeholder: '@munchwerk.berlin',
	hint: 'The city edition’s account, with the @.'
} as const;

const headline = definePostDesign({
	id: 'headline',
	name: 'Headline card',
	description: 'One finding said big, with a series stamp, a sentence and an optional photo.',
	formats: ['portrait', 'square', 'story'],
	fields: [
		themeField,
		{
			key: 'label',
			label: 'Stamp',
			type: 'text',
			maxLength: 28,
			hint: 'The series, one or two words: Rising, New in Town.'
		},
		{
			key: 'headline',
			label: 'Headline',
			type: 'textarea',
			maxLength: 90,
			hint: 'The fact, about eight words, sentence case.'
		},
		{
			key: 'body',
			label: 'Sentence',
			type: 'textarea',
			maxLength: 160,
			hint: 'Optional. One line with the number behind it.'
		},
		{
			key: 'photo',
			label: 'Photo',
			type: 'image',
			hint: 'Optional. Credit its creator in the caption.'
		},
		{
			key: 'where',
			label: 'City and period',
			type: 'text',
			placeholder: 'Berlin · October 2026'
		},
		handleField
	],
	defaults: {
		theme: 'day',
		label: 'Rising',
		headline: 'Berlin can’t stop posting about bao',
		body: 'Posted 48 times by 19 creators in October, up from 11 in September.',
		photo: '',
		where: 'Berlin · October 2026',
		handle: '@munchwerk.berlin'
	},
	caption:
		'Berlin can’t stop posting about bao.\n\n48 posts by 19 creators in October, up from 11 in September.\n\nThe full list: link in bio.\n\n#berlinfood #berlineats #bao',
	fills: headlineFills,
	component: HeadlineCard
});

const bigNumber = definePostDesign({
	id: 'big-number',
	name: 'Big number',
	description: 'One figure as the picture on an acid, grape or ink field.',
	formats: ['portrait', 'square', 'story'],
	fields: [
		{
			key: 'field',
			label: 'Field',
			type: 'select',
			hint: 'Acid by day, grape for evenings and openings, ink for a quiet fact.',
			options: [
				{ value: 'acid', label: 'Acid' },
				{ value: 'grape', label: 'Grape' },
				{ value: 'ink', label: 'Ink' }
			]
		},
		{ key: 'label', label: 'Stamp', type: 'text', maxLength: 28 },
		{
			key: 'figure',
			label: 'Number',
			type: 'text',
			maxLength: 8,
			hint: 'As we write numbers: 1,200 · 40% · +12.'
		},
		{
			key: 'unit',
			label: 'What it counts',
			type: 'text',
			maxLength: 30,
			placeholder: 'posts about brunch'
		},
		{ key: 'sentence', label: 'Sentence', type: 'textarea', maxLength: 140 },
		{
			key: 'method',
			label: 'Method line',
			type: 'text',
			maxLength: 90,
			placeholder: 'Counted from 3,400 posts, 1–31 October'
		},
		handleField
	],
	defaults: {
		field: 'acid',
		label: 'October 2026',
		figure: '3,400',
		unit: 'posts about food',
		sentence:
			'Berlin named 412 places on TikTok and Instagram this month. Kreuzberg came first.',
		method: 'Counted from posts by 900 creators, 1–31 October',
		handle: '@munchwerk.berlin'
	},
	fills: bigNumberFills,
	component: BigNumber
});

const topList = definePostDesign({
	id: 'top-list',
	name: 'Top list',
	description:
		'A ranked list in one image: Heat Check, Rising. Square shows 5 rows, portrait 8, a story 10.',
	formats: ['portrait', 'square', 'story'],
	fields: [
		themeField,
		{
			key: 'label',
			label: 'Stamp',
			type: 'text',
			maxLength: 28,
			placeholder: 'Heat Check · Berlin'
		},
		{ key: 'title', label: 'Title', type: 'textarea', maxLength: 60 },
		{ key: 'period', label: 'Period', type: 'text', placeholder: 'October 2026' },
		{
			key: 'items',
			label: 'Rows',
			type: 'list',
			itemLabel: 'Row',
			min: 1,
			max: 10,
			fields: [
				{ key: 'name', label: 'Name', type: 'text' },
				{ key: 'meta', label: 'Right side', type: 'text', placeholder: '48 posts' },
				{
					key: 'value',
					label: 'Bar value',
					type: 'number',
					min: 0,
					hint: 'The bar’s length, against the largest row.'
				}
			]
		},
		{ key: 'method', label: 'Method line', type: 'text', maxLength: 90 },
		handleField
	],
	defaults: {
		theme: 'day',
		label: 'Heat Check · Berlin',
		title: 'Most talked-about places',
		period: 'October 2026',
		items: [
			{ name: 'Bao Brothers', meta: '48 posts', value: 48 },
			{ name: 'Café Kalk', meta: '41 posts', value: 41 },
			{ name: 'Pasta Nonna', meta: '37 posts', value: 37 },
			{ name: 'Smash Club', meta: '30 posts', value: 30 },
			{ name: 'Mezze Garten', meta: '26 posts', value: 26 },
			{ name: 'Kimchi Kiosk', meta: '22 posts', value: 22 },
			{ name: 'Bäckerei Ost', meta: '19 posts', value: 19 },
			{ name: 'Taco Hof', meta: '17 posts', value: 17 }
		],
		method: 'Counted from 3,400 posts by 900 creators, 1–31 October',
		handle: '@munchwerk.berlin'
	},
	fills: topListFills,
	component: TopList
});

const listCarousel = definePostDesign({
	id: 'list-carousel',
	name: 'List carousel',
	description: 'The brand’s carousel: a cover, one slide per place, the method, the follow card.',
	formats: ['portrait', 'square'],
	fields: [
		themeField,
		{ key: 'series', label: 'Series', type: 'text', maxLength: 24, placeholder: 'Heat Check' },
		{ key: 'title', label: 'Cover title', type: 'textarea', maxLength: 70 },
		{
			key: 'period',
			label: 'Period',
			type: 'text',
			placeholder: 'Oct 2026',
			hint: 'Short: it is set in pixel caps.'
		},
		{
			key: 'items',
			label: 'Places',
			type: 'list',
			itemLabel: 'Place',
			min: 1,
			max: 10,
			fields: [
				{ key: 'name', label: 'Name', type: 'text' },
				{ key: 'area', label: 'District', type: 'text' },
				{
					key: 'stat',
					label: 'Count',
					type: 'text',
					placeholder: '48 posts by 19 creators'
				},
				{
					key: 'credit',
					label: 'Photo by',
					type: 'text',
					placeholder: '@creator',
					hint: 'The creator whose photo it is, with the @.'
				},
				{ key: 'photo', label: 'Photo', type: 'image' }
			]
		},
		{
			key: 'method',
			label: 'Method',
			type: 'textarea',
			maxLength: 120,
			hint: 'One line: what was counted, from how many posts, which dates.'
		},
		{
			key: 'cta',
			label: 'Call to action',
			type: 'text',
			placeholder: 'The full top 10: link in bio'
		},
		handleField
	],
	defaults: {
		theme: 'day',
		series: 'Heat Check',
		title: 'Berlin’s most talked-about places',
		period: 'Oct 2026',
		items: [
			{
				name: 'Bao Brothers',
				area: 'Kreuzberg',
				stat: '48 posts by 19 creators',
				credit: '@eatberlin',
				photo: ''
			},
			{
				name: 'Café Kalk',
				area: 'Neukölln',
				stat: '41 posts by 22 creators',
				credit: '@brunchberlin',
				photo: ''
			},
			{
				name: 'Pasta Nonna',
				area: 'Mitte',
				stat: '37 posts by 15 creators',
				credit: '@nudelnacht',
				photo: ''
			}
		],
		method: 'Counted from 3,400 posts by 900 creators, 1–31 October',
		cta: 'The full top 10: link in bio',
		handle: '@munchwerk.berlin'
	},
	slides: (v) => [
		'Cover',
		...v.items.map((item, i) => `${i + 1}. ${item.name || 'Place'}`),
		'Method',
		'Follow'
	],
	caption:
		'Berlin’s most talked-about places in October.\n\n1. Bao Brothers (photo @eatberlin)\n2. Café Kalk (photo @brunchberlin)\n3. Pasta Nonna (photo @nudelnacht)\n\nCounted from 3,400 posts by 900 creators. The full top 10: link in bio.\n\n#berlinfood #berlineats #heatcheck',
	fills: carouselFills,
	component: ListCarousel
});

export const POST_DESIGNS: PostDesign[] = [headline, topList, listCarousel, bigNumber];

export const findPostDesign = (id: string) => POST_DESIGNS.find((d) => d.id === id);
