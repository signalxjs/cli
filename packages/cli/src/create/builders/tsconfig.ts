/**
 * Renders `tsconfig.json`: a strict, bundler-resolution base with the JSX
 * import source the kind needs, `compilerOptions` deep-merged in layer order
 * and `include`/`types` unioned.
 */
import type { TsconfigFragment } from '../layer.js';

export class TsconfigBuilder {
    private compilerOptions: Record<string, unknown> = {
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        jsxImportSource: 'sigx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        isolatedModules: true,
    };
    private include: string[] = ['src'];
    private types: string[] = [];

    merge(fragment: TsconfigFragment | undefined): void {
        if (!fragment) return;
        Object.assign(this.compilerOptions, fragment.compilerOptions);
        for (const i of fragment.include ?? []) if (!this.include.includes(i)) this.include.push(i);
        for (const t of fragment.types ?? []) if (!this.types.includes(t)) this.types.push(t);
    }

    render(): string {
        const compilerOptions = { ...this.compilerOptions };
        if (this.types.length) compilerOptions.types = this.types;
        return JSON.stringify({ compilerOptions, include: this.include }, null, 4) + '\n';
    }
}
