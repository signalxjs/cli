/**
 * Renders `vite.config.ts` from merged fragments. The output is the shape
 * the core examples use: `sigx({ … })` first in `plugins`, the oxc JSX
 * options, and — only when an SSR layer needs the dev-server module graph
 * to share `@sigx/*` instances with the request handler — the
 * `({ command }) =>` form with `ssr.external`.
 */
import type { ViteConfigFragment, VitePluginEntry } from '../layer.js';

export class ViteConfigBuilder {
    private plugins: VitePluginEntry[] = [];
    private ssr: Record<string, string> = {};
    private sigxOptions: Record<string, string> = {};
    private family: string[] = [];
    private topLevel: Record<string, string> = {};
    private serveOnly: Record<string, string> = {};
    private imports: Array<{ names: string; from: string }> = [];

    merge(fragment: ViteConfigFragment | undefined): void {
        if (!fragment) return;
        for (const plugin of fragment.plugins ?? []) {
            const i = this.plugins.findIndex((p) => p.name === plugin.name);
            if (i === -1) this.plugins.push(plugin);
            else this.plugins[i] = plugin; // later layer refines the call (adapter, options)
        }
        Object.assign(this.ssr, fragment.ssr);
        Object.assign(this.sigxOptions, fragment.sigxOptions);
        for (const f of fragment.family ?? []) if (!this.family.includes(f)) this.family.push(f);
        Object.assign(this.topLevel, fragment.topLevel);
        Object.assign(this.serveOnly, fragment.serveOnly);
        for (const imp of fragment.imports ?? []) {
            if (!this.imports.some((i) => i.names === imp.names && i.from === imp.from)) this.imports.push(imp);
        }
    }

    hasContent(): boolean {
        return this.plugins.length > 0;
    }

    private renderSigxCall(): string {
        const opts: string[] = [];
        if (Object.keys(this.ssr).length) {
            opts.push(`ssr: { ${Object.entries(this.ssr).map(([k, v]) => `${k}: ${v}`).join(', ')} }`);
        }
        for (const [k, v] of Object.entries(this.sigxOptions)) opts.push(`${k}: ${v}`);
        return opts.length ? `sigx({ ${opts.join(', ')} })` : 'sigx()';
    }

    render(): string {
        const plugins = [...this.plugins].sort((a, b) => a.order - b.order);
        const lines: string[] = [`import { defineConfig } from 'vite';`];
        for (const p of plugins) {
            lines.push(
                p.importKind === 'named' ? `import { ${p.name} } from '${p.from}';` : `import ${p.name} from '${p.from}';`,
            );
        }
        for (const imp of this.imports) lines.push(`import ${imp.names} from '${imp.from}';`);
        lines.push('');

        const useFunctionForm = Object.keys(this.serveOnly).length > 0 || this.family.length > 0;
        if (this.family.length) {
            lines.push(
                '// Externalized from the dev-server module graph so the app, the request',
                '// handler and the render plugins share one set of @sigx module instances.',
                `const SIGX_FAMILY = [${this.family.map((f) => `'${f}'`).join(', ')}];`,
                '',
            );
        }

        const body: string[] = [];
        body.push('    plugins: [');
        // An entry with `call: ''` is import-only (a helper referenced inside
        // another call) — it keeps its import line and contributes no element.
        body.push(
            plugins
                .map((p) => (p.name === 'sigx' ? this.renderSigxCall() : (p.call ?? `${p.name}()`)))
                .filter((call) => call !== '')
                .map((call) => `        ${call}`)
                .join(',\n'),
        );
        body.push('    ],');
        body.push(`    oxc: {`, `        jsx: {`, `            runtime: 'automatic',`, `            importSource: 'sigx'`, `        }`, `    }${Object.keys(this.topLevel).length || useFunctionForm ? ',' : ''}`);
        const top = Object.entries(this.topLevel);
        top.forEach(([k, v], i) => {
            body.push(`    ${k}: ${v}${i < top.length - 1 || useFunctionForm ? ',' : ''}`);
        });
        if (useFunctionForm) {
            const serve = { ...this.serveOnly };
            if (this.family.length) serve.ssr = `{ external: SIGX_FAMILY }`;
            body.push(`    ...(command === 'serve' && {`);
            const entries = Object.entries(serve);
            entries.forEach(([k, v], i) => body.push(`        ${k}: ${v}${i < entries.length - 1 ? ',' : ''}`));
            body.push('    })');
        }

        if (useFunctionForm) {
            lines.push('export default defineConfig(({ command }) => ({', ...body, '}));');
        } else {
            lines.push('export default defineConfig({', ...body, '});');
        }
        return lines.join('\n') + '\n';
    }
}
