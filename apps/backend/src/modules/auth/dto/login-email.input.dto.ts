import typia from 'typia';

export interface LoginEmailInputDto {
	email: string & typia.tags.Format<'email'>;

	password: string;
}
