# Ritm

Ritm is a web trainer for ten-finger touch typing in Russian, English, Ukrainian, German, Turkish, French, and Spanish. The application runs in the browser. It uses HTML, CSS, and JavaScript modules. It has no server part of its own and no user account. The application saves the profile and progress in the localStorage of the current browser. Optional anonymous usage statistics (PostHog, EU) are off if the code has no key. The user can also turn them off in the profile. See the section "Analytics and privacy".

## Features

- 16 lessons for each of the seven built-in languages (112 lessons in total). The lessons cover the home row, the top row, the bottom row, numbers, Shift, and connected text.
- A short lecture before each lesson, and detailed instructions that show where to put each finger.
- A hand diagram, finger zones, a hint for the next key, and a hint for the opposite Shift key.
- The "Авто" (Auto) mode removes the movement hints step by step as you complete lessons. First it removes the finger hint. Then it removes the next-key hint. After 25% of the lessons are complete, only the key highlight stays. After 50%, this highlight also disappears. With the "Всегда" (Always) and "Выкл." (Off) modes, you choose the help manually. The profile saves this setting. The letters, the colored zones, and the hand diagram have separate controls.
- The "Показать руки" (Show hands) switch shows transparent hands above the keyboard. The whole hand moves smoothly so that the correct finger comes over the letter. The fingers keep their natural length and do not stretch, and the other fingers move together with the hand. After a correct key press, the hands show the return to the home position before the next move. This also happens when the same letter repeats. For the space key, the right thumb moves. For capital letters, the opposite little finger also moves to Shift. The browser saves this setting.
- The "Показать движение" (Show movement) button turns on the hands. It shows slowly the move to the current key and back. During a session, a mouse click on the button pauses the typing. Use the "Продолжить" (Continue) button to resume. If the system setting for reduced motion is on, the application shows a static hand position.
- The "Переучиваюсь" (Retraining) mode: you select up to 8 problem keys on the on-screen keyboard. The application shows the assigned hand and finger. It gives short key combinations with the related home key. While you type, press F2 or the "Нажал другим пальцем" (I used a different finger) button to mark your own observation. This stops the timer and asks you to repeat the combination after you return to the home position. The browser cannot detect the finger automatically. The application stores these marks separately from typing errors. They do not change the accuracy.
- Practice with your own text, with a sample text, with difficult keys, with a selected finger or hand, or with a mix of these.
- Repeatable exercises with a seed. The same seed, the same selected lesson, and the same key set or mode give the same text. The exercise heading shows the seed. In the "Указанные клавиши" (Specified keys) field, you can repeat a set of difficult characters, including the space.
- For each key, the application saves the number of times it was shown and the number of positions with an error. It counts the space, lowercase characters, and uppercase characters separately.
- An error stops the cursor. Backspace corrects the error, but the statistics keep the error.
- The timer starts at the first attempt. It does not count pauses or the time when the page has no focus.
- Accuracy is the share of correct attempts. Speed is the number of typed characters per minute of active time. The application does not use WPM.
- "Выполнено" (Done) means at least one lesson attempt with an accuracy of 95% or higher. "Закреплено" (Reinforced) means one more attempt with an accuracy of 95% or higher, without hints, on a different calendar day. You can choose any lesson at any time. The application keeps the lessons that were done before.
- A local profile with a name. The application saves the settings, the language, and the selected lessons automatically.
- The history holds up to 500 sessions. It shows speed, accuracy, hint conditions, and the voluntary marks for a wrong finger. For old records, the missing values show as "Нет данных" (No data). The graph compares the same lesson text with the same hint set. Old records without this information are not in the graph. A lesson repeat uses the same text, so the comparison is meaningful. The application stores "Done" and "Reinforced" separately. They stay when the history is shortened.
- You can hide the speed while you type. After the session, the result screen shows it. You can turn off the keyboard hints for a self-check.
- Full profile transfer with a JSON file: export, validation, and an import preview. You can apply the file in a new browser. The application reads and saves the file fully on the client. It supports old `ritm-progress.json` files. The import replaces the current local data only after validation and after you click "Применить файл" (Apply file).
- You can add layouts with rows of 13, 12, 11, or 10 characters, and a separate display for Shift. The application creates eight starter lessons automatically.

The application language setting does not change the keyboard layout of the operating system. The trainer accepts the characters that you actually type. To practice with ten fingers, you need a physical keyboard.

## Interface and training languages

The "Язык интерфейса" (Interface language) setting is independent of the training language. The interface is available in Russian, Ukrainian, German, Turkish, French, and Spanish. The translation covers lessons and explanations, navigation, finger hints, practice, the profile, and error messages. English stays a training language. When you change the interface language, the application pauses the active session. It keeps the typed text and the statistics. The profile saves both settings, and the JSON file transfers them. An old profile keeps the Russian interface.

| Training language | Layout                                     |
| ----------------- | ------------------------------------------ |
| Русский           | ЙЦУКЕН                                     |
| English           | QWERTY (US)                                |
| Українська        | ЙЦУКЕН (UA), with ґ on the extra ISO key   |
| Deutsch           | QWERTZ (DE)                                |
| Türkçe            | Q (TR), with separate i/İ and ı/I          |
| Français          | Traditional AZERTY (FR), digits with Shift |
| Español           | QWERTY (ES, Spain)                         |

The five new languages have their own exercises and texts. The national layouts agree with the base XKB tables `ua`, `de`, `tr`, `fr`, and `es`. The extra ISO keys have their own finger zones. For French and Spanish, the application supports common composed letters with dead keys (for example, `^` + `e` → `ê`, `´` + `a` → `á`). The hint shows the key sequence. The application normalizes your own text to Unicode NFC.

Limitations:

- The application does not change the system layout.
- It does not model AltGr, Caps Lock, all regional variants, or the new French AZERTY.
- The custom layout builder keeps the previous row format of 13, 12, 11, or 10 characters.
- The application does not translate names and the proper names of sessions. The history shows lesson names in the current interface language.
- Native speakers did not edit the translations.
- The real input of dead keys depends on the OS and the browser. The automated tests check the event handlers, but they do not replace a check with a physical keyboard.

The translation catalogs are in `src/locales/`. The common logic is in `src/i18n.js`. The Russian source messages are the keys. The application does not send user strings to a translator. `tests/languages.mjs` checks that the catalogs are complete. It also checks all courses, national characters, ISO zones, and profile transfer with independent languages. The browser scenarios are in `tests/browser/languages.spec.mjs`.

## Development

You need Node.js 20 or newer. Unpack the archive and open the project folder:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. The development server reads the files directly from `src/`. After you change a file, refresh the page. This is a local static server for development. The profile data stays in the localStorage of the browser.

## Project structure

```text
src/
  index.html       — main page
  app.js           — interface and event handlers
  course.js        — layouts, lessons, and the training model
  exercises.js     — generator of repeatable exercises and key statistics
  storage.js       — profile validation, migration, and JSON format
  analytics.js     — anonymous statistics (PostHog EU), no-op without a key
  styles.css       — styles and responsive layout
  ui/html.js       — HTML templates with markup formatting
scripts/
  build.mjs        — creates dist from src
  serve.mjs        — local static server
  archive.mjs      — creates the source archive
tests/            — fast model and profile tests, browser smoke and e2e tests
dist/             — build result, do not edit
```

The source files are only in `src/`. The file `storage.js` validates these items separately: settings, custom layouts, history, selected lessons, and progress. To add a new built-in language, add it to `builtinLanguages` in `src/course.js`. To add a custom language, use the form in the application.

## Formatting and checks

```sh
npm run format
npm run format:check
npm test
```

Prettier formats JavaScript, CSS, HTML, and the markup inside `html` templates. The settings are in `.prettierrc.json` and `.editorconfig`. The HTML templates do not escape user input automatically. Use the `esc` function before you insert such values.

`npm test` (or `npm run test:unit`) runs fast checks on the source files without a browser. The checks cover these items:

- all 112 lessons
- finger zones
- accuracy and speed
- training states
- pauses and corrections
- profile validation and migration
- exercises with a seed
- lesson reinforcement
- hints and hand movement

An integration test passes the results of `TypingSession` to a JSON profile. It checks that the history and the best lesson result are restored. Do not repeat these cases in the e2e tests.

For the browser tests, install Chromium one time:

```sh
npx playwright install chromium
# Linux CI: npx playwright install --with-deps chromium
npm run test:smoke
npm run test:e2e
# All fast and browser checks:
npm run test:all
```

The smoke test checks that the built application loads. It also checks the resources, that there are no JavaScript errors, and the main sections for both languages. The e2e test includes the smoke test. It also checks these items:

- Russian and English input
- validation of custom text
- an error and Backspace
- pause and loss of focus
- session completion
- the move to the next lesson
- saving after a reload
- settings
- profile download, and profile import in a separate browser context

The application rejects incorrect JSON. It applies a correct file only after confirmation.

Playwright builds `dist/` automatically. It also starts and stops the static server. The default port is 4173. You can set `PORT`, but the port must be free. Each test gets an isolated localStorage. Retries are off. If a test fails, Playwright saves a screenshot and a trace in `test-results/`. It saves the HTML report in `playwright-report/` (`npx playwright show-report`).

The workflow `.github/workflows/tests.yml` runs the formatting check, the fast checks, and the browser checks for pull requests and for pushes to `main`. If a check fails, the workflow saves the report and the trace for 7 days. The Pages publication stays a separate workflow.

Limitations:

- The automated tests use only Chromium with a desktop viewport.
- There are no reference visual snapshots.
- There is no check of a real system layout or IME, of Safari or Firefox, of mobile input, or of a full browser matrix for custom layouts.
- The browser tests check that the handlers are connected and that user actions work. The fast tests check exact time calculations with fixed timestamps.

## Build and publication

```sh
npm run build
npm run preview
```

`npm run build` clears `dist/` and copies the source files into it. The folder structure stays the same. The build does not minify the code. To publish, upload the content of `dist/` to a static host. Git ignores the `dist/` folder. You can restore it from `src/` at any time.

```sh
npm run archive
```

This command also creates `dist/ritm-source.zip`. The archive contains the source files, scripts, tests, the lock file, and the formatting settings. The archive does not contain `.git`, the Site identifier, `node_modules`, local data, or the finished build.

## GitHub Pages with Actions

Site: https://alexbaumgertner.github.io/typo-trainer/

The workflow `.github/workflows/pages.yml` runs after a push to `main`. You can also start it manually: **Actions → Deploy to GitHub Pages → Run workflow**. The workflow does these steps:

1. It installs the dependencies with `npm ci`.
2. It checks the formatting.
3. It runs the tests.
4. It builds the site with the source archive.
5. It publishes `dist/`.

For the first run, select **Settings → Pages → Build and deployment → Source → GitHub Actions**. You do this setting only one time for the repository. The workflow does not need a personal token or more secrets. If Pages is not enabled, the Configure Pages step shows a message. After you enable Pages, run the workflow again from Actions.

Only the `deploy` job has permission to publish. The publication jobs run one after the other. If a check or the build fails, the workflow does not publish the new version.

All local links and imports are relative. For this reason, the application works at the path `/typo-trainer/` and does not need a base URL. The profile on GitHub Pages is separate from the profile on the previous domain. To move a profile, use the JSON file from the "Мой профиль" (My profile) section.

## Analytics and privacy

The application can send **anonymous** events to [PostHog](https://posthog.com) (EU region, `https://eu.i.posthog.com`). This shows how people go through the lessons and where they stop. The profile data stays only in your browser.

**If the key is empty, analytics is fully off.** The SDK does not load, the application sends no requests, and "Мой профиль" (My profile) only shows a note that it collects no statistics.

### How to turn on

The repository already contains the public Project API key of the owner's project. To use your own project, or to turn off analytics, replace or clear the key:

1. Create a project in [PostHog Cloud EU](https://eu.posthog.com). Sign up on `eu.posthog.com`, not on `us.`.
2. Open **Project settings → Project → Project API key** and copy the key. It looks like `phc_…`.
3. Put it in `ANALYTICS_CONFIG.POSTHOG_KEY` in `src/analytics.js` and commit it.

The key is public. A Project API key can only write events. It cannot read data. For this reason, the key is stored in the code, and you do not need secrets or GitHub Secrets. Do not use a Personal API key (`phx_…`). It is private. Automated browsers (`navigator.webdriver`, for example Playwright) do not send analytics. For a GitHub Pages site, you can limit the Authorized URLs in the PostHog project settings. The build does not change. The browser loads the SDK dynamically from `eu-assets.i.posthog.com`. There are no npm dependencies.

### How to turn off

- User: "Мой профиль" (My profile) → "Анонимная статистика использования" (Anonymous usage statistics). By default the switch is on (if a key is set). It works at once, the profile saves it, and the JSON export contains it. If it is off at load time, the SDK does not even load.
- Browser: the application also respects an active Do Not Track setting (`respect_dnt`).
- Owner: keep `POSTHOG_KEY` empty.

### SDK settings

`persistence: 'memory'` (no cookie and no localStorage), `autocapture: false`, `disable_session_recording: true`, `capture_pageview: false`, `capture_pageleave: false`, `respect_dnt: true`, `ip: false`, `person_profiles: 'identified_only'`, no surveys and no feature flags. The application does not call `identify`, and it does not store a user identifier. Each page load creates a new random identifier in memory.

### Events

| Event                    | When                                              | Properties                                                                                                        |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `lesson_started`         | a lesson starts                                   | `lessonId`, `layout` (`ru`/`en`/`custom`), `hintMode`                                                             |
| `lesson_completed`       | the user types the lesson to the end              | `lessonId`, `accuracy`, `charsPerMinute`, `durationSec`, `hintMode`, `isRepeat`                                   |
| `lesson_abandoned`       | the user leaves an exercise (after typing starts) | `lessonId` or `practiceType`, `layout`, `hintMode`, `progress` (0–1)                                              |
| `practice_mode_selected` | the user selects a practice                       | `practiceType` (`sample`, `weak`, `custom`, `finger`, `fingers`, `hand`, `hands`, `keys`, `retraining`), `layout` |
| `hands_overlay_toggled`  | the "Show hands" switch                           | `setting`, `enabled`, `hintMode`                                                                                  |
| `hint_mode_changed`      | colored zones / letters on the keys               | `setting`, `enabled`, `hintMode`                                                                                  |
| `profile_exported`       | the user downloads a profile file                 | —                                                                                                                 |
| `profile_imported`       | the user applies a profile file                   | —                                                                                                                 |
| `settings_changed`       | the user turns on statistics                      | `setting` (`analytics`), `enabled`                                                                                |

`hintMode` is the mode of the movement hints (`auto`, `always`, `off`). For `hint_mode_changed`, the `setting` property is `hintMode`, `colors`, `letters`, or `guidance`. When the user turns off statistics, the application sends no event.

### What the application does not send

The application does not send these items: typed text, pressed characters, your own practice text, the profile name, the content of an imported file, and the names and characters of custom layouts. Only a whitelist of keys (`ALLOWED_PROPS` in `src/analytics.js`) passes from `props`. The values must be numbers, flags, or short strings. The application discards everything else. The test `tests/analytics.mjs` checks this.

### Check that events are sent

In a normal browser, open the published site, turn on statistics in "Мой профиль" (My profile), and open DevTools → Network. Do Not Track must be off, and no blocker must be active. Then do these steps:

1. Refresh the page. `eu-assets.i.posthog.com/static/module.js` must load successfully. The page view alone does not send `$pageview`.
2. In a lesson, click "Начать практику" (Start practice). Expected result: a POST to `https://eu.i.posthog.com/e/` with the event `lesson_started` and the response `200 {"status":"Ok"}`.
3. Turn off statistics in the profile. The next actions must not send events. After you refresh the page, the SDK must not load.
4. To confirm that the data arrives, open the events of the correct project in PostHog EU. Find `lesson_started` by the time of your check. HTTP 200 confirms that the request was accepted. It does not check the project reports.

Check of the published site on October 21, 2026: the SDK loaded, and the lesson start event was accepted (HTTP 200, `{"status":"Ok"}`). The check did not cover access to the event list in the dashboard, because it needs the owner's login. The check created one lesson start event in the production project.

Normal Playwright intentionally does not send analytics. The application checks `navigator.webdriver`, and the SDK also filters automated user agents. Do not turn off these checks in the site code. The browser tests in `tests/browser/analytics.spec.mjs` check these items:

- the block for automation
- sending through a mock SDK
- immediate opt-out
- keeping the choice after a reload
- turning on again

The tests intercept requests to PostHog. No test events go to the production project.

### PostHog MCP for the development agent

MCP gives an agent access to PostHog after the owner authorizes it. You configure it separately from the browser SDK. Installing MCP does not turn on or repair the event sending of the site.

Run this in an environment where the user settings of the agent are writable:

```sh
npx -y @posthog/wizard@latest mcp add
```

To install only MCP in Codex, an official option is available:

```sh
codex mcp add posthog --url https://mcp.posthog.com/mcp
codex mcp login posthog
codex mcp list
```

Complete the OAuth login to the account that has the correct project. The public `phc_…` site key does not replace this authorization. Do not add personal API keys or OAuth tokens to Git. After the connection, check that the agent can access the correct project and read the latest events.

In the restricted environment of the check, wizard 2.86.0 started, but the installation in Codex failed with `EROFS` when it wrote `~/.codex/config.toml.wizard-tmp`. In that session, MCP was not installed and not authorized. Repeat the command in an environment with a writable configuration.

Sources: [PostHog MCP for Codex](https://posthog.com/docs/model-context-protocol/codex), [MCP setup in Codex](https://developers.openai.com/codex/mcp).

### Limitations

- Ad blockers and private modes can block PostHog. Such visitors do not appear in the statistics. This does not affect the trainer.
- For an audience in the EU, the site owner is responsible for the legal basis and the notice. The application has no consent banner. The analytics is anonymous and uses no cookies and no identifiers, but you must make a separate legal assessment.
- The application still loads fonts from Google Fonts. This is independent of analytics.

## Method

The course uses traditional teaching principles:

- fixed finger zones
- a home position
- a step-by-step introduction of keys
- letter combinations and words
- repetition of difficult keys
- feedback
- short, regular sessions

The lectures and exercises were written specially for this application. The 95% threshold and the repeat on a different day are course settings. They are not universal scientific standards. The method does not promise a specific speed or a specific learning time. The application finds the day from the local date of the browser when the attempt ends. Old achievements keep the "Done" state. But without data about the attempt conditions, they do not become "Reinforced" automatically. They need two new checks on different days.

In the exercises, the generator shows the target characters about equally often. If the counts are equal, it prefers the transitions that occurred less often. For the ring fingers and little fingers, it first uses one familiar key. Then it adds new movements. The generator adds a space between groups of characters. If the space is itself a target, it is part of the balance. Shift characters are available only after the lesson where they first appear. The hint shows the opposite Shift key.

A key is "difficult" if it has at least 12 appearances in the last 10 sessions with full statistics, and a conservative lower bound of its error share is above 5% (Wilson bound with a coefficient of 1.96). These are heuristic thresholds. They are not a proven measure of skill. If the sample is smaller, the application reports that there is not enough data. Old history records without the number of appearances stay in the history, but they do not count in the difficult-key estimate. For a Shift character, the application counts the error on this character. From one wrong character, the browser cannot tell if the learner made an error with the physical Shift key.

Sources of the technique recommendations: [Ratatype](https://www.ratatype.com/learn/) and [TypingClub](https://www.typingclub.com/).
