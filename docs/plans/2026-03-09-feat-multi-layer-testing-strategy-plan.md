---
title: 'feat: Adopt npmx.dev Multi-Layer Testing Strategy'
type: feat
status: active
date: 2026-03-09
reference: npmx.dev testing infrastructure
---

# Adopt npmx.dev Multi-Layer Testing Strategy

## Overview

Port the comprehensive testing strategy from [npmx.dev](https://npmx.dev) to vue-jazz, adapting it from a Nuxt app context to a plain Vue + Vite + Jazz chat app. This upgrades the current minimal setup (2 unit tests, 7 E2E suites) to a multi-layer strategy covering unit, component, accessibility, property-based, and performance testing — with enhanced CI and tooling.

## Problem Statement / Motivation

The vue-jazz project has a solid but early-stage testing foundation. Key gaps:

- **No component tests** — `@vue/test-utils` is installed but unused. Vue SFC behavior is only tested at the E2E level, which is slow and coarse.
- **No accessibility testing** — The codebase has good a11y patterns (`role="log"`, `aria-live`, `sr-only`) but nothing validates they work or prevents regressions.
- **No test fixtures or mock infrastructure** — Each test is self-contained with no shared helpers, making it hard to test Jazz-dependent components.
- **No dead code detection** — Unused exports and components accumulate silently.
- **No coverage tracking** — Unit tests run with coverage locally but CI doesn't upload or gate on it.
- **E2E tests run against dev server, not production build** — PWA features (service worker, install prompt) only work in production builds, so they're never actually E2E tested.
- **Core business logic in `useChat.ts` is untested** — Message sending, image upload validation, pagination slicing have zero unit test coverage.

npmx.dev has solved all of these with a battle-tested multi-layer approach. This plan adapts those patterns for vue-jazz's stack.

## Proposed Solution

Implement testing in 4 phases, each independently valuable:

1. **Foundation** — Vitest projects config (unit: node, component: browser mode), restructure tests, add `useChat.ts` unit tests, fix E2E server
2. **Component Testing** — Jazz-free components first, then Jazz mocking layer + Jazz-dependent components (all in real Chromium via `@vitest/browser-playwright`)
3. **Accessibility + Performance** — axe-core via Playwright, Lighthouse CI
4. **Tooling + Quality** — knip dead code detection, property-based testing, Codecov, enhanced CI

## Technical Considerations

### Jazz Mocking Strategy (Highest Risk)

8 of 14 components depend on Jazz (`useCoState`, `useAccount`, `JazzVueProvider`). The mocking approach:

1. **Create `test/mocks/jazz.ts`** — Stub implementations of `useCoState`, `useAccount`, `useLogOut`, `createImage`
2. **Create a `TestJazzProvider` wrapper** — A mock provider component that supplies the Jazz context via Vue's `provide/inject`
3. **Use plain objects as CoValue mocks** — Objects with the shape of `co.loaded<typeof Message>` including `$isLoaded`, `$jazz.createdBy`, etc.
4. **Check Jazz source** at `/Users/alexanderopalic/projects/opensource/jazz` for any official test utilities before building custom mocks

**Proof of concept needed:** Mount `ChatBubble.vue` with a mock message before committing to this approach.

### Virtual Module Mocking

`ReloadPrompt.vue` imports from `virtual:pwa-register/vue` (a Vite plugin virtual module). In component tests:

- Use `vi.mock('virtual:pwa-register/vue')` with stub implementation
- The vitest config merges with `vite.config.ts` which resolves this; the `projects` config inherits this via `mergeConfig`

### Browser Mode Instead of happy-dom

Component tests use **Vitest browser mode** with `@vitest/browser-playwright` (Chromium) instead of happy-dom. This means:

- **No polyfills needed** — `matchMedia`, `IntersectionObserver`, `ResizeObserver` all work natively in real Chromium
- **No happy-dom limitations** — VueUse composables (`useMediaQuery`, `useNetwork`) work without mocking browser APIs
- **Higher fidelity** — CSS layout, computed styles, and real DOM behavior are tested accurately
- **Trade-off: slightly slower** — Each test spawns a real browser page, but the accuracy gain is worth it for component tests
- Unit tests (pure logic, composables without DOM) still use `environment: 'node'` for maximum speed

### E2E: Dev Server vs Preview Server

Current `playwright.config.ts` starts `pnpm dev --port 4173`. This means:

- PWA service worker is never tested (only works in production builds)
- Performance characteristics don't match production
- CI runs `pnpm build-only` but E2E still uses dev server

**Fix:** Switch to `pnpm preview --port 4173` with `pnpm build-only` as a prerequisite.

## Acceptance Criteria

### Phase 1: Foundation

- [ ] `vitest.config.ts` with `projects` array: `unit` (node env) and `component` (browser mode with Playwright)
- [ ] Install `@vitest/browser-playwright` dev dependency
- [ ] Remove `happy-dom` dev dependency (no longer needed)
- [ ] Existing tests moved from `src/__tests__/` to `test/unit/app/` with working imports
- [ ] `test/unit/app/composables/useChat.spec.ts` — tests for `sendMessage` whitespace validation, `sendImage` 5MB check, `displayedMessages` slicing
- [ ] `playwright.config.ts` switched to `pnpm preview --port 4173`
- [ ] All existing tests still pass
- [ ] New npm scripts: `test:unit`, `test:component` (update existing `test:unit`)

### Phase 2: Component Testing

- [ ] `test/mocks/jazz.ts` — mock implementations for `useCoState`, `useAccount`, `useLogOut`, `createImage`
- [ ] `test/mocks/pwa.ts` — mock for `virtual:pwa-register/vue`
- [ ] `test/setup/component.ts` — setup file with global mocks (no polyfills needed — browser mode provides real APIs)
- [ ] Jazz-free component tests: `ChatInputForm.vue`, `BaseButton.vue`, `BaseInput.vue`, `BaseCard.vue`, `BaseSkeleton.vue`
- [ ] Jazz-dependent component tests: `ChatBubble.vue`, `ChatMessageList.vue`, `BubbleInfo.vue`
- [ ] Console warning spy (fail tests on unexpected `console.warn`) — adapted from npmx.dev's `a11y.spec.ts` pattern

### Phase 3: Accessibility + Performance

- [ ] `axe-core` + `@axe-core/playwright` in E2E tests for full-fidelity a11y audits (not happy-dom — need real layout engine for contrast checks)
- [ ] A11y tests for key pages: chat view (light + dark mode), empty state, loading state
- [ ] `.lighthouserc.cjs` — accessibility score >= 90, CLS = 0
- [ ] Lighthouse CI runs against production build in both light and dark modes
- [ ] npm scripts: `test:a11y`

### Phase 4: Tooling + Quality

- [ ] `fast-check` property-based tests for: `shouldShowInstallPrompt`, `isDismissed`, `displayedMessages` slicing, message text validation
- [ ] `knip.ts` configuration with Vue SFC support, ignore patterns for auto-generated routes and virtual modules
- [ ] Codecov coverage upload from unit + component tests (merged report)
- [ ] Enhanced CI workflow with 7+ parallel jobs: lint, types, unit, component, e2e, a11y, knip
- [ ] npm scripts: `knip`, `knip:fix`

## Test Directory Structure (Target)

```
test/
  unit/                          # Pure logic, node environment (Vitest)
    app/
      composables/
        useChat.spec.ts          # Core chat business logic
        usePwaInstall.spec.ts    # Moved from src/__tests__/
        useChatIdClipboard.spec.ts
        useOnline.spec.ts
      utils/                     # If utility functions are extracted
    schema.spec.ts               # Moved from src/__tests__/
  component/                     # Vue SFC tests, browser mode via Playwright (Vitest + @vue/test-utils)
    chat/
      ChatInputForm.spec.ts
      ChatBubble.spec.ts
      ChatMessageList.spec.ts
      BubbleInfo.spec.ts
    ui/
      BaseButton.spec.ts
      BaseInput.spec.ts
      BaseCard.spec.ts
    InstallPrompt.spec.ts
    NetworkStatus.spec.ts
    ReloadPrompt.spec.ts
  e2e/                           # Full app flows, Chromium (Playwright)
    app.test.ts                  # Existing
    chat-creation.test.ts        # Existing
    clipboard.test.ts            # Existing
    messaging.test.ts            # Existing
    multi-user.test.ts           # Existing
    navigation.test.ts           # Existing
    profile.test.ts              # Existing
    a11y.test.ts                 # NEW: axe-core page-level audits
    test-utils.ts                # NEW: Extended Playwright fixtures
  fixtures/                      # Mock data for deterministic testing
    jazz/
      messages.ts                # Mock Message CoValues
      chats.ts                   # Mock Chat CoLists
      accounts.ts                # Mock Account objects
  mocks/
    jazz.ts                      # community-jazz-vue module mock
    pwa.ts                       # virtual:pwa-register/vue mock
  setup/
    component.ts                 # global mocks (no polyfills — browser mode provides real APIs)
```

## Key Configuration Files

### `vitest.config.ts` (UPDATED)

```typescript
import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      coverage: {
        provider: 'v8',
        exclude: [
          'node_modules/**',
          'dist/**',
          'dev-dist/**',
          'coverage/**',
          'test/**',
          '**/*.config.{ts,js}',
          '**/*.d.ts',
        ],
      },
      projects: [
        {
          test: {
            name: 'unit',
            environment: 'node',
            include: ['test/unit/**/*.spec.ts'],
          },
        },
        {
          test: {
            name: 'component',
            include: ['test/component/**/*.spec.ts'],
            setupFiles: ['test/setup/component.ts'],
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
)
```

### Updated `package.json` scripts

```json
{
  "test": "vitest",
  "test:unit": "vitest run --project unit",
  "test:component": "vitest run --project component",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:a11y": "pnpm build-only && pnpm test:a11y:prebuilt",
  "test:a11y:prebuilt": "./scripts/lighthouse.sh",
  "knip": "knip",
  "knip:fix": "knip --fix"
}
```

### Updated `.github/workflows/ci.yml` (Target: 7 jobs)

| Job         | What                                                              | Dependencies |
| ----------- | ----------------------------------------------------------------- | ------------ |
| `lint`      | oxlint + oxfmt check                                              | —            |
| `types`     | `vue-tsc --build`                                                 | —            |
| `unit`      | `pnpm test:unit --coverage` + Codecov upload                      | —            |
| `component` | `pnpm test:component`                                             | —            |
| `e2e`       | Install chromium, `pnpm build-only`, `pnpm test:e2e`              | —            |
| `a11y`      | Install chromium, `pnpm build-only`, Lighthouse CI (dark + light) | —            |
| `knip`      | Dead code detection                                               | —            |

Build artifact sharing: E2E and a11y jobs both need `pnpm build-only`. Use `actions/upload-artifact` / `actions/download-artifact` to avoid rebuilding.

## Dependencies & Risks

### New Dependencies

| Package                      | Purpose                                   | Phase |
| ---------------------------- | ----------------------------------------- | ----- |
| `@vitest/browser-playwright` | Browser mode provider for component tests | 1     |
| `axe-core`                   | Accessibility engine                      | 3     |
| `@axe-core/playwright`       | Playwright a11y integration               | 3     |
| `fast-check`                 | Property-based testing                    | 4     |
| `knip`                       | Dead code detection                       | 4     |
| `@lhci/cli`                  | Lighthouse CI                             | 3     |

### Removed Dependencies

| Package     | Reason                                                          |
| ----------- | --------------------------------------------------------------- |
| `happy-dom` | Replaced by Vitest browser mode — real Chromium is used instead |

### Risks

| Risk                                                    | Likelihood | Mitigation                                                                                                     |
| ------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| Jazz mocking is complex and brittle                     | High       | Check Jazz source for official test utils first; start with Jazz-free components; create POC before committing |
| Browser mode CI overhead (Chromium install)             | Medium     | E2E already installs Playwright browsers; component tests reuse the same Chromium binary                       |
| Lighthouse CI is flaky due to Jazz WebSocket dependency | Medium     | Consider mocking the Jazz backend or using lenient initial thresholds                                          |
| knip produces many false positives with Vue SFCs        | Medium     | Configure Vue plugin, add ignore patterns, run manually first to establish baseline                            |
| CODECOV_TOKEN secret not configured                     | Low        | Check repo settings before adding CI job                                                                       |

## Component Testing Priority

Ordered by independence from Jazz (easiest → hardest):

| Priority | Component             | Jazz Dependency                   | Complexity                                          |
| -------- | --------------------- | --------------------------------- | --------------------------------------------------- |
| 1        | `ChatInputForm.vue`   | None                              | Low — pure form UI                                  |
| 2        | `BaseButton.vue`      | None                              | Low — CVA variants                                  |
| 3        | `BaseInput.vue`       | None                              | Low — CVA variants                                  |
| 4        | `BaseCard.vue`        | None                              | Low — slot wrapper                                  |
| 5        | `BaseSkeleton.vue`    | None                              | Low — CSS-only                                      |
| 6        | `InstallPrompt.vue`   | None (uses VueUse)                | Low — browser mode provides real `matchMedia`       |
| 7        | `NetworkStatus.vue`   | None (uses VueUse)                | Low — browser mode provides real `navigator.onLine` |
| 8        | `ReloadPrompt.vue`    | None (uses virtual module)        | Medium — needs `virtual:pwa-register/vue` mock      |
| 9        | `ChatMessageList.vue` | Props only (receives `Message[]`) | Medium — needs mock message objects                 |
| 10       | `ChatBubble.vue`      | Props only (receives `Message`)   | Medium — needs mock message + image                 |
| 11       | `BubbleInfo.vue`      | Deep (`useCoState(Account, ...)`) | High — needs full Jazz mock provider                |
| 12       | `ChatImage.vue`       | Deep (Jazz `Image` component)     | High — imports from `community-jazz-vue`            |

## Property-Based Testing Targets

| Function                  | Property / Invariant                                                                           | Source                             |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| `shouldShowInstallPrompt` | Exhaustive truth table: only `true` when `(canInstall \|\| isIos) && !installed && !dismissed` | `src/composables/usePwaInstall.ts` |
| `isDismissed`             | Monotonic: dismissed at time `t` implies dismissed at all `t' < t` within 30 days              | `src/composables/usePwaInstall.ts` |
| `isDismissed`             | Boundary: exactly 30 days = dismissed, 30 days + 1ms = not dismissed                           | `src/composables/usePwaInstall.ts` |
| `displayedMessages`       | Slice invariants: length <= limit, preserves order, last N of source                           | `src/composables/useChat.ts`       |
| Message text validation   | Whitespace-only strings always rejected; non-whitespace always accepted                        | `src/composables/useChat.ts`       |
| Image size validation     | Files > 5MB always rejected; files <= 5MB always accepted                                      | `src/composables/useChat.ts`       |

## References & Research

### Internal References

- Current vitest config: `vitest.config.ts`
- Current playwright config: `playwright.config.ts`
- Current CI: `.github/workflows/ci.yml`
- Core business logic: `src/composables/useChat.ts`
- Jazz schema: `src/schema.ts`
- Jazz provider: `src/RootApp.vue`
- Jazz source reference: `/Users/alexanderopalic/projects/opensource/jazz`

### External References (npmx.dev patterns adapted)

- Vitest workspace config: `/Users/alexanderopalic/projects/opensource/npmx.dev/vitest.config.ts`
- axe-core a11y testing: `/Users/alexanderopalic/projects/opensource/npmx.dev/test/nuxt/a11y.spec.ts`
- Console warning spy pattern: `/Users/alexanderopalic/projects/opensource/npmx.dev/test/nuxt/a11y.spec.ts:67-89`
- Playwright fixtures with hydration detection: `/Users/alexanderopalic/projects/opensource/npmx.dev/test/e2e/test-utils.ts`
- Fixture-based mocking: `/Users/alexanderopalic/projects/opensource/npmx.dev/test/fixtures/mock-routes.cjs`
- Lighthouse CI config: `/Users/alexanderopalic/projects/opensource/npmx.dev/.lighthouserc.cjs`
- CI workflow (8 parallel jobs): `/Users/alexanderopalic/projects/opensource/npmx.dev/.github/workflows/ci.yml`
- Property-based testing: `/Users/alexanderopalic/projects/opensource/npmx.dev/test/unit/shared/utils/async.spec.ts`
- Testing docs: `/Users/alexanderopalic/projects/opensource/npmx.dev/TESTING-CI-QUALITY.md`
