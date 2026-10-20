import typia from 'typia';

/** Asks for a sign-in code to an account's e-mail (the venue portal's login). */
export interface LoginCodeInputDto {
	email: string & typia.tags.Format<'email'>;
}
