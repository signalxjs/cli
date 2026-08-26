import { signal, component } from '@sigx/lynx';

const App = component(() => {
    const count = signal(0);

    return () => (
        <scroll-view scroll-orientation="vertical" class="h-screen bg-slate-900">
            <view class="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-slate-900">
                {/* Header group */}
                <view class="flex flex-col items-center gap-4">
                    {/* Logo */}
                    <view class="w-20 h-20 rounded-2xl bg-blue-500 flex items-center justify-center">
                        <text class="text-4xl text-white">⚡</text>
                    </view>

                    <text class="text-3xl font-bold text-slate-100 text-center">
                        {{projectName}}
                    </text>

                    <text class="text-sm text-slate-400 text-center max-w-[280px]">
                        Built with sigx-lynx + Tailwind CSS
                    </text>
                </view>

                {/* Counter card */}
                <view class="flex flex-col mt-10 p-6 bg-slate-800 rounded-2xl border border-slate-700 items-center gap-5 w-[280px]">
                    <text class="text-6xl font-bold text-slate-100">
                        {count.value}
                    </text>

                    <view class="flex flex-row gap-3">
                        <view
                            bindtap={() => count.value > 0 && count.value--}
                            class="px-7 py-3 bg-slate-700 rounded-xl"
                        >
                            <text class="text-slate-100 text-xl">−</text>
                        </view>
                        <view
                            bindtap={() => count.value++}
                            class="px-7 py-3 bg-blue-500 rounded-xl"
                        >
                            <text class="text-white text-xl">+</text>
                        </view>
                    </view>
                </view>

                <text class="text-xs text-slate-500 mt-10 text-center">
                    Edit src/App.tsx to get started
                </text>
            </view>
        </scroll-view>
    );
});

export default App;
