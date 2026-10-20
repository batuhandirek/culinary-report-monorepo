import { PromotionalChannel } from '../constants/promotional-channel.constant.js';
import type { User } from '../entities/user.entity.js';

const CHANNEL_CONSENT = {
	email: 'acceptedEmailCommunications',
	sms: 'acceptedSmsCommunications',
	call: 'acceptedCallCommunications',
} as const;

/**
 * Whether a promotional message (campaign, announcement) may reach the user on this
 * channel: the marketing consent, and the channel's own where it has one. Every
 * promotional sender checks this (in bulk: `UserService.filterPromotionalRecipients`).
 * A message about the user's own activity asks `NotificationPreferenceService` instead.
 */
export const acceptsPromotional = (
	user: Pick<User, 'acceptedMarketing' | (typeof CHANNEL_CONSENT)[keyof typeof CHANNEL_CONSENT]>,
	channel: PromotionalChannel,
): boolean => !!user.acceptedMarketing && !!user[CHANNEL_CONSENT[channel]];
