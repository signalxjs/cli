import type { Config } from 'tailwindcss';
import LynxPreset from '@lynx-js/tailwind-preset';
import { DaisyLynxPreset } from '@sigx/lynx-daisyui/preset';

export default {
    content: [
        './src/**/*.{tsx,ts,jsx,js}',
    ],
    presets: [LynxPreset, DaisyLynxPreset],
} satisfies Config;
