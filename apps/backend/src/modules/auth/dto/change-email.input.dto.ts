import { tags } from 'typia';

export interface ChangeEmailInputDto {
	email: string & tags.Format<'email'>;
}
