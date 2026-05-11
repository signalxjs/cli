import { component, defineApp } from "sigx";

const Counter = component(({ signal }) => {
    const state = signal({ count: 0 });

    return () => (
        <div class="max-w-2xl mx-auto p-10 text-center">
            <h1 class="text-3xl font-bold text-gray-800 mb-4">
                🚀 Welcome to SignalX!
            </h1>
            <p class="text-gray-600 mb-8">
                Edit <code class="bg-gray-200 px-2 py-1 rounded">src/App.tsx</code> to get started
            </p>
            <div class="bg-white p-8 rounded-xl shadow-lg">
                <p class="text-6xl font-bold mb-6">
                    {state.count}
                </p>
                <div class="flex gap-4 justify-center">
                    <button
                        onClick={() => state.count++}
                        class="px-6 py-3 text-lg font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                        Increment
                    </button>
                    <button
                        onClick={() => state.count--}
                        class="px-6 py-3 text-lg font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                    >
                        Decrement
                    </button>
                </div>
            </div>
        </div>
    );
});

defineApp(Counter).mount('#app');
