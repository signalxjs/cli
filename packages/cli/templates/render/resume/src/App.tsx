import { component } from 'sigx';
import { Counter } from './resume/Counter';

/**
 * A server-only page. The browser receives HTML plus a <1 kB event loader
 * — no page code, no component code, no framework runtime — until the
 * first interaction.
 */
export const App = component(() => {
    return () => (
        <div class="app">
            <header class="app-header">
                <span class="brand">⚡ {{projectName}}</span>
                <a class="link" href="https://sigx.dev" target="_blank" rel="noreferrer">Docs</a>
            </header>

            <main class="app-main">
                <div class="card">
                    <div class="card-body">
                        <h1 class="card-title">Hello, SignalX</h1>
                        <p class="muted">
                            Zero JavaScript on load. Open the network panel, then click:
                            the handler chunk loads, the write upgrades this one component.
                        </p>
                        <Counter initial={0} />
                    </div>
                </div>
            </main>
        </div>
    );
});
