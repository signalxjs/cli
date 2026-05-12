import { signal, component } from '@sigx/lynx';
import { Badge, Button, Card, Toggle } from '@sigx/lynx-daisyui';

const App = component(() => {
    const count = signal(0);
    const autoIncrement = signal(false);

    let timer: ReturnType<typeof setInterval> | null = null;
    const syncTimer = () => {
        if (autoIncrement.value && !timer) {
            timer = setInterval(() => count.value++, 800);
        } else if (!autoIncrement.value && timer) {
            clearInterval(timer);
            timer = null;
        }
    };

    return () => (
        <scroll-view scroll-orientation="vertical" class="h-screen bg-base-200">
            <view class="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-base-200">
                {/* Header group */}
                <view class="flex flex-col items-center gap-4">
                    {/* Logo */}
                    <view class="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
                        <text class="text-4xl text-primary-content">⚡</text>
                    </view>

                    <text class="text-3xl font-bold text-base-content text-center">
                        {{projectName}}
                    </text>

                    <text class="text-sm text-base-content/60 text-center max-w-[280px]">
                        Built with sigx-lynx + DaisyUI
                    </text>
                </view>

                {/* Counter card */}
                <Card bordered shadow="lg" class="mt-10 w-[300px] bg-base-100">
                    <Card.Body>
                        <view class="flex flex-row items-center justify-center gap-3">
                            <Badge variant="primary" size="lg">{count.value}</Badge>
                            <text class="text-base-content/60">×2 =</text>
                            <Badge variant="secondary" size="lg">{count.value * 2}</Badge>
                        </view>

                        <Card.Actions class="justify-center mt-4 gap-2">
                            <Button
                                variant="error"
                                outline
                                size="sm"
                                bindpress={() => count.value > 0 && count.value--}
                            >
                                −
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                bindpress={() => (count.value = 0)}
                            >
                                Reset
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                bindpress={() => count.value++}
                            >
                                +
                            </Button>
                        </Card.Actions>

                        <view class="flex flex-row items-center justify-between mt-4 pt-4 border-t border-base-300">
                            <text class="text-sm text-base-content/70">Auto-increment</text>
                            <Toggle
                                checked={autoIncrement.value}
                                color="success"
                                bindchange={(next: boolean) => {
                                    autoIncrement.value = next;
                                    syncTimer();
                                }}
                            />
                        </view>
                    </Card.Body>
                </Card>

                <text class="text-xs text-base-content/50 mt-10 text-center">
                    Edit src/App.tsx to get started
                </text>
            </view>
        </scroll-view>
    );
});

export default App;
