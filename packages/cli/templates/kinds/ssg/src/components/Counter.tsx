import { component } from 'sigx';

/** An island: server-rendered, hydrated in the browser via `client:load`. */
export const Counter = component(({ signal }) => {
    const state = signal({ count: 0 });

    return () => (
        <div class="card">
            <div class="card-body">
                <div class="counter">
                    <button class="btn btn-ghost" onClick={() => state.count--} aria-label="Decrement">−</button>
                    <span class="badge badge-primary badge-lg">{state.count}</span>
                    <button class="btn btn-primary" onClick={() => state.count++} aria-label="Increment">+</button>
                </div>
            </div>
        </div>
    );
});
