/**
 * Test harness for driving @sigx/terminal UIs — ported from the terminal
 * repo's prompt-harness: output capture via an injected OutputTarget, key
 * injection through dispatchKey (the real input path), fake-timer settling.
 */
import { vi } from 'vitest';
import { setOutputTarget, dispatchKey, type OutputTarget } from '@sigx/terminal';

export const ESC = String.fromCharCode(27);
export const ENTER = '\r';
export const CTRL_C = String.fromCharCode(3);
export const UP = `${ESC}[A`;
export const DOWN = `${ESC}[B`;

export interface Capture {
    target: OutputTarget;
    chunks: string[];
    output: () => string;
    clear: () => void;
}

export function captureOutput(opts: { columns?: number; rows?: number; isTTY?: boolean } = {}): Capture {
    const chunks: string[] = [];
    const target: OutputTarget = {
        write: (s: string) => { chunks.push(s); },
        columns: opts.columns ?? 80,
        rows: opts.rows ?? 24,
        isTTY: opts.isTTY ?? true,
    };
    setOutputTarget(target);
    // Frames are wrapped in synchronized-update markers; strip them so
    // content assertions stay focused.
    const stripSync = (s: string) => s.split('\x1b[?2026h').join('').split('\x1b[?2026l').join('');
    return {
        target,
        chunks,
        output: () => stripSync(chunks.join('')),
        clear: () => { chunks.length = 0; },
    };
}

/** Advance past mount + READY_DELAY (50ms) + a render batch. */
export async function settle(ms = 80): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
}

/** Dispatch a key through the real input path, then let the repaint run. */
export async function press(key: string): Promise<void> {
    dispatchKey(key);
    await vi.advanceTimersByTimeAsync(40);
}

/** Type a string one printable at a time. */
export async function type(text: string): Promise<void> {
    for (const ch of text) {
        await press(ch);
    }
}

/** Strip all CSI escape sequences for plain-text assertions. */
export function stripAnsi(s: string): string {
    return s.split(ESC).map((part, i) => (i === 0 ? part : part.replace(/^\[\??[0-9;]*[A-Za-z~]/, ''))).join('');
}
