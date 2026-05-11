import { signal, component } from '@sigx/lynx';

const App = component(() => {
    const count = signal(0);

    return () => (
        <scroll-view scroll-orientation="vertical" class="h-screen">
            <view class="flex items-center justify-center h-screen gap-5 bg-slate-900">
                {/* Logo */}
                <view class="w-20 h-20 rounded-2xl bg-blue-500 flex items-center justify-center">
                    <text class="text-4xl text-white">⚡</text>
                </view>

                <text class="text-3xl font-bold text-slate-100">
                    {{projectName}}
                </text>

                <text class="text-sm text-slate-400 text-center max-w-[280px]">
                    Built with sigx-lynx + Tailwind CSS
                </text>

                {/* Counter card */}
                <view class="mt-5 p-6 bg-slate-800 rounded-2xl items-center gap-4 w-[280px]">
                    <text class="text-5xl font-bold text-slate-200">
                        {count.value}
                    </text>

                    <view class="flex flex-row gap-3">
                        <view
                            bindtap={() => count.value > 0 && count.value--}
                            class="px-6 py-3 bg-slate-700 rounded-xl"
                        >
                            <text class="text-slate-200 text-lg">−</text>
                        </view>
                        <view
                            bindtap={() => count.value++}
                            class="px-6 py-3 bg-blue-500 rounded-xl"
                        >
                            <text class="text-white text-lg">+</text>
                        </view>
                    </view>
                </view>

                <text class="text-xs text-slate-600 mt-4">
                    Edit src/App.tsx to get started
                </text>
            </view>
        </scroll-view>
    );
});

export default App;
