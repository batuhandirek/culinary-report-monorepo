import type {
	FeedbackSentiment,
	FeedbackTopic,
} from 'src/modules/venues/interfaces/feedback.interface.js';

import type { FeedbackUnit } from '../entities/feedback-point.entity.js';

/** The aspect a point is filed under, with its parent when it has one: what a page shows and links */
export interface FeedbackAspectOutputDto {
	/** The aspect's key (`Topic.key`): the same as `theme` */
	key: string;
	/** "Price increase" */
	label: string;
	/** The aspect above it; absent for a root (a point "about price, nothing finer") */
	parent?: { key: string; label: string };
}

/**
 * One thing a review or a mention says (a `FeedbackPoint` row). A point has a `detail`, praise
 * `positive` and a complaint `negative`; a dish-only row has a `dish`, the dish's sentiment and no
 * topic or detail; a noticed change (`change`) is `neutral`, its phrase the detail. Pages group
 * them by sentiment themselves.
 */
export interface FeedbackPointOutputDto {
	sentiment: FeedbackSentiment;
	/** The aspect's root key */
	topic?: FeedbackTopic;
	/** The aspect's key; absent until the point is filed, and on a dish-only row */
	theme?: string;
	/** The aspect of `theme`, with its label; absent with it. Every route serving rows populates it (`aspect`, `aspect.parent`) */
	aspect?: FeedbackAspectOutputDto;
	detail?: string;
	/** The dish or drink it is about */
	dish?: string;
	/** The food topic the dish is (`FeedbackPoint.foodTopic`): its page is `/admin/trends/<key>` */
	foodTopic?: { key: string; label: string };
	/** The number it states: minutes for a wait, the price for a price */
	amount?: number;
	unit?: FeedbackUnit;
	/** A change the reviewer noticed since before ("new owner"), not a praise or complaint */
	change: boolean;
}
