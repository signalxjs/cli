import type { Layer } from '../layer.js';
import { deps } from '../deps.js';

export const stylingDaisyui: Layer = {
    name: 'styling:daisyui',
    overlay: 'styling/daisyui',
    packageJson: ({ spec }) => ({
        // @sigx/daisyui's component library targets the DOM runtime; SSG pages
        // use daisyUI's classes directly.
        dependencies: spec.kind === 'ssg' ? {} : deps('@sigx/daisyui'),
        devDependencies: deps('tailwindcss', '@tailwindcss/vite', 'daisyui'),
    }),
    vite: { plugins: [{ name: 'tailwindcss', from: '@tailwindcss/vite', order: 50 }] },
    readme: ({ spec }) => [
        {
            title: 'Styling',
            order: 30,
            body: [
                'Tailwind CSS 4 + daisyUI 5. Themes are declared in `src/styles.css` (`@plugin "daisyui" { themes: … }`); set `data-theme` on `<html>` to switch.',
                ...(spec.kind === 'ssg'
                    ? []
                    : ['', '`@sigx/daisyui` ships ready-made components (`Button`, `Card`, `Modal`, `ThemeSelector`, …) — see https://sigx.dev/daisyui/.']),
            ].join('\n'),
        },
    ],
};
