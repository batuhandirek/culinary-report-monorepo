import typia from 'typia';

export interface SignupMobileInputDto {
	firstName: string & typia.tags.MinLength<2>;

	lastName: string & typia.tags.MinLength<2>;

	mobileNumber: string;

	password: string;

	acceptedTerms?: boolean;
	acceptedMarketing?: boolean;
}
