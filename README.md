# Ritm

Ritm is a web trainer for ten-finger touch typing in Russian and English. The application runs fully in the browser. It uses HTML, CSS, and JavaScript modules. It has no server part and no user account. The application saves data in the localStorage of the current browser.

## Features

- 16 lessons for the ЙЦУКЕН layout and 16 lessons for QWERTY. The lessons cover the home row, the top row, the bottom row, numbers, Shift, and connected text.
- A short lecture before each lesson, and detailed instructions that show where to put each finger.
- A hand diagram, finger zones, a hint for the next key, and a hint for the opposite Shift key.
- A "Show hands" switch. Transparent hands show above the keyboard. The correct finger moves to the letter. The thumb is highlighted for the space key. The opposite little finger is highlighted for Shift. The browser saves this setting.
- Practice with your own text, with a sample text, or with the difficult keys from the last 10 sessions.
- An error stops the cursor. Backspace corrects the error, but the statistics keep the error.
- The timer starts at the first attempt. It does not count pauses or the time when the page has no focus.
- Accuracy is the share of correct attempts. Speed is the number of typed characters per minute of active time. The application does not use WPM.
- A lesson is complete when the accuracy is 95% or higher. You can choose any lesson at any time.
- A local profile with a name. The application saves the settings, the language, and the selected lessons automatically.
- The history holds up to 500 sessions and shows a speed graph. The lesson progress is stored separately. It stays when the history is shortened.
- Full profile transfer with a JSON file: export, validation, and an import preview. You can apply the file in a new browser. The application reads and saves the file fully on the client. It supports old `ritm-progress.json` files. The import replaces the current local data only after validation and after you click "Применить файл" (Apply file).
- You can add layouts with rows of 13, 12, 11, or 10 characters, and a separate display for Shift. The application creates eight starter lessons automatically.

The application language setting does not change the keyboard layout of the operating system. The trainer accepts the characters that you actually type. To practice with ten fingers, you need a physical keyboard.

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
  storage.js       — profile validation, migration, and JSON format
  styles.css       — styles and responsive layout
  ui/html.js       — HTML templates with markup formatting
scripts/
  build.mjs        — creates dist from src
  serve.mjs        — local static server
  archive.mjs      — creates the source archive
tests/            — tests for the course, profiles, and templates
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

The tests run on the files in `src`. They do not need a build. The tests check these items:

- all 32 lessons
- the order in which the keys are taught
- finger zones
- accuracy and speed calculation
- pause and completion
- profile saving and transfer
- compatibility with old files
- rejection of incorrect data

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

## Method

The course uses traditional teaching principles:

- fixed finger zones
- a home position
- a step-by-step introduction of keys
- letter combinations and words
- repetition of difficult keys
- feedback
- short, regular sessions

The lectures and exercises were written specially for this application. The 95% threshold is a course setting. It is not a universal scientific standard. The method does not promise a specific speed or a specific learning time.

Sources of the technique recommendations: [Ratatype](https://www.ratatype.com/learn/) and [TypingClub](https://www.typingclub.com/).
