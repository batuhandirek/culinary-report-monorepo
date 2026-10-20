import { Injectable } from '@nestjs/common';

@Injectable()
export class SubscriberRegistry {
	private readonly registry = new Map<string, string[]>();

	register(eventName: string, queueName: string): void {
		const existing = this.registry.get(eventName) ?? [];
		existing.push(queueName);
		this.registry.set(eventName, existing);
	}

	getSubscribers(eventName: string): string[] {
		return this.registry.get(eventName) ?? [];
	}
}
