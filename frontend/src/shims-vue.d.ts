declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
    // An SFC's component *is* its default export — the shape is vue-loader's, not a choice.
    export default component;
}
