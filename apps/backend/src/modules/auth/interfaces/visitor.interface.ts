import { IBrowser, ICPU, IDevice, IEngine, IOS, IResult } from 'ua-parser-js';

export interface Visitor {
	ip?: string;
	countryCode?: string;
	userAgent?: string;

	ua?: IResult['ua'];
	device?: IDevice;
	browser?: IBrowser;
	engine?: IEngine;
	os?: IOS;
	cpu?: ICPU;
}
