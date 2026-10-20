import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { ReviewAlertEmail, type ReviewAlertEmailProps, reviewAlertSubject } from 'emails';

import { mainConfig } from 'src/config/main.config.js';
import { EmailService } from 'src/modules/email/services/email.service.js';
import { renderEmail } from 'src/modules/email/util/render-email.js';
import { ReviewReplyAgent } from 'src/modules/reports/agents/review-reply.agent.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';

import { OutreachTouchKindEnum, ProspectStageEnum } from '../constants/outreach.constant.js';
import { Prospect } from '../entities/prospect.entity.js';

import { OutreachService } from './outreach.service.js';

/** The template key a review alert is logged with. */
export const REVIEW_ALERT_TEMPLATE = 'review-alert';

/** The portal's Reviews tab of a brand. */
export const portalReviewsUrl = (brandId: string) =>
	`${mainConfig.PUBLIC_APP_URL}/portal/${brandId}/reviews`;

/**
 * Mails a subscribed brand (`WON`, with a `contactEmail`) a critical review of one of its branches the weekly watch
 * found: the guest's words, a reply draft (`ReviewReplyAgent`, one call, kept on the review for
 * the portal) and where to post it, in the prospect's language. Logged as an outreach touch.
 */
@Injectable()
export class ReviewAlertService {
	private readonly logger = new Logger(ReviewAlertService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly outreachService: OutreachService,
		private readonly emailService: EmailService,
		private readonly reviewReplyAgent: ReviewReplyAgent,
	) {}

	/** Returns whether a mail was queued. A brand that stopped subscribing gets none. */
	async send(reviewId: string): Promise<boolean> {
		const review = await this.em.findOne(Review, { id: reviewId }, { populate: ['venue', 'venue.brand', 'venue.brand.branches'] });
		if (!review) return false;
		const prospect = await this.em.findOne(Prospect, { brand: review.venue.brand });
		if (prospect?.stage !== ProspectStageEnum.WON || !prospect.contactEmail) {
			this.logger.log(`No alert for ${review.venue.name}: not subscribed or no address`);
			return false;
		}
		const text = review.text || review.textTranslated;
		if (!text || review.stars == null) return false;

		review.replyDraft ??= await this.draft(review, text);
		const props: ReviewAlertEmailProps = {
			language: prospect.language,
			// A chain's branch is named with its street
			venueName: review.venue.brand.branches.length > 1 && review.venue.street ? `${review.venue.name} · ${review.venue.street}` : review.venue.name,
			contactName: prospect.contactName,
			stars: review.stars,
			publishedAt: review.publishedAt.toISOString(),
			text,
			translation: review.text && review.language !== 'en' ? review.textTranslated : null,
			draft: review.replyDraft,
			googleUrl: review.venue.googleUrl,
			portalUrl: portalReviewsUrl(prospect.brand.id),
		};
		const subject = reviewAlertSubject(props);
		// Queued first: a failure after it repeats the mail rather than losing it
		await this.emailService.queueEmail({
			to: { email: prospect.contactEmail, name: prospect.contactName ?? undefined },
			subject,
			...(await renderEmail(ReviewAlertEmail, props)),
		});
		await this.outreachService.log(prospect.id, {
			kind: OutreachTouchKindEnum.EMAIL,
			subject,
			body: props.portalUrl,
			template: REVIEW_ALERT_TEMPLATE,
		});
		await this.em.flush();
		this.logger.log(`Alerted ${review.venue.name} to a ${review.stars}-star review`);
		return true;
	}

	/** One reply in the review's language; null when the call fails, so the mail still goes. */
	private async draft(review: Review, text: string): Promise<string | null> {
		try {
			const res = await this.reviewReplyAgent.generate(
				JSON.stringify({
					venue: {
						name: review.venue.name,
						category: review.venue.category,
						district: review.venue.district,
					},
					reviews: [
						{ reviewId: review.reviewId, stars: review.stars, language: review.language, text },
					],
				}),
			);
			return res.object.replies.find(r => r.reviewId === review.reviewId)?.reply.trim() || null;
		} catch (e) {
			this.logger.warn(`Reply draft for ${review.venue.name} failed: ${(e as Error).message}`);
			return null;
		}
	}
}
