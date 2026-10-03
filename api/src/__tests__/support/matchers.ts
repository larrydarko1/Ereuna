/**
 * Vitest types its asymmetric matchers `any`, which the strict type rules refuse wherever
 * one sits inside an expected object or call. These return `unknown`, which is the truth: a
 * matcher is not a value of the field's type, only something `expect` knows how to compare
 * with one.
 */
import { expect } from 'vitest';

/** `expect.any`: any instance of this class (`Date`, `ObjectId`, …). */
export const anyOf = (type: unknown): unknown => expect.any(type);

/** `expect.anything`: any value but null or undefined. */
export const anything = (): unknown => expect.anything();
