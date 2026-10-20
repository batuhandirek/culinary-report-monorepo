import type { ExceptionCodes } from 'exceptions';

import {
	DEFAULT_BAD_REQUEST_ERROR_NOTIFICATION,
	DEFAULT_INTERNAL_SERVER_ERROR_NOTIFICATION,
	DEFAULT_NOT_FOUND_ERROR_NOTIFICATION,
	EXCEPTION_MAPPING
} from '#constants/EXCEPTION_MAPPING.js';
import { FormError } from '#ui/components/form/index.js';
import type { OptionalIdNotification } from '#ui/lib/notification-manager.js';
import { notificationManager } from '#ui/lib/notification-manager.js';

export interface ActionOptions<Result, Args extends unknown[]> {
	onSuccess?: (result: Result, args: Args) => void;
	onError?: (error: Error) => void;
	onFinally?: () => void;
	preventDuplicates?: boolean;
	successNotification?:
		OptionalIdNotification | ((result: Result, args: Args) => OptionalIdNotification);
}

function getExceptionCode(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;

	return typeof error.code === 'string' ? error.code : undefined;
}

export class Action<Args extends unknown[], Result> {
	public executing = $state(false);
	public error = $state<Error | null>(null);
	public result = $state<Result | null>(null);
	public succeeded = $derived(this.result !== null && this.error === null);

	constructor(
		private api: (...args: Args) => Promise<Result>,
		private options?: ActionOptions<Result, Args>
	) {}

	public execute = async (...args: Args): Promise<Result | null> => {
		if (this.executing && this.options?.preventDuplicates !== false) {
			return null;
		}

		this.executing = true;
		this.error = null;

		try {
			const res = await this.api(...args);
			this.result = res;

			// Show success notification if provided
			if (this.options?.successNotification) {
				const notification =
					typeof this.options.successNotification === 'function'
						? this.options.successNotification(res, args)
						: this.options.successNotification;

				notificationManager.addNotification({
					...notification,
					success: true
				});
			}

			this.options?.onSuccess?.(res, args);
			return res;
		} catch (e: unknown) {
			const exceptionCode = getExceptionCode(e);
			const mappedNotification = exceptionCode
				? EXCEPTION_MAPPING[exceptionCode as ExceptionCodes]
				: undefined;

			// Handle error notifications
			if (e instanceof FormError) {
				notificationManager.addNotification({
					title: 'Form hatalı',
					text: 'Kırmızı alanları düzeltip tekrar dene.',
					warning: true
				});
			} else if (mappedNotification) {
				notificationManager.addNotification(mappedNotification);
			} else if (exceptionCode === 'bad-request-exception') {
				notificationManager.addNotification({
					...DEFAULT_BAD_REQUEST_ERROR_NOTIFICATION,
					text: DEFAULT_BAD_REQUEST_ERROR_NOTIFICATION.text
				});
			} else if (exceptionCode === 'not-found-exception') {
				notificationManager.addNotification({
					...DEFAULT_NOT_FOUND_ERROR_NOTIFICATION,
					text: DEFAULT_NOT_FOUND_ERROR_NOTIFICATION.text
				});
			} else {
				notificationManager.addNotification({
					...DEFAULT_INTERNAL_SERVER_ERROR_NOTIFICATION,
					text: DEFAULT_INTERNAL_SERVER_ERROR_NOTIFICATION.text
				});
			}

			this.error = e instanceof Error ? e : new Error(String(e));
			this.result = null;
			this.options?.onError?.(this.error);
			return null;
		} finally {
			this.executing = false;
			this.options?.onFinally?.();
		}
	};

	public reset = () => {
		this.executing = false;
		this.error = null;
		this.result = null;
	};
}

export function createAction<Args extends unknown[], Result>(
	api: (...args: Args) => Promise<Result>,
	options?: ActionOptions<Result, Args>
): Action<Args, Result> {
	return new Action(api, options);
}
