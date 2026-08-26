import { describe, it, expect, afterEach } from 'vitest';
import { defineApp } from 'sigx';
import { Counter } from './Counter';

/** Mounts the island into happy-dom's document and clicks it. */
describe('Counter', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let app: ReturnType<typeof defineApp> | undefined;

    afterEach(() => {
        app?.unmount();
        host.innerHTML = '';
    });

    it('increments on click', () => {
        app = defineApp(<Counter />);
        app.mount(host);
        expect(host.querySelector('.badge')?.textContent).toBe('0');
        host.querySelector<HTMLButtonElement>('button[aria-label="Increment"]')!.click();
        expect(host.querySelector('.badge')?.textContent).toBe('1');
    });
});
