# {{projectName}}

A native mobile app built with [SignalX for Lynx](https://sigx.dev/lynx/) and daisyUI.

## Getting Started

### Prerequisites

- **Node.js 22+**
- **Android:** [Android Studio](https://developer.android.com/studio). It installs
  the Android SDK and an emulator, and bundles a JDK. Android builds need
  JDK 17–23. If `JAVA_HOME` points at a newer or older JDK, sigx uses Android
  Studio's JDK automatically.
- **iOS (macOS only):** Xcode 15+ and CocoaPods

Check your setup at any time. Every problem it finds comes with a `fix:` line:

```bash
npx sigx doctor
```

### Run the app

```bash
npm run run:android   # build, install and launch on an emulator or device
npm run run:ios       # macOS: build and launch on the iOS simulator
npm run run:web       # run it in the browser
```

The first Android build downloads Gradle and dependencies and takes a few
minutes; later builds are incremental. With nothing connected, `run:android`
boots your most recent Android emulator. To create one, open Android Studio →
Device Manager → Create Virtual Device.

The command keeps a dev server running. Edit `src/App.tsx` and the app
reloads. Once the app is installed, `npm run dev` starts just the dev server
and the device dashboard.

### Build for production

```bash
npm run build                    # the JS bundle (dist/)
npx sigx run:android --release   # a release build on the device
```

### Trouble?

- `npx sigx doctor` checks Node, the JDK, the Android SDK, emulators and your
  package versions.
- Add `--verbose` to any build command to see the full native build output.
- If a command says your @sigx packages are "out of step", run
  `npx sigx upgrade`.

## Project Structure

```
{{projectName}}/
├── src/
│   ├── App.tsx              # Root component
│   ├── styles.css           # Tailwind entry point
│   ├── main.tsx             # BG-thread entry point
│   └── main.thread.tsx      # Main-thread entry point
├── lynx.config.ts           # rspeedy build config
├── signalx.config.ts        # sigx-lynx native config
├── tailwind.config.ts       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── tsconfig.json
└── package.json
```

## Learn More

- [SignalX for Lynx documentation](https://sigx.dev/lynx/)
- [Lynx Runtime](https://lynxjs.org)
- [Tailwind CSS](https://tailwindcss.com)
