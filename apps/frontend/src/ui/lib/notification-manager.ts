import { toast } from 'svelte-sonner';

export interface Notification {
	id: string;
	title: string;
	noTimeout?: boolean;
	time?: number;
	success?: boolean;
	warning?: boolean;
	error?: boolean;
	info?: boolean;
	text?: string;
	href?: string;
	// A button on the toast, e.g. the undo of what it reports.
	action?: { label: string; onClick: () => void };
}

export interface OptionalIdNotification extends Omit<Notification, 'id'> {
	id?: string;
}

class NotificationManager {
	addNotification(notif: OptionalIdNotification) {
		let method: 'message' | 'info' | 'success' | 'warning' | 'error' = 'message';
		if (notif.info) method = 'info';
		if (notif.success) method = 'success';
		if (notif.warning) method = 'warning';
		if (notif.error) method = 'error';
		toast[method](notif.title, {
			description: notif.text,
			duration: notif.time ?? 5000,
			action: notif.action
		});
	}
}

export const notificationManager = new NotificationManager();
