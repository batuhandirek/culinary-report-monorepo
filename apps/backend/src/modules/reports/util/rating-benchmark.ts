// Pure: a branch's all-time Google rating against its district's and its kind of food's venues.

import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import type { VenueTopicTag } from 'src/modules/topics/util/venue-topics.js';
import {
	districtRatingStanding,
	isRatingPeer,
	RATING_BENCHMARK_MIN_VENUES,
	RatingPeer,
	ratingStanding,
} from 'src/modules/venues/util/rating-benchmark.js';

import type { ReportRatingBenchmark } from '../interfaces/report-data.interface.js';

/**
 * The branch's standing among `peers` (its city's open venues; `isRatingPeer` keeps the food
 * venues with a rating and 20+ reviews, the branch itself is left out): in its district, and
 * among the venues tagged with its primary food topic (`tags`, with parents: a ramen place
 * counts for Japanese), or the nearest parent topic with `RATING_BENCHMARK_MIN_VENUES` when the
 * topic alone has fewer. Undefined without a rating or when neither comparison has enough peers.
 */
export const ratingBenchmark = (input: {
	branch: RatingPeer;
	cityName: string;
	peers: RatingPeer[];
	tags: Map<string, VenueTopicTag[]>;
	index: TopicIndex;
}): ReportRatingBenchmark | undefined => {
	const { branch, index } = input;
	if (branch.rating == null) return undefined;
	const rating = branch.rating;
	const peers = input.peers.filter(p => p.id !== branch.id && isRatingPeer(p));

	const inDistrict = districtRatingStanding(branch, peers);
	const district = inDistrict && branch.district ? { label: branch.district, ...inDistrict } : undefined;

	let topic: ReportRatingBenchmark['topic'];
	const primary = input.tags.get(branch.id)?.find(t => t.primary)?.key;
	if (primary) {
		const peerTopics = peers.map(p => ({
			rating: p.rating!,
			keys: new Set(index.withParents((input.tags.get(p.id) ?? []).map(t => t.key))),
		}));
		// The topic, else its parent, its parent's parent, … until one has enough venues
		for (let key: string | null | undefined = primary; key && !topic; key = index.get(key)?.parentKey) {
			const ratings = peerTopics.filter(p => p.keys.has(key!)).map(p => p.rating);
			if (ratings.length < RATING_BENCHMARK_MIN_VENUES) continue;
			const standing = ratingStanding(rating, ratings);
			const found = index.get(key);
			if (standing && found) topic = { key, label: found.label, city: input.cityName, ...standing };
		}
	}

	if (!district && !topic) return undefined;
	return { rating, ...(district && { district }), ...(topic && { topic }) };
};

/** "4.3 on Google: above 70 % of Kreuzberg's 212 food venues (median 4.4), above 55 % of Berlin's 61 kebab places (median 4.2)". */
export const ratingBenchmarkSentence = (b: ReportRatingBenchmark): string =>
	`${b.rating.toFixed(1)} all-time on Google: ` +
	[
		b.district &&
			`above ${b.district.percentile} % of ${b.district.label}'s ${b.district.venues} food venues (median ${b.district.median})`,
		b.topic &&
			`above ${b.topic.percentile} % of ${b.topic.city}'s ${b.topic.venues} ${b.topic.label} places (median ${b.topic.median})`,
	]
		.filter(Boolean)
		.join(', ') +
	' (venues with 20+ reviews)';
