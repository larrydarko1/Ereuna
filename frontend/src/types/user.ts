/**
 * Shapes the account components pass between themselves.
 * A type that two SFCs share lives here rather than being exported from one of
 * them: typescript-eslint resolves a `.vue` module's exports as `any`, so a type
 * declared inside a component silently disables every type-aware rule at each
 * place it is used, even though `vue-tsc` reads it fine.
 */

/** What a re-authentication prompt collects before a destructive account change. */
export type Credentials = {
    password: string;
    code: string;
};
