import { component } from 'sigx';

/** A reactive counter — `signal` state, fine-grained DOM updates. */
export const Counter = component<{ initial?: number }>((ctx) => {
    const count = ctx.signal(ctx.props.initial ?? 0);

    return () => (
        <div class="counter">
            <button class="btn btn-ghost" onClick={() => count.value--} aria-label="Decrement">−</button>
            <span class="badge badge-primary badge-lg">{count.value}</span>
            <button class="btn btn-primary" onClick={() => count.value++} aria-label="Increment">+</button>
        </div>
    );
});
