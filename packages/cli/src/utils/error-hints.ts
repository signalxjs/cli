/**
 * Next-step hints for errors a new user can't act on as printed. Module
 * resolution failures are the big one: when an app's `@sigx/*` packages sit
 * at mismatched versions, Node reports a bare ES-module link error
 * ("The requested module '@sigx/runtime-core/internals' does not provide an
 * export named 'declareLiveClient'") that says nothing about versions.
 */

const MODULE_MISMATCH_RE =
    /does not provide an export named|ERR_PACKAGE_PATH_NOT_EXPORTED|is not exported under the conditions|Package subpath .* is not defined by "exports"/;
const MODULE_MISSING_RE = /ERR_MODULE_NOT_FOUND|Cannot find (module|package) '/;

/** A one-paragraph hint for `message`, or null when we have nothing useful to add. */
export function hintForError(message: string): string | null {
    if (MODULE_MISMATCH_RE.test(message)) {
        return (
            'hint: this usually means your @sigx packages are at mismatched versions (for example an old\n' +
            '      @sigx/runtime-core next to newer @sigx/* packages). For a Lynx app run `npx sigx upgrade`;\n' +
            '      otherwise update the @sigx/* entries in package.json to matching versions and reinstall.\n' +
            '      Avoid `npm install --force` / `--legacy-peer-deps` — they install mismatched peers.'
        );
    }
    if (MODULE_MISSING_RE.test(message)) {
        return 'hint: a dependency is missing — run your package manager\'s install (e.g. `npm install`) and try again.';
    }
    return null;
}

/** `message` followed by its hint, if any. */
export function withHint(message: string): string {
    const hint = hintForError(message);
    return hint ? `${message}\n${hint}` : message;
}
