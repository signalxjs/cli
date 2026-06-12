import { component } from 'sigx';

export const About = component(() => {
    return () => (
        <div>
            <h2 style="color: #2c3e50; margin-bottom: 16px;">About</h2>
            <p style="color: #666; margin-bottom: 16px;">
                This is a SignalX SSR application with streaming server-side rendering,
                client-side hydration, and file-based routing.
            </p>
            <ul style="color: #666; line-height: 2;">
                <li>⚡ Streaming SSR with Express</li>
                <li>🔄 Client-side hydration</li>
                <li>🧭 Router with <code>@sigx/router</code></li>
                <li>🤖 Blocking render for crawlers &amp; AI agents</li>
                <li>🏗️ Production build support</li>
            </ul>
        </div>
    );
});
