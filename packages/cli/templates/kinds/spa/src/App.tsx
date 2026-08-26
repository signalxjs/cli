import { component } from 'sigx';

/**
 * The root component. `signal` creates reactive state; the render function
 * re-runs only for the parts of the DOM that read what changed.
 */
export const App = component(({ signal }) => {
    const state = signal({ count: 0 });

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
                            Edit <code>src/App.tsx</code> and save — the page updates in place.
                        </p>
                        <div class="counter">
                            <button class="btn btn-ghost" onClick={() => state.count--} aria-label="Decrement">−</button>
                            <span class="badge badge-primary badge-lg">{state.count}</span>
                            <button class="btn btn-primary" onClick={() => state.count++} aria-label="Increment">+</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
});
