import typia from 'typia';

export interface ForgotPasswordInputDto {
	email?: string & typia.tags.Format<'email'>;
	mobileNumber?: string;
}
