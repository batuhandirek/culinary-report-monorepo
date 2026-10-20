import { BlogEntryStateEnum } from '../constants/blog-entry-state.enum.constant.js';

export interface ChangeBlogEntryStateInputDto {
	state: BlogEntryStateEnum;
}
