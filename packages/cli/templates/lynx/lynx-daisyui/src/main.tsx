// Component styles first, then the app's Tailwind utilities, so a utility
// class (justify-center, bg-base-100, …) overrides a component default.
import '@sigx/lynx-daisyui/styles';
import './styles.css';
import { defineApp } from '@sigx/lynx';
import { ThemeProvider } from '@sigx/lynx-daisyui';
import App from './App';

// ThemeProvider defines the daisyUI theme tokens (--color-*, --text-*) that
// the preset's classes (bg-base-200, text-3xl, btn, …) resolve through.
defineApp(
    <ThemeProvider>
        <App />
    </ThemeProvider>,
).mount(null);

if (module.hot) {
    module.hot.accept();
}
