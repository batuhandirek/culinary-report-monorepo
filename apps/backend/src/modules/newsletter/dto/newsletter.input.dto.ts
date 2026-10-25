import type { tags } from 'typia';

export interface NewsletterSubscribeInputDto {
	email: string & tags.Format<'email'> & tags.MaxLength<254>;
	citySlug: string & tags.MaxLength<60>;
}

export interface NewsletterTokenInputDto {
	token: string & tags.MinLength<10> & tags.MaxLength<64>;
}

export interface AdminNewsletterCountsInputDto {
	cityId: string & tags.Format<'uuid'>;
}
