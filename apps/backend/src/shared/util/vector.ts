/**
 * A `number[]` in the text form pgvector parses, for binding into a raw `em.execute`.
 *
 * MikroORM's `HalfvecType` only converts on entity properties; a vector reaching SQL as a
 * query parameter has to be a literal, cast at the call site (`?::halfvec(3072)`).
 */
export const toVectorLiteral = (embedding: number[]): string => `[${embedding.join(',')}]`;
