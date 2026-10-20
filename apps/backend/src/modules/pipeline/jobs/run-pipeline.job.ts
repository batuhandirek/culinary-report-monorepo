export type RunPipelineJobPayload = { pipelineRunId: string };

export class RunPipelineJob {
	public static readonly jobName = 'run-pipeline';
	constructor(public payload: RunPipelineJobPayload) {}
}
