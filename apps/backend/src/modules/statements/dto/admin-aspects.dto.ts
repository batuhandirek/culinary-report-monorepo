import { tags } from 'typia';

export interface AdminAspectsInputDto {
	cityId: string & tags.Format<'uuid'>;
	/** The last month of the window; the last whole month by default */
	month?: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
}

/** One aspect with the city's claims filed under it */
export interface AdminAspectOutputDto {
	id: string;
	key: string;
	label: string;
	/** Its root's key; absent for a root */
	parentKey?: string;
	/** What it covers: exactly what the claim labeller (Jev) is told */
	hint?: string;
	/** When aspect discovery created it */
	discoveredAt?: string & tags.Format<'date-time'>;
	/** All time, its children's claims included */
	claims: number;
	/** Per month of `months`, its children's included */
	byMonth: number[];
	/** All time, filed at it with nothing finer */
	atItself: number;
	/** Per month of `months`, filed at it with nothing finer */
	atItselfByMonth: number[];
}

export interface AdminLooseClaimsOutputDto {
	claims: number;
	byMonth: number[];
}

export interface AdminAspectsOutputDto {
	month: string;
	/** The window the per-month counts follow, oldest first, ending with `month` */
	months: string[];
	aspects: AdminAspectOutputDto[];
	/** Labelled and filed under no aspect */
	noAspect: AdminLooseClaimsOutputDto;
	/** Not labelled yet */
	unread: AdminLooseClaimsOutputDto;
}
