import { component, onMounted } from 'sigx';
import type { LayoutProps, LayoutSlots } from '@sigx/ssg';
import { Link } from '@sigx/router';
import { ThemeProvider, ThemeSelector, initializeTheme } from '@sigx/daisyui';

export default component<LayoutProps, unknown, LayoutSlots>(({ slots }) => {
    onMounted(() => {
        initializeTheme({ defaultTheme: 'light' });
    });

    return () => (
        <ThemeProvider defaultTheme="light" darkMode>
            <div class="min-h-screen flex flex-col bg-base-100">
                <header class="navbar bg-base-300">
                    <div class="flex-1">
                        <span class="text-xl font-bold px-4">🚀 {{projectName}}</span>
                    </div>
                    <div class="flex-none">
                        <nav class="flex gap-2 mr-4">
                            <Link to="/" class="btn btn-sm btn-ghost">Home</Link>
                            <Link to="/about" class="btn btn-sm btn-ghost">About</Link>
                        </nav>
                        <ThemeSelector themes={['light', 'dark', 'cupcake', 'cyberpunk', 'synthwave', 'retro', 'custom']} />
                    </div>
                </header>

                <main class="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
                    <article class="prose prose-lg max-w-none">
                        {slots.default()}
                    </article>
                </main>

                <footer class="footer footer-center p-4 bg-base-300 text-base-content">
                    <p>Built with SignalX SSG + DaisyUI</p>
                </footer>
            </div>
        </ThemeProvider>
    );
});
