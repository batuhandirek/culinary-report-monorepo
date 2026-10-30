import type { Rel } from '@mikro-orm/core';
import { Check, Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import type {
	FeedbackSentiment,
	FeedbackTopic,
} from 'src/modules/venues/interfaces/feedback.interface.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

/** Where a point was said: a review, a post's mention. A new source is a new kind, not a new shape. */
export type FeedbackSourceKind = 'review' | 'mention';

/** What a stated number measures: a wait in minutes, a price in the city's currency. */
export type FeedbackUnit = 'minutes' | 'money';

/**
 * One thing a review or a post's mention says, e.g. `{ theme: price_increase, dish: "cheeseburger",
 * foodTopic: burgers, sentiment: negative, detail: "prices went up" }`. A point has a `detail`
 * (praise `positive`, a complaint `negative`) and a theme once filed; a dish-only row (a dish the
 * source lists that no point of it names) has a `dish` and the dish's sentiment, no topic and no
 * detail. Brand and venue are never copied: they change after extraction (matching, corrections,
 * merges), so readers join through the source. `FeedbackService` is the one writer.
 */
@Entity({ tableName: 'feedback_points' })
@Check({
	name: 'feedback_points_one_source_check',
	expression: '(review_id is null) <> (mention_id is null)',
})
@Index({ properties: ['city', 'month'] })
@Index({ properties: ['foodTopic', 'month'] })
export class FeedbackPoint extends MikroOrmSimpleEntityAbstractClass<'change'> {
	@Property({ type: 'text' })
	sourceKind: FeedbackSourceKind;

	@ManyToOne({ entity: () => Review, nullable: true, deleteRule: 'cascade', index: true })
	review?: Rel<Review> | null;

	@ManyToOne({ entity: () => Mention, nullable: true, deleteRule: 'cascade', index: true })
	mention?: Rel<Mention> | null;

	/** The source's: a review's venue's city, a mention's post's city. Never changes. */
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	/** YYYY-MM (UTC) of the review's `publishedAt` or the post's `postedAt` */
	@Property({ type: 'text' })
	month: string;

	@Property({ type: 'text' })
	sentiment: FeedbackSentiment;

	/** The theme's topic; null on a dish-only row. Copied from `FEEDBACK_THEMES` (`FeedbackService.realign`) */
	@Property({ type: 'text', nullable: true })
	topic?: FeedbackTopic | null;

	/** The aspect's key (`Topic.key`); null on a dish-only row and on a point not filed yet. Kept with `aspect` for the SQL readers */
	@Property({ type: 'text', nullable: true })
	theme?: string | null;

	/** The aspect the point is filed under: the `Topic` row of `theme`; set with it, null while unfiled */
	@ManyToOne({ entity: () => Topic, nullable: true, deleteRule: 'set null', index: true })
	aspect?: Rel<Topic> | null;

	/** The phrase, in English; null on a dish-only row */
	@Property({ type: 'text', nullable: true })
	detail?: string | null;

	/** The dish or drink it is about, as the source names it */
	@Property({ type: 'text', nullable: true })
	dish?: string | null;

	/** `dishKey(dish)`: one key across spellings and plurals */
	@Property({ type: 'text', nullable: true })
	dishKey?: string | null;

	/** The dish or drink topic the dish names as a whole (`TopicIndex.dishTopic`), re-linked when topics change */
	@ManyToOne({ entity: () => Topic, nullable: true, deleteRule: 'set null' })
	foodTopic?: Rel<Topic> | null;

	/** The number the point states ("waited 40 min": 40), never estimated */
	@Property({ type: 'double', nullable: true })
	amount?: number | null;

	@Property({ type: 'text', nullable: true })
	unit?: FeedbackUnit | null;

	/** When the dish was decided (the extraction agent, the phrase, the dish pass): a point is asked once */
	@Property({ type: 'datetime', nullable: true })
	dishCheckedAt?: Date | null;

	/** When the amount was decided (the extraction agent, the parser, the amount pass) */
	@Property({ type: 'datetime', nullable: true })
	amountCheckedAt?: Date | null;

	/**
	 * A change the reviewer noticed since an earlier visit ("new owner", "portions got smaller"),
	 * `neutral`, its phrase the `detail`: no praise or complaint, filed under a theme like any point
	 */
	@Property({ type: 'boolean', default: false })
	change: boolean = false;
}
