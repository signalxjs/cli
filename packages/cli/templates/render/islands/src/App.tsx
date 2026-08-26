import { component } from 'sigx';
import { Counter } from './islands/Counter';
// @sigx:if server-fn
import { ServerGreeting } from './components/ServerGreeting';
// @sigx:endif

/**
 * The page is a server-only component: everything outside the islands is
 * static HTML that is never hydrated. Each `client:*` directive decides
 * when that one island's JavaScript loads and runs.
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
                            Static HTML from the server. Only the counter below ships JavaScript —
                            edit <code>src/App.tsx</code> or <code>src/islands/Counter.tsx</code>.
                        </p>
                        <Counter client:load />
                        {/* @sigx:if server-fn */}
                        <ServerGreeting />
                        {/* @sigx:endif */}
                    </div>
                </div>
            </main>
        </div>
    );
});
