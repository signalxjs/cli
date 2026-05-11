import { signal, component } from '@sigx/lynx';

const App = component(() => {
    const count = signal(0);

    return () => (
        <scroll-view scroll-orientation="vertical" style={{ height: '100vh' }}>
            <view style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                gap: '20px',
                backgroundColor: '#0f172a',
            }}>
                {/* Logo area */}
                <view style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <text style={{ fontSize: '36px', color: '#fff' }}>⚡</text>
                </view>

                <text style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#f1f5f9',
                }}>
                    {{projectName}}
                </text>

                <text style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    textAlign: 'center',
                    maxWidth: '280px',
                }}>
                    Built with sigx-lynx — signal-based native apps
                </text>

                {/* Counter card */}
                <view style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: '20px',
                    padding: '24px',
                    backgroundColor: '#1e293b',
                    borderRadius: '16px',
                    alignItems: 'center',
                    gap: '16px',
                    width: '280px',
                }}>
                    <text style={{ fontSize: '48px', fontWeight: 'bold', color: '#e2e8f0' }}>
                        {count.value}
                    </text>

                    <view style={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '12px',
                    }}>
                        <view
                            bindtap={() => count.value > 0 && count.value--}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#334155',
                                borderRadius: '10px',
                            }}
                        >
                            <text style={{ color: '#e2e8f0', fontSize: '18px' }}>−</text>
                        </view>
                        <view
                            bindtap={() => count.value++}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#3b82f6',
                                borderRadius: '10px',
                            }}
                        >
                            <text style={{ color: '#fff', fontSize: '18px' }}>+</text>
                        </view>
                    </view>
                </view>

                <text style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginTop: '16px',
                }}>
                    Edit src/App.tsx to get started
                </text>
            </view>
        </scroll-view>
    );
});

export default App;
