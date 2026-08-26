import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

export const stylingTailwind: Layer = {
    name: 'styling:tailwind',
    overlay: 'styling/tailwind',
    packageJson: { devDependencies: deps('tailwindcss', '@tailwindcss/vite') },
    vite: { plugins: [{ name: 'tailwindcss', from: '@tailwindcss/vite', order: 50 }] },
    readme: [
        {
            title: 'Styling',
            order: 30,
            body: 'Tailwind CSS 4 via `@tailwindcss/vite` — no config file needed. `src/styles.css` imports Tailwind and defines the starter\'s component classes with `@apply`.',
        },
    ],
};
