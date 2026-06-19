# BuggyBag vs ринок: конкурентний аналіз (червень 2026)

## TL;DR — чесна відповідь

**Чи придумав я те, що вже існує? Частково так, частково ні.**

- Базова механіка «скріншот + пін + анотація + опис бага» — **давно існує**. Це переповнена ніша: Marker.io, BugHerd, Usersnap, Userback, Pastel/Markup.io роблять це з 2010-х.
- Глибокий захват технічного контексту (console, network, події користувача) — **теж не унікально**. Jam.dev і Bird Eats Bug роблять дуже близьке (хоч через video-recording, а не live screenshot+drawing).
- Найсильніша фішка BuggyBag — передача бага напряму в AI-агента (Cursor/Claude/Antigravity) — **ідея вже не нова в принципі**: у 2026 і Jam.dev (Jam MCP), і Userback (Userback MCP) вже підключають контекст бага до Cursor/Claude Code/Windsurf/VS Code/ChatGPT. Але **механізм відрізняється** (деталі — розділ 7).
- Те, чого реально не знайдено в жодного з 7 досліджених конкурентів: резолюція React-компонента + файл:рядок прямо на піні (через стандартний React dev-режим `_debugSource`, без окремого build-плагіна), diff стейту zustand/redux, явні `data-buggy-source` data-provenance хінти, вбудований design-audit, і власне Quality Score 2.0 з готовими prompt-шаблонами під конкретного агента.
- Велика структурна відмінність: BuggyBag — **self-hosted, MIT, безкоштовний** npm-пакет, який ти сам інтегруєш у свій Next.js+Supabase портал. Всі 7 конкурентів — **платні SaaS** ($8–$249+/міс). Тобто ми, ймовірно, навіть не конкуруємо за того самого покупця.

---

## 1. До якої категорії належить BuggyBag

Ринок ділиться на два табори, і BuggyBag сидить на стику:

1. **Visual feedback widgets** (Marker.io, BugHerd, Usersnap, Userback, Pastel/Markup.io) — пін на елементі сторінки + коментар, орієнтовані на агенції/клієнтів/UAT, віджет видимий кінцевим користувачам за дизайном.
2. **Dev-context recorders** (Jam.dev, Bird Eats Bug) — запис сесії з логами консолі/мережі, орієнтовані на розробників, рідше client-facing.

BuggyBag ближче до (2), але з механікою пінів із (1), і додає третій, відсутній у конкурентів шар: **React dev-context + AI-agent prompt engineering**, націлений вузько на команди, що тестують AI-згенерований код (це прямо написано в `README.md`: «Зроблено для команд, які тестують AI-генерований код»).

---

## 2. Огляд конкурентів

| Інструмент | Аудиторія / тип | Підключення | Ціна (старт) | Посилання |
|---|---|---|---|---|
| **BuggyBag (наш)** | Internal QA для AI-генерованого коду | npm React-компонент / standalone `<script>`, self-hosted | **Безкоштовно** (MIT, self-host) | [GitHub](https://github.com/ArthurMospan/buggy-bag-widget) |
| **Marker.io** | Агенції, client UAT | code snippet, WordPress plugin, browser extension, CMS-інтеграції | від $39/міс (15-денний trial) | [Pricing](https://marker.io/pricing) · [Install](https://help.marker.io/en/articles/4667238-install-the-widget) |
| **BugHerd** | Агенції/клієнти, website feedback | guest-link (без реєстрації) або JS snippet (від Premium) або browser extension | $41 → $66 → $124/міс | [bugherd.com](https://bugherd.com/) · [Огляд цін](https://www.softwaresuggest.com/bugherd) |
| **Usersnap** | Feedback + опитування + screen recording | унікальний JS snippet на «простір», live/pause toggle | ~€49 → €109 → €159/міс | [Pricing](https://usersnap.com/pricing) |
| **Userback** | Customer feedback + NPS + AI-handoff | script tag перед `</body>` + Widget Access Token, browser extension, **MCP-сервер** | per-seat (зростає з командою, точні цифри — на сайті) | [Userback MCP docs](https://docs.userback.io/docs/userback-mcp) · [Install methods](https://docs.userback.io/docs/widget-installation-methods) |
| **Jam.dev** | Bug-capture для розробників, AI-debugging | Chrome extension (1 клік запис), **Jam MCP** | Free → ~$12–14/користувач/міс (annual) | [Jam MCP docs](https://jam.dev/docs/jam-mcp) · [Pricing (G2)](https://www.g2.com/products/jam-dev/pricing) |
| **Bird Eats Bug** | No-code screen-recording bug report | Chrome extension або Web SDK widget (без реєстрації для кінцевого юзера) | $8/користувач/міс (до 20), $20/доп. місце; free 15 завантажень/міс | [Pricing](https://birdeatsbug.com/pricing) · [Browser extension](https://birdeatsbug.com/feature/browser-extension) |
| **Pastel / Markup.io** | No-code feedback на сайтах/PDF/дизайнах | відкриваєш URL у браузерному canvas, нічого не встановлюється | Pastel $29→$83→$350/міс; Markup.io Pro $79/міс | [Markup.io alternatives/pricing огляд](https://webvizio.com/blog/8-best-markup-io-alternatives-with-pricing-comparison/) |

> Примітка щодо точності цін: цифри взято з агрегаторів (G2, SoftwareSuggest, Capterra) і офіційних pricing-сторінок станом на червень 2026; деякі джерела дають дещо різні числа (особливо Usersnap — $98 за одним джерелом, €49 за іншим). Перед прийняттям рішень — перевір актуальну ціну за прямим лінком вище.

---

## 3. Детальна матриця можливостей

| Можливість | **BuggyBag** | Marker.io | BugHerd | Usersnap | Userback | Jam.dev | Bird Eats Bug | Pastel/Markup.io |
|---|---|---|---|---|---|---|---|---|
| Screenshot + малювання (область/стрілка/пін/лінійка) | ✅ | ✅ | ✅ | ✅ | ✅ | відео, не малювання | відео, не малювання | ✅ |
| Пін на конкретному DOM-елементі | ✅ + CSS selector | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ | ✅ |
| Guest-link / без реєстрації для не-розробника | ➖ (потрібен npm/script) | ✅ (WP-plugin) | ✅ (guest link) | ✅ | ✅ | ✅ (extension) | ✅ (Web SDK) | ✅ |
| Browser-extension шлях підключення | ➖ | ✅ | ✅ | ➖ | ✅ | ✅ (основний) | ✅ (основний) | ➖ |
| Build-time інтеграція (Vite/Webpack plugin) | ➖ * (заготовка в репо, не підключена до пакету) | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| React-компонент + filePath:line на піні | ✅ (React dev `_debugSource`, без build-плагіна; лише dev-режим) | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| Відео-запис сесії (а не статичний скріншот) | ➖ | ➖ | ➖ | частково (screen recording) | ➖ | ✅ | ✅ | ➖ |
| Console errors / unhandled exceptions | ✅ | ❔ не задокументовано | ❔ не задокументовано | ❔ не задокументовано | ✅ (через extension) | ✅ | ✅ | ➖ |
| Network requests з тілами помилок (≥400) | ✅ (fetch+XHR патч) | ➖ | ➖ | ➖ | ✅ (extension) | ✅ | ✅ | ➖ |
| Event log дій користувача (click/nav/scroll/form) | ✅ (5 хв, relativeMs) | ➖ | ➖ | ➖ | ➖ | ✅ (через відео+actions) | ✅ | ➖ |
| State management diff (zustand/redux, before→after) | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| Явні data-provenance хінти (`data-buggy-source`) | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| Design-audit (фонти/кольори/spacing/border-radius) | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| Готовий AI-prompt під конкретний агент (copy-paste) | ✅ (4 шаблони + Quality Score 2.0) | ➖ | ➖ | ➖ | ➖ | ➖ (MCP, не темплейт) | ➖ | ➖ |
| Live AI-agent доступ до контексту (MCP, pull-модель) | ➖ | ➖ | ➖ | ➖ | ✅ | ✅ | ➖ | ➖ |
| Push issue у GitHub/Jira/YouTrack/Linear | ✅ (GitHub, YouTrack) | ✅ (integrations) | ✅ (Jira, Trello) | ✅ (Jira) | ✅ | ✅ (Jira, Linear) | ✅ (Jira, GitHub, Linear, Trello) | ❔ |
| Self-hosted / open-source | ✅ MIT | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| Розрахований на видимість для зовнішніх клієнтів | ➖ (прихований за замовчуванням, internal QA) | ✅ | ✅ | ✅ | ✅ | ➖ (internal) | ✅ | ✅ |
| Mobile native SDK (iOS/Android) | ➖ (тільки web + simulated/real touch-flow) | ❔ | ❔ | ❔ | ✅ | ❔ | ❔ | ➖ |

✅ — є, ➖ — не знайдено в публічних матеріалах, ❔ — не вдалось підтвердити публічно (не означає «немає», просто не задокументовано).

\* У `buggy-bag/src/` є `vite-plugin.ts` і `webpack-loader.ts` — Babel AST-трансформація, що інжектить `data-source-file`/`data-source-line` в JSX на етапі білда. Це **не** живий продуктовий шлях: файли не експортуються з `index.ts`, не згадані в `README.md`, і runtime-колектор (`lib/collector.ts`) їх не читає взагалі — він бере file:line з React-івського `_debugSource` на Fiber-вузлі, який React сам додає в dev-режимі без жодного нашого плагіна. Це й була свідома відмова від build-плагіна як обов'язкового кроку підключення — рівно те рішення, яке ти пригадав: змушувати юзера конфігурувати Vite/Webpack заради однієї фічі — зайвий напряг, тож лишили це закодженим, але не підключеним.

---

## 4. Як виглядає підключення в конкурентів — детально

**Marker.io.** Три шляхи: (1) вставити JS-сніпет перед `</head>`; (2) встановити офіційний WordPress-плагін без коду — можна показувати віджет усім відвідувачам або лише залогіненим; (3) браузерне розширення для тестування на продакшн-сайтах без зміни коду. Старт від $39/міс, 15-денний trial.
[Install the Widget](https://help.marker.io/en/articles/4667238-install-the-widget) · [Інтеграція у веб-апку](https://help.marker.io/en/articles/5546520-how-to-integrate-marker-io-into-your-web-app)

**BugHerd.** Найпростіший шлях для клієнтів — **guest-link**: клієнт відкриває посилання, бачить віджет BugHerd прямо на твоєму сайті, без акаунту, без розширення. Для команди — browser extension або JS snippet (snippet-інсталяція відкривається лише з плану Premium, $124/міс). Необмежена кількість гостей на всіх планах.
[bugherd.com](https://bugherd.com/)

**Usersnap.** Кожен «простір» (workspace) має унікальний JS-сніпет; після вставки в код активація/деактивація відбувається перемикачем live/pause у дашборді — без редеплою. Сильна сторона — готові інтеграції (Jira автоматично підтягує device/resolution/URL, Intercom, Zapier).
[Usersnap Pricing](https://usersnap.com/pricing)

**Userback.** Script tag перед `</body>` з Widget Access Token; підтримує sync/async завантаження. Окремо є browser extension — для internal QA команд і складних/захищених застосунків, де віджет на сторінці не підходить. Плюс — **Userback MCP**: OAuth-авторизація, після якої AI-агент (Claude, Cursor, VS Code, ChatGPT, Windsurf) сам підтягує деталі фідбеку, коментарі, console/network логи й контекст workflow — без копіювання, без перемикання вкладок.
[Userback MCP](https://docs.userback.io/docs/userback-mcp) · [Install methods](https://docs.userback.io/docs/widget-installation-methods) · [Як підключити AI-тули до фідбеку](https://userback.io/blog/connect-ai-tools-to-user-feedback/)

**Jam.dev.** Основний шлях — Chrome-розширення (не працює в Opera/Brave/Firefox): один клік — запис екрана, скріншот або replay щойно сталого бага; кожен Jam одразу містить network requests, дані браузера, кроки відтворення. Окремо — **Jam MCP**: вставляєш лінк на Jam у Cursor/Claude Code/VS Code/Windsurf — і відео, events, console-логи, network-запити та навіть транскрипт голосового фідбеку підвантажуються прямо в контекст агента.
[Jam MCP docs](https://jam.dev/docs/jam-mcp) · [Meet the new Jam MCP](https://jam.dev/blog/meet-the-new-jam-mcp/)

**Bird Eats Bug.** Два шляхи: Chrome-розширення для команди, або Web SDK widget, який можна вбудувати в продукт так, щоб будь-хто (включно з клієнтом) міг репортнути баг без реєстрації й без розширення (кастомізація — у Premium). Інтеграції: Jira, GitHub, Slack, Zapier, Linear, Trello.
[Pricing](https://birdeatsbug.com/pricing) · [Browser extension](https://birdeatsbug.com/feature/browser-extension)

**Pastel / Markup.io.** Нічого не встановлюється: відкриваєш URL сайту у фірмовому браузерному canvas-перегляді, лишаєш коментарі прямо на «живій» версії сторінки чи PDF/дизайн-файлі. Максимально no-code, але й найменш «технічний» — без захвату console/network/коду взагалі.

---

## 5. Чого немає в BuggyBag (варто розглянути)

- **No-code / guest-режим для нетехнічних людей.** Зараз вхід — npm-пакет або (частково) standalone-скрипт; немає аналога BugHerd-guest-link чи Pastel-style «просто відкрий URL», де взагалі нічого не треба підключати до коду.
- **Відео-запис сесії з таймлайном.** BuggyBag робить статичний скріншот + анотації; Jam.dev, Bird Eats Bug, Usersnap і Userback (через extension) дають повний screen recording — це сильно знижує бар'єр для нетехнічного репортера, який не вміє точно описати кроки.
- **MCP-сервер (pull-модель).** У нас лише push (скопіюй готовий промпт). Jam і Userback дозволяють агенту самому «відкрити» баг-сесію та довитягнути додаткові деталі без участі людини.
- **Browser-extension шлях.** Корисно для сторонніх сайтів/SaaS, куди не можна вставити власний код — у всіх 5 «feedback-widget» конкурентів така опція є, у BuggyBag — ні.
- **Готові інтеграції «з коробки» (Zapier, Slack, Trello, Linear, Jira).** У нас — лише GitHub Issue + YouTrack; у конкурентів — десятки.
- **NPS / опитування / customer-feedback функції** (Usersnap, Userback) — не наш кейс, але варто розуміти, що це частина їхньої цінності, не лише bug-tracking.
- **Mobile native SDK** (Userback має) — у нас лише веб + емуляція/реальний touch-flow в браузері.

## 6. Чого немає у конкурентів (наші реальні відмінності)

- **React Fiber → компонент + файл:рядок прямо на піні**, через стандартний React dev `_debugSource` — без потреби підключати окремий build-плагін (заготовки `vite-plugin.ts`/`webpack-loader.ts` є в репо, але свідомо не підключені — занадто великий напряг для юзера заради цієї фічі). Обмеження: працює лише в dev-режимі React, у production-білді `_debugSource` відсутній. Жоден із 7 досліджених конкурентів цього не робить у складі bug-репортингу (найближчий аналог — окрема категорія open-source dev-tools типу «Click to React Component» / `react-inspector`, але це окремі інструменти, не інтегровані в баг-трекер).
- **Diff стейту (zustand/redux), before → after.** Не згадується в жодного конкурента.
- **`data-buggy-source` — явні data-provenance хінти** (DOM-атрибут + `registerDataSource()` API), що показують, з якого backend-джерела («supabase:products.price») походять дані під піном. Унікально для BuggyBag серед досліджених інструментів.
- **Вбудований design-audit** (фонти/кольори/spacing/border-radius використані на сторінці) прямо в баг-репорті.
- **Quality Score 2.0** — явна 8-факторна оцінка (опис 20, скріншот 20, DOM/pin 15, кроки 15, файл компонента 10, мережа/консоль 10, store diff 5, data sources 5) повноти репорту саме для AI-агента, плюс **4 готові prompt-шаблони** з вшитими правилами поведінки агента («виправляй один баг за раз», «вкажи точний файл і рядок», «не рефактори зайве», «питай, якщо незрозуміло», «аналізуй скріншот, якщо є візуальна неоднозначність») під конкретний інструмент (Antigravity, Claude Code, Cursor, GitHub Issue). Це більш «opінionated» prompt-engineering шар, ніж сирі MCP-дані Jam/Userback.
- **Self-hosted, MIT, безкоштовний.** Усі 7 конкурентів — платні SaaS від $8 до $350/міс. Це означає, що BuggyBag і ці інструменти, ймовірно, навіть не за того самого покупця борються: хто готовий платити Marker.io/Userback за SaaS — не той, хто сам пише та хостить Next.js+Supabase портал.
- **Прихований за замовчуванням віджет**, орієнтований на внутрішню QA-команду, а не на клієнта/тестера ззовні — філософія, протилежна Marker.io/BugHerd/Usersnap/Pastel, де віджет за дизайном видимий кінцевому користувачу.

---

## 7. Найважливіше порівняння: push-промпт (BuggyBag) vs MCP (Jam.dev / Userback)

Це ключове для відповіді «чи придумав я те, що вже існує» — сама **ідея** «передати контекст бага AI-агенту» вже не нова, але **механізм** інший.

| | **BuggyBag** (push) | **Jam.dev / Userback MCP** (pull) |
|---|---|---|
| Налаштування на боці агента | Жодного — просто вставити текст у чат | Потрібен MCP-клієнт (Cursor/Claude Code/VS Code/Windsurf/ChatGPT) + OAuth/token |
| Формат даних | Готовий, структурований, opінionated промпт під конкретний інструмент | Сирі дані сесії (відео/логи/events); агент сам інтерпретує |
| Працює без MCP-сумісного клієнта | ✅ будь-де, де можна вставити текст | ➖ тільки в підтримуваних MCP-клієнтах |
| Видима оцінка повноти репорту перед відправкою | ✅ Quality Score 2.0 | ❔ публічно не задокументовано |
| Агент може сам «докопатись» до додаткових даних на льоту | ➖ (тільки те, що в промпті) | ✅ агент сам запитує більше через MCP-tool calls |
| Залежність від вендора/інфраструктури | ➖ self-hosted | ✅ потребує хмарного сервісу Jam/Userback |

Висновок по цьому розділу: BuggyBag не «винайшов» AI-handoff як категорію — вона вже існує і саме в 2026 стає мейнстрімом (MCP). Але всередині категорії BuggyBag обрав інший, валідний підхід (push/copy-paste, без інфраструктури), і додав шар якості (Quality Score, behavior-правила per-агент), якого в Jam/Userback публічно не видно.

---

## Підсумок

Ти не винайшов категорію «bug-репортинг з пінами на скріншоті» — вона давно і щільно зайнята. Ти не винайшов і категорію «передати баг AI-агенту» — вона вже з'являється у двох прямих конкурентів через MCP. Те, що реально нове (або принаймні не знайдено в жодного з 7 перевірених інструментів): React dev-time резолюція до рівня файл:рядок (через `_debugSource`, без build-плагіна — і це свідомий вибір, не недогляд), diff стейту, явні data-provenance хінти, вбудований design-audit, і саме *такий* — opінionated, copy-paste, з вбудованою оцінкою якості — формат AI-промпту. Плюс зовсім інша бізнес-модель: безкоштовний self-hosted MIT-інструмент проти платних SaaS $8–350/міс.

Практичний висновок: BuggyBag не конкурує «впритул» з жодним із цих 7 інструментів за того самого покупця, але прямо повторює загальну ідею (pin-репорти + AI-handoff) ринку, що вже рухається в цьому напрямку. Якщо є намір колись зробити з цього окремий продукт — варто чітко доносити саме унікальні шари (React dev-time резолюція file:line, store diff, data-provenance, design-audit, Quality Score) як позиціонування, а не «ще один pin-репортер» чи «ще один MCP».

---

## Sources

- [Marker.io — Pricing](https://marker.io/pricing)
- [Marker.io — Install the Widget](https://help.marker.io/en/articles/4667238-install-the-widget)
- [Marker.io — How to integrate into your web app](https://help.marker.io/en/articles/5546520-how-to-integrate-marker-io-into-your-web-app)
- [BugHerd — official site](https://bugherd.com/)
- [BugHerd — pricing overview (SoftwareSuggest)](https://www.softwaresuggest.com/bugherd)
- [Usersnap — Pricing](https://usersnap.com/pricing)
- [Userback — MCP docs](https://docs.userback.io/docs/userback-mcp)
- [Userback — Widget installation methods](https://docs.userback.io/docs/widget-installation-methods)
- [Userback — Connect AI tools to user feedback](https://userback.io/blog/connect-ai-tools-to-user-feedback/)
- [Jam.dev — MCP docs](https://jam.dev/docs/jam-mcp)
- [Jam.dev — Meet the new Jam MCP](https://jam.dev/blog/meet-the-new-jam-mcp/)
- [Jam.dev — Pricing (G2)](https://www.g2.com/products/jam-dev/pricing)
- [Bird Eats Bug — Pricing](https://birdeatsbug.com/pricing)
- [Bird Eats Bug — Browser extension](https://birdeatsbug.com/feature/browser-extension)
- [Markup.io / Pastel pricing comparison (Webvizio)](https://webvizio.com/blog/8-best-markup-io-alternatives-with-pricing-comparison/)
- [buggy-bag-widget — GitHub repo](https://github.com/ArthurMospan/buggy-bag-widget)
