import { component } from 'sigx';
import type { LayoutProps, LayoutSlots } from '@sigx/ssg';
import { Link } from '@sigx/router';

export default component<LayoutProps, unknown, LayoutSlots>(({ slots }) => {
    return () => (
        <div style="min-height: 100vh; display: flex; flex-direction: column;">
            <header style="background: #2c3e50; color: white; padding: 1rem;">
                <div style="max-width: 800px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
                    <h1 style="margin: 0; font-size: 1.5rem;">🚀 {{projectName}}</h1>
                    <nav style="display: flex; gap: 1rem;">
                        <Link to="/" style="color: white; text-decoration: none;">Home</Link>
                        <Link to="/about" style="color: white; text-decoration: none;">About</Link>
                    </nav>
                </div>
            </header>

            <main style="flex: 1; max-width: 800px; margin: 0 auto; padding: 2rem; width: 100%;">
                {slots.default()}
            </main>

            <footer style="background: #2c3e50; color: #ccc; padding: 1rem; text-align: center; font-size: 0.875rem;">
                Built with SignalX SSG
            </footer>
        </div>
    );
});
