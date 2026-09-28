import { knip } from '@larrydarko/lint-config/knip';

export default knip({
    workspaces: {
        '.': {
            entry: ['scripts/**/*.ts!', 'e2e/support/global-setup.ts'],
            project: ['scripts/**/*.ts!', 'e2e/**/*.ts', '*.{ts,mts,js}'],
        },
        frontend: { entry: ['index.html!'], project: ['src/**/*.{ts,vue}!', '*.ts'] },
        api: { project: ['src/**/*.ts!', '*.ts'] },
        worker: { project: ['src/**/*.ts!'] },
        ingestor: { project: ['src/**/*.ts!'] },
        db: { entry: ['migrate-mongo-config.js!', 'migrations/*.js!'], project: ['**/*.{js,ts}'] },
        'packages/shared': {
            project: ['src/**/*.ts!'],
            ignoreDependencies: ['pino-pretty'],
        },
    },
    tags: ['-public'],
});
