import { component } from 'sigx';
import type { LayoutProps, LayoutSlots } from '@sigx/ssg';
import { Link } from '@sigx/router';

export default component<LayoutProps, unknown, LayoutSlots>(({ slots }) => {
    return () => (
        <div class="min-h-screen flex flex-col bg-gray-50">
            <header class="bg-gray-800 text-white">
                <div class="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 class="text-xl font-bold">🚀 {{projectName}}</h1>
                    <nav class="flex gap-6">
                        <Link to="/" class="text-white hover:text-gray-300 no-underline">Home</Link>
                        <Link to="/about" class="text-white hover:text-gray-300 no-underline">About</Link>
                    </nav>
                </div>
            </header>

            <main class="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
                <article class="prose prose-lg max-w-none">
                    {slots.default?.()}
                </article>
            </main>

            <footer class="bg-gray-800 text-gray-400 text-center py-4 text-sm">
                Built with SignalX SSG
            </footer>
        </div>
    );
});
