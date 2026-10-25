import type { FilterQuery } from '@mikro-orm/core';
import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { monthRange } from 'src/modules/venues/util/month.js';

import { Mention } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';

export interface BrandPostFilters {
	/** `YYYY-MM` */
	month?: string;
	platform?: SocialPlatformEnum;
}

/** A post about the brand and what it said about it (its mention of the brand). */
export interface BrandPost {
	post: SocialPost;
	mention: Mention;
	/** Posted by one of the brand's own accounts (`SocialAccount.brand`): not word of mouth */
	own: boolean;
	/** Marked as an ad by the platform, or paid / gifted as the caption reads */
	paid: boolean;
}

/** One author's posts about the brand. */
export interface BrandCreator {
	author: string;
	platform: SocialPlatformEnum;
	authorFans?: number;
	posts: number;
	views: number;
	paid: number;
	own: boolean;
	lastPostedAt: Date;
	/** Their most viewed post */
	url: string;
}

/** Every post about one brand (any branch, or the brand alone), for its portal: the list behind the report's top six. */
@Injectable()
export class BrandPostsService {
	constructor(private readonly em: EntityManager) {}

	/** One page of the posts that mention the brand, newest first. */
	async list(
		brandId: string,
		filters: BrandPostFilters,
		page: number,
		size: number,
	): Promise<{ items: BrandPost[]; total: number }> {
		const [posts, total] = await this.em.findAndCount(SocialPost, this.where(brandId, filters), {
			populate: ['account'],
			orderBy: { postedAt: QueryOrder.DESC, id: QueryOrder.ASC },
			offset: (page - 1) * size,
			limit: size,
		});
		const mentions = posts.length
			? await this.em.find(
					Mention,
					{ post: { $in: posts.map(p => p.id) }, brand: brandId },
					{ orderBy: { id: QueryOrder.ASC }, populate: ['feedback', 'feedback.foodTopic'] },
				)
			: [];
		const byPost = new Map<string, Mention>();
		for (const mention of mentions) {
			if (!byPost.has(mention.post.id)) byPost.set(mention.post.id, mention);
		}
		return {
			items: posts.map(post => ({
				post,
				mention: byPost.get(post.id)!,
				own: post.account?.brand?.id === brandId,
				paid: post.isAd || post.isPromotional === true,
			})),
			total,
		};
	}

	/** The accounts that posted about the brand, most viewed first. */
	async creators(brandId: string, filters: BrandPostFilters): Promise<BrandCreator[]> {
		const posts = await this.em.find(SocialPost, this.where(brandId, filters), {
			fields: ['author', 'authorFans', 'platform', 'views', 'isAd', 'isPromotional', 'postedAt', 'url', 'account.brand'],
		});
		const groups = _.groupBy(
			posts.filter(p => p.author),
			p => `${p.platform} ${p.author!.toLowerCase()}`,
		);
		const creators = Object.values(groups).map(group => {
			const top = _.maxBy(group, p => p.views)!;
			const fans = _.max(group.map(p => p.authorFans ?? undefined).filter(n => n != null));
			return {
				author: top.author!,
				platform: top.platform,
				...(fans != null && { authorFans: fans }),
				posts: group.length,
				views: _.sumBy(group, p => p.views),
				paid: group.filter(p => p.isAd || p.isPromotional === true).length,
				own: top.account?.brand?.id === brandId,
				lastPostedAt: _.maxBy(group, p => p.postedAt.getTime())!.postedAt,
				url: top.url,
			};
		});
		return _.orderBy(creators, ['views', 'posts'], ['desc', 'desc']);
	}

	/** The months with a post about the brand, newest first, with how many. */
	async months(brandId: string): Promise<{ month: string; count: number }[]> {
		return this.em.getConnection().execute(
			`select to_char(p.posted_at at time zone 'UTC', 'YYYY-MM') as month, count(distinct p.id)::int as count
			from social_posts p join mentions m on m.post_id = p.id
			where m.brand_id = ? group by 1 order by 1 desc`,
			[brandId],
		);
	}

	private where(brandId: string, filters: BrandPostFilters): FilterQuery<SocialPost> {
		const where: FilterQuery<SocialPost> = { mentions: { brand: brandId } };
		if (filters.platform) where.platform = filters.platform;
		if (filters.month) {
			const { start, end } = monthRange(filters.month);
			where.postedAt = { $gte: start, $lt: end };
		}
		return where;
	}
}
