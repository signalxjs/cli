import { signal, component } from '@sigx/lynx';

const App = component(() => {
    const count = signal(0);

    return () => (
        <scroll-view scroll-orientation="vertical" style={{ height: '100vh', backgroundColor: '#0f172a' }}>
            <view style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                paddingLeft: '24px',
                paddingRight: '24px',
                paddingTop: '48px',
                paddingBottom: '48px',
                backgroundColor: '#0f172a',
            }}>
                {/* Header group */}
                <view style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    {/* Logo */}
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
                        textAlign: 'center',
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
                </view>

                {/* Counter card */}
                <view style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: '40px',
                    padding: '24px',
                    backgroundColor: '#1e293b',
                    borderRadius: '16px',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: '#334155',
                    alignItems: 'center',
                    gap: '20px',
                    width: '280px',
                }}>
                    <text style={{ fontSize: '56px', fontWeight: 'bold', color: '#f1f5f9' }}>
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
                                paddingLeft: '28px',
                                paddingRight: '28px',
                                paddingTop: '12px',
                                paddingBottom: '12px',
                                backgroundColor: '#334155',
                                borderRadius: '12px',
                            }}
                        >
                            <text style={{ color: '#f1f5f9', fontSize: '20px' }}>−</text>
                        </view>
                        <view
                            bindtap={() => count.value++}
                            style={{
                                paddingLeft: '28px',
                                paddingRight: '28px',
                                paddingTop: '12px',
                                paddingBottom: '12px',
                                backgroundColor: '#3b82f6',
                                borderRadius: '12px',
                            }}
                        >
                            <text style={{ color: '#fff', fontSize: '20px' }}>+</text>
                        </view>
                    </view>
                </view>

                <text style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginTop: '40px',
                    textAlign: 'center',
                }}>
                    Edit src/App.tsx to get started
                </text>
            </view>
        </scroll-view>
    );
});

export default App;
