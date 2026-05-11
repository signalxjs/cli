import { component, effect } from 'sigx';
import { Button, Card, Badge, Toggle, Stats, Stat, Hero } from '@sigx/daisyui';

export const Home = component(({ signal }) => {
    const state = signal({
        count: 0,
        autoIncrement: false,
        elapsed: 0,
    });

    // Auto-increment effect — shows reactive effects in action
    effect(() => {
        if (!state.autoIncrement) return;
        const timer = setInterval(() => state.count++, 800);
        return () => clearInterval(timer);
    });

    // Elapsed timer — shows independent reactive state
    effect(() => {
        const timer = setInterval(() => state.elapsed++, 1000);
        return () => clearInterval(timer);
    });

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return () => (
        <div>
            {/* Hero */}
            <Hero class="bg-base-100 py-20">
                <Hero.Content>
                    <div class="max-w-2xl">
                        <h1 class="text-5xl font-bold leading-tight">
                            Build Reactive Apps<br />
                            <span class="text-primary">with SignalX</span>
                        </h1>
                        <p class="py-6 text-lg text-base-content/70">
                            Fine-grained reactivity, SSR streaming, and a beautiful component library —
                            everything you need to build modern web applications.
                        </p>
                        <div class="flex gap-3 justify-center">
                            <Button variant="primary" size="lg">Get Started</Button>
                            <Button variant="ghost" size="lg" outline>Documentation</Button>
                        </div>
                    </div>
                </Hero.Content>
            </Hero>

            {/* Stats — all reactive */}
            <div class="px-6 -mt-8 relative z-10 flex justify-center">
                <Stats class="w-full max-w-3xl bg-base-100">
                    <Stat title="Counter" value={state.count} description="Reactive signal" />
                    <Stat title="Doubled" value={state.count * 2} description="Computed value" />
                    <Stat title="Uptime" value={formatTime(state.elapsed)} description="Live timer" />
                </Stats>
            </div>

            {/* Features */}
            <section class="py-16 px-6">
                <div class="max-w-5xl mx-auto">
                    <h2 class="text-3xl font-bold text-center mb-12">Why SignalX?</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card bordered>
                            <Card.Body>
                                <Card.Title>⚡ Fine-grained Reactivity</Card.Title>
                                <p class="text-base-content/70">
                                    Signals update only what changed — no virtual DOM diffing,
                                    no unnecessary re-renders. Surgical precision updates.
                                </p>
                            </Card.Body>
                        </Card>
                        <Card bordered>
                            <Card.Body>
                                <Card.Title>🌊 SSR Streaming</Card.Title>
                                <p class="text-base-content/70">
                                    Server-side render your app with streaming HTML.
                                    Instant first paint, seamless hydration, full interactivity.
                                </p>
                            </Card.Body>
                        </Card>
                        <Card bordered>
                            <Card.Body>
                                <Card.Title>🎨 DaisyUI Themes</Card.Title>
                                <p class="text-base-content/70">
                                    30+ built-in themes, dark mode, and full component library.
                                    Switch the theme above to see it in action!
                                </p>
                            </Card.Body>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Interactive Demo */}
            <section class="py-16 px-6 bg-base-100">
                <div class="max-w-xl mx-auto">
                    <h2 class="text-3xl font-bold text-center mb-2">Try It Live</h2>
                    <p class="text-center text-base-content/60 mb-8">Interact with reactive signals right here</p>

                    <Card shadow="lg" bordered>
                        <Card.Body center>
                            <div class="flex items-center gap-4 mb-6">
                                <Badge variant="primary" size="lg">{state.count}</Badge>
                                <span class="text-base-content/60">×2 =</span>
                                <Badge variant="secondary" size="lg">{state.count * 2}</Badge>
                            </div>
                            <Card.Actions justify="center">
                                <Button variant="primary" onClick={() => state.count++}>
                                    + Increment
                                </Button>
                                <Button variant="error" outline onClick={() => state.count--}>
                                    − Decrement
                                </Button>
                                <Button variant="ghost" onClick={() => (state.count = 0)}>
                                    Reset
                                </Button>
                            </Card.Actions>
                            <div class="divider">AUTO MODE</div>
                            <Toggle
                                onChange={(val: boolean) => (state.autoIncrement = val)}
                                label="Auto-increment every 800ms"
                                color="success"
                            />
                        </Card.Body>
                    </Card>
                </div>
            </section>
        </div>
    );
});
