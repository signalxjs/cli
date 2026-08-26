import { component } from 'sigx';

/**
 * An island: server-rendered with its initial count, hydrated when the
 * `client:*` directive on its use fires (`client:load` on the home page).
 * Island state transfers automatically — the signal is keyed by its
 * declaration name per island instance.
 */
export const Counter = component<{ initial?: number }>((ctx) => {
    const count = ctx.signal(ctx.props.initial ?? 0);
    return () => (
        <div class="counter">
            <button class="btn btn-ghost" onClick={() => count.value--} aria-label="Decrement">−</button>
            <span class="badge badge-primary badge-lg">{count.value}</span>
            <button class="btn btn-primary" onClick={() => count.value++} aria-label="Increment">+</button>
        </div>
    );
}, { name: 'Counter' });
