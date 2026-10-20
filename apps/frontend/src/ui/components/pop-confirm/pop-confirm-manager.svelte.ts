import type { PopConfirmProps } from '#ui/wrapped/PopConfirm.svelte';

class PopConfirmManager {
	public showingProps = $state<null | PopConfirmProps>(null);
	private onConfirm = $state<null | PopConfirmProps['onConfirm']>(null);
	private onCancel = $state<null | PopConfirmProps['onCancel']>(null);
	constructor() {}
	show = (props: PopConfirmProps) => {
		const { onConfirm, onCancel, ...rest } = props;
		this.onConfirm = onConfirm;
		this.onCancel = onCancel;
		this.showingProps = {
			...rest,
			onConfirm: this.confirmed,
			onCancel: this.cancelled
		};
	};

	confirmed = () => {
		if (this.onConfirm) {
			this.onConfirm();
		}
		this.showingProps = null;
		this.onConfirm = null;
		this.onCancel = null;
	};

	cancelled = () => {
		if (this.onCancel) {
			this.onCancel();
		}
		this.showingProps = null;
		this.onConfirm = null;
		this.onCancel = null;
	};
}

export const popConfirmManager = new PopConfirmManager();
