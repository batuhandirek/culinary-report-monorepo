<script lang="ts">
	import { CalendarDays, Crown, Mail } from '@lucide/svelte';

	import { type AdminUserOutputDto, AdminUserOutputDtoRolesEnum } from 'client';

	import { ago, onDay } from '#components/admin/admin-format.js';
	import * as HoverCard from '#ui/primitives-new/hover-card/index.js';
	import Avatar from '#ui/wrapped/Avatar.svelte';

	// Only `id` is required: the chip is fed users of every shape (list rows, chat
	// participants, nested DTOs) and shows what it gets.
	interface Props {
		user: { id: string } & Partial<
			Pick<
				AdminUserOutputDto,
				'firstName' | 'lastName' | 'email' | 'createdAt'
			> & {
				profileImage?: { url: string } | null;
				// Wire values: every DTO has its own twin of the roles enum.
				roles: `${AdminUserOutputDtoRolesEnum}`[];
			}
		>;
		text?: string;
		sm?: boolean;
		publicName?: boolean;
	}

	let { user, text = '', sm = false, publicName = false }: Props = $props();
	let name = $derived(
		[
			user.firstName ?? '',
			publicName ? (user.lastName ? `${user.lastName[0]}.` : '') : (user.lastName ?? '')
		]
			.filter(Boolean)
			.join(' ') || 'Unnamed user'
	);
	let isAdmin = $derived(user.roles?.includes(AdminUserOutputDtoRolesEnum.Admin) ?? false);
</script>

{#snippet marks()}
	{#if isAdmin}
		<Crown class="text-primary-darker fill-primary size-3 shrink-0" aria-label="Admin" />
	{/if}
{/snippet}

{#if user}
	<HoverCard.Root openDelay={350}>
		<HoverCard.Trigger
			href={`/admin/users/${user.id}`}
			class={[
				'group/chip inline-flex max-w-full min-w-0 shrink-0 items-center align-middle',
				sm ? 'gap-1.5' : 'gap-2'
			]}>
			<Avatar
				size={sm ? 22 : 32}
				identifier={user.id}
				alt={name}
				src={user.profileImage?.url} />
			<span
				class={[
					'text-ink decoration-line group-hover/chip:decoration-ink truncate font-medium whitespace-nowrap underline-offset-4 group-hover/chip:underline',
					sm ? 'text-[0.8125rem]' : 'text-sm'
				]}>
				{name}
				{text}
			</span>
			{@render marks()}
		</HoverCard.Trigger>
		<HoverCard.Content class="w-80">
			<div class="flex items-start gap-3">
				<Avatar size={44} identifier={user.id} alt={name} src={user.profileImage?.url} />
				<div class="flex min-w-0 flex-col gap-1">
					<div class="flex items-center gap-1.5">
						<span class="truncate font-semibold">{name}</span>
						{@render marks()}
					</div>
					{#if user.email}
						<span class="text-muted-foreground flex items-center gap-1.5 text-xs">
							<Mail class="size-3.5 shrink-0" />
							<span class="truncate">{user.email}</span>
						</span>
					{/if}
					{#if user.createdAt}
						<span class="text-muted-foreground flex items-center gap-1.5 text-xs">
							<CalendarDays class="size-3.5 shrink-0" />
							Joined {onDay(user.createdAt)} · {ago(user.createdAt)}
						</span>
					{/if}
				</div>
			</div>
		</HoverCard.Content>
	</HoverCard.Root>
{/if}
