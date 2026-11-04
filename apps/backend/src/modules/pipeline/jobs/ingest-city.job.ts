export type IngestCityJobPayload = {
	cityId: string;
};

/**
 * A reading pass over a city (`IngestionService`): queued after every scrape run that stored
 * sources and hourly by `IngestionCron`, one waiting per city (the queue is `stately`).
 */
export class IngestCityJob {
	public static readonly jobName = 'pipeline-ingest';
	constructor(public payload: IngestCityJobPayload) {}
}
