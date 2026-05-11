import { component } from 'sigx';

export const About = component(() => {
    return () => (
        <div>
            <h2 class="text-2xl font-bold text-gray-800 mb-4">About</h2>
            <p class="text-gray-600 mb-4">
                This is a SignalX SSR application with streaming server-side rendering,
                client-side hydration, and file-based routing.
            </p>
            <ul class="text-gray-600 space-y-2">
                <li>⚡ Streaming SSR with Express</li>
                <li>🔄 Client-side hydration</li>
                <li>🧭 Router with <code class="bg-gray-200 px-2 py-1 rounded">@sigx/router</code></li>
                <li>🎨 Tailwind CSS styling</li>
                <li>📡 API routes ready (<code class="bg-gray-200 px-2 py-1 rounded">/api/hello</code>)</li>
                <li>🏗️ Production build support</li>
            </ul>
        </div>
    );
});
