import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { validateEnv } from 'src/shared/util/env.js';

export class DurableWorkflowsConfig {
	/**
	 * Nothing durable runs: DBOS is not launched, decorated methods are plain methods and starting
	 * a workflow fails. For a process that must not pick up the backend's queued workflows (the eval
	 * CLI on the dev database)
	 */
	@IsBoolean()
	@IsOptional()
	@Transform(v => v.value === true || v.value === 'true')
	public DURABLE_WORKFLOWS_DISABLED: boolean = false;

	/**
	 * The application name DBOS files workflows, queues and schedules under. Unset:
	 * `munchwerk-<NODE_ENV>`, so a dev backend on a copy of the production database never resumes
	 * or dequeues production's workflows
	 */
	@IsString()
	@IsOptional()
	public DBOS_APPLICATION_NAME?: string;

	/**
	 * Pinned, so every restart and deploy resumes the pending workflows with the current code; DBOS
	 * only recovers workflows of its own version. Bump it when a workflow's step order changes in a
	 * way the old runs can't follow (they then stay pending until forked or cancelled from the admin).
	 * Stored as `<application name>-<version>`: DBOS wants version names unique across the
	 * applications sharing a system database
	 */
	@IsString()
	@IsOptional()
	public DBOS_APPLICATION_VERSION: string = 'v1';

	/** Where DBOS keeps its tables; unset, the app's own database (`DB_*`), in the `dbos` schema */
	@IsString()
	@IsOptional()
	public DBOS_SYSTEM_DATABASE_URL?: string;

	@IsString()
	@IsOptional()
	public DBOS_SCHEMA: string = 'dbos';

	@IsNumber()
	@Min(1)
	@IsOptional()
	@Transform(v => Number(v.value))
	public DBOS_POOL_SIZE: number = 5;

	/** DBOS's own log level (its launch, recovery and queue messages) */
	@IsString()
	@IsOptional()
	public DBOS_LOG_LEVEL: string = 'warn';
}

const durableWorkflowsConfig = validateEnv(DurableWorkflowsConfig);
export { durableWorkflowsConfig };
