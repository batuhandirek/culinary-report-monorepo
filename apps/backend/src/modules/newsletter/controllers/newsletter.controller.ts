import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { TurnstileGuard } from 'src/modules/turnstile/guards/turnstile.guard.js';

import {
	NewsletterSubscribeInputDto,
	NewsletterTokenInputDto,
} from '../dto/newsletter.input.dto.js';
import { NewsletterSubscriptionOutputDto } from '../dto/newsletter.output.dto.js';
import { NewsletterSubscriber } from '../entities/newsletter-subscriber.entity.js';
import { NewsletterService } from '../services/newsletter.service.js';

const subscriptionDto = (subscriber: NewsletterSubscriber) =>
	wrap(subscriber).serialize({
		skipNull: true,
		forceObject: true,
		populate: ['city'],
	}) as unknown as NewsletterSubscriptionOutputDto;

/** The front page's monthly e-mail: sign up (a confirmation mail follows), confirm, unsubscribe. */
@Controller('newsletter/subscriptions')
export class NewsletterController {
	constructor(private readonly newsletterService: NewsletterService) {}

	/** Answers the same whether the address was new, pending or already confirmed. */
	@TypedRoute.Post('/')
	@UseGuards(TurnstileGuard)
	async subscribeToNewsletter(@TypedBody() body: NewsletterSubscribeInputDto): Promise<void> {
		await this.newsletterService.subscribe(body.email, body.citySlug);
	}

	@TypedRoute.Post('/confirm')
	async confirmNewsletter(
		@TypedBody() body: NewsletterTokenInputDto,
	): Promise<NewsletterSubscriptionOutputDto> {
		return subscriptionDto(await this.newsletterService.confirm(body.token));
	}

	@TypedRoute.Post('/unsubscribe')
	async unsubscribeFromNewsletter(
		@TypedBody() body: NewsletterTokenInputDto,
	): Promise<NewsletterSubscriptionOutputDto> {
		return subscriptionDto(await this.newsletterService.unsubscribe(body.token));
	}
}
