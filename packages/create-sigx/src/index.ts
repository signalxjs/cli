
/**
 * create-sigx — canonical scaffolder for SignalX projects.
 *
 * Thin shim around @sigx/cli's `create` command. Enables:
 *   npm  create sigx@latest my-app
 *   pnpm create sigx        my-app
 *   yarn create sigx        my-app
 *   bunx create sigx        my-app
 *
 * Single source of truth for scaffolding logic lives in @sigx/cli.
 */

import { runCreate } from '@sigx/cli/create';
runCreate();
