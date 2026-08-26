import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Only the packages' own suites. Template overlays under
        // packages/cli/templates ship sample tests for GENERATED projects —
        // they import `sigx`, which this repo does not install, and only make
        // sense inside a scaffolded app (the e2e suite runs them there).
        include: ['packages/*/__tests__/**/*.test.{ts,tsx}'],
    },
});
