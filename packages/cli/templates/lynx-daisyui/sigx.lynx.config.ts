import { defineLynxConfig } from '@sigx/lynx-cli/config';

export default defineLynxConfig({
    name: '{{projectName}}',
    version: '0.1.0',
    buildNumber: '1',

    // App-shell assets — sigx ships sensible defaults in ./assets/.
    // Swap these PNGs to rebrand without touching native code.
    icon: 'assets/icon.png',
    splash: {
        image: 'assets/splash.png',
        backgroundColor: '#FFFFFF',
    },

    // Custom URL scheme for deep linking ({{projectName}}://...).
    // Comment out if you don't need deep links.
    scheme: '{{projectName}}',

    // 'portrait' | 'landscape' | 'default'
    orientation: 'portrait',

    modules: [
        '@sigx/lynx-storage',
        '@sigx/lynx-clipboard',
        '@sigx/lynx-haptics',
        '@sigx/lynx-device-info',
        '@sigx/lynx-network',
    ],
    android: {
        applicationId: 'com.example.{{projectName}}',
        versionCode: 1,
        minSdk: 24,
        targetSdk: 35,
        adaptiveIcon: {
            foreground: 'assets/adaptive-foreground.png',
            backgroundColor: '#0D9488',
        },
    },
    ios: {
        bundleIdentifier: 'com.example.{{projectName}}',
        deploymentTarget: '15.0',
    },
});
