export interface AdminBackfillFeedbackThemesOutputDto {
	/** Reviews whose points were filed this run */
	reviews: number;
	/** Mentions whose points were filed this run */
	mentions: number;
	/** Points given a theme */
	points: number;
	/** Reviews and mentions still holding a point without a theme, in the same scope */
	remaining: { reviews: number; mentions: number };
}
