# Repository agent instructions

## Mission

Maintain a cross-agent skill suite that can take a VK Mini App from idea to
catalog release. Preserve compatibility with the open `npx skills` ecosystem,
Codex, and Claude Code.

## Source layout

- Put each public skill at `skills/<lowercase-hyphen-name>/SKILL.md`.
- Keep YAML frontmatter limited to `name` and `description`.
- Put detailed, selectively loaded guidance in `references/`.
- Put deterministic reusable automation in `scripts/` and test every changed
  script by executing it.
- Put files intended to be copied into target apps in `assets/`.
- Keep `agents/openai.yaml` aligned with the skill. Its `default_prompt` must
  mention `$<skill-name>` and `short_description` must be 25–64 characters.
- Keep `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
  aligned with the public skill set.

## Skill design

- Write imperative, compact instructions for another capable coding agent.
- Put trigger conditions in the frontmatter description, not in a body
  “when to use” section.
- Prefer progressive disclosure: keep `SKILL.md` focused and link every relevant
  bundled resource directly from it.
- Make sibling skill ownership explicit instead of duplicating whole workflows.
- Inspect installed VKUI, VK Bridge, and generator versions before using
  version-specific APIs. Treat the current official docs and package types as
  authoritative.
- Make VKUI and `@vkontakte/icons` the default for app UI where appropriate.
- Treat Bridge declines, unavailable methods, timeouts, and receive-only events
  as normal product states.
- Never let local mocks masquerade as real-client proof. Preserve the final VK
  client smoke-test gate.

## Portability

- Never rely on `CLAUDE_PLUGIN_ROOT` or a vendor-specific MCP/tool name in a
  public skill.
- Resolve scripts/assets relative to the installed skill directory, typically
  by assigning an absolute `SKILL_DIR` discovered from the active `SKILL.md`.
- Use standard shell, Node.js, and repository-relative paths where possible.
- Keep Claude-specific integration metadata under `.claude-plugin/`; do not make
  it a runtime dependency of the skills.

## Required validation

Before committing:

1. Run `git diff --check`.
2. Run `npx skills add . --list` and confirm every intended skill is discovered.
3. Install all skills into a clean temporary project with
   `npx skills add <absolute-repo-path> --skill '*' -a codex --copy -y`, then
   compare the installed tree with `skills/`.
4. Run `quick_validate.py` for every skill.
5. Parse both `.claude-plugin/*.json` manifests.
6. Syntax-check every changed shell/Node script.
7. Execute changed scripts and reusable code against representative fixtures.
8. For Bridge mocks, test success, structured rejection, and receive-only event
   behavior with current Vitest and VK Bridge types.

Do not weaken a checker merely to make an incomplete fixture pass. A readiness
check must distinguish declarations from installed dependencies, filenames from
real test cases, and comments from executable mock behavior.

## Git safety

- Preserve unrelated user changes.
- Stage only the intended repository files.
- Use a concise commit message describing the whole skill-suite change.
- Do not publish releases, deploy apps, or submit catalog entries unless the
  user explicitly requests those external actions.
