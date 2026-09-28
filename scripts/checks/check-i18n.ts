#!/usr/bin/env node
/**
 * i18n locale consistency gate. What it checks — plural, placeholder and array
 * parity across the 18 locales, plus the createI18n options — lives in
 * @larrydarko/lint-config/gates/i18n; only this project's paths are here.
 *
 * Key parity is not this gate's job: `no-missing-keys-in-other-locales` in the
 * ESLint config reports a key missing from any locale, in both directions.
 */
import { checkI18n } from '@larrydarko/lint-config/gates/i18n';

checkI18n({
    localeDir: 'frontend/src/i18n/locales',
    configFile: 'frontend/src/i18n/index.ts',
});
