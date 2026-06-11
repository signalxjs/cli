// Demo of the @sigx/cli/shell runtime — run it in a real terminal:
//
//     node scripts/shell-demo.mjs   (from packages/cli)
//
// Tabs: 1/2 to switch · r fake-reload · type / for commands · Esc/^C to quit.
import { runShell, createShellLogger } from '../dist/shell/index.js';
import { jsx } from '@sigx/runtime-core';
import { Text, Col, LogView, Badge, Row, QRCode, paintToken } from '@sigx/terminal';

const t = (color, text) => jsx(Text, { color, children: text });

// A fake peer plugin contributing a tab + command — proves the merge model.
const fakeLynxPlugin = {
    name: 'lynx',
    detect: () => true,
    commands: {},
    tui: {
        tabs: [{
            id: 'connect',
            label: 'Connect',
            render: () => jsx(Col, {
                children: [
                    t('dim', 'Scan with sigx-lynx-go:'),
                    jsx(QRCode, { text: 'http://192.168.1.20:8788/main.lynx.bundle' }),
                ],
            }),
        }],
        commands: [{
            name: '/devices',
            description: 'list connected devices (from the lynx plugin)',
            run: (shell) => shell.say(paintToken('  ios #0 · iPhone 16 Sim · connected', 'dim')),
        }],
        status: () => [{ label: 'devices', value: '1', tone: 'success' }],
    },
};

let store; // set once the shell is up

const shell = await runShell({
    title: 'sigx dev',
    version: 'v0.3.0 (demo)',
    plugins: [fakeLynxPlugin],
    tabs: [
        {
            id: 'server',
            label: 'Server',
            render: () => jsx(Col, {
                children: [
                    jsx(Row, {
                        children: [
                            jsx(Badge, { label: 'running', color: 'success' }),
                            t('dim', 'http://localhost:8788'),
                        ],
                    }),
                    t('dim', 'press r to fake a reload · 2 for logs · / for commands'),
                ],
            }),
        },
        {
            id: 'logs',
            label: 'Logs',
            render: () => jsx(LogView, { store, height: 12 }),
        },
    ],
    shortcuts: [
        { key: 'r', label: 'reload', run: (s) => s.say(paintToken('↻ bundle reloaded (fake)', 'accent')) },
    ],
    status: () => [{ label: 'port', value: '8788' }],
    onExit: () => { console.log('\n(cleanup ran — adb reverse teardown would go here)'); },
});

store = shell.store;
const logger = createShellLogger(shell);
logger.log('dev server listening on :8788');

// Fake streaming build/device logs into the store (the Logs tab).
const LINES = [
    '[rspeedy] compiled main.lynx.bundle in 312ms',
    '📱 ios #0  app launched',
    '📱 ios #0  console.log: hello from the device',
    '[hmr] update accepted: src/App.tsx',
];
let i = 0;
setInterval(() => {
    shell.store.push(LINES[i++ % LINES.length] + '\n');
}, 900);
