import { component } from 'sigx';
import { useRoute } from '@sigx/router';

export const About = component(() => {
    const route = useRoute();
    return () => (
        <div class="card">
            <div class="card-body">
                <h1 class="card-title">About</h1>
                <p class="muted">
                    This page is the <code>{route.path}</code> route, declared in <code>src/router.ts</code>.
                    Add a component under <code>src/pages/</code> and a record to the table to add another.
                </p>
            </div>
        </div>
    );
});
