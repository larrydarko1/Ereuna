/**
 * The API contract as an OpenAPI 3.1 document, for the tools that speak it:
 * Schemathesis fuzzes the running API from it (e2e/fuzz/run.ts). It is
 * built from API_ROUTES alone, so it lists exactly the routes the contract
 * does, with the schemas the routers validate and answer with.
 *
 * The contract names a success's body, not its status, so a success is any
 * 2XX. A path parameter is described by the entry's `params`, the schema its
 * router validates with; a route whose `params` do not name exactly its path's
 * parameters fails the build. A request object is closed at every depth, as
 * the API's validator is: it refuses a key no schema declares.
 *
 * Schemathesis reads the document in Python, so two of the API's rules are
 * rewritten into ones Python reads the same way JavaScript does (see
 * `describeInput`): a pattern's `\d`, `\w` and `\0`, and a trimmed text's
 * length. The API trims before it measures, so a text's limits count what is
 * left once the padding is gone, and the document says so in one pattern.
 *
 * Node only, and kept out of the package index: zod-openapi is a dev
 * dependency, and only tooling reads this.
 */
import { z } from 'zod';
import {
    createDocument,
    type CreateDocumentOptions,
    type ZodOpenApiOperationObject,
    type ZodOpenApiPathsObject,
    type ZodOpenApiResponseObject,
} from 'zod-openapi';

import { isApiRoute } from '#contract-check.js';
import { API_ROUTES, type ApiRoute, type Endpoint } from '#contract.js';
import { errorBodySchema } from '#errors.js';

type OpenApiDocument = ReturnType<typeof createDocument>;

type OverrideContext = Parameters<NonNullable<CreateDocumentOptions['override']>>[0];

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

const METHODS: readonly Method[] = ['get', 'post', 'put', 'patch', 'delete'];

/** Each character JavaScript's `trim()` removes: its whitespace and line terminators. */
const TRIMMED_CHARACTERS = Array.from({ length: 0x10000 }, (_, code) => String.fromCharCode(code)).filter(
    (char) => char.trim() === '',
);

/** The same characters, as the inside of a pattern's character class. */
const TRIMMED = TRIMMED_CHARACTERS.map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');

/** The contract as an OpenAPI document. @public */
export function openApiDocument(): OpenApiDocument {
    const paths: ZodOpenApiPathsObject = {};
    for (const route of Object.keys(API_ROUTES).filter(isApiRoute)) {
        const { method, path, params } = splitRoute(route);
        const pathItem = paths[path] ?? {};
        pathItem[method] = operation(route, API_ROUTES[route], params);
        paths[path] = pathItem;
    }
    return createDocument(
        {
            openapi: '3.1.0',
            info: { title: 'Ereuna API', version: '1.0.0' },
            paths,
        },
        { override: describeInput },
    );
}

/** `'GET /api/notes/:id'` as OpenAPI's `get` and `/api/notes/{id}`, with the parameter names. */
function splitRoute(route: ApiRoute): { method: Method; path: string; params: string[] } {
    const [verb = '', rawPath = ''] = route.split(' ');
    const method = METHODS.find((candidate) => candidate === verb.toLowerCase());
    if (method === undefined) throw new Error(`${route}: no OpenAPI method for ${verb}`);
    const params: string[] = [];
    const path = rawPath.replace(/:(\w+)/g, (_match, name: string) => {
        params.push(name);
        return `{${name}}`;
    });
    return { method, path, params };
}

function operation(route: ApiRoute, endpoint: Endpoint, params: string[]): ZodOpenApiOperationObject {
    const requestParams = {
        ...(params.length > 0 && { path: pathParams(route, endpoint, params) }),
        ...(endpoint.query instanceof z.ZodObject && { query: endpoint.query }),
    };
    return {
        operationId: route,
        ...(Object.keys(requestParams).length > 0 && { requestParams }),
        ...requestBody(endpoint),
        responses: {
            '2XX': success(endpoint.response),
            '4XX': {
                description: 'Refused, with a machine-readable code',
                content: { 'application/json': { schema: errorBodySchema } },
            },
        },
    };
}

/** The entry's `params`, which must name exactly the parameters in its path. */
function pathParams(route: ApiRoute, endpoint: Endpoint, names: string[]): z.ZodObject {
    const declared = Object.keys(endpoint.params?.shape ?? {});
    if (endpoint.params === undefined || [...declared].sort().join() !== [...names].sort().join()) {
        throw new Error(
            `${route}: its contract entry's \`params\` must name ${names.join(', ')}, not ${declared.length > 0 ? declared.join(', ') : 'nothing'}`,
        );
    }
    return endpoint.params;
}

/**
 * Says each request rule the way the API applies it. A request object takes
 * only the keys it declares, at every depth: the API's validator refuses the
 * rest with a 422 (`droppedKeys`). A schema that says so itself (a record, a
 * catchall) keeps its own rule. A pattern is spelled for Python on both sides:
 * a response's dates carry one too, and the fuzzer checks every answer with it.
 */
function describeInput({ jsonSchema, zodSchema, io }: OverrideContext): void {
    if (jsonSchema.pattern !== undefined) jsonSchema.pattern = portablePattern(jsonSchema.pattern);
    if (io !== 'input') return;
    // A number read from a query string (`queryDigits`) is its digits, parsed
    // and then bounded: the bounds sit on the number, past the string the document
    // would describe. Said as that integer, it carries them, and Schemathesis
    // writes an integer as exactly the digits the API takes
    if (zodSchema instanceof z.ZodPipe && zodSchema.out instanceof z.ZodNumber) {
        const { type, minimum, maximum } = z.toJSONSchema(zodSchema.out);
        delete jsonSchema.pattern;
        Object.assign(jsonSchema, { type, minimum, maximum });
        return;
    }
    if (zodSchema._zod.def.type === 'object') jsonSchema.additionalProperties ??= false;
    // The pattern beside it is Zod's, the rule the API applies. JSON Schema's own
    // formats (`date`, `date-time`, `email`) are another approximation: the two
    // disagree at the edges, and a draw has to satisfy both, which filtered out so
    // many of the screener filter body's that the fuzzer gave up on it
    if (jsonSchema.format !== undefined && jsonSchema.pattern !== undefined) delete jsonSchema.format;
    if (zodSchema instanceof z.ZodString && trims(zodSchema)) {
        // zod-openapi hands each link of a chain (`.trim().min(1).max(60)`) here in
        // turn, onto one object: each call rewrites what the last one left, so the
        // last link, the whole schema, decides.
        jsonSchema.pattern = portablePattern(trimmedPattern(zodSchema));
        delete jsonSchema.minLength;
        delete jsonSchema.maxLength;
        delete jsonSchema.allOf;
    }
}

/**
 * A trimmed text's rules as one anchored pattern over what was sent: any padding
 * at either end, around a kept text that starts and ends on a kept character and
 * is as long as the schema's limits allow. `minLength` and `maxLength` alone
 * count the padding the API trims off first: `"\r"` is one character to them and
 * nothing to the API, and a 60-character name with a tab in front is 61.
 *
 * A text with a pattern of its own is spelled the same way when that pattern is
 * one class repeated (`^[a-z0-9_]+$`) and refuses every padding character: the
 * class takes the limits in place of `+`. Any other pattern cannot be composed
 * with the trim, and is refused here before it reaches a run.
 */
function trimmedPattern(zodSchema: z.ZodString): string {
    let least = 0;
    let most: number | undefined;
    const own: RegExp[] = [];
    for (const check of zodSchema._zod.def.checks ?? []) {
        if (check instanceof z.core.$ZodCheckMinLength) least = Math.max(least, check._zod.def.minimum);
        else if (check instanceof z.core.$ZodCheckMaxLength) most = Math.min(most ?? Infinity, check._zod.def.maximum);
        else if (check instanceof z.core.$ZodCheckRegex) own.push(check._zod.def.pattern);
    }
    const padding = `[${TRIMMED}]*`;
    if (own.length === 0) return `^${padding}${keptText(least, most)}${padding}$`;
    const repeated = own.length === 1 ? /^\^(\[[^\]]+\])\+\$$/.exec(own[0]?.source ?? '')?.[1] : undefined;
    if (repeated === undefined || !refusesPadding(own)) {
        throw new Error(
            `pattern ${own.map(String).join(', ')} on a trimmed text cannot be spelled with its trim: give it the form ^[…]+$`,
        );
    }
    return `^${padding}${repeated}{${Math.max(least, 1)},${most ?? ''}}${padding}$`;
}

/**
 * Between `least` and `most` characters that start and end on a kept one, as a
 * pattern; optional when `least` is 0, so padding alone trims to the empty text.
 */
function keptText(least: number, most: number | undefined): string {
    const kept = `[^${TRIMMED}]`;
    const any = `(?:[${TRIMMED}]|${kept})`;
    const inner = (from: number): string => `${any}{${from},${most === undefined ? '' : most - 2}}`;
    let text = `${kept}${inner(least - 2)}${kept}`;
    if (most === 1) text = kept;
    else if (least <= 1) text = `${kept}(?:${inner(0)}${kept})?`;
    return least === 0 ? `(?:${text})?` : text;
}

/**
 * Whether `rules` refuse every trimmed character, at either end of a text of
 * letters, digits or punctuation: then the API's trim never changes a text they
 * take, and its length rules count only what is kept. It runs Zod's own
 * `RegExp`s, the rule the API applies, rather than one rebuilt from the
 * document's string.
 */
function refusesPadding(rules: RegExp[]): boolean {
    // A `g` or `y` rule resumes from its last match: Zod rewinds it before each test, and so does this
    const takes = (text: string): boolean =>
        rules.every((rule) => {
            rule.lastIndex = 0;
            return rule.test(text);
        });
    return TRIMMED_CHARACTERS.every((space) =>
        ['', 'a', 'A', '0', '_', '-', '.'].every((filler) =>
            [0, 1, 2, 3].every((count) => {
                const text = filler.repeat(count);
                return !takes(`${text}${space}`) && !takes(`${space}${text}`);
            }),
        ),
    );
}

/**
 * The same pattern in escapes Python reads as JavaScript does. Python's `\d` and
 * `\w` take any script's digits and letters (`١`, `é`), where JavaScript's take
 * ASCII only, and Python reads `\0` as an octal escape Schemathesis gets wrong:
 * run 4 sent a NUL the pattern refused. Any other class escape is refused here,
 * so a new one is spelled out before it reaches a run.
 */
function portablePattern(pattern: string): string {
    const ascii: Record<string, string> = { 'd': '0-9', 'w': 'A-Za-z0-9_', '0': '\\x00' };
    let out = '';
    let inClass = false;
    for (let at = 0; at < pattern.length; at++) {
        const char = pattern[at] ?? '';
        if (char !== '\\') {
            if (char === '[' && !inClass) inClass = true;
            else if (char === ']' && inClass) inClass = false;
            out += char;
            continue;
        }
        const next = pattern[at + 1] ?? '';
        at++;
        const spelled = ascii[next];
        if (spelled !== undefined) out += inClass || next === '0' ? spelled : `[${spelled}]`;
        else if (/[DWsSbB]/.test(next))
            throw new Error(
                `pattern ${pattern}: spell \\${next} out as a class, which Python reads as JavaScript does`,
            );
        else out += `\\${next}`;
    }
    return out;
}

/** Whether a string schema trims what it is given before its length is checked. */
function trims(zodSchema: z.ZodString): boolean {
    // Zod keeps `.trim()` as an anonymous rewrite: tried on a padded value, it shows itself
    return (zodSchema._zod.def.checks ?? []).some(
        (check) => check instanceof z.core.$ZodCheckOverwrite && check._zod.def.tx(' x ') === 'x',
    );
}

/** The JSON body, when the route takes one. */
function requestBody(endpoint: Endpoint): Pick<ZodOpenApiOperationObject, 'requestBody'> {
    if (endpoint.body === undefined) return {};
    return { requestBody: { required: true, content: { 'application/json': { schema: endpoint.body } } } };
}

function success(response: Endpoint['response']): ZodOpenApiResponseObject {
    if (response === null) return { description: 'Done, no body' };
    if (response === 'raw') {
        return {
            description: 'The bytes of a file',
            content: { 'image/svg+xml': { schema: z.string().meta({ format: 'binary' }) } },
        };
    }
    return { description: 'Success', content: { 'application/json': { schema: response } } };
}
