import { FilterQuery, QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import { AdminUpdateMentionInputDto } from '../dto/admin-mention.input.dto.js';
import {
	AdminListMentionsInputDto,
	AdminListMentionsOutputDto,
	AdminListPostsInputDto,
	AdminListPostsOutputDto,
	AdminMentionOutputDto,
	AdminMentionWithPostOutputDto,
	AdminSocialPostListItemOutputDto,
	AdminSocialPostOutputDto,
} from '../dto/admin-social.output.dto.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPost } from '../entities/social-post.entity.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';
import { normalizeHashtag } from '../util/hashtags.js';

const MENTION_POPULATE = [
	'mentions',
	'mentions.venue',
	'mentions.brand',
	'mentions.feedback',
	'mentions.feedback.foodTopic',
	'mentions.feedback.aspect',
	'mentions.feedback.aspect.parent',
	'account',
	'account.creator',
	'account.brand',
	'foundBy',
	'foundBy.source',
	'foundBy.venue',
] as const;
// A post's page also lists its hashtags with what they name
const POST_POPULATE = [
	...MENTION_POPULATE,
	'mentions.topics',
	'mentions.topics.topic',
	'city',
	'hashtagLinks',
	'hashtagLinks.hashtag',
	'hashtagLinks.hashtag.topic',
	'hashtagLinks.hashtag.brand',
] as const;
const EXCLUDE = [
	'account.creator.accounts',
	'account.brand.branches',
	'mentions.brand.branches',
	'hashtagLinks.hashtag.brand.branches',
	'mentions.topics.mention',
	'mentions.topics.topic.parent',
] as const;

@Controller('/admin')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminSocialController {
	constructor(
		private readonly em: EntityManager,
		private readonly mentionMatchingService: MentionMatchingService,
	) {}

	@TypedRoute.Get('/posts')
	async listPosts(@TypedQuery() query: AdminListPostsInputDto): Promise<AdminListPostsOutputDto> {
		const filters: FilterQuery<SocialPost> = {};
		if (query.cityId) filters.city = query.cityId;
		if (query.platform) filters.platform = query.platform;
		if (query.month) {
			const { start, end } = monthRange(query.month);
			filters.postedAt = { $gte: start, $lt: end };
		}
		if (query.q) {
			filters.$or = [
				{ text: { $ilike: `%${query.q}%` } },
				{ author: { $ilike: `%${query.q}%` } },
				{ account: { displayName: { $ilike: `%${query.q}%` } } },
				{ locationName: { $ilike: `%${query.q}%` } },
			];
		}
		if (query.hashtag && normalizeHashtag(query.hashtag))
			filters.hashtagLinks = { hashtag: { tag: normalizeHashtag(query.hashtag) } };
		if (query.accountId) filters.account = query.accountId;
		else if (query.creatorId) filters.account = { creator: query.creatorId };
		if (query.venueId) filters.mentions = { venue: query.venueId };
		else if (query.brandId) filters.mentions = { brand: query.brandId };
		else if (query.unmatchedOnly) filters.mentions = { matchMethod: MentionMatchMethodEnum.NONE };
		else if (query.matchedOnly) filters.mentions = { brand: { $ne: null } };

		const [field, order] = (query.sort ?? 'postedAt:desc').split(':') as ['postedAt' | 'views', 'asc' | 'desc'];
		const [items, totalItems] = await this.em.findAndCount(SocialPost, filters, {
			populate: [...MENTION_POPULATE],
			orderBy: { [field]: order === 'asc' ? QueryOrder.ASC : QueryOrder.DESC },
			offset: (query.page - 1) * query.size,
			limit: query.size,
		});
		return {
			items: items.map(
				post =>
					wrap(post).serialize({
						skipNull: true,
						forceObject: true,
						populate: [...MENTION_POPULATE],
						exclude: [...EXCLUDE],
					}) as unknown as AdminSocialPostListItemOutputDto,
			),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	@TypedRoute.Get('/posts/:id')
	async getPost(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminSocialPostOutputDto> {
		const post = await this.em.findOneOrFail(SocialPost, { id }, { populate: [...POST_POPULATE, 'snapshots'] });
		return wrap(post).serialize({
			skipNull: true,
			forceObject: true,
			populate: [...POST_POPULATE, 'snapshots'],
			exclude: [...EXCLUDE, 'snapshots.post'],
		}) as unknown as AdminSocialPostOutputDto;
	}

	@TypedRoute.Get('/mentions')
	async listMentions(@TypedQuery() query: AdminListMentionsInputDto): Promise<AdminListMentionsOutputDto> {
		const filters: FilterQuery<Mention> = {};
		if (query.venueId) filters.venue = query.venueId;
		if (query.brandId) filters.brand = query.brandId;
		if (query.matchMethod) filters.matchMethod = query.matchMethod;
		if (query.month) {
			const { start, end } = monthRange(query.month);
			filters.post = { postedAt: { $gte: start, $lt: end } };
		}
		const populate = ['post', 'venue', 'brand', 'feedback', 'feedback.foodTopic', 'feedback.aspect', 'feedback.aspect.parent'] as const;
		const [items, totalItems] = await this.em.findAndCount(Mention, filters, {
			populate: [...populate],
			orderBy: { post: { postedAt: QueryOrder.DESC } },
			offset: (query.page - 1) * query.size,
			limit: query.size,
		});
		return {
			items: items.map(
				mention =>
					wrap(mention).serialize({
						skipNull: true,
						forceObject: true,
						populate: [...populate],
					}) as unknown as AdminMentionWithPostOutputDto,
			),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	/** Relinks, unlinks or ignores a mention; matching never overwrites it afterwards. */
	@TypedRoute.Patch('/mentions/:id')
	async updateMention(
		@TypedParam('id') id: number & tags.Type<'uint32'>,
		@TypedBody() body: AdminUpdateMentionInputDto,
	): Promise<AdminMentionOutputDto> {
		const mention = await this.mentionMatchingService.correct(id, body);
		await this.em.populate(mention, ['feedback', 'feedback.foodTopic', 'feedback.aspect', 'feedback.aspect.parent']);
		return wrap(mention).serialize({
			skipNull: true,
			forceObject: true,
			populate: ['venue', 'brand', 'feedback', 'feedback.foodTopic', 'feedback.aspect', 'feedback.aspect.parent'],
		}) as unknown as AdminMentionOutputDto;
	}
}
