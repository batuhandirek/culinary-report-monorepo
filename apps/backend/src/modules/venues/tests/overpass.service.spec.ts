import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { OverpassService } from '../services/overpass.service.js';
import type { OverpassElement } from '../util/osm-places.js';

const answer = (body: unknown, status = 200): Response =>
	({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
		text: async () => JSON.stringify(body),
	}) as Response;

const cafe: OverpassElement = {
	type: 'node',
	id: 1,
	lat: 52.5,
	lon: 13.3,
	tags: { amenity: 'cafe', name: 'Kaffee' },
};

describe('OverpassService', () => {
	const service = new OverpassService();
	const originalFetch = globalThis.fetch;
	let fetchMock: jest.Mock<(url: string) => Promise<Response>>;
	const hosts = () => fetchMock.mock.calls.map(([url]) => new URL(url).host);

	beforeEach(() => {
		fetchMock = jest.fn<(url: string) => Promise<Response>>();
		globalThis.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it('asks the next instance when one lists nothing', async () => {
		fetchMock
			.mockResolvedValueOnce(answer({ elements: [] }))
			.mockResolvedValueOnce(answer({ elements: [cafe] }));
		await expect(service.foodPlaces(62422, 1)).resolves.toEqual([cafe]);
		expect(hosts()).toEqual(['overpass-api.de', 'overpass.private.coffee']);
	});

	it('throws once every attempt listed nothing, never an empty list', async () => {
		fetchMock.mockResolvedValue(answer({ elements: [] }));
		await expect(service.foodPlaces(62422, 1)).rejects.toThrow('listed nothing');
		expect(fetchMock).toHaveBeenCalledTimes(5);
	});

	it('retries a busy instance and an answer cut short', async () => {
		fetchMock
			.mockResolvedValueOnce(answer('busy', 504))
			.mockResolvedValueOnce(answer({ elements: [cafe], remark: 'runtime error: timed out' }))
			.mockResolvedValueOnce(answer({ elements: [cafe] }));
		await expect(service.foodPlaces(62422, 1)).resolves.toEqual([cafe]);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('does not retry an answer Overpass refused', async () => {
		fetchMock.mockResolvedValue(answer('parse error', 400));
		await expect(service.foodPlaces(62422, 1)).rejects.toThrow('Overpass answered 400');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
