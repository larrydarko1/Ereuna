/**
 * A fast stand-in for argon2.
 * The real parameters are 64 MB and three passes — deliberately, and correctly,
 * about a tenth of a second per call. A suite that registers, logs in and mints
 * ten recovery codes would spend minutes proving a library works. The shape is
 * kept exactly: `hash` produces an opaque string and `verify` compares against
 * it, so every branch that depends on a hash matching or not still runs.
 * What this does NOT cover is the cost parameters themselves — those are
 * asserted against `config.argon2` in the config suite instead.
 */
const PREFIX = '$fake$';

export const fakeArgon2 = {
    argon2id: 2,
    hash: (plaintext: string): Promise<string> => Promise.resolve(`${PREFIX}${plaintext}`),
    verify: (hash: string, plaintext: string): Promise<boolean> => Promise.resolve(hash === `${PREFIX}${plaintext}`),
};

/** The stored hash for a known password, for seeding a user document. */
export const hashOf = (plaintext: string): string => `${PREFIX}${plaintext}`;
