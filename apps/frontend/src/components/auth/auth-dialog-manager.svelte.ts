import type { AuthDialogProps } from './AuthDialog.svelte';

class AuthDialogManager {
	public showingProps = $state<null | AuthDialogProps>(null);
	private onSuccess = $state<null | AuthDialogProps['onSuccess']>(null);
	private onCancel = $state<null | AuthDialogProps['onCancel']>(null);
	constructor() {}
	show = (props: AuthDialogProps) => {
		const { onSuccess, onCancel, ...rest } = props;
		this.onSuccess = onSuccess;
		this.onCancel = onCancel;
		this.showingProps = {
			...rest,
			onSuccess: this.confirmed,
			onCancel: this.cancelled
		};
	};

	confirmed = () => {
		if (this.onSuccess) {
			this.onSuccess();
		}
		this.showingProps = null;
		this.onSuccess = null;
		this.onCancel = null;
	};

	cancelled = () => {
		if (this.onCancel) {
			this.onCancel();
		}
		this.showingProps = null;
		this.onSuccess = null;
		this.onCancel = null;
	};
}

export const authDialogManager = new AuthDialogManager();
