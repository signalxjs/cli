import { component } from 'sigx';
import { Card, Steps, Badge, Divider, Button } from '@sigx/daisyui';

export const About = component(({ signal }) => {
    const state = signal({ currentStep: 'signals' });

    const steps = [
        { id: 'signals', label: 'Signals', color: 'primary' as const },
        { id: 'effects', label: 'Effects', color: 'secondary' as const },
        { id: 'components', label: 'Components', color: 'accent' as const },
        { id: 'ssr', label: 'SSR', color: 'success' as const },
    ];

    const stepDetails: Record<string, { title: string; desc: string }> = {
        signals: {
            title: '📡 Signals — Reactive Primitives',
            desc: 'Signals are the foundation of SignalX. They hold reactive state and automatically notify subscribers when values change. No proxies, no cloning — just direct, fine-grained reactivity.',
        },
        effects: {
            title: '⚡ Effects — Automatic Reactions',
            desc: 'Effects run whenever their signal dependencies change. Use them for side effects like timers, API calls, or DOM updates. Cleanup functions are called automatically.',
        },
        components: {
            title: '🧩 Components — Composable UI',
            desc: 'SignalX components use a render function that only runs once. The returned JSX template is live — signal references inside it update surgically without re-running the function.',
        },
        ssr: {
            title: '🌊 SSR — Streaming Server Rendering',
            desc: 'Stream HTML to the browser as it\'s generated. SignalX hydrates seamlessly on the client, preserving server-rendered content and adding full interactivity.',
        },
    };

    const current = () => stepDetails[state.currentStep] || stepDetails.signals;

    return () => (
        <div>
            {/* Header */}
            <section class="py-16 px-6 bg-base-100">
                <div class="max-w-3xl mx-auto text-center">
                    <h1 class="text-4xl font-bold mb-4">About SignalX</h1>
                    <p class="text-lg text-base-content/70">
                        A modern reactive framework for building fast, type-safe web applications
                        with fine-grained reactivity and streaming SSR.
                    </p>
                </div>
            </section>

            <Divider />

            {/* How It Works — Interactive Steps */}
            <section class="py-16 px-6">
                <div class="max-w-3xl mx-auto">
                    <h2 class="text-3xl font-bold text-center mb-10">How It Works</h2>

                    <Steps
                        items={steps}
                        model={() => state.currentStep}
                        class="mb-10"
                    />

                    <Card bordered shadow="lg" class="transition-all duration-300">
                        <Card.Body>
                            <Card.Title>{current().title}</Card.Title>
                            <p class="text-base-content/70 leading-relaxed">{current().desc}</p>
                        </Card.Body>
                    </Card>
                </div>
            </section>

            <Divider />

            {/* Tech Stack */}
            <section class="py-16 px-6 bg-base-100">
                <div class="max-w-3xl mx-auto">
                    <h2 class="text-3xl font-bold text-center mb-10">Built With</h2>
                    <div class="flex flex-wrap justify-center gap-3">
                        <Badge variant="primary" size="lg">SignalX</Badge>
                        <Badge variant="secondary" size="lg">TypeScript</Badge>
                        <Badge variant="accent" size="lg">Vite</Badge>
                        <Badge variant="info" size="lg">DaisyUI</Badge>
                        <Badge variant="success" size="lg">Tailwind CSS</Badge>
                        <Badge variant="warning" size="lg">SSR Streaming</Badge>
                    </div>
                </div>
            </section>

            <Divider />

            {/* CTA */}
            <section class="py-16 px-6">
                <div class="max-w-xl mx-auto text-center">
                    <h2 class="text-2xl font-bold mb-4">Ready to build?</h2>
                    <p class="text-base-content/60 mb-6">
                        Start building your next project with SignalX.
                    </p>
                    <div class="flex gap-3 justify-center">
                        <Button variant="primary">Read the Docs</Button>
                        <Button variant="ghost" outline>View on GitHub</Button>
                    </div>
                </div>
            </section>
        </div>
    );
});
