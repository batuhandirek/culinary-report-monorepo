import typia from 'typia';

export interface SignupEmailInputDto {
	firstName: string & typia.tags.MinLength<2>;

	lastName: string & typia.tags.MinLength<2>;

	email: string & typia.tags.Format<'email'>;

	password: string;

	acceptedTerms?: boolean;
	acceptedMarketing?: boolean;
}
