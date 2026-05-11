import { component } from 'sigx';
import { RouterView, Link, useRoute } from '@sigx/router';

export const App = component(() => {
    const route = useRoute();

    return () => (
        <div style="font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
            <header style="background: #2c3e50; color: white; padding: 1rem; margin-bottom: 2rem; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <h1 style="margin: 0; font-size: 1.5rem;">🚀 {{projectName}}</h1>
                <nav style="display: flex; gap: 1rem;">
                    <Link
                        to="/"
                        style={`color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; background: ${route.path === '/' ? '#3498db' : 'transparent'}`}
                    >
                        Home
                    </Link>
                    <Link
                        to="/about"
                        style={`color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; background: ${route.path === '/about' ? '#3498db' : 'transparent'}`}
                    >
                        About
                    </Link>
                </nav>
            </header>

            <main style="background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <RouterView />
            </main>
        </div>
    );
});
