import { tags } from 'typia';

import type { BrandMemberRoleEnum } from 'src/modules/auth/constants/brand-member-role.enum.constant.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type {
	OutreachTouchKindEnum,
	OutreachTouchOutcomeEnum,
	ProspectLanguage,
	ProspectStageEnum,
} from '../constants/outreach.constant.js';

type DateTime = string & tags.Format<'date-time'>;
type Text<N extends number> = string & tags.MaxLength<N>;

type AdminListProspectsSortField =
	'nextFollowUpAt' | 'lastTouchAt' | 'createdAt' | 'name' | 'leadScore';

export interface AdminListProspectsInputDto extends PaginationRequest {
	sort?: `${AdminListProspectsSortField}:${'asc' | 'desc'}`;
	/** Part of the brand's name */
	q?: string;
	stage?: ProspectStageEnum;
	/** Only those whose follow-up is due by the end of today */
	due?: boolean;
	brandId?: string & tags.Format<'uuid'>;
	/** Prospects with a branch in this city */
	cityId?: string & tags.Format<'uuid'>;
}

/** `null` clears a field; a missing one stays as it is. */
export interface AdminProspectDetailsInputDto {
	language?: ProspectLanguage;
	contactName?: Text<200> | null;
	contactEmail?: (string & tags.Format<'email'>) | null;
	/** A handle, `@handle` or a profile URL */
	instagram?: Text<300> | null;
	hook?: Text<2000> | null;
	notes?: Text<10000> | null;
}

export interface AdminListSuggestedProspectsInputDto {
	/** How many to list, best first */
	size?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<100>;
}

export interface AdminAddProspectInputDto extends AdminProspectDetailsInputDto {
	brandId: string & tags.Format<'uuid'>;
}

export interface AdminUpdateProspectInputDto extends AdminProspectDetailsInputDto {
	stage?: ProspectStageEnum;
	nextFollowUpAt?: DateTime | null;
	/** When they said we may e-mail them; `null` takes it back */
	emailConsentAt?: DateTime | null;
}

export interface AdminLogOutreachTouchInputDto {
	kind: OutreachTouchKindEnum;
	/** When it happened; defaults to now */
	at?: DateTime;
	subject?: Text<500>;
	body?: Text<20000>;
	/** The template it started from */
	template?: Text<100>;
	/** The next follow-up: a date, `null` for none, absent for the usual gap */
	followUpAt?: DateTime | null;
	/** VISIT or CALL only: who we got hold of */
	outcome?: OutreachTouchOutcomeEnum;
	/** VISIT or CALL only: when to come back; it becomes the follow-up, over `followUpAt` */
	comeBackAt?: DateTime;
	/** VISIT or CALL only: they said we may e-mail them; sets the prospect's `emailConsentAt` */
	emailConsent?: boolean;
}

export interface AdminInviteToPortalInputDto {
	/** Who to invite; the prospect's contact e-mail when absent */
	email?: string & tags.Format<'email'>;
	/** OWNER when absent */
	role?: BrandMemberRoleEnum;
}
