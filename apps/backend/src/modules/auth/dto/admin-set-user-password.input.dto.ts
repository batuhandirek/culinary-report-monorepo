import typia from 'typia';

export interface AdminSetUserPasswordInputDto {
	password: string & typia.tags.MinLength<8>;
}
