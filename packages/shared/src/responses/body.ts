/**
 * The body a response schema puts on the wire. A frontend call types its answer
 * with `ResponseBody<typeof schema>` — the very schema its route sends with —
 * rather than restating the shape, which is what let the two drift apart.
 */
import type { z } from 'zod';

export type ResponseBody<TSchema> = TSchema extends z.ZodType ? z.output<TSchema> : never;
