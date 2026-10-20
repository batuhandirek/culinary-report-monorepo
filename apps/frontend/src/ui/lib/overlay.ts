/**
 * The close key in the corner of every dialog, sheet and popover sheet: a 36px round
 * ghost button (44px to the finger), so the three overlays share one affordance.
 */
export const OVERLAY_CLOSE_CLASS =
	"text-muted-foreground hover:bg-ink/5 hover:text-ink focus-visible:ring-ring/50 absolute end-3 top-3 grid size-9 place-items-center rounded-full outline-none transition-colors focus-visible:ring-[3px] disabled:pointer-events-none pointer-coarse:after:absolute pointer-coarse:after:-inset-1 pointer-coarse:after:content-[''] [&_svg:not([class*='size-'])]:size-[1.125rem] [&_svg]:pointer-events-none [&_svg]:shrink-0";
