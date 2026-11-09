import { tags } from 'typia';

export interface AdminBackfillReviewsInputDto {
	cityId: string & tags.Format<'uuid'>;
	/** The first day kept, `YYYY-MM-DD`; the first of the current month without */
	since?: string & tags.Pattern<'^\\d{4}-\\d{2}-\\d{2}$'>;
	/** The venues posts named in this many days; 90 without */
	talkedDays?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<365>;
	/** The run's cap over all its attempts; the city's `BACKFILL_REVIEWS` budget without */
	budgetUsd?: number & tags.Minimum<0> & tags.Maximum<200>;
}

export interface AdminBackfillReviewsOutputDto {
	/** The run on `/admin/workflows` */
	workflowId: string;
}
