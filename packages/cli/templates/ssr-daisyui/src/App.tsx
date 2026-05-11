import { component } from 'sigx';
import { RouterView, Link, useRoute } from '@sigx/router';
import { ThemeProvider, ThemeSelector, Footer } from '@sigx/daisyui';

const themes = ['light', 'dark', 'cupcake', 'synthwave', 'cyberpunk', 'dracula', 'nord', 'autumn'] as const;

export const App = component(() => {
    const route = useRoute();

    return () => (
        <ThemeProvider defaultTheme="light" darkMode>
            <div class="min-h-screen flex flex-col bg-base-200">
                {/* Navbar */}
                <header class="navbar bg-base-100 shadow-sm sticky top-0 z-50">
                    <div class="navbar-start">
                        <Link to="/" class="btn btn-ghost text-xl font-bold gap-2">
                            🚀 {{projectName}}
                        </Link>
                    </div>
                    <div class="navbar-center hidden sm:flex">
                        <nav class="flex gap-1">
                            <Link
                                to="/"
                                class={`btn btn-sm ${route.path === '/' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                Home
                            </Link>
                            <Link
                                to="/about"
                                class={`btn btn-sm ${route.path === '/about' ? 'btn-primary' : 'btn-ghost'}`}
                            >
                                About
                            </Link>
                        </nav>
                    </div>
                    <div class="navbar-end">
                        <ThemeSelector themes={[...themes]} />
                    </div>
                </header>

                {/* Main content */}
                <main class="flex-1">
                    <RouterView />
                </main>

                {/* Footer */}
                <Footer center class="bg-base-100 text-base-content border-t border-base-300">
                    <aside>
                        <p>Built with 💜 using <strong>SignalX</strong> &amp; <strong>DaisyUI</strong></p>
                    </aside>
                </Footer>
            </div>
        </ThemeProvider>
    );
});
