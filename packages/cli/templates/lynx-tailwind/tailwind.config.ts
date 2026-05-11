import type { Config } from 'tailwindcss';
import LynxPreset from '@lynx-js/tailwind-preset';

export default {
    content: [
        './src/**/*.{tsx,ts,jsx,js}',
    ],
    presets: [LynxPreset],
} satisfies Config;
