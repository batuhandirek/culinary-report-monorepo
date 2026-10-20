import { tags } from 'typia';

import type { VenueStatusSummary } from '../services/venue-status-change.service.js';

export interface AdminGetVenueStatusChangesInputDto {
	/** The last month of the three-month window */
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminVenueStatusChangesOutputDto extends VenueStatusSummary {}
