export class Cache<T> {
	private duration: number;
	private data?: T;
	private setAt?: number;

	constructor(duration: number) {
		this.duration = duration;
	}

	setData(data: T) {
		this.data = data;
		this.setAt = Date.now();
	}

	getData(): T | undefined {
		if (!this.setAt || Date.now() > this.setAt + this.duration) {
			this.clearData();
			return undefined;
		}

		return this.data;
	}

	clearData() {
		this.data = undefined;
		this.setAt = undefined;
	}
}
