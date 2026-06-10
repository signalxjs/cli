# @sigx/cli

The unified `sigx` command-line tool — daily-driver CLI for [SignalX](https://sigx.dev/core/) projects (web and Lynx).

```bash
npm i -D @sigx/cli
# then:
npx sigx <command>
```

After scaffolding with `npm create @sigx@latest`, the generated project depends on `@sigx/cli` directly. The `sigx` binary is the single entry point for everything: scaffolding, dev servers, builds, previews, and platform-specific commands provided by plugins. Any package can extend `sigx` with new commands via a `sigx-cli.plugin` field in its `package.json`.

## 📚 Documentation

Full command reference, headless `create` flags, the plugin API and live examples → **<https://sigx.dev/cli/>**

```bash
sigx create my-app    # scaffold a project (interactive)
sigx dev              # start the dev server
sigx build            # production build
```

Run `sigx --help` for the full live list (varies by what plugins are installed in your project).

## License

MIT — © Andreas Ekdahl
