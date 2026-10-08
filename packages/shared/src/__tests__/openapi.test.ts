import { describe, it, expect } from 'vitest';

import { API_ROUTES } from '#contract.js';
import { LIMITS } from '#limits.js';
import { openApiDocument } from '#openapi.js';
import { searchField, symbolField } from '#requests/fields.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

const doc = openApiDocument();
const paths = doc.paths ?? {};

/**
 * Vitest types its asymmetric matchers `any`, which the strict type rules refuse inside an
 * expected object. These say `unknown`: a matcher is not a value of the field's type, only
 * something `expect` knows how to compare with one.
 */
const containing = (fields: Record<string, unknown>): unknown => expect.objectContaining(fields);
const includingAll = (items: unknown[]): unknown => expect.arrayContaining(items);

/** Every string held under `keyword` anywhere inside `value`. */
function valuesOf(value: unknown, keyword: string): string[] {
    const found: string[] = [];
    JSON.parse(JSON.stringify(value ?? null), (key, held: unknown) => {
        if (key === keyword && typeof held === 'string') found.push(held);
        return held;
    });
    return found;
}

/** Every operation in the document, as the contract key it was built from. */
function operationIds(): string[] {
    return Object.values(paths).flatMap((item) =>
        METHODS.flatMap((method) => {
            const id: unknown = item?.[method]?.operationId;
            return typeof id === 'string' ? [id] : [];
        }),
    );
}

describe('openApiDocument', () => {
    it('documents every route in the contract once, and nothing else', () => {
        expect(operationIds().sort()).toEqual(Object.keys(API_ROUTES).sort());
    });

    it("writes a router's :params as OpenAPI path parameters, each with its entry's `params` rule", () => {
        const [id] = paths['/api/notes/{id}']?.patch?.parameters ?? [];
        expect(id).toMatchObject({ in: 'path', name: 'id', required: true, schema: { pattern: '^[0-9a-fA-F]{24}$' } });
        const trade = paths['/api/portfolios/{number}/trades/{id}']?.delete?.parameters ?? [];
        const slots = Array.from({ length: LIMITS.portfolioSlots }, (_, slot) => String(slot));
        expect(trade).toContainEqual(containing({ in: 'path', name: 'number', schema: containing({ enum: slots }) }));
    });

    it('spells every pattern so Python reads it as JavaScript does: no \\d, \\w, \\s, \\b or \\0', () => {
        const patterns = valuesOf(doc, 'pattern');
        expect(patterns.filter((pattern) => /(?<!\\)(?:\\\\)*\\[dDwWsSbB0]/.test(pattern))).toEqual([]);
    });

    it('describes a trimmed text by what is left after the trim, at both of its limits', () => {
        // The body's one field, a name: trimmed, at least one character and at most sixty
        const [rule, ...others] = valuesOf(paths['/api/watchlists']?.post?.requestBody, 'pattern');
        expect(others).toEqual([]);
        const trimmed = new RegExp(rule ?? '^$');
        for (const padding of ['\r', ' \t\u00a0\ufeff', '']) expect(trimmed.test(padding)).toBe(false);
        for (const text of ['a', ' a ', '\u00a0é\n', `\t${'x'.repeat(60)} `]) expect(trimmed.test(text)).toBe(true);
        expect(trimmed.test('x'.repeat(61))).toBe(false);
    });

    it('spells a trimmed text with a pattern of its own as that pattern around the padding', () => {
        const [symbol] = paths['/api/charts/{symbol}/profile']?.get?.parameters ?? [];
        const [rule = ''] = valuesOf(symbol, 'pattern');
        for (const sample of ['AAPL', ' aapl ', '^GSPC', 'A B', '$ne', 'x'.repeat(20), 'x'.repeat(21), ' ']) {
            expect(new RegExp(rule).test(sample)).toBe(symbolField.safeParse(sample).success);
        }
    });

    it('documents the search term with the rule the API applies to it', () => {
        const query = paths['/api/charts/search']?.get?.parameters ?? [];
        const [rule = ''] = valuesOf(
            query.find((param) => 'name' in param && param.name === 'q'),
            'pattern',
        );
        const field = searchField(60);
        for (const sample of ['apple', 'a', 'brk.b', 'app\u0000le', 'a b']) {
            expect(new RegExp(rule).test(sample)).toBe(field.safeParse(sample).success);
        }
    });

    it('closes every request object, nested ones too, as the validator refuses undeclared keys', () => {
        const body = paths['/api/auth/register']?.post?.requestBody;
        expect(body).toMatchObject({ content: { 'application/json': { schema: { additionalProperties: false } } } });
        const imported = JSON.stringify(paths['/api/portfolios/{number}/import']?.post?.requestBody);
        expect(imported).not.toContain('"additionalProperties":true');
    });

    it('documents a query with the limits its schema enforces', () => {
        const query = paths['/api/notes']?.get?.parameters ?? [];
        expect(query).toContainEqual(containing({ in: 'query', name: 'limit', schema: containing({ maximum: 200 }) }));
    });

    // The API reads a count as its digits: an integer is what Schemathesis writes that way
    it('documents a count read from a query string as the integer it parses to', () => {
        const query = paths['/api/notes']?.get?.parameters ?? [];
        expect(query).toContainEqual({
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        });
    });

    it('documents the events flag as the two words the API takes', () => {
        const query = paths['/api/charts/{symbol}/events']?.get?.parameters ?? [];
        expect(query).toContainEqual(containing({ name: 'all', schema: containing({ enum: ['true', 'false'] }) }));
    });

    it('documents a JSON body, a body-less success and a file each as what they carry', () => {
        expect(paths['/api/auth/login']?.post?.requestBody).toMatchObject({
            content: { 'application/json': { schema: { type: 'object' } } },
        });
        expect(paths['/api/auth/logout']?.post?.responses?.['2XX']).toEqual({ description: 'Done, no body' });
        expect(paths['/api/logos/{exchange}/{file}']?.get?.responses?.['2XX']).toMatchObject({
            content: { 'image/svg+xml': { schema: { format: 'binary' } } },
        });
    });

    it('holds every refusal to a code from the shared list', () => {
        const refused: unknown = paths['/api/auth/login']?.post?.responses?.['4XX'];
        expect(refused).toMatchObject({
            content: {
                'application/json': {
                    schema: {
                        properties: { error: { enum: includingAll(['VALIDATION_FAILED', 'MALFORMED_REQUEST']) } },
                    },
                },
            },
        });
    });

    it('is plain JSON, ready to write to a file', () => {
        expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
    });
});
