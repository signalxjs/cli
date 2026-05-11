import { component } from 'sigx';

export const Home = component(({ signal }) => {
    const state = signal({ count: 0 });

    return () => (
        <div>
            <h2 style="color: #2c3e50; margin-bottom: 16px;">Home</h2>
            <p style="color: #666; margin-bottom: 24px;">
                Welcome to your SignalX SSR app! Edit <code>src/pages/Home.tsx</code> to get started.
            </p>
            <div style="background: #f8f9fa; padding: 24px; border-radius: 8px; text-align: center;">
                <p style="font-size: 48px; margin-bottom: 16px;">{state.count}</p>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button
                        onClick={() => state.count++}
                        style="padding: 10px 20px; font-size: 14px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer;"
                    >
                        Increment
                    </button>
                    <button
                        onClick={() => state.count--}
                        style="padding: 10px 20px; font-size: 14px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer;"
                    >
                        Decrement
                    </button>
                </div>
            </div>
        </div>
    );
});
