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
| **vk-app-assets** | Create or derive a visual direction, then generate/resize icons and splashscreens to required sizes. |
| **vk-lottie-launch-icon** | Author or validate a Lottie animated launch icon (96×96, ≤24 KB, seamless loop). |
| **vk-app-scaffold** | Bootstrap a new VK Mini App on the current official React + VKUI + Bridge + router + Vite stack. |
| **vk-app-design** | Design and implement native-feeling, adaptive, accessible flows with VKUI. |
| **vk-bridge-recipes** | Add vk-bridge features (init, ads, analytics, theme, share, storage) with a dev-mock fallback and prod-visible diagnostics. |
| **vk-app-test** | Run local, unit, integration, and browser tests with controlled VK Bridge mock scenarios. |
| **vk-app-listing** | Produce names, short/full descriptions, privacy text, localization, and a complete catalog asset manifest. |
| **vk-app-publish** | Build, package `build.zip`, deploy via `vk-miniapps-deploy`, and run a catalog submission checklist. |

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
- **Local development is a first-class release gate.** The test skill supports
  the official `@vkontakte/vk-bridge-mock` package for standalone browser
  sessions when its Bridge-major coverage is compatible, plus a current,
  deterministic Vitest controller for success, decline, timeout, and client
  events.
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
check scripts and JSON manifests; for `vk-app-test`, also run its readiness
checker against both an intentionally incomplete fixture and a complete app
fixture, then execute the bundled Vitest mock scenarios.

## Русский

`vk-miniapp-kit` — набор Agent Skills для полного цикла разработки
VK Mini Apps: от идеи и продуктового плана до реализации на VKUI, локального
тестирования с моками VK Bridge, подготовки материалов для каталога и публикации.
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
| **vk-app-test** | Настраивает локальную разработку, моки VK Bridge, Vitest и браузерные сценарии. |
| **vk-app-assets** | Создаёт и проверяет логотипы, иконки и заставки приложения. |
| **vk-lottie-launch-icon** | Создаёт или проверяет анимированную Lottie-иконку запуска. |
| **vk-catalog-screenshots** | Делает и нормализует скриншоты для каталога VK. |
| **vk-app-listing** | Готовит название, короткое и полное описание, локализацию, текст политики конфиденциальности и манифест материалов. |
| **vk-app-publish** | Собирает, упаковывает, развёртывает и проверяет приложение перед отправкой в каталог. |

Подробные правила разработки находятся в [`AGENTS.md`](AGENTS.md), а инструкции
для Claude Code — в [`CLAUDE.md`](CLAUDE.md).

## License

MIT
