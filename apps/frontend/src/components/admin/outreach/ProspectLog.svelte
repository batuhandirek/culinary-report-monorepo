<script lang="ts">
	import { Plus, Trash2 } from '@lucide/svelte';
	import type {
		AdminLogOutreachTouchInputDtoKindEnum,
		AdminLogOutreachTouchInputDtoOutcomeEnum,
		AdminOutreachTouchOutputDto,
		AdminProspectOutputDto
	} from 'client';

	import { atExact, atShort } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import { findOutreachTemplate } from '#constants/OUTREACH_TEMPLATES.js';
	import { api } from '#lib/api.js';
	import {
		IN_PERSON_KINDS,
		LOGGABLE_KINDS,
		outcomeLabel,
		type OutreachTouchKind,
		TOUCH_KINDS,
		TOUCH_OUTCOMES,
		touchLabel
	} from '#lib/outreach-status.js';
	import Icon from '#ui/components/Icon.svelte';
	import { popConfirmManager } from '#ui/components/pop-confirm/pop-confirm-manager.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { Textarea } from '#ui/primitives-new/textarea/index.js';
	import Badge from '#ui/wrapped/Badge.svelte';
	import Button from '#ui/wrapped/Button.svelte';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import EmptyState from '#ui/wrapped/EmptyState.svelte';
	import IconButton from '#ui/wrapped/IconButton.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// Everything that happened with this prospect, newest first, and a way to add what
	// happened outside the composer: their reply, a call, a visit, a note.
	interface Props {
		prospect: AdminProspectOutputDto;
		onChange: (prospect: AdminProspectOutputDto) => void;
	}

	let { prospect, onChange }: Props = $props();

	const KINDS = LOGGABLE_KINDS.map((kind) => ({ value: kind.value, label: kind.label }));
	const OUTCOMES = TOUCH_OUTCOMES.map((o) => ({ value: o.value, label: o.label }));

	// Date inputs speak `YYYY-MM-DD` in local time
	const today = () => new Date().toLocaleDateString('en-CA');
	const atLocal = (day: string, hour: number) =>
		new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString();

	let kind = $state<string>('REPLY');
	let day = $state(today());
	let text = $state('');
	let checkBackOn = $state('');
	// A visit or a call: who was reached, when to come back, their OK to e-mail
	const inPerson = $derived(IN_PERSON_KINDS.includes(kind as OutreachTouchKind));
	let outcome = $state<string>('');
	let comeBackAt = $state('');
	let emailConsent = $state(false);

	const addAction = createAction(
		() =>
			api.admin.logOutreachTouch(prospect.id, {
				kind: kind as AdminLogOutreachTouchInputDtoKindEnum,
				// Today is now; an earlier day is backdated to its noon
				at: day && day !== today() ? atLocal(day, 12) : undefined,
				body: text.trim() || undefined,
				followUpAt: kind === 'REPLY' && checkBackOn ? atLocal(checkBackOn, 9) : undefined,
				...(inPerson && {
					outcome: (outcome || undefined) as AdminLogOutreachTouchInputDtoOutcomeEnum | undefined,
					comeBackAt: comeBackAt ? new Date(comeBackAt).toISOString() : undefined,
					emailConsent: emailConsent || undefined
				})
			}),
		{
			onSuccess: (updated) => {
				onChange(updated);
				text = '';
				checkBackOn = '';
				day = today();
				outcome = '';
				comeBackAt = '';
				emailConsent = false;
			},
			successNotification: () => ({
				title: 'Added to the log',
				text: LOGGABLE_KINDS.find((k) => k.value === kind)?.label
			})
		}
	);

	const removeAction = createAction(
		(touch: AdminOutreachTouchOutputDto) => api.admin.removeOutreachTouch(prospect.id, touch.id),
		{
			onSuccess: (updated) => onChange(updated),
			successNotification: { title: 'Entry deleted' }
		}
	);
	const confirmRemove = (touch: AdminOutreachTouchOutputDto) =>
		popConfirmManager.show({
			title: 'Delete this entry?',
			description: `“${touchLabel(touch)}” goes from the log and the counts. The stage stays as it is.`,
			confirmText: 'Delete',
			destructive: true,
			onConfirm: () => removeAction.execute(touch)
		});

	// Long messages fold to a few lines until opened
	let open = $state<Record<string, boolean>>({});
	const isLong = (body: string) => body.length > 280 || body.split('\n').length > 4;
</script>

<AdminPanel title="Log" note={prospect.touches.length}>
	<div class="flex flex-col gap-4">
		<div class="bg-wash/60 flex flex-col gap-2 rounded-md p-3">
			<div class="flex flex-wrap items-center gap-2">
				<Select items={KINDS} bind:value={kind} aria-label="What happened" width={170} />
				<div class="w-44">
					<Input type="date" bind:value={day} max={today()} aria-label="When" />
				</div>
				{#if kind === 'REPLY'}
					<label class="text-muted-foreground flex items-center gap-2 text-xs whitespace-nowrap">
						Check back on
						<span class="w-44"><Input type="date" bind:value={checkBackOn} min={today()} /></span>
					</label>
				{/if}
			</div>
			{#if inPerson}
				<div class="flex flex-wrap items-center gap-3">
					<Select
						items={OUTCOMES}
						value={outcome}
						onValueChange={(v) => (outcome = v)}
						placeholder="Who did you reach?"
						aria-label="Outcome"
						width={200} />
					<label class="text-muted-foreground flex items-center gap-2 text-xs whitespace-nowrap">
						Come back on
						<span class="w-52">
							<Input type="datetime-local" bind:value={comeBackAt} aria-label="Come back on" />
						</span>
					</label>
				</div>
				<Checkbox bind:checked={emailConsent}>They said I may e-mail them</Checkbox>
			{/if}
			<Textarea
				bind:value={text}
				rows={2}
				placeholder={kind === 'REPLY'
					? 'What they said: paste their answer or sum it up'
					: kind === 'NOTE'
						? 'The owner is in on Tuesdays…'
						: 'What happened'} />
			<div class="flex items-center justify-between gap-3">
				<span class="text-muted-foreground text-xs">
					{#if kind === 'REPLY'}
						Moves them to Replied and stops the follow-ups, unless you set a date to check
						back.
					{:else if kind === 'NOTE'}
						Notes change nothing else.
					{:else if inPerson}
						Counts as a try. A come-back time becomes the follow-up; otherwise the usual gap
						applies while they haven't answered. Their OK is kept on the prospect.
					{:else}
						Counts as a try; while they haven't answered, it sets the next follow-up.
					{/if}
				</span>
				<Button
					size="sm"
					variant="outline"
					icon={Plus}
					loading={addAction.executing}
					onclick={() => addAction.execute()}>
					Add
				</Button>
			</div>
		</div>

		{#if prospect.touches.length === 0}
			<EmptyState
				title="Nothing yet"
				hint="Sent messages, their answers and your notes show up here."
				ground="none"
				size="sm" />
		{:else}
			<ul class="divide-line m-0 flex list-none flex-col divide-y p-0">
				{#each prospect.touches as touch (touch.id)}
					{@const meta = TOUCH_KINDS[touch.kind as OutreachTouchKind]}
					<li class="flex items-start gap-3 py-3">
						<span
							class={[
								'flex size-8 shrink-0 items-center justify-center rounded-full',
								touch.kind === 'REPLY' ? 'bg-tint text-ink' : 'bg-wash text-muted-foreground'
							]}>
							<Icon icon={meta.icon} size={16} />
						</span>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
								<span class="font-medium">{touchLabel(touch)}</span>
								<span class="text-muted-foreground text-xs" title={atExact(touch.at)}>
									{atShort(touch.at)}
								</span>
								{#if touch.template}
									<Badge pill variant="quiet">
										{findOutreachTemplate(touch.template)?.name ?? touch.template}
									</Badge>
								{/if}
								{#if touch.outcome}
									<Badge pill variant="quiet">{outcomeLabel(touch.outcome)}</Badge>
								{/if}
								{#if touch.emailConsent}
									<Badge pill variant="success">OK to e-mail</Badge>
								{/if}
							</div>
							{#if touch.comeBackAt}
								<p class="text-muted-foreground m-0 text-xs">Come back {atShort(touch.comeBackAt)}</p>
							{/if}
							{#if touch.subject}
								<p class="m-0 text-sm font-medium">{touch.subject}</p>
							{/if}
							{#if touch.body}
								<p
									class={[
										'text-muted-foreground m-0 text-sm whitespace-pre-wrap',
										!open[touch.id] && 'line-clamp-4'
									]}>
									{touch.body}
								</p>
								{#if isLong(touch.body)}
									<button
										type="button"
										class="text-beet self-start text-xs hover:underline"
										onclick={() => (open[touch.id] = !open[touch.id])}>
										{open[touch.id] ? 'Show less' : 'Show all'}
									</button>
								{/if}
							{/if}
						</div>
						<IconButton
							icon={Trash2}
							label="Delete entry"
							variant="ghost"
							onclick={() => confirmRemove(touch)} />
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</AdminPanel>
