// The notification switches on the profile page: per topic, the channels a message about
// it goes out on. A channel is listed only where something is actually sent on it, so every
// switch the API exposes does something. Adding one is an entry here; no stored row changes.
export const NOTIFICATION_TOPIC_CHANNELS = {
	// The monthly report and anything else produced for the user's venues
	reports: ['email'],
	// Time-sensitive signals, e.g. a sudden wave of negative reviews
	alerts: ['email', 'sms'],
} as const;

export type NotificationTopic = keyof typeof NOTIFICATION_TOPIC_CHANNELS;
export type NotificationChannelOf<T extends NotificationTopic> =
	(typeof NOTIFICATION_TOPIC_CHANNELS)[T][number];
export type NotificationChannel = NotificationChannelOf<NotificationTopic>;

export const NOTIFICATION_TOPICS = Object.keys(NOTIFICATION_TOPIC_CHANNELS) as NotificationTopic[];

/** Every switch with its state: what `GET /auth/me` returns. */
export type NotificationPreferences = {
	[T in NotificationTopic]: { [C in NotificationChannelOf<T>]: boolean };
};

/** Any subset of the switches: what `PATCH /auth/me` takes. */
export type NotificationPreferencesPatch = {
	[T in NotificationTopic]?: { [C in NotificationChannelOf<T>]?: boolean };
};

// A switch the user never touched has no row, and is on.
export const NOTIFICATION_PREFERENCE_DEFAULT = true;

/** What a sender names so its message answers to a switch: whose, and which topic. */
export interface NotificationPreferenceTarget {
	userId: string;
	topic: NotificationTopic;
}
