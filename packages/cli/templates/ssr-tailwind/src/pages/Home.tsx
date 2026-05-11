import { component } from 'sigx';

export const Home = component(({ signal }) => {
    const state = signal({ count: 0 });

    return () => (
        <div>
            <h2 class="text-2xl font-bold text-gray-800 mb-4">Home</h2>
            <p class="text-gray-600 mb-6">
                Welcome to your SignalX SSR app! Edit <code class="bg-gray-200 px-2 py-1 rounded">src/pages/Home.tsx</code> to get started.
            </p>
            <div class="bg-gray-50 p-8 rounded-xl text-center">
                <p class="text-6xl font-bold mb-6">{state.count}</p>
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
