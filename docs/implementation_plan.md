# BuggyBag — Plan to Make It Truly World-Class

## Goal
Transform BuggyBag from a basic screenshot+description tool into a **professional-grade AI-powered bug intelligence platform** where every bug report contains all information a developer needs to fix the issue without asking a single follow-up question — and can be sent directly to AI models with screenshots.

---

## Current State Assessment

| What works | What's missing |
|---|---|
| Screenshot capture ✅ | Pin has no DOM context |
| Network requests (fetch) ✅ | `eventLog` window = 30s (too short) |
| Console errors ✅ | `filePath` never populated (fiber `_debugSource` unused) |
| React component name ✅ | Prompt ignores 90% of `tech_context` |
| Store snapshot ✅ | No AI send (only copy-paste) |
| Event log (clicks/nav) ✅ | No request/response bodies for errors |
| Severity auto-calc ✅ | No DOM selector for pin location |

---

## Tasks — Execute One Per Conversation

---

### ✅ Task 1 — PIN → DOM Element Context
**What:** When a user places a pin, capture the DOM element under that pin point using `document.elementFromPoint(x, y)`. Store: tagName, id, classes, unique CSS selector (generated), aria-label, inner text (trimmed), bounding rect, and the React component from fiber.

**Why this first:** This is the single most impactful change. Every pin becomes "Pin #1 on `<button id="submit-order">` in component `CheckoutForm`" instead of just "x=342, y=210".

**Files to change:**
- `buggy-bag/src/types.ts` — add `PinElementContext` to `DrawShape`
- `buggy-bag/src/lib/collector.ts` — add `getPinElementContext(x, y)` function
- `buggy-bag/src/components/CaptureMode.tsx` — call `getPinElementContext` when pin is placed in `handleShapeComplete`
- `buggy-bag/src/lib/collector.ts` — improve `findReactComponent` to also extract `_debugSource.fileName` + `lineNumber` (dev builds)

**New data shape:**
```ts
interface PinElementContext {
  tagName: string;
  id?: string;
  classes: string[];
  selector: string;        // e.g. "button#add-to-cart"
  ariaLabel?: string;
  innerText?: string;      // first 80 chars
  reactComponent?: {
    name: string;
    filePath?: string;     // from fiber._debugSource
    lineNumber?: number;
    props?: Record<string, unknown>;
  };
  boundingRect: { x: number; y: number; width: number; height: number };
}
```

**Portal:** Update `BugDetailModal` to display pin DOM context per annotation. Update prompt formatters to include selector + component file.

---

### 🟩 Task 2 — Extended Event Log (5min window + richer events)
**What:** Extend the event collection window from 30s to 5 minutes. Add more event types: form field changes (input/select, with field name not value), scroll milestones, focus events, key shortcuts. Add timestamps relative to bug report ("3m 24s before report").

**Why:** "Кроки відтворення не завжди показуються" — це тому що 30s вікно. З 5 хв все буде.

**Files:**
- `buggy-bag/src/lib/collector.ts`:
  - `EVENT_WINDOW_MS` → `5 * 60 * 1000`
  - Add `patchFormEvents()` — tracks `change` events on `input`, `select`, `textarea` (field name only, not value, for privacy)
  - Add relative timestamps to `EventLogEntry`
  - Increase `MAX_EVENTS` from 50 → 100

**New event types:**
```ts
type EventType = 'navigation' | 'click' | 'network_error' | 'console_error' 
  | 'store_change' | 'form_change' | 'scroll' | 'focus';
```

---

### 🟩 Task 3 — Extended Network Capture (request/response body for errors)
**What:** For failed requests (status ≥ 400), capture request body (first 500 chars) and response body (first 500 chars). Also capture request headers (excluding Auth/Cookie/sensitive). Add XHR interception alongside fetch.

**Why:** "POST /api/checkout → 422" tells you nothing. "POST /api/checkout → 422, body: `{quantity: -1}`" tells you everything.

**Files:**
- `buggy-bag/src/types.ts` — extend `NetworkRequest` with `requestBody?`, `responseBody?`, `requestHeaders?`
- `buggy-bag/src/lib/collector.ts` — update `patchFetch()` to read bodies on error; add `patchXHR()` for XMLHttpRequest
- `buggy-bag-portal/src/lib/types.ts` — mirror the type update
- `buggy-bag-portal/src/components/bugs/BugDetailModal.tsx` — show request/response bodies in network section

**Privacy guards:** Redact passwords, tokens from bodies. Truncate at 500 chars. Only capture for error responses.

---

### 🟩 Task 4 — Direct AI Send (Vision API with Screenshots)
**What:** Add ability to send bugs directly to AI (Anthropic Claude / OpenAI GPT-4o) with the screenshot image included via vision API. Portal gets a new "Send to AI" button that uses a server-side API route (to protect API keys) and returns the AI-generated analysis in-app.

**Architecture:**
```
Portal UI → POST /api/ai-analyze → Server (holds API key) → Anthropic/OpenAI API → Response shown in portal
```

**Files:**
- `buggy-bag-portal/src/app/api/ai-analyze/route.ts` — **NEW** — server route that calls Claude/GPT with structured bug data + base64 image
- `buggy-bag-portal/.env.local` — add `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- `buggy-bag-portal/src/components/bugs/AIAnalysisPanel.tsx` — **NEW** — UI component showing AI response with streaming support
- `buggy-bag-portal/src/components/bugs/BugDetailModal.tsx` — integrate AI panel
- `buggy-bag-portal/src/components/bugs/PromptGenerator.tsx` — add "Send to AI" button alongside "Copy"

**AI prompt construction:** Uses all collected context — screenshot (base64), pin DOM selectors, console errors, network errors, event log steps, component name + file path. Returns structured JSON: `{ title, description, stepsToReproduce, expectedBehavior, actualBehavior, suggestedFix, affectedFiles[], severity }`.

**User config:** Settings screen in portal where user enters their AI API key (stored in Supabase per-project, encrypted).

---

### 🟩 Task 5 — `data-buggy-source` Data Hints System
**What:** Allow client sites to annotate HTML elements with data attributes that describe where the data comes from. The widget reads these at pin time and includes them in the report.

**Usage (client adds to their code):**
```html
<span data-buggy-source="supabase:products.price">$99</span>
<input data-buggy-source="store:cart.quantity" />
<div data-buggy-source="api:/products/:id">...</div>
```

**Widget reads:** when pin is placed on element, walks up DOM collecting any `data-buggy-source` attributes within the element and its parents (up to 3 levels).

**Result in report:**
> Pin #2 on `<span>` — Data source: `supabase:products.price`

**Files:**
- `buggy-bag/src/lib/collector.ts` — add `readDataSources(element)` function
- `buggy-bag/src/types.ts` — add `dataSources?: string[]` to `PinElementContext`
- Portal `BugDetailModal` + prompt formatters — display/include data sources

**Also add JS API:**
```ts
BuggyBag.registerDataSource(selector, source)
// e.g. BuggyBag.registerDataSource('#price', 'supabase:products.price')
```

---

### 🟩 Task 6 — Store Diff (Baseline → Bug State)
**What:** Capture a "baseline" store snapshot when the page first loads. At bug report time, compare it to the current snapshot and show only the fields that changed. This gives developers instant "what changed in state before the bug".

**Result:**
```diff
- cart.items: []
+ cart.items: [{id: 5, qty: -1}]
- checkout.step: 1
+ checkout.step: 3
```

**Files:**
- `buggy-bag/src/lib/collector.ts` — save baseline snapshot in `initCollector()`, add `getStoreDiff()` function
- `buggy-bag/src/types.ts` — add `storeDiff?: Record<string, { before: unknown; after: unknown }>` to `TechContext`
- Portal `BugDetailModal` — render diff view with before/after columns
- Prompt formatters — include diff in context

---

### 🟩 Task 7 — Rebuilt AI Prompt Engine (Rich Context + Quality Score 2.0)
**What:** Rebuild the prompt generator to use ALL the new data collected in Tasks 1–6. Add new template: **"Developer Handoff"** that generates a full GitHub issue–style report. Improve quality score to account for new data points. Add inline preview of what AI will see (including screenshot thumbnail). Fix `generate-ai-prompt` API route to include all tech_context.

**New quality score factors:**
| Factor | Points |
|---|---|
| Has description | 20 |
| Has screenshot | 20 |
| Has DOM selector (pin context) | 15 |
| Has steps to reproduce | 15 |
| Has component + filePath | 10 |
| Has network/console data | 10 |
| Has store diff | 5 |
| Has data sources | 5 |

**New template — "GitHub Issue":**
```markdown
## Bug Report: {description}

**Component:** `CheckoutForm` (`src/components/CheckoutForm.tsx:42`)
**Route:** `/checkout`
**Severity:** High

### Element
Pin #1 on `<button id="submit-order">` (CheckoutForm > SubmitButton)
Data source: `supabase:orders.status`

### Steps to Reproduce
1. Navigated to /checkout
2. Changed quantity field to -1
3. Clicked "Submit order"

### Expected vs Actual
**Expected:** Order validation error shown
**Actual:** 500 Internal Server Error

### Technical Evidence
- `POST /api/orders → 500` (body: `{"quantity":-1}`)
- Console: `TypeError: Cannot read property 'validate' of undefined [OrderService.ts:87]`

### State Change
- `cart.items[0].quantity`: `1` → `-1`
```

**Files:**
- `buggy-bag-portal/src/components/bugs/PromptGenerator.tsx` — add GitHub template, update all templates with new context, improve quality score
- `buggy-bag-portal/src/app/api/generate-ai-prompt/route.ts` — full rewrite to use all tech_context fields
- `buggy-bag-portal/src/components/bugs/PromptGenerator.tsx` — screenshot thumbnail preview, send-to-AI integration

---

## Execution Order

```
Task 1  →  Task 2  →  Task 3  →  Task 4  →  Task 5  →  Task 6  →  Task 7
 (PIN)    (Events)  (Network)    (AI Send)  (DataSrc)  (Diff)    (Prompt)
```

Each task is self-contained and delivers immediate value. Tasks 1–3 improve data collection. Task 4 adds AI send (biggest UX win). Tasks 5–6 add professional-grade context. Task 7 ties it all together.
