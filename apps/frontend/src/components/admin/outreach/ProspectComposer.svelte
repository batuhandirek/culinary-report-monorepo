<script lang="ts">
	import { AtSign, Check, Copy, Download, Mail, MapPin, Phone, Printer, Search } from '@lucide/svelte';
	import type {
		AdminLogOutreachTouchInputDtoKindEnum,
		AdminLogOutreachTouchInputDtoOutcomeEnum,
		AdminProspectOutputDto,
		AdminUpdateProspectInputDtoLanguageEnum
	} from 'client';

	import { untrack } from 'svelte';

	import { downloadLeaveBehindPdf, downloadReportPdf } from './report-pdf.js';

	import { onDay } from '#components/admin/admin-format.js';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import {
		findOutreachTemplate,
		OUTREACH_TEMPLATES,
		type OutreachLanguage
	} from '#constants/OUTREACH_TEMPLATES.js';
	import { api } from '#lib/api.js';
	import { needsEmailConsent, TOUCH_OUTCOMES } from '#lib/outreach-status.js';
	import {
		draftFrom,
		gmailComposeUrl,
		gmailThreadUrl,
		instagramUrl,
		mailtoUrl,
		outreachVars,
		suggestedTemplateKey
	} from '#lib/outreach-template.js';
	import { userStore } from '#stores/UserStore.svelte.js';
	import { createAction } from '#ui/lib/action.svelte.js';
	import { notificationManager } from '#ui/lib/notification-manager.js';
	import { Textarea } from '#ui/primitives-new/textarea/index.js';
	import Button from '#ui/wrapped/Button.svelte';
	import Checkbox from '#ui/wrapped/Checkbox.svelte';
	import Input from '#ui/wrapped/Input.svelte';
	import Notice from '#ui/wrapped/Notice.svelte';
	import Select from '#ui/wrapped/Select.svelte';

	// Writes the next message from a template, hands it to Gmail (or the phone), and logs it.
	// Nothing is sent from here: the message goes out from your own mailbox. A call or a visit
	// is a script: what happened is logged with it (who you spoke to, when to come back, their OK
	// to e-mail).
	interface Props {
		prospect: AdminProspectOutputDto;
		onChange: (prospect: AdminProspectOutputDto) => void;
	}

	let { prospect, onChange }: Props = $props();

	const TEMPLATES = OUTREACH_TEMPLATES.map((t) => ({ value: t.key, label: t.name }));
	const LANGUAGES: { value: OutreachLanguage; label: string }[] = [
		{ value: 'en', label: 'English' },
		{ value: 'de', label: 'Deutsch' }
	];
	const LOG_LABEL = {
		EMAIL: 'Log as sent',
		DM: 'Log DM as sent',
		CALL: 'Log the call',
		VISIT: 'Log the visit'
	};
	const OUTCOMES = TOUCH_OUTCOMES.map((o) => ({ value: o.value, label: o.label }));
	// What to do about a variable the template could not fill
	const MISSING: Record<string, string> = {
		hook: 'the “lead with” line (Edit, in the panel on the right)',
		sender: 'your name (“Sign as”, below)',
		headline: 'a report (build one on the venue page)',
		month: 'a report (build one on the venue page)',
		creators: 'creator numbers from a report',
		views: 'view numbers from a report'
	};

	// The name you sign with, remembered in this browser
	const SENDER_KEY = 'outreach.sender';
	const readSender = () => {
		try {
			return localStorage.getItem(SENDER_KEY) ?? '';
		} catch {
			return '';
		}
	};
	let sender = $state(readSender() || (userStore.user?.firstName ?? ''));
	$effect(() => {
		try {
			localStorage.setItem(SENDER_KEY, sender);
		} catch {
			// Private windows: it is only a default
		}
	});

	// Where the conversation stands when the page opens; the composer is remade per prospect
	let templateKey = $state(untrack(() => suggestedTemplateKey(prospect)));
	const template = $derived(findOutreachTemplate(templateKey) ?? OUTREACH_TEMPLATES[0]);
	let language = $derived(prospect.language as OutreachLanguage);
	const draft = $derived(draftFrom(template, outreachVars(prospect, language, sender), language));

	// What you typed over the template; `null` follows it
	let editedSubject = $state<string | null>(null);
	let editedBody = $state<string | null>(null);
	const subject = $derived(editedSubject ?? draft.subject);
	const body = $derived(editedBody ?? draft.body);
	const edited = $derived(editedSubject !== null || editedBody !== null);
	const resetEdits = () => {
		editedSubject = null;
		editedBody = null;
	};

	// When the conversation moves on (a message logged here, a reply logged in the log),
	// the next template follows it
	let suggested = untrack(() => templateKey);
	$effect(() => {
		const next = suggestedTemplateKey(prospect);
		untrack(() => {
			if (next === suggested) return;
			suggested = next;
			templateKey = next;
			resetEdits();
		});
	});

	let to = $derived(prospect.contactEmail ?? '');
	// A call or a visit: the script is read, and what happened is logged
	const inPerson = $derived(template.kind === 'CALL' || template.kind === 'VISIT');
	let callNotes = $state('');
	let outcome = $state<string>('');
	// `datetime-local` speaks local wall time; sent as an instant
	let comeBackAt = $state('');
	let emailConsent = $state(false);
	const resetVisit = () => {
		callNotes = '';
		outcome = '';
		comeBackAt = '';
		emailConsent = false;
	};

	// A cold e-mail needs their OK first (UWG §7): the send buttons wait behind the warning
	// until you say you have it, or they wrote first
	const consentMissing = $derived(template.kind === 'EMAIL' && needsEmailConsent(prospect));
	let consentAcknowledged = $state(false);
	const sendBlocked = $derived(consentMissing && !consentAcknowledged);

	// Only the gaps still in the text: one you filled by hand is no longer missing
	const missing = $derived(
		[
			...new Set(
				draft.missing
					.filter((name) => `${subject}\n${body}`.includes(`[${name}]`))
					.map((name) => MISSING[name] ?? name)
			)
		]
	);

	const pickTemplate = (key: string) => {
		templateKey = key;
		resetEdits();
	};

	const languageAction = createAction(
		(next: OutreachLanguage) =>
			api.admin.updateProspect(prospect.id, {
				language: next as AdminUpdateProspectInputDtoLanguageEnum
			}),
		{ onSuccess: (updated) => onChange(updated) }
	);
	const pickLanguage = (next: OutreachLanguage) => {
		if (next === language) return;
		language = next;
		resetEdits();
		languageAction.execute(next);
	};

	const copy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		notificationManager.addNotification({ title: 'Copied', success: true });
	};

	const report = $derived(prospect.latestReport);
	const pdfAction = createAction(() => downloadReportPdf(report!, prospect.brand.name), {
		successNotification: { title: 'PDF ready', text: 'It is in your downloads: attach it' }
	});
	const leaveBehindAction = createAction(
		() => downloadLeaveBehindPdf(report!, prospect.brand.name),
		{
			successNotification: {
				title: 'Leave-behind ready',
				text: 'An A5 page in your downloads: print it and take it along'
			}
		}
	);

	const logAction = createAction(
		async () => {
			const address = to.trim();
			if (template.kind === 'EMAIL' && address && address !== (prospect.contactEmail ?? ''))
				await api.admin.updateProspect(prospect.id, { contactEmail: address });
			return api.admin.logOutreachTouch(prospect.id, {
				kind: template.kind as AdminLogOutreachTouchInputDtoKindEnum,
				template: template.key,
				subject: template.kind === 'EMAIL' && subject ? subject : undefined,
				body: inPerson ? callNotes.trim() || undefined : body,
				...(inPerson && {
					outcome: (outcome || undefined) as AdminLogOutreachTouchInputDtoOutcomeEnum | undefined,
					comeBackAt: comeBackAt ? new Date(comeBackAt).toISOString() : undefined,
					emailConsent: emailConsent || undefined
				})
			});
		},
		{
			onSuccess: (updated) => {
				onChange(updated);
				resetEdits();
				resetVisit();
			},
			successNotification: (updated) => ({
				title: 'Logged',
				text: [
					updated.nextFollowUpAt ? `Next follow-up on ${onDay(updated.nextFollowUpAt)}` : '',
					emailConsent ? 'OK to e-mail noted' : ''
				]
					.filter(Boolean)
					.join(' · ') || undefined
			})
		}
	);
</script>

<AdminPanel title="Next message" note={template.name}>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center gap-3">
			<Select
				items={TEMPLATES}
				value={templateKey}
				onValueChange={pickTemplate}
				aria-label="Template"
				width={220} />
			<div class="flex gap-1.5" role="group" aria-label="Language">
				{#each LANGUAGES as option (option.value)}
					<button
						type="button"
						class="chip"
						aria-pressed={language === option.value}
						onclick={() => pickLanguage(option.value)}>{option.label}</button>
				{/each}
			</div>
			{#if edited}
				<Button variant="link" size="sm" onclick={resetEdits}>Back to the template</Button>
			{/if}
		</div>
		<p class="text-muted-foreground m-0 -mt-2 text-xs">{template.when}</p>

		{#if template.kind === 'EMAIL'}
			<label class="flex flex-col gap-1.5 text-sm">
				<span class="font-medium">To</span>
				<Input
					type="email"
					value={to}
					oninput={(e: Event) => (to = (e.currentTarget as HTMLInputElement).value)}
					placeholder="owner@venue.de" />
				{#if !to}
					<span class="text-muted-foreground text-xs">
						No address yet. The imprint (Impressum) on their website names the owner and an
						email; it is saved when you log the message.
					</span>
				{/if}
			</label>
			{#if template.thread === 'reply'}
				<p class="ink-strip m-0">
					Send this as a reply in the thread of your last email, so it stays one conversation.
				</p>
			{:else}
				<label class="flex flex-col gap-1.5 text-sm">
					<span class="font-medium">Subject</span>
					<Input
						value={subject}
						oninput={(e: Event) =>
							(editedSubject = (e.currentTarget as HTMLInputElement).value)} />
				</label>
			{/if}
		{/if}

		<label class="flex flex-col gap-1.5 text-sm">
			<span class="font-medium">{inPerson ? 'Script' : 'Message'}</span>
			<Textarea
				value={body}
				oninput={(e: Event) => (editedBody = (e.currentTarget as HTMLTextAreaElement).value)}
				rows={12}
				class="leading-relaxed" />
		</label>

		{#if missing.length}
			<Notice tone="warning" size="sm" title="Fill in before sending">
				<ul class="m-0 list-disc pl-5 text-sm">
					{#each missing as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			</Notice>
		{/if}

		{#if inPerson}
			<div class="bg-wash/60 flex flex-col gap-3 rounded-md p-3">
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
				<Checkbox bind:checked={emailConsent}>
					They said I may e-mail them the report
				</Checkbox>
				<label class="flex flex-col gap-1.5 text-sm">
					<span class="font-medium">What happened</span>
					<Textarea
						bind:value={callNotes}
						rows={3}
						placeholder={template.kind === 'VISIT'
							? 'Owner not in, staff said Tuesdays after 15:00. Left the page.'
							: 'Spoke to the owner, Ali. Send the report to ali@…'} />
				</label>
				<p class="text-muted-foreground m-0 text-xs">
					A come-back time becomes the follow-up. Their OK is kept on the prospect, so the
					composer knows it may e-mail them.
				</p>
			</div>
		{/if}

		{#if consentMissing}
			<Notice tone="warning" size="sm" title="No OK to e-mail yet">
				A cold e-mail to a business in Germany needs their prior consent (UWG §7), and nothing
				here says they gave it: no visit or call logged with their OK, and no reply from them.
				Visit or call first and log it with consent, or send only once they have written to you.
				{#snippet actions()}
					{#if !consentAcknowledged}
						<Button variant="outline" size="sm" onclick={() => (consentAcknowledged = true)}>
							I have their OK, show the buttons
						</Button>
					{/if}
				{/snippet}
			</Notice>
		{/if}

		<div class="flex flex-wrap items-center gap-2">
			{#if template.kind === 'EMAIL' && sendBlocked}
				<!-- The warning above has the only way on -->
			{:else if template.kind === 'EMAIL' && template.thread === 'reply'}
				<Button icon={Search} href={gmailThreadUrl(to)} newTab disabled={!to}>
					Find the thread in Gmail
				</Button>
				<Button variant="outline" icon={Copy} onclick={() => copy(body)}>Copy text</Button>
			{:else if template.kind === 'EMAIL'}
				<Button icon={Mail} href={gmailComposeUrl(to, subject, body)} newTab>
					Open in Gmail
				</Button>
				<Button variant="outline" href={mailtoUrl(to, subject, body)}>Mail app</Button>
				<Button variant="outline" icon={Copy} onclick={() => copy(body)}>Copy text</Button>
			{:else if template.kind === 'VISIT'}
				{#if prospect.venue?.googleUrl}
					<Button variant="outline" icon={MapPin} href={prospect.venue.googleUrl} newTab>
						{[prospect.venue.street, prospect.venue.district].filter(Boolean).join(', ') ||
							'On Google Maps'}
					</Button>
				{:else if prospect.venue?.street}
					<span class="text-muted-foreground flex items-center gap-1 text-sm">
						<MapPin class="size-4" />
						{[prospect.venue.street, prospect.venue.district].filter(Boolean).join(', ')}
					</span>
				{/if}
			{:else if template.kind === 'DM'}
				<Button icon={Copy} onclick={() => copy(body)}>Copy text</Button>
				{#if prospect.instagram}
					<Button
						variant="outline"
						icon={AtSign}
						href={instagramUrl(prospect.instagram)}
						newTab>
						@{prospect.instagram}
					</Button>
				{/if}
			{:else if prospect.venue?.phone}
				<Button icon={Phone} href={`tel:${prospect.venue.phone.replaceAll(' ', '')}`}>
					Call {prospect.venue.phone}
				</Button>
			{/if}
			{#if template.attachReport && report}
				<Button
					variant="outline"
					icon={Download}
					loading={pdfAction.executing}
					onclick={() => pdfAction.execute()}>
					Report PDF
				</Button>
			{/if}
			{#if template.leaveBehind}
				<Button
					variant="outline"
					icon={Printer}
					disabled={!report}
					title={report ? undefined : 'Build a report first'}
					loading={leaveBehindAction.executing}
					onclick={() => leaveBehindAction.execute()}>
					Print leave-behind
				</Button>
			{/if}
			{#if !sendBlocked}
				<Button
					variant="secondary"
					icon={Check}
					loading={logAction.executing}
					onclick={() => logAction.execute()}>
					{LOG_LABEL[template.kind]}
				</Button>
			{/if}
		</div>

		<label class="text-muted-foreground flex items-center gap-2 text-xs whitespace-nowrap">
			Sign as
			<span class="w-44"><Input bind:value={sender} placeholder="Your first name" /></span>
		</label>
	</div>
</AdminPanel>
