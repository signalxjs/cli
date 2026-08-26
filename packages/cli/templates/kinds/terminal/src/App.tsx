import { component, onMounted, onUnmounted, onKey, exitTerminal, Box, Text, Heading } from '@sigx/terminal';

/**
 * The root component. Keys arrive through `onKey`; signals drive the
 * re-render, the renderer diffs the terminal frame.
 */
export const App = component(({ signal }) => {
    const state = signal({ count: 0 });

    let off: (() => void) | undefined;
    onMounted(() => {
        off = onKey((key) => {
            if (key === '+' || key === '=' || key === 'k') state.count++;
            else if (key === '-' || key === 'j') state.count--;
            else if (key === 'q' || key === '\x03') {
                exitTerminal();
                process.exit(0);
            }
            return true;
        });
    });
    onUnmounted(() => off?.());

    return () => (
        <Box border="rounded" padX={2} label="{{projectName}}">
            <Heading>Hello, SignalX</Heading>
            <br />
            <Text>Count: <Text color="info">{String(state.count)}</Text></Text>
            <br />
            <Text color="dim">+ / − to change · q to quit · edit src/App.tsx and save to see HMR</Text>
        </Box>
    );
});
