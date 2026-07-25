# vk-miniapp-kit

An installable Agent Skills toolkit for taking a [VK Mini
App](https://dev.vk.com/mini-apps) from an idea to a tested catalog release.
It works with Codex, Claude Code, Cursor, and the other agents supported by the
open [`skills`](https://github.com/vercel-labs/skills) CLI.

## Install

```bash
# inspect the available skills
npx skills add m0rg0t/vk-miniapp-kit --list

# install the complete toolkit (interactive agent/scope selection)
npx skills add m0rg0t/vk-miniapp-kit

# or install globally for Codex without prompts
npx skills add m0rg0t/vk-miniapp-kit --skill '*' -g -a codex -y

# install one focused workflow
npx skills add m0rg0t/vk-miniapp-kit --skill vk-app-test
```

For local development, use `npx skills add . --list` or
`npx skills add . --skill '*'`.

## Skills

| Skill | Use it when you want to… |
|-------|--------------------------|
| **vk-miniapp-lifecycle** | Coordinate the whole idea → build → test → catalog workflow and its quality gates. |
| **vk-app-plan** | Turn an idea into a scoped product brief, screen map, Bridge/data needs, and acceptance criteria. |
| **vk-catalog-screenshots** | Capture catalog/store screenshots at VK's exact spec (600×1200 portrait, ≥3). |
| **vk-app-assets** | Create and preflight the 576 icon, 1120×630 real-UI snippet, screenshots/Lottie manifest, and complete catalog asset package. |
| **vk-lottie-launch-icon** | Author or validate a Lottie animated launch icon (96×96, ≤24 KB, seamless loop). |
| **vk-app-scaffold** | Bootstrap a new VK Mini App on the current official React + VKUI + Bridge + router + Vite stack. |
| **vk-app-design** | Design and implement native-feeling, adaptive, accessible flows with VKUI. |
| **vk-bridge-recipes** | Add vk-bridge features (init, ads, analytics, theme, share, storage) with a dev-mock fallback and prod-visible diagnostics. |
| **vk-app-test** | Run local, unit, integration, and browser tests with a bundled Bridge 3 runtime mock and controlled scenarios. |
| **vk-app-security** | Verify signed launch identity, protect secrets, harden APIs/permissions/data, and scan common risks. |
| **vk-app-doctor** | Audit the app, tests, security, hosting, assets, and catalog readiness with one read-only command. |
| **vk-app-listing** | Produce names, privacy/moderation text, localization, category, support details, and the wider listing pack. |
| **vk-catalog-copy** | Produce single-line paste-ready Description and Short description values with exact counts and current-form limits. |
| **vk-miniapps-deploy** | Save an uploaded hosting version, confirm a code for that same version, and verify production HTTP 200 without re-uploading. |
| **vk-app-publish** | Orchestrate catalog preflight, build/package, version-bound deploy confirmation, smoke tests, and submission. |

Start with **`vk-miniapp-lifecycle`** for a broad request. It routes each phase
to the focused skill and resumes from the current project state instead of
forcing a greenfield workflow. Install the complete toolkit when using the
lifecycle coordinator because it delegates detailed phases to sibling skills.

## Repository layout

```text
skills/<skill-name>/
├── SKILL.md              # trigger metadata and agent workflow
├── agents/openai.yaml    # Codex/OpenAI UI metadata
├── references/           # detailed guidance loaded only when needed
├── scripts/              # deterministic validation/automation
└── assets/               # reusable source files copied into target apps
```

The root `.claude-plugin/` manifests retain Claude Code plugin compatibility;
the `skills/` layout is the cross-agent source of truth used by `npx skills`.
See [`AGENTS.md`](AGENTS.md) for repository-wide contribution rules and
[`CLAUDE.md`](CLAUDE.md) for Claude Code-specific notes.

## Design notes

- **Cross-agent installation.** Every skill lives at
  `skills/<name>/SKILL.md`, the native discovery layout used by `npx skills`.
  Bundled resources are resolved relative to the installed skill directory;
  no Claude-only environment variable is required.
- **Tool selection is built into the skills, not assumed.** For example,
  `vk-catalog-screenshots` prefers the `agent-browser` CLI, then falls back to
  Playwright, then puppeteer-core — so it works on whatever browser tooling the
  machine has.
- **Local development is a first-class release gate.** The test skill bundles a
  source-owned Bridge 3 runtime mock with success, dark-theme,
  permission-declined, ads-unavailable, and storage-error scenarios, plus a
  deterministic Vitest controller. The older official mock remains a
  compatibility option only when Bridge majors match.
- **Security is part of the lifecycle.** The security skill includes a
  backend-only Node/TypeScript launch-signature verifier and a read-only scanner
  for exposed secrets, unverified identity, CORS, unsafe input sinks, and
  sensitive logging.
- **One command summarizes readiness.** `vk-app-doctor` checks dependencies,
  Bridge/mock isolation, real test declarations, launch authentication, hosting
  config/build output, PNG dimensions, screenshots, privacy, and catalog copy.
- **One strict catalog preflight gates submission.** It validates a readable
  576×576 PNG, the 1120×630 real-UI snippet and retained sources, screenshots,
  optional Lottie, single-line copy limits, policy URL, and support contact.
- **Deploy confirmation is version-bound.** Upload state records the exact
  hosting version; a later code calls `apps.confirmDeploy` for that version
  without silently creating another deploy.
- **VKUI is the default UI layer.** The design skill first reuses VKUI and
  `@vkontakte/icons`, then adds custom CSS only when the product genuinely needs
  it.
- **Platform facts are verified, not memorized.** Where a skill states VK's
  required sizes or a `vk-bridge` method signature, it points at the
  authoritative source so the recipe stays correct as VK evolves.

## Validate changes

List and install the exact local source with the same CLI users will run:

```bash
npx skills add . --list
npx skills add . --skill '*' -a codex --copy -y
```

Validate every `SKILL.md` with the skill-creator validator:

```bash
for skill in skills/*; do
  uv run --with pyyaml python \
    "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" \
    "$skill"
done
```

Run executable checks in proportion to the files changed. At minimum, syntax
check scripts and JSON manifests. Exercise the runtime mock, launch verifier,
security scanner, and doctor against both intentionally broken and complete
fixtures whenever those resources change.

## Русский

`vk-miniapp-kit` — набор Agent Skills для полного цикла разработки
VK Mini Apps: от идеи и продуктового плана до реализации на VKUI, локального
тестирования с runtime-моками VK Bridge, проверки безопасности и готовности,
подготовки материалов для каталога и публикации.
Навыки работают с Codex, Claude Code, Cursor и другими агентами, которые
поддерживает открытый CLI `skills`.

### Установка

```bash
# посмотреть доступные навыки
npx skills add m0rg0t/vk-miniapp-kit --list

# установить полный набор
npx skills add m0rg0t/vk-miniapp-kit

# установить глобально для Codex без интерактивных вопросов
npx skills add m0rg0t/vk-miniapp-kit --skill '*' -g -a codex -y

# установить только выбранный навык
npx skills add m0rg0t/vk-miniapp-kit --skill vk-app-test
```

Для комплексной задачи начните с **`vk-miniapp-lifecycle`** и установите весь
набор: этот навык координирует этапы и передаёт специализированную работу
остальным навыкам.

### Состав набора

| Навык | Назначение |
|-------|------------|
| **vk-miniapp-lifecycle** | Ведёт проект через весь цикл: идея → разработка → тестирование → каталог. |
| **vk-app-plan** | Превращает идею в продуктовый план, карту экранов и критерии приёмки. |
| **vk-app-scaffold** | Создаёт проект на актуальном официальном стеке React + VKUI + VK Bridge. |
| **vk-app-design** | Проектирует адаптивный и доступный интерфейс на VKUI. |
| **vk-bridge-recipes** | Добавляет инициализацию, рекламу, темы, шаринг, аналитику и хранилище VK Bridge. |
| **vk-app-test** | Настраивает локальную разработку, встроенный runtime-мок Bridge 3, Vitest и браузерные сценарии. |
| **vk-app-security** | Проверяет подпись параметров запуска, защищает секреты, API, разрешения и пользовательские данные. |
| **vk-app-doctor** | Одной командой проверяет проект, тесты, безопасность, хостинг, ассеты и готовность к каталогу. |
| **vk-app-assets** | Создаёт и проверяет полный пакет ассетов: иконку 576×576, сниппет 1120×630, скриншоты и общий манифест. |
| **vk-lottie-launch-icon** | Создаёт или проверяет анимированную Lottie-иконку запуска. |
| **vk-catalog-screenshots** | Делает и нормализует скриншоты для каталога VK. |
| **vk-app-listing** | Готовит название, локализацию, категорию, политику конфиденциальности и материалы для модерации. |
| **vk-catalog-copy** | Готовит однострочные поля описания без Markdown и показывает точные счётчики. |
| **vk-miniapps-deploy** | Сохраняет версию загрузки, подтверждает код именно для неё и проверяет production HTTP 200. |
| **vk-app-publish** | Оркестрирует preflight, сборку, version-bound deploy, smoke-тесты и отправку в каталог. |

Подробные правила разработки находятся в [`AGENTS.md`](AGENTS.md), а инструкции
для Claude Code — в [`CLAUDE.md`](CLAUDE.md).

## License

MIT
