CLAUDE.md v2.0.0 (Last Rev: 2026-11-25)

@AGENTS.md

## Claude-Specific Notes

- `.claude/launch.json` defines `static-server` (`python -m http.server 8931`) for the preview pane.
- Cloud sessions cannot reach calc.ilhs.app or the DNS-over-HTTPS hosts through the sandbox proxy: test with `wrangler dev` and mock DNS in Playwright (`context.route`).
