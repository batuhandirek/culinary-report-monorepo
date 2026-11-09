import { LlmSpendParamsGroupByEnum as Group } from 'client';

// The Money page (`/admin/money`): its tabs, how the LLM spend can be grouped, and the
// providers' names. The page keeps the tab in `?tab=`, the range in `?from=&to=` and the
// grouping in `?groupBy=`, the defaults (this month, by agent) out of the URL.

export const ADMIN_MONEY_TABS = [
	{ value: 'spend', label: 'LLM spend' },
	{ value: 'calls', label: 'Calls' },
	{ value: 'credits', label: 'Apify credit' }
];

export const SPEND_GROUPS: { value: Group; label: string }[] = [
	{ value: Group.Agent, label: 'Agent' },
	{ value: Group.Model, label: 'Model' },
	{ value: Group.Provider, label: 'Provider' },
	{ value: Group.Day, label: 'Day' },
	{ value: Group.City, label: 'City' },
	{ value: Group.Purpose, label: 'Purpose' },
	{ value: Group.Workflow, label: 'Workflow' }
];

export const DEFAULT_SPEND_GROUP = Group.Agent;

export const PROVIDER_LABELS: Record<string, string> = {
	apify: 'Apify',
	openai: 'OpenAI',
	anthropic: 'Anthropic',
	openrouter: 'OpenRouter',
	typesafe: 'TypeSafe'
};

export const providerLabel = (provider?: string) =>
	provider ? (PROVIDER_LABELS[provider] ?? provider) : '';
