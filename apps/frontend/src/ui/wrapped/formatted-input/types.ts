export interface ValueFormatter<T = string | number> {
	/** Parse display string to actual value. Returns null if invalid. */
	parse: (displayValue: string) => T | null;
	/** Format actual value to display string */
	format: (value: T) => string;
	/** Optional validation. If not provided, parse returning non-null is considered valid. */
	validate?: (value: T) => boolean;
}
