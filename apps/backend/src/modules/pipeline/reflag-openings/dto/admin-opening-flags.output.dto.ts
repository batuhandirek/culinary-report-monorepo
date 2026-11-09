export interface AdminReflagOpeningsOutputDto {
	/** Posts the agent read this call */
	read: number;
	/** Posts whose call failed (left as they were) */
	failed: number;
	/** Mentions set as a new opening this call */
	flaggedMentions: number;
	/** Posts holding at least one of them */
	flaggedPosts: number;
	/** Mentions that were flagged and the re-read cleared */
	cleared: number;
	/** Stored mentions the agent's answer named no venue for (left as they were) */
	unpaired: number;
	/** Tokens the calls used */
	tokens: number;
	/** The `offset` for the next call */
	nextOffset: number;
	/** Posts of the scope after `nextOffset` */
	remaining: number;
}
