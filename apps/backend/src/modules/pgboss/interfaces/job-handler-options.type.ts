import { QueueOptions, QueuePolicy, WorkOptions } from 'pg-boss';

/** A queue's settings: pg-boss's, and its policy (`stately`: one job waits and one runs, per `singletonKey`). */
export type QueueSettings = QueueOptions & { policy?: QueuePolicy };

export type JobHandlerOptions = Omit<WorkOptions, 'batchSize'> & QueueSettings;

export type BatchJobHandlerOptions = WorkOptions & QueueSettings & { batchSize: number };

export type CronHandlerOptions = JobHandlerOptions & { tz?: string };
