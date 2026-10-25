/** What the confirm and unsubscribe pages show: the address and the city edition. */
export interface NewsletterSubscriptionOutputDto {
	email: string;
	city: { slug: string; name: string };
	confirmedAt?: Date;
	unsubscribedAt?: Date;
}

export interface AdminNewsletterCountsOutputDto {
	confirmed: number;
	pending: number;
	unsubscribed: number;
}
