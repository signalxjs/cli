import { component } from 'sigx';
import { RouterView, Link, useRoute } from '@sigx/router';

export const App = component(() => {
    const route = useRoute();

    return () => (
        <div class="max-w-2xl mx-auto p-10">
            <header class="bg-gray-800 text-white p-4 mb-8 rounded-lg flex justify-between items-center">
                <h1 class="text-xl font-bold">🚀 {{projectName}}</h1>
                <nav class="flex gap-4">
                    <Link
                        to="/"
                        class={`text-white no-underline px-4 py-2 rounded ${route.path === '/' ? 'bg-blue-500' : 'hover:bg-gray-700'}`}
                    >
                        Home
                    </Link>
                    <Link
                        to="/about"
                        class={`text-white no-underline px-4 py-2 rounded ${route.path === '/about' ? 'bg-blue-500' : 'hover:bg-gray-700'}`}
                    >
                        About
                    </Link>
                </nav>
            </header>

            <main class="bg-white p-8 rounded-lg shadow-sm">
                <RouterView />
            </main>
        </div>
    );
});
