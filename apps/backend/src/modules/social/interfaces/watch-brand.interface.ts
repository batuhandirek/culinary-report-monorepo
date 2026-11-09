/**
 * One of the month's report brands, as the watch list reads it: a won prospect (a paying customer)
 * and its place among the city's most talked-about brands. The pipeline works the list out
 * (`ReportBrandsService`), since won prospects are outreach's and social never reads them.
 */
export interface WatchBrand {
	brand: { id: string; name: string };
	/** Its place among the city's most talked-about brands of the month (1 = most); absent outside the top */
	rank?: number;
	/** A won prospect: a paying customer */
	won: boolean;
}
