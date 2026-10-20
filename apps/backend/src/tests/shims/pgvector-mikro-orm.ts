import { Type } from '@mikro-orm/core';

/**
 * ESM shim for `pgvector/mikro-orm` (test-only, wired via jest moduleNameMapper).
 *
 * The real package is CommonJS and `require()`s the ESM `@mikro-orm/core`, which Node 22's
 * jest-ESM loader can't do (needs Node 24.9+). This reproduces the same column types +
 * conversions so `schema.refresh()` builds identical DDL (pgvector itself works in PGlite).
 */

const vectorToSql = (value: unknown) =>
	Array.isArray(value) ? JSON.stringify(value.map(v => Number(v))) : value;

const vectorFromSql = (value: string | null) =>
	value === null ? null : (
		value
			.substring(1, value.length - 1)
			.split(',')
			.map(v => parseFloat(v))
	);

const sized = (name: string, dimensions?: number) =>
	dimensions == null ? name : `${name}(${dimensions})`;

const dims = (prop: { dimensions?: number; length?: number }) => prop.dimensions ?? prop.length;

export class HalfvecType extends Type<number[] | null, string | null> {
	convertToDatabaseValue(value: unknown) {
		return value == null ? null : (vectorToSql(value) as string);
	}
	convertToJSValue(value: string | null) {
		return value == null ? null : (vectorFromSql(value) as number[]);
	}
	getColumnType(prop: { dimensions?: number; length?: number }) {
		return sized('halfvec', dims(prop));
	}
}

export class VectorType extends HalfvecType {
	override getColumnType(prop: { dimensions?: number; length?: number }) {
		return sized('vector', dims(prop));
	}
}

export class BitType extends HalfvecType {
	override getColumnType(prop: { dimensions?: number; length?: number }) {
		return sized('bit', dims(prop));
	}
}

export class SparsevecType extends HalfvecType {
	override getColumnType(prop: { dimensions?: number; length?: number }) {
		return sized('sparsevec', dims(prop));
	}
}
