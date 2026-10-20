import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import { CitySourceKindEnum } from '../entities/city-source.entity.js';

/** A source as stored: hashtags without `#`, lowercased; searches trimmed. */
export const normalizeSourceValue = (kind: CitySourceKindEnum, value: string): string => {
	const trimmed = value.trim().replace(/\s+/g, ' ');
	return kind === CitySourceKindEnum.TIKTOK_SEARCH ? trimmed : trimmed.replace(/^#+/, '').toLowerCase();
};

/** The platform and `SocialPost.source` a source's posts carry. */
export const sourcePost = (
	kind: CitySourceKindEnum,
	value: string,
): { platform: SocialPlatformEnum; source: string } => {
	switch (kind) {
		case CitySourceKindEnum.TIKTOK_HASHTAG:
			return { platform: SocialPlatformEnum.TIKTOK, source: `#${value}` };
		case CitySourceKindEnum.TIKTOK_SEARCH:
			return { platform: SocialPlatformEnum.TIKTOK, source: `search:${value}` };
		case CitySourceKindEnum.INSTAGRAM_HASHTAG:
			return { platform: SocialPlatformEnum.INSTAGRAM, source: `#${value}` };
	}
};
