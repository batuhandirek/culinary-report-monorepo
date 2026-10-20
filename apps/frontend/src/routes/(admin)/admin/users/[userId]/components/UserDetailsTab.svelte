<script lang="ts">
	import { type AdminUserOutputDto } from 'client';

	import { ago, at } from '#components/admin/admin-format.js';
	import AdminFacts, { type AdminFact } from '#components/admin/AdminFacts.svelte';
	import AdminPanel from '#components/admin/AdminPanel.svelte';
	import AdminRawJson from '#components/admin/AdminRawJson.svelte';
	import { enumToName } from '#lib/util.js';

	interface Props {
		user: AdminUserOutputDto;
	}

	let { user }: Props = $props();

	const verified = (date?: string | null): Pick<AdminFact, 'hint' | 'tone'> =>
		date ? { hint: `verified ${at(date)}` } : { hint: 'not verified', tone: 'danger' };
	const yesNo = (value?: boolean | null) => (value ? 'Yes' : 'No');

	const contact = $derived<AdminFact[]>([
		{
			label: 'Email',
			value: user.email,
			...(user.email ? verified(user.emailVerifiedAt) : {})
		},
		{
			label: 'Mobile',
			value: user.mobileNumber,
			...(user.mobileNumber ? verified(user.mobileNumberVerifiedAt) : {})
		},
		{
			label: 'Password',
			value: user.passwordLastChangedAt ? `Changed ${at(user.passwordLastChangedAt)}` : null,
			hint: user.passwordLastChangedAt ? undefined : 'never set or never changed'
		}
	]);

	const account = $derived<AdminFact[]>([
		{ label: 'ID', value: user.id, mono: true },
		{ label: 'Joined', value: at(user.createdAt), hint: ago(user.createdAt) },
		{ label: 'Updated', value: at(user.updatedAt) },
		{ label: 'Roles', value: user.roles.map(enumToName).join(', ') },
		...(user.isMarkedForDeletion
			? [
					{
						label: 'Deletion',
						value:
							typeof user.markedForDeletionAt === 'string'
								? `Requested ${at(user.markedForDeletionAt)}`
								: 'Requested',
						tone: 'danger'
					} satisfies AdminFact
				]
			: [])
	]);

	const consents = $derived<AdminFact[]>([
		{ label: 'Marketing', value: yesNo(user.acceptedMarketing) },
		{ label: 'Email', value: yesNo(user.acceptedEmailCommunications) },
		{ label: 'SMS', value: yesNo(user.acceptedSmsCommunications) },
		{ label: 'Calls', value: yesNo(user.acceptedCallCommunications) }
	]);

	// Codes still on their way to the user: the first thing support asks about.
	const requests = $derived(user.verificationRequests ?? []);
</script>

<div class="flex min-w-0 flex-col gap-5">
	<div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
		<div class="flex min-w-0 flex-col gap-5">
			<AdminPanel title="Contact and sign-in">
				<AdminFacts items={contact} />
			</AdminPanel>
			<AdminPanel title="Account">
				<AdminFacts items={account} />
			</AdminPanel>
		</div>

		<div class="flex min-w-0 flex-col gap-5">
			<AdminPanel title="Consents">
				<AdminFacts items={consents} />
			</AdminPanel>

			{#if requests.length}
				<AdminPanel title="Verification codes" note={requests.length}>
					<ul class="divide-line m-0 flex list-none flex-col divide-y p-0 text-sm">
						{#each requests as request, index (request.id ?? index)}
							<li class="flex flex-col gap-0.5 py-2">
								<span class="font-medium">
									{request.type ? enumToName(request.type) : 'Verification'}
									<span class="text-muted-foreground font-normal">
										· {request.email ??
											request.mobileNumber ??
											request.identifier ??
											'—'}
									</span>
								</span>
								<span class="text-muted-foreground text-xs">
									{request.verifiedAt
										? `Verified ${at(request.verifiedAt)}`
										: `Sent ${request.sendCount ?? 0}×, last ${at(request.lastSentAt)}, expires ${at(request.expiresAt)}`}
								</span>
							</li>
						{/each}
					</ul>
				</AdminPanel>
			{/if}
		</div>
	</div>

	<AdminRawJson value={user} />
</div>
