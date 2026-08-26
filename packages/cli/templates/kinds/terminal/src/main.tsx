// The mount module. `sigx-terminal-dev src/main.tsx` runs it with HMR;
// `tsx src/main.tsx` runs it plainly. Pipe the output (`| cat`) and the
// renderer prints one plain-text frame instead of taking over the terminal.
import { defineApp, terminalMount } from '@sigx/terminal';
import { App } from './App';

defineApp(<App />).mount({ clearConsole: true, fullscreen: true }, terminalMount);
