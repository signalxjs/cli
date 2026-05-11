import { component, defineApp } from "sigx";

const Counter = component(({ signal }) => {
    const state = signal({ count: 0 });

    return () => (
        <div style="text-align: center; padding: 40px;">
            <h1 style="color: #2c3e50; margin-bottom: 20px;">
                🚀 Welcome to sigx!
            </h1>
            <p style="color: #666; margin-bottom: 30px;">
                Edit <code>src/App.tsx</code> to get started
            </p>
            <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <p style="font-size: 48px; margin-bottom: 20px;">
                    {state.count}
                </p>
                <button
                    onClick={() => state.count++}
                    style="padding: 12px 24px; font-size: 16px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 0 8px;"
                >
                    Increment
                </button>
                <button
                    onClick={() => state.count--}
                    style="padding: 12px 24px; font-size: 16px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; margin: 0 8px;"
                >
                    Decrement
                </button>
            </div>
        </div>
    );
});

defineApp(Counter).mount('#app');
