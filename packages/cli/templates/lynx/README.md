# {{projectName}}

A native mobile app built with [sigx-lynx](https://github.com/signalxjs/core).

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- [sigx-lynx-go](https://github.com/signalxjs/core/tree/main/go) app on your device/emulator

### Development

```bash
# Install dependencies
pnpm install

# Start the dev server
sigx dev

# Or use npx
npx sigx dev
```

Scan the QR code shown in the terminal with sigx-lynx-go, or enter the URL manually.

### Building

```bash
sigx build
```

### Environment Check

```bash
sigx doctor
```

## Project Structure

```
{{projectName}}/
├── src/
│   ├── App.tsx              # Root component
│   ├── main.tsx             # BG-thread entry point
│   └── main.thread.tsx      # Main-thread entry point
├── lynx.config.ts           # rspeedy build config
├── sigx.lynx.config.ts      # sigx-lynx native config
├── tsconfig.json
└── package.json
```

## Learn More

- [sigx-lynx Documentation](https://github.com/signalxjs/core)
- [Lynx Runtime](https://lynxjs.org)
