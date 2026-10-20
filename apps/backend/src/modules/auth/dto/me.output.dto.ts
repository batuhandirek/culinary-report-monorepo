import { ImageOutputDto } from 'src/modules/image/dto/image.output.dto.js';
import { NotificationPreferences } from 'src/modules/notification-preferences/constants/notification-preferences.constant.js';

import { UserRoleEnum } from '../constants/user-role.enum.constant.js';

import { BrandMembershipOutputDto } from './brand-membership.output.dto.js';

export interface GetMeOutputDto {
	id: string;
	firstName: string;
	lastName: string;
	publicName?: string;
	/** Their public bio; absent when they wrote none. */
	description?: string;

	email?: string;
	emailVerifiedAt?: Date;

	mobileNumber?: string;
	mobileNumberVerifiedAt?: Date;

	passwordLastChangedAt?: Date;



	isMarkedForDeletion?: boolean;
	markedForDeletionAt?: Date;

	acceptedMarketing?: boolean;
	acceptedCallCommunications?: boolean;
	acceptedEmailCommunications?: boolean;
	acceptedSmsCommunications?: boolean;

	/** Every notification switch with its state. Always complete. */
	notificationPreferences: NotificationPreferences;

	roles: UserRoleEnum[];
	profileImage?: ImageOutputDto;

	/** The brands whose portal they may open, by name. Admins open any brand's without one. */
	brandMemberships: BrandMembershipOutputDto[];
}
