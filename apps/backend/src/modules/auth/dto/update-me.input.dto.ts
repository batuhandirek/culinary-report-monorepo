import { tags } from 'typia';

import { NotificationPreferencesPatch } from 'src/modules/notification-preferences/constants/notification-preferences.constant.js';

export interface UpdateMeInputDto {
	firstName?: string;

	lastName?: string;

	/**
	 * A short public bio, plain text. Stored trimmed; an empty string clears it. Refused
	 * with 422 `CONTACT_INFO_NOT_ALLOWED` when it carries a phone number, e-mail address
	 * or social handle.
	 */
	description?: string & tags.MaxLength<2000>;

	/** A new photo as a data URL. The current photo's own URL is accepted and changes nothing. */
	profileImage?: string;

	isMarkedForDeletion?: boolean; // only false

	acceptedMarketing?: boolean;
	acceptedCallCommunications?: boolean;
	acceptedEmailCommunications?: boolean;
	acceptedSmsCommunications?: boolean;

	/** Only the switches named change; the rest keep their stored value. */
	notificationPreferences?: NotificationPreferencesPatch;
}
