/**
 * The public face of a user, safe to hand to anyone.
 *
 * This interface *is* the wire contract: nestia builds the response stringifier from
 * it, so a serialized `User` goes out with only these properties — email, phone
 * and the rest are dropped even though they sit on the entity.
 *
 * `publicName` is the entity's "Firstname L." getter; the full surname stays private.
 * The image shape mirrors `ListListingsItemUser['profileImage']` so the frontend can render
 * a user from a listing card or a profile with the same component.
 */
export interface PublicUserImageOutputDto {
	url: string;
	width: number;
	height: number;
	aspectRatio: number;
	fileName: string;
}

export interface PublicUserOutputDto {
	id: string;
	publicName: string;
	profileImage?: PublicUserImageOutputDto;
}
