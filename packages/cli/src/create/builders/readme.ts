/**
 * Renders the project README: title, a one-line description of what was
 * scaffolded, package-manager-aware getting-started commands, then the
 * sections layers contributed (sorted by `order`, then insertion), then
 * links.
 */
import type { LayerContext, ReadmeSection } from '../layer.js';
import { describeSpec } from '../spec.js';

const KIND_BLURB: Record<string, string> = {
    spa: 'A client-rendered SignalX app on Vite.',
    ssr: 'A server-rendered SignalX app — one `vite build --app` produces the client and server builds.',
    ssg: 'A static site built with `@sigx/ssg` — file-based routing, MDX pages, built-in search.',
    terminal: 'A terminal UI built with `@sigx/terminal` — TSX and signals, with an HMR dev runner.',
    lynx: 'A native iOS/Android app built with SignalX Lynx.',
};

export class ReadmeBuilder {
    private sections: ReadmeSection[] = [];

    constructor(private readonly ctx: LayerContext) {}

    add(sections: ReadmeSection[] | undefined): void {
        if (sections) this.sections.push(...sections);
    }

    render(scripts: { has(name: string): boolean }): string {
        const { spec, pm } = this.ctx;
        const lines: string[] = [
            `# ${spec.name}`,
            '',
            `${KIND_BLURB[spec.kind]} Scaffolded by \`npm create @sigx\` (${describeSpec(spec)}).`,
            '',
            '## Getting started',
            '',
            '```sh',
            pm.install,
            pm.run('dev'),
            '```',
            '',
        ];
        const cmds: string[] = [];
        if (scripts.has('build')) cmds.push(`- \`${pm.run('build')}\` — production build`);
        if (scripts.has('start')) cmds.push(`- \`${pm.run('start')}\` — run the production build`);
        if (scripts.has('preview')) cmds.push(`- \`${pm.run('preview')}\` — preview the production build`);
        if (scripts.has('deploy')) cmds.push(`- \`${pm.run('deploy')}\` — deploy`);
        if (scripts.has('test')) cmds.push(`- \`${pm.run('test')}\` — run tests`);
        if (scripts.has('lint')) cmds.push(`- \`${pm.run('lint')}\` — lint`);
        if (cmds.length) lines.push('## Scripts', '', ...cmds, '');

        const sorted = this.sections
            .map((s, i) => ({ ...s, i }))
            .sort((a, b) => (a.order ?? 50) - (b.order ?? 50) || a.i - b.i);
        for (const s of sorted) lines.push(`## ${s.title}`, '', s.body.trim(), '');

        lines.push(
            '## Learn more',
            '',
            '- [SignalX docs](https://sigx.dev)',
            '- [GitHub](https://github.com/signalxjs)',
            '',
        );
        return lines.join('\n');
    }
}
