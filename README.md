# pi-debug-dashboard

Real-time browser-based debug dashboard for the [pi coding agent](https://pi.dev). Visualize agent sessions with SSE streaming, Gantt timelines, context gauges, compaction logs, and more.

## Installation and Usage

### Extension Mode (inside pi)

Install via pi's package manager, then start the dashboard from within a pi session:

```bash
pi install npm:@ricoyudog/pi-debug-dashboard
```

After installation, use the `/dashboard start` command in pi. Open `http://localhost:9848` in your browser.

### Standalone Mode (CLI)

Clone the repository and run the standalone server against a pi debug log:

```bash
git clone https://github.com/ricoyudog/pi-debug-dashboard.git
cd pi-debug-dashboard
npx tsx src/standalone.ts --log <path> [--port 9848]
```

Requires `tsx` (`npm install -g tsx`). Open `http://localhost:9848` in your browser.

## Features

- Session browsing with enriched labels (CWD, session name, goal, first message)
- Real-time SSE streaming of agent events
- Gantt timeline showing tool execution duration and errors
- Context gauge showing token usage as percentage of context window
- System prompt panel and startup info display
- Compaction log tracking
- Full-text search and filtering
- Keyboard navigation
- Light/dark theme toggle

## Development

```bash
git clone https://github.com/ricoyudog/pi-debug-dashboard.git
cd pi-debug-dashboard
npm install
```

**Standalone dev:** Run against your pi debug log:

```bash
npx tsx src/standalone.ts --log ~/.pi/agent/pi-debug.log
```

**Extension mode dev:** Install locally for testing inside pi:

```bash
pi install npm:@ricoyudog/pi-debug-dashboard
```

## License

MIT. See [LICENSE](./LICENSE).

GitHub: [ricoyudog/pi-debug-dashboard](https://github.com/ricoyudog/pi-debug-dashboard)