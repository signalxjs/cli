import { component } from 'sigx';

/**
 * Fully resumable: each click handler captures only the named signal, so
 * the transform extracts it into a QRL chunk. The first click loads that
 * tiny chunk (not this file), the write triggers upgrade-on-write, and only
 * then does this component's chunk load and hydrate.
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
});
