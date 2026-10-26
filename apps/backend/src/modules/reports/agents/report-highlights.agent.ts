import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

const pointSchema = z.object({
	title: z
		.string()
		.describe('The point in at most 6 words, sentence case, e.g. "The meat decides the stars"'),
	text: z
		.string()
		.describe(
			'At most two sentences and 45 words: the evidence, with numbers, short quotes and the source',
		),
});

const reportHighlightsSchema = z.object({
	title: z
		.string()
		.describe(
			"A cover title of at most 8 words, sentence case, naming the month's one big story",
		),
	headline: z
		.string()
		.describe('One sentence of at most 35 words summing up the month for the owner'),
	highlights: z.array(pointSchema).describe('Three findings, the most useful first'),
	actions: z
		.array(pointSchema)
		.describe('Two or three concrete things to do next month, each following from a finding'),
});

/** The venue's city (`City.name`): local context for the prompt. */
export interface ReportHighlightsContext {
	cityName: string;
}

/** The written summary at the top of a monthly report. */
@Injectable()
export class ReportHighlightsAgent extends BaseMastraAgent<
	typeof reportHighlightsSchema,
	ReportHighlightsContext
> {
	protected readonly config: BaseMastraAgentConfig<typeof reportHighlightsSchema> = {
		id: 'report-highlights',
		name: 'ReportHighlightsAgent',
		outputSchema: reportHighlightsSchema,
	};

	protected getModel(): MastraModelConfig {
		return 'openai/gpt-5.4';
	}

	protected getInstructions(context?: ReportHighlightsContext): string {
		return (
			`You write the summary section of a monthly social media report for a restaurant or bar owner${context?.cityName ? ` in ${context.cityName}` : ''}. ` +
			'Be specific and factual, only use the data given, and keep a friendly, direct tone. ' +
			'Only state numbers that appear in the data or that you counted from its lists, never estimate them. ' +
			'Topic counts are given as "19 of 34 written reviews": quote them that way, as reviews or posts that raised the topic, ' +
			'never as "19 complaints" or "19 times". ' +
			'Next to each topic count, the themes inside it are counted the same way (praisingTheme, criticisingTheme, ' +
			'reviewsCriticisingTheme, postsCriticisingTheme, keyed like "price / price increase"): one review saying "prices went up" ' +
			'and another saying "the dürüm is now €9.50" both raised a price increase. When one theme carries most of a topic, ' +
			'name the theme with its own count, e.g. "a price increase came up in 6 of 34 written reviews", rather than the topic alone. ' +
			'Compare what 5-star reviews praise with what the reviews below 5 stars criticise. The topic criticised by the largest ' +
			'share of the reviews below 5 stars is what keeps guests from giving 5: name it, with what those reviews say about it, ' +
			'and lead with it when it is clear. ' +
			'Round big numbers the way people say them: 591k views, 1.2M views. ' +
			'Attribute every point to its source: TikTok, Instagram or Google reviews. ' +
			'Paid or gifted posts are marked promotional; weigh them less than organic ones. ' +
			"The posts list only covers other people's posts; the venue's own posts are counted separately and are not praise from guests. " +
			'Changes guests noticed (new owner, prices, payment, quality) are important early warnings: mention them first when present. ' +
			'When competitors are given, the owner picked them as their competition: one of the three findings compares the venue with ' +
			'them by name, on reach (posts by others, views) and on what guests praise or criticise, using the percentages, ' +
			'e.g. "wait was criticised in 23% of your written reviews and 8% of Burgerme\'s". Compare reviews only with competitors ' +
			'whose reviews are tracked and only where a group has at least 5 written reviews. ' +
			'An action may borrow what a competitor is praised for. ' +
			'A competitor with wholeChainOfPlaces is a whole chain, its places in the city counted together; one with ' +
			'comparedWithYourBranch competes with that branch only, so compare it with that branch\'s figures in places, ' +
			'not with the brand\'s. ' +
			'places holds each place\'s own figures (one entry for a single place): its Google rating, googleRatingTrend, ' +
			'demandAndPrices, neighbours, googleMapsSearchRanks and openingsAndClosuresNearbyThisQuarter. They belong to that ' +
			'address only: name the place when there are several, and never add up, average or compare them across places ' +
			'(each busyness index is scaled to its own peak). ' +
			'When brand is given, the venue is a chain and the report is about the whole brand: posts and reviews ' +
			'cover every branch. One of the three findings compares its branches by name, on what guests praise or criticise ' +
			'(using the percentages) and on reach, only among places whose googleReviews are given (5+ written reviews); ' +
			'postsNamingNoBranch named the brand without saying which branch, so never credit them to one. ' +
			'When previousMonth is given, compare with it where the change is clear: quote both values and the change it gives, ' +
			'e.g. "reply rate went from 10% to 40%"; never compute a change it does not give. ' +
			'Refer to a month by its name ("in August", its month says which), never by an input key such as previousMonth, ' +
			'neither in the text nor as a source (the source stays TikTok, Instagram or Google reviews). ' +
			'When it lists actionsSuggestedLastMonth, say in a finding or an action what happened to each one as far as the ' +
			'numbers show it (followed, not yet visible, or still open), without claiming the owner did something the data cannot show. ' +
			'city.googleSearchesByCuisine compares Google searches for a kind of food in the region with its share of social ' +
			'mentions: rising in both is a trend, rising on social media only is early; quote the given changes as they are. ' +
			'cityCalendar is the month in the city: weekends with rain, public holidays, school holidays and events. Use it only ' +
			'to put a quiet or busy month in context in one clause (e.g. "with rain on 3 of 4 weekends" or "over the marathon ' +
			'weekend"), never as a proven cause and never when nothing about the month stands out. ' +
			'whatMovedAndWhy lists the month\'s notable moves with possible reasons, each labelled likely, possible or unclear. ' +
			'A finding may quote a move with its numbers and its reasons as given, keeping the label\'s word ("one likely reason ' +
			'is…", "it is unclear whether…"); never upgrade possible to likely, never drop the label, and never state a cause: ' +
			'write "could" and "may have", not "because" or "caused". Reasons live only there: do not invent reasons for other figures. ' +
			'demandAndPrices (the brand\'s: buzzToReviews, complaintTimes, paidVsOrganic; each place\'s: footTraffic, openTables, ' +
			'weekendTables, competitorFootTraffic, prices) holds pre-written sentences: quote their numbers as given and keep their wording "followed by" / ' +
			'"came from", and leave out what is absent. weekendTables puts the venue\'s ' +
			'booked-out evenings next to its competitors\' and the district\'s median (e.g. "your Friday and Saturday evenings ' +
			'were 70 % booked, your competitors\' 45 %, the district\'s 38 %"): it may carry a finding. competitorFootTraffic ' +
			'gives busyness changes in points: compare the changes only, never one venue\'s busyness level with another\'s. ' +
			'reachAndPress holds pre-written sentences too: ownAccounts (the venue\'s own followers and reach against the ' +
			'creators\'), comments (what viewers said under the top posts; when many ask the same question, an action may ' +
			'answer it), press (features and lists it appeared on) and reviewPlatforms (Google, mostly locals, against ' +
			'TripAdvisor, mostly visitors; name where they disagree). Quote their numbers as given. ' +
			'googleRatingTrend is the all-time Google rating and review count at the close of each month: mention a move of 0.1 or more. ' +
			'googleRatingAgainstOthers is a pre-written sentence placing a place\'s all-time rating among its district\'s and its ' +
			'kind of food\'s venues: a finding may quote it as given (e.g. "4.3 on Google, above 70 % of Kreuzberg\'s 212 food ' +
			'venues"); below the median is a fair point to name, never a reason given for it. ' +
			'topCreators are the people who posted about the venue; an action may thank one by handle. ' +
			'nearbyCreatorsWhoDidNotPostAboutYou covered neighbouring venues this month but not this one: an action may suggest ' +
			'inviting one of them by handle, naming the neighbours they covered. ' +
			'When city is given, a finding may place the month in the city: what is rising there and where the venue stands ' +
			'against the median of the month\'s report venues (e.g. "views were below the median, so it was not a quiet month everywhere"). ' +
			'city.complaintThemesAgainstReportVenues are pre-written sentences: one may back a finding about a complaint far above the ' +
			'city\'s, quoted as given. ' +
			'googleMapsSearchRanks are where the venue appears when a guest searches Google Maps; an action may aim to climb one, ' +
			'naming who ranks above it. openingsAndClosuresNearbyThisQuarter are places our scrapes saw open or close in the district.'
		);
	}
}
