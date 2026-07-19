---
name: vk-app-plan
description: Turn a VK Mini App idea into a build-ready product brief with target users, core loop, MVP boundary, screen and route map, VKUI interaction plan, VK Bridge capabilities, launch parameters, data/privacy needs, analytics events, monetization choice, risks, and testable acceptance criteria. Use when the user has an app idea, asks what to build, needs requirements or architecture before implementation, or says “продумай/спроектируй VK мини-приложение”. Use before vk-app-scaffold for greenfield work and to re-scope an existing app whose behavior is unclear.
---

# Plan a VK Mini App

Convert a fuzzy idea into decisions a builder can implement and a reviewer can
verify.

## Workflow

1. Inspect any existing app, notes, audience data, and constraints. Ask only for
   a decision that would materially change the product; otherwise state a
   reasonable assumption and continue.
2. Define one primary user and one sentence for the problem, promised outcome,
   and repeatable core loop.
3. Cut the MVP. Separate must-have behavior from later ideas and explicit
   non-goals. Favor a complete narrow loop over many disconnected features.
4. Map the experience into panels/routes and define loading, empty, error,
   offline, permission-declined, and return-user states.
5. Map platform requirements:
   - required `VKWebApp*` methods and receive-only events;
   - launch parameters/deep links;
   - per-user storage, backend, or VK API data;
   - permissions and failure behavior;
   - sharing, notifications, ads, or payments only if justified.
6. Define an analytics funnel with named events and no unnecessary personal
   data.
7. Record privacy and moderation implications from actual data behavior.
8. Write measurable acceptance criteria and the minimum test matrix.

Use `references/product-brief-template.md` as the output skeleton. Put the brief
in the app repository, conventionally `docs/product-brief.md`.

## Decision rules

- Default the interface to VKUI; defer component-level design to
  `vk-app-design`.
- Require a user benefit before adding a Bridge permission or monetization
  interruption.
- Treat a Bridge decline, unavailable client method, timeout, and missing launch
  parameter as normal states.
- Never invent catalog claims that cannot be demonstrated in the MVP.
- Mark external facts that must be confirmed in the current VK admin or official
  documentation.

## Done when

- A developer can identify every MVP screen, state, data source, and Bridge call.
- Acceptance criteria describe observable behavior, including failure paths.
- Non-goals protect the first release from scope creep.
- The brief feeds directly into `vk-app-scaffold`, `vk-app-design`,
  `vk-bridge-recipes`, and `vk-app-test`.
