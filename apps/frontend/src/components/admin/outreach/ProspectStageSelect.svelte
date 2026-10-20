<script lang="ts">
	import type { AdminProspectOutputDto, AdminUpdateProspectInputDtoStageEnum } from 'client';

	import { api } from '#lib/api.js';
	import { PROSPECT_STAGES, stageLabel } from '#lib/outreach-status.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import Select from '#ui/wrapped/Select.svelte';

	// Moving a prospect by hand. The backend logs the move as a stage entry.
	interface Props {
		prospect: AdminProspectOutputDto;
		onChange: (prospect: AdminProspectOutputDto) => void;
	}

	let { prospect, onChange }: Props = $props();

	const STAGES = PROSPECT_STAGES.map((stage) => ({ value: stage.value, label: stage.label }));

	const stageAction = createAction(
		(stage: string) =>
			api.admin.updateProspect(prospect.id, {
				stage: stage as AdminUpdateProspectInputDtoStageEnum
			}),
		{
			onSuccess: (updated) => onChange(updated),
			// The select already shows the picked stage: a copy puts the old one back
			onError: () => onChange({ ...prospect }),
			successNotification: (_, [stage]) => ({
				title: `Moved to ${stageLabel(stage)}`,
				text: prospect.brand.name
			})
		}
	);
</script>

<Select
	items={STAGES}
	value={prospect.stage}
	onValueChange={(stage) => stage !== prospect.stage && stageAction.execute(stage)}
	aria-label="Stage"
	size="sm"
	width={160} />
