import { Injectable } from '@nestjs/common';

import {
	NOTIFICATION_PREFERENCE_DEFAULT,
	NOTIFICATION_TOPIC_CHANNELS,
	NOTIFICATION_TOPICS,
	NotificationChannel,
	NotificationPreferences,
	NotificationPreferencesPatch,
	NotificationTopic,
} from '../constants/notification-preferences.constant.js';
import { NotificationPreferenceRepository } from '../repositories/notification-preference.repository.js';

/**
 * The topic switches of `/profil/izinler`, and the one place a sender learns whether a
 * message about a user's own activity may leave on a channel. The push, e-mail and SMS
 * services ask it themselves when a sender names a topic; nothing else reads the table.
 */
@Injectable()
export class NotificationPreferenceService {
	constructor(
		private readonly notificationPreferenceRepository: NotificationPreferenceRepository,
	) {}

	/** Whether the user left this topic on for this channel. */
	async isOn(
		userId: string,
		topic: NotificationTopic,
		channel: NotificationChannel,
	): Promise<boolean> {
		const row = await this.notificationPreferenceRepository.findOne({
			user: userId,
			topic,
			channel,
		});
		return row?.enabled ?? NOTIFICATION_PREFERENCE_DEFAULT;
	}

	/** Every switch with its state, set or not. */
	async getAll(userId: string): Promise<NotificationPreferences> {
		const rows = await this.notificationPreferenceRepository.find({ user: userId });
		const all: Record<string, Record<string, boolean>> = {};
		for (const topic of NOTIFICATION_TOPICS) {
			all[topic] = {};
			for (const channel of NOTIFICATION_TOPIC_CHANNELS[topic]) {
				const row = rows.find(r => r.topic === topic && r.channel === channel);
				all[topic][channel] = row?.enabled ?? NOTIFICATION_PREFERENCE_DEFAULT;
			}
		}
		return all as NotificationPreferences;
	}

	/**
	 * Sets the switches the patch names and leaves the rest. Does not flush: the rows go
	 * with the caller's own flush.
	 */
	async update(userId: string, patch: NotificationPreferencesPatch): Promise<void> {
		const rows = await this.notificationPreferenceRepository.find({ user: userId });
		for (const topic of NOTIFICATION_TOPICS) {
			const switches: Record<string, boolean | undefined> = patch[topic] ?? {};
			for (const channel of NOTIFICATION_TOPIC_CHANNELS[topic]) {
				const enabled = switches[channel];
				if (enabled === undefined) continue;
				const row = rows.find(r => r.topic === topic && r.channel === channel);
				if (row) row.enabled = enabled;
				else {
					this.notificationPreferenceRepository.create({
						user: userId,
						topic,
						channel,
						enabled,
					});
				}
			}
		}
	}
}
