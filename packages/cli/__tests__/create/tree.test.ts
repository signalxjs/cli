import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyConditionals, readOverlay, writeTree } from '../../src/create/tree.js';

describe('applyConditionals', () => {
    const src = [
        'a',
        '// @sigx:if x',
        'kept-when-x',
        '// @sigx:endif',
        '/* @sigx:if !x */',
        'kept-when-not-x',
        '/* @sigx:endif */',
        '<!-- @sigx:if y -->',
        '  # @sigx:if x',
        'nested',
        '  # @sigx:endif',
        'y-only',
        '<!-- @sigx:endif -->',
        'z',
    ].join('\n');

    it('keeps blocks whose condition holds and strips the markers', () => {
        expect(applyConditionals(src, new Set(['x'])).split('\n')).toEqual(['a', 'kept-when-x', 'z']);
        expect(applyConditionals(src, new Set(['y'])).split('\n')).toEqual(['a', 'kept-when-not-x', 'y-only', 'z']);
        expect(applyConditionals(src, new Set(['x', 'y'])).split('\n')).toEqual(['a', 'kept-when-x', 'nested', 'y-only', 'z']);
    });

    it('rejects unbalanced markers', () => {
        expect(() => applyConditionals('// @sigx:if x\n', new Set())).toThrow(/unterminated/);
        expect(() => applyConditionals('// @sigx:endif\n', new Set())).toThrow(/without/);
    });

    it('handles CRLF input', () => {
        expect(applyConditionals('a\r\n// @sigx:if x\r\nb\r\n// @sigx:endif\r\nc', new Set())).toBe('a\r\nc');
    });
});

describe('readOverlay / writeTree', () => {
    let dir: string;
    beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sigx-tree-')); });
    afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

    it('reads text with substitution + conditionals, binaries verbatim, and renames gitignore', () => {
        const src = join(dir, 'tpl');
        mkdirSync(join(src, 'src'), { recursive: true });
        writeFileSync(join(src, 'gitignore'), 'node_modules\n');
        writeFileSync(join(src, 'src', 'main.ts'), 'const n = "{{projectName}}";\n// @sigx:if tailwind\nimport "./tw.css";\n// @sigx:endif\n');
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        writeFileSync(join(src, 'logo.png'), png);

        const tree = readOverlay(src, { projectName: 'demo', conditions: new Set(['tailwind']) });
        expect([...tree.keys()].sort()).toEqual(['.gitignore', 'logo.png', 'src/main.ts']);
        expect(tree.get('src/main.ts')).toBe('const n = "demo";\nimport "./tw.css";\n');
        expect(Buffer.from(tree.get('logo.png') as Uint8Array)).toEqual(png);

        const out = join(dir, 'out');
        expect(writeTree(tree, out)).toBe(3);
        expect(existsSync(join(out, '.gitignore'))).toBe(true);
        expect(readFileSync(join(out, 'src', 'main.ts'), 'utf-8')).toContain('demo');
        expect(readFileSync(join(out, 'logo.png'))).toEqual(png);
    });
});
