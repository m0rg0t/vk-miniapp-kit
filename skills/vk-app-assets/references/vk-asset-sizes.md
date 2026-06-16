# VK Mini App asset sizes

The **authoritative source is the VK app admin upload forms** — each field states
its required size and rejects the wrong one. App settings live at
`vk.com/editapp?act=...` (sections: «Настройки», «Каталог»). Confirm there
before a final submission; treat this table as the well-known defaults.

## Icons

| Purpose | Size | File (convention) | Notes |
|---------|------|-------------------|-------|
| Master / source | 1024×1024 | `icon-1024.png` | Keep a high-res square master; all others derive from it. |
| Catalog icon | 576×576 | `icon-576.png` | The square icon shown in the VK catalog. |
| (Optional) smaller | 256×256, 200×200 | `icon-256.png` … | Some legacy slots; generate only if the admin asks. |
| Vector source | — | `icon.svg` | The `create-vk-mini-app` template ships an SVG master. |

Square source in, square sizes out — never feed a non-square image to the icon
path or it distorts.

## Splashscreens (loading background)

| Orientation | Size | File (convention) |
|-------------|------|-------------------|
| Portrait | 1080×1920 | `splashscreen-1080x1920.png` |
| Landscape | 1920×1080 | `splashscreen-1920x1080.png` |
| Vector sources | — | `splashscreen.svg`, `splashscreen-horizontal.svg` |

Portrait and landscape need **separate sources** — stretching one into the other
distorts. The `--splash` / `--splash-landscape` flags keep them independent.

## Related (other skills own these)

| Asset | Size / budget | Skill |
|-------|---------------|-------|
| Catalog screenshots | 600×1200 portrait (or 1200×600) | `vk-catalog-screenshots` |
| Animated launch icon | 96×96, ≤24 KB, Lottie JSON | `vk-lottie-launch-icon` |

## Where assets live

The official template puts them under `public/resources/app/`. Output there so
the build (`dist/`) and `vk-hosting-config.json` pick them up unchanged.
