// Google's booking page (`google.com/maps/reserve/dine?c=…`) as its first response serves it,
// trimmed to what the parser reads. Shaped on a real Berlin page fetched on 2026-10-18 (Restaurant
// Le Canard, via OpenTable, Fri, Oct 23 at 21:00): the date picker's label, one slot button per
// quarter hour (`aria-label` the time, "Selected: …" for the asked one, `data-slot` naming the
// area), the area names in the page's initial data, and the partner footer (a page fed by several
// providers lists them all, seen on another Berlin page the same day). A closed slot is a button
// with no accessible name.

export interface FixtureSlot {
	area: string;
	/** "8:15 PM", "Selected: 9:00 PM", or null for a closed slot */
	label: string | null;
}

const button = ({ area, label }: FixtureSlot, bts: number) =>
	label === null
		? `<span class="Ijf3Rd"><div data-is-touch-wrapper='true'><button class="VfPpkd-LgbsSe" jscontroller="soHxf" jsname="hNX5Yc" disabled><div class="VfPpkd-Jh9lGc"></div><span jsname="V67aGc" class="VfPpkd-vQzf8d"></span></button></div></span>`
		: `<span class="Ijf3Rd"><div data-is-touch-wrapper='true'><button class="VfPpkd-LgbsSe" jscontroller="soHxf" jsaction="click:cOuCgd; mousedown:UX7yZ;" data-idom-class="Rj2Mlf OLiIxf PDpWxe" jsname="hNX5Yc" aria-label="${label}" data-bts="${bts}" jslog="51654; 2:1792782000,1&amp;-60&amp;&amp;" data-slot="%.@.1,null,[null,2,[[&quot;${area}&quot;,[&quot;7486217585750364098&quot;,null,null,&quot;2&quot;],[${bts + 5400}]]]],[[${bts}],[null,120,&quot;CEST&quot;,&quot;Central European Summer Time&quot;]]]"${label.startsWith('Selected') ? ' data-pts="true"' : ''}><div class="VfPpkd-Jh9lGc"></div><span jsname="V67aGc" class="VfPpkd-vQzf8d">${label.replace('Selected: ', '')}</span></button></div></span>`;

export const googleReservePageHtml = ({
	date = 'Fri, Oct 23',
	partner = 'OpenTable',
	areas = [{ id: 'wgRXn_hULWs', name: 'Le Canard' }],
	grids = [] as FixtureSlot[][],
}: {
	date?: string | null;
	/** One partner ("in partnership with"), several ("Booking providers supply these times") or none */
	partner?: string | string[] | null;
	areas?: { id: string; name: string }[];
	grids?: FixtureSlot[][];
} = {}): string => `<!doctype html><html lang="en"><head><title>Reserve with Google</title></head><body>
<c-wiz><div role="combobox" aria-label="Party"><span>2 people</span></div>
<div role="group" aria-label="Select reservation date"><div class="VfPpkd-TkwUic" tabindex="0"><span jsslot class="VfPpkd-uusGie"><span class="xfudi"><span jsname="HHHCce" class="xfudi TXj4Ec">${date ?? ''}</span></span></span></div></div>
<ul role="listbox" aria-label="Select reservation time"><li data-value="18:00"><span>6:00 PM</span></li><li data-value="18:30"><span>6:30 PM</span></li></ul>
<div jsname="e4SXRb">${grids
	.map(
		(slots, g) =>
			`<div class="LXmcJe" jsname="DTEbMd">${areas.length > 1 ? `<div class="area-title">${areas[g]?.name ?? ''}</div>` : ''}</div><div class="grid">${slots
				.map((slot, i) => button(slot, 1792771200 + i * 900))
				.join('')}</div>`,
	)
	.join('')}</div>
${
	partner === null
		? ''
		: Array.isArray(partner)
			? // Several providers: a tooltip, then a logo and name each, in random order
				`<div class="T6fPzb"><div><span class="kWzVUe">Booking providers supply these times</span><span data-is-tooltip-wrapper="true"><button aria-label="About these providers"><svg width="16" height="16"><path d="M11 7h2v2h-2z"/></svg></button><div role="status"><span aria-hidden="true"></span><div jsslot><strong>About these providers</strong><br>Providers are displayed in random order.</div></div></span></div><div class="NGLLDf">${partner
					.map(p => `<img aria-hidden="true" alt="${p}" src="https://lh3.googleusercontent.com/x"/><span class="b2p8uc">${p}</span>`)
					.join('')}</div></div>`
			: `<div class="T6fPzb"><div><span class="kWzVUe">Booking times are provided in partnership with</span></div><div class="NGLLDf"><img class="eW5Dmb ioB7Bc" aria-hidden="true" alt="${partner}" src="https://lh3.googleusercontent.com/x"/><span class="b2p8uc">${partner}</span></div></div>`
}
<div jsname="YAd1Hc"><button jsname="EwKiCc" disabled><span jsname="V67aGc">Continue</span></button></div>
</c-wiz><script nonce="x">AF_initDataCallback({key: 'ds:0', hash: '1', data:[[1,2,3],2,[43200,82800],null,null,"20270115T074015",null,null,["gtar",[]],null,null,[[${areas
	.map(a => `["${a.id}","${a.name}",[null,""],null,3,null,54,null,[]]`)
	.join(',')}]]], sideChannel: {}});</script></body></html>`;

/** Nine quarter hours from `from` ("6:00 PM"-style labels), `selected` marking the asked time. */
export const quarterHours = (fromHour: number, area: string, closed: number[] = [], selectedIndex = 4): FixtureSlot[] =>
	Array.from({ length: 9 }, (_, i) => {
		const minutes = fromHour * 60 + i * 15;
		const hour = Math.floor(minutes / 60);
		const label = `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
		return { area, label: closed.includes(i) ? null : i === selectedIndex ? `Selected: ${label}` : label };
	});
