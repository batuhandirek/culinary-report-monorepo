import { tags } from 'typia';

export interface AdminBackfillFeedbackThemesInputDto {
	/** Only the reviews of this city's venues and the mentions of its posts */
	cityId?: string & tags.Format<'uuid'>;
	/** At most this many reviews and this many mentions a run; 500 by default */
	limit?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<5000>;
}
