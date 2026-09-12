/*
 * Browser APIs TypeScript's own lib does not declare.
 *
 * Every block below merges into a global the DOM lib already declares — UIEvent,
 * Navigator, Window. Declaration merging is an `interface` feature: a `type`
 * alias of the same name is a duplicate-identifier error, so the whole file has
 * to opt out of the prefer-type rule.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
/** https://developer.mozilla.org/en-US/docs/Web/API/InputDeviceCapabilities */
interface InputDeviceCapabilities {
    firesTouchEvents?: boolean;
}
interface UIEvent {
    /** https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/sourceCapabilities */
    sourceCapabilities?: InputDeviceCapabilities;
}

/**
 * Navigator userAgentData
 * https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData
 * More reliable way of determining chromium browsers.
 * Note: This is a partial type definition for the low entropy properties.
 */
interface UADataBrand {
    brand: string;
    version: string;
}
interface Navigator {
    userAgentData?: {
        brands: UADataBrand[];
        platform: string;
        mobile: boolean;
    };
}

interface Window {
    chrome: unknown;
}
