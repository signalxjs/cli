import { describe, expect, it } from 'vitest';
import { hintForError, withHint } from '../src/utils/error-hints.js';

describe('hintForError (#128)', () => {
    it('explains the missing-export link error as a version mismatch', () => {
        const msg = "The requested module '@sigx/runtime-core/internals' does not provide an export named 'declareLiveClient'";
        expect(hintForError(msg)).toContain('mismatched versions');
        expect(hintForError(msg)).toContain('npx sigx upgrade');
        expect(withHint(`error: ${msg}`)).toMatch(/^error: .*\nhint: /s);
    });

    it('points a missing module at a reinstall', () => {
        expect(hintForError("Cannot find package '@sigx/lynx-cli' imported from /app/x.js")).toContain('install');
    });

    it('leaves ordinary errors alone', () => {
        expect(hintForError('Directory "my-app" already exists!')).toBeNull();
        expect(withHint('boom')).toBe('boom');
    });
});
