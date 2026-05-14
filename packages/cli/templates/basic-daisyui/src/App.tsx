import { component, defineApp, effect } from "sigx";
import {
    ThemeProvider,
    ThemeSelector,
    Card,
    Button,
    Badge,
    Toggle,
    Stats,
    Hero,
    Footer,
} from "@sigx/daisyui";

const themes = ['light', 'dark', 'cupcake', 'synthwave', 'cyberpunk', 'dracula', 'nord', 'autumn'] as const;

const App = component(({ signal }) => {
    const state = signal({
        count: 0,
        autoIncrement: false,
        elapsed: 0,
    });

    effect(() => {
        if (!state.autoIncrement) return;
        const timer = setInterval(() => state.count++, 800);
        return () => clearInterval(timer);
    });

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
        <ThemeProvider defaultTheme="light" darkMode>
            <div class="min-h-screen flex flex-col bg-base-200">
                {/* Navbar */}
                <header class="navbar bg-base-100 shadow-sm sticky top-0 z-50">
                    <div class="navbar-start">
                        <span class="btn btn-ghost text-xl font-bold">🚀 {{projectName}}</span>
                    </div>
                    <div class="navbar-end">
                        <ThemeSelector themes={[...themes]} />
                    </div>
                </header>

                {/* Main */}
                <main class="flex-1">
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
                                <Button variant="primary" size="lg">Get Started</Button>
                            </div>
                        </Hero.Content>
                    </Hero>

                    {/* Stats */}
                    <div class="px-6 -mt-8 relative z-10 flex justify-center">
                        <Stats class="w-full max-w-3xl bg-base-100">
                            <Stats.Item>
                                <Stats.Title>Counter</Stats.Title>
                                <Stats.Value>{state.count}</Stats.Value>
                                <Stats.Desc>Reactive signal</Stats.Desc>
                            </Stats.Item>
                            <Stats.Item>
                                <Stats.Title>Doubled</Stats.Title>
                                <Stats.Value>{state.count * 2}</Stats.Value>
                                <Stats.Desc>Computed value</Stats.Desc>
                            </Stats.Item>
                            <Stats.Item>
                                <Stats.Title>Uptime</Stats.Title>
                                <Stats.Value>{formatTime(state.elapsed)}</Stats.Value>
                                <Stats.Desc>Live timer</Stats.Desc>
                            </Stats.Item>
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
                                            no unnecessary re-renders.
                                        </p>
                                    </Card.Body>
                                </Card>
                                <Card bordered>
                                    <Card.Body>
                                        <Card.Title>🧩 Component Model</Card.Title>
                                        <p class="text-base-content/70">
                                            Composable components with JSX, compound patterns,
                                            and full TypeScript support.
                                        </p>
                                    </Card.Body>
                                </Card>
                                <Card bordered>
                                    <Card.Body>
                                        <Card.Title>🎨 DaisyUI Themes</Card.Title>
                                        <p class="text-base-content/70">
                                            30+ built-in themes, dark mode, and full component library.
                                            Switch the theme above!
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

defineApp(App).mount('#app');
