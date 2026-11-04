import type { LlmModelChoice } from 'src/modules/llm/constants/llm-models.constant.js';

/**
 * Claude first, `gpt-5.4` behind it (`modelsFor`: the rest of Sonnet's tier): the user's call,
 * 2026-11-03, for free questions over the data. Paid outside `llmPaid` through the agent's
 * `paidFallback`: each answer is a question an admin asked by hand, and its cost is stored on it.
 * `LLM_AGENT_MODELS=analyst:anthropic/claude-opus-5-5` puts it on Opus.
 */
export const ANALYST_MODEL: LlmModelChoice = 'anthropic/claude-sonnet-5-5';

/** Model steps per answer (each a round of tool calls), and the queries among them */
export const ANALYST_MAX_STEPS = 30;
export const ANALYST_MAX_QUERIES = 24;
/** Lookups (`schema`, `find`) are cheap but still capped, so a confused run ends */
export const ANALYST_MAX_LOOKUPS = 24;

/** The whole answer, every model step and query together */
export const ANALYST_TIMEOUT_MS = 10 * 60_000;
/** One query; Postgres cancels it past this */
export const ANALYST_STATEMENT_TIMEOUT_MS = 20_000;

/**
 * The Postgres role the model's queries run as (`AnalystReaderService`): `SELECT` on the readable
 * tables and nothing else, so no query can change anything whatever the checks before it miss
 */
export const ANALYST_READER_ROLE = 'analyst_reader';

/** Rows the model reads of a result, and the characters of one cell */
export const ANALYST_MODEL_ROWS = 100;
export const ANALYST_MODEL_CELL_CHARS = 300;
/** Rows a query part keeps for the page (a shown result's table and chart) */
export const ANALYST_STORED_ROWS = 500;
export const ANALYST_STORED_CELL_CHARS = 500;
/** Rows Postgres is asked for at most: one more than stored tells a cut */
export const ANALYST_FETCH_ROWS = ANALYST_STORED_ROWS + 1;

/** Earlier messages of the thread the model is given with a new question */
export const ANALYST_HISTORY_MESSAGES = 16;

/** A question's length, and how many questions an admin may have waiting at once */
export const ANALYST_QUESTION_MAX_CHARS = 4_000;

/**
 * Tables a query may not read: people's accounts, sessions, codes and e-mail addresses (rows go to
 * the model's provider), the cache of 3072-wide vectors, and the queue's schema. Admin pages show
 * the people tables; the analyst never needs them for a question about the city's food.
 */
export const ANALYST_DENIED_TABLES = [
	'users',
	'user_sessions',
	'credential_verification_requests',
	'user_notification_preferences',
	'newsletter_subscribers',
	'brand_members',
	'notifications',
	'embeddings',
	'migrations',
	'analyst_threads',
	'analyst_messages',
	'analyst_message_parts',
] as const;

/** Schemas a query may not name (pg-boss's queue) */
export const ANALYST_DENIED_SCHEMAS = ['pgboss'] as const;

/**
 * Functions that read the server's files, reach other servers, sleep or touch other sessions: a
 * read-only transaction still runs them
 */
export const ANALYST_DENIED_FUNCTIONS = [
	'pg_read_file',
	'pg_read_binary_file',
	'pg_ls_dir',
	'pg_stat_file',
	'pg_ls_logdir',
	'pg_ls_waldir',
	'pg_ls_tmpdir',
	'pg_sleep',
	'pg_sleep_for',
	'pg_sleep_until',
	'pg_terminate_backend',
	'pg_cancel_backend',
	'pg_reload_conf',
	'pg_rotate_logfile',
	'set_config',
	'dblink',
	'dblink_exec',
	'dblink_connect',
	'lo_import',
	'lo_export',
	'lo_get',
	'lo_open',
	'query_to_xml',
	'pg_advisory_lock',
	'pg_advisory_xact_lock',
	'txid_current',
	'nextval',
	'setval',
] as const;
