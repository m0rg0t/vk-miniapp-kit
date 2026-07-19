# Claude Code guidance

Follow [`AGENTS.md`](AGENTS.md) for all repository-wide skill authoring,
portability, validation, and Git rules.

## Claude plugin compatibility

- Keep `.claude-plugin/plugin.json` valid and versioned when the public toolkit
  changes materially.
- Keep `.claude-plugin/marketplace.json` descriptions and keywords aligned with
  the actual skills.
- Claude Code discovers skills from `skills/<name>/SKILL.md`; do not duplicate
  skill content inside the plugin manifests.
- Public skill instructions must also work when installed by `npx skills` into
  Codex, Cursor, or another supported agent. Never require
  `CLAUDE_PLUGIN_ROOT`, Claude-in-Chrome, or a Claude-only tool name.

## Local verification

Use the cross-agent installer as the primary smoke test:

```bash
npx skills add . --list
npx skills add . --skill '*' -a claude-code --copy -y
```

When changing a skill, validate its complete installed folder—including
references, scripts, assets, and `agents/openai.yaml`—rather than checking only
the `SKILL.md` frontmatter.
