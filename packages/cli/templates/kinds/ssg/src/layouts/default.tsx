import { component } from 'sigx';
import type { LayoutProps, LayoutSlots } from '@sigx/ssg';
import { Link } from '@sigx/router';

/** The page frame every route renders into. */
export default component<LayoutProps, unknown, LayoutSlots>(({ slots }) => {
    return () => (
        <div class="app">
            <header class="app-header">
                <span class="brand">⚡ {{projectName}}</span>
                <nav class="nav">
                    <Link class="link" to="/">Home</Link>
                    <Link class="link" to="/about">About</Link>
                </nav>
            </header>

            <main class="app-main prose">{slots.default?.()}</main>

            <footer class="app-footer muted">Built with @sigx/ssg</footer>
        </div>
    );
});
