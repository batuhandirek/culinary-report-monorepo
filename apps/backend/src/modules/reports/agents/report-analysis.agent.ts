import { Injectable } from '@nestjs/common';

import { MastraModelConfig } from '@mastra/core/llm';
import type { Tool } from '@mastra/core/tools';
import { stepCountIs } from 'ai';
import { z } from 'zod/v4';

import {
	BaseMastraAgent,
	BaseMastraAgentConfig,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import { ANALYSIS_MAX_STEPS, ANALYSIS_MODEL, MAX_TOOL_CALLS } from '../constants/report-analysis.constant.js';

const hypothesisSchema = z.object({
	reason: z
		.string()
		.describe(
			'One possible explanation in at most 30 words, second person, worded as a possibility ("could", "may have", "one possible reason is"), never as a fact',
		),
	confidence: z
		.enum(['likely', 'possible', 'unclear'])
		.describe(
			'likely: the checks and the evidence point the same way and nothing contradicts it; possible: some support, some against, or thin; unclear: the data cannot tell',
		),
	evidenceFor: z
		.array(z.string())
		.describe('Up to three facts from the observation, its checks or a tool answer, each with its numbers and its source'),
	evidenceAgainst: z.array(z.string()).describe('Up to three facts that speak against it, the same way'),
});

const investigationSchema = z.object({
	key: z.string().describe("The observation's key, unchanged"),
	whatHappened: z.string().describe("One sentence with the observation's numbers, months and source"),
	hypotheses: z.array(hypothesisSchema).describe('One to three possible reasons, the most likely first'),
	cannotTell: z.string().nullable().describe('What the data cannot settle, or null'),
	worthChecking: z.array(z.string()).describe('Up to three things only the owner can check, each starting with a verb'),
});

export const reportAnalysisSchema = z.object({
	investigations: z.array(investigationSchema).describe('One per observation given, in the order given'),
	notes: z
		.string()
		.describe(
			'For the admin: how you went about it, what you looked up and why, and what settled each confidence label; at most 200 words',
		),
});

/** The city's name for the prompt, and the run's tools (`ReportEvidenceService.tools`, one `ToolRun` per report). */
export interface ReportAnalysisContext {
	cityName?: string;
	tools: Record<string, Tool>;
}

/**
 * "What moved, and why it might have": given the month's observations with their checks, it
 * writes hypotheses with a confidence word, calling the evidence tools for what the checks left
 * open. Capped at `ANALYSIS_MAX_STEPS` steps; the tools cap their own calls (`ToolRun`). The
 * caller passes an `abortSignal` for the whole run (shared across account failover). Every line
 * is checked after (`checkAnalysis`): numbers only as given, no causal wording.
 */
@Injectable()
export class ReportAnalysisAgent extends BaseMastraAgent<typeof reportAnalysisSchema, ReportAnalysisContext> {
	protected readonly config: BaseMastraAgentConfig<typeof reportAnalysisSchema> = {
		id: 'report-analysis',
		name: 'ReportAnalysisAgent',
		outputSchema: reportAnalysisSchema,
		defaultExecutionOptions: { maxSteps: ANALYSIS_MAX_STEPS, stopWhen: stepCountIs(ANALYSIS_MAX_STEPS) },
	};

	protected getModel(): MastraModelConfig {
		return ANALYSIS_MODEL;
	}

	protected override getTools(context?: ReportAnalysisContext): Record<string, Tool> {
		return context?.tools ?? {};
	}

	protected getInstructions(context?: ReportAnalysisContext): string {
		const city = context?.cityName ? ` in ${context.cityName}` : '';
		return (
			`You investigate what moved in a monthly report for a restaurant, café or bar owner${city}. Code has already found the ` +
			'notable moves (observations) and answered standard questions about each (checks). Your job is to say, for each ' +
			'observation, what might explain it: not what did.\n\n' +
			'How to work. Read every observation and its checks first; most of the facts you need are there. Call a tool only for a ' +
			'question the checks leave open, and say in notes what you looked up and why. You have at most ' +
			`${MAX_TOOL_CALLS} tool calls and ${ANALYSIS_MAX_STEPS} steps for the whole report, so spend them on the observations that ` +
			'matter most (they are given in order of importance). When the budget is spent, write your answer from what you have.\n\n' +
			'Hypotheses. Give one to three possible reasons per observation, most likely first. Each is a possibility, worded as one: ' +
			'"could", "may have", "one possible reason is". Never write "because", "caused", "due to", "led to", "thanks to" or ' +
			'"drove": a line with those words is dropped. Label each with one of three words. likely: the checks and the evidence ' +
			'point the same way and nothing contradicts it. possible: some evidence for, some against, or the evidence is thin. ' +
			'unclear: the data cannot tell either way; say so plainly and use cannotTell for what is missing. Never upgrade to ' +
			'likely without evidence for it and none against it. Put the evidence under evidenceFor and evidenceAgainst as short ' +
			'facts, each with its numbers and its source (TikTok, Instagram, Google reviews, Google Maps, your own account, the ' +
			'booking page, the calendar).\n\n' +
			'Numbers. Only state numbers that appear in the observation, its checks or a tool answer, written as given or rounded ' +
			'the way people say them (591k, 1.2M, 36%). Never compute, estimate or extrapolate a number. Topic and theme counts ' +
			'are given as "7 of 23 written reviews": quote them that way, never as "7 complaints". An absent figure means not ' +
			'tracked, never zero.\n\n' +
			'Time. Each observation and check says its resolution: month, week or day. Never claim a finer timing than the data ' +
			'has: a monthly follower count moved "between the two snapshots", not "on the 14th". A holiday, the weather or an ' +
			'event is context in one clause, never on its own a likely reason.\n\n' +
			"Comparisons. Compare a place's figures with that place's earlier months, never with another place's level; busyness " +
			"is a change in points of the venue's own index. Compare reviews with competitors only on shares and only where both " +
			"have 5+ written reviews. Paid or gifted posts count less than organic ones. The venue's own posts are not word of mouth.\n\n" +
			'Worth checking. Up to three things only the owner can check, each starting with a verb ("Check whether the Saturday ' +
			'staffing changed in September"), tied to a hypothesis.\n\n' +
			'Voice. Second person, sentence case, plain English, no exclamation marks, no emoji. Never write "insights", ' +
			'"analytics", "data-driven", "leverage", "influencer" (say creator), "viral", "must-try", "foodie", "hidden gem". ' +
			'whatHappened is one sentence with the numbers. Refer to months by name, never by a key.\n\n' +
			"Output. One investigation per observation, keyed by the observation's key, in the order given. notes is for the admin " +
			'only: what you checked, what you looked up and why each label is what it is.'
		);
	}
}
