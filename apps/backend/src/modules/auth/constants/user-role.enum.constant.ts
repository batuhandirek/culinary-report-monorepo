export enum UserRoleEnum {
	SYSTEM = 'system',
	ADMIN = 'admin',
	PROMOTER = 'promoter',
	USER = 'user',
	// Holds at least one accepted brand membership (`BrandMemberService`); never assigned by hand
	VENUE_OWNER = 'venue_owner',
}
