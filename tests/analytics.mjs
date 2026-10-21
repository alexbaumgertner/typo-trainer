import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ANALYTICS_CONFIG,
  ALLOWED_PROPS,
  analyticsAvailable,
  analyticsReady,
  initAnalytics,
  resetAnalyticsForTests,
  sanitizeProps,
  setAnalyticsEnabled,
  track,
} from '../src/analytics.js';

assert.equal(typeof window, 'undefined');
assert.equal(ANALYTICS_CONFIG.POSTHOG_HOST, 'https://eu.i.posthog.com');

function fakeSdk() {
  const sdk = { loads: 0, inits: [], events: [] };
  sdk.posthog = {
    init: (key, options) => sdk.inits.push({ key, options }),
    capture: (name, props) => sdk.events.push({ name, props }),
    identify: () => assert.fail('identify must never be called'),
  };
  sdk.load = async () => {
    sdk.loads++;
    return { default: sdk.posthog };
  };
  return sdk;
}
const withKey = { ...ANALYTICS_CONFIG, POSTHOG_KEY: 'phc_test' };

// No key: nothing is loaded, nothing is sent.
{
  resetAnalyticsForTests();
  const sdk = fakeSdk();
  const noKey = { ...ANALYTICS_CONFIG, POSTHOG_KEY: '' };
  initAnalytics({ analytics: true }, { config: noKey, loadSdk: sdk.load });
  assert.equal(analyticsAvailable(), false);
  setAnalyticsEnabled(true);
  track('lesson_started', { lessonId: 1 });
  await analyticsReady();
  assert.equal(sdk.loads, 0);
  assert.equal(sdk.events.length, 0);
}

// Key set: privacy-preserving init and whitelisted events.
{
  resetAnalyticsForTests();
  const sdk = fakeSdk();
  initAnalytics({ analytics: true }, { config: withKey, loadSdk: sdk.load });
  await analyticsReady();
  assert.equal(sdk.loads, 1);
  const { key, options } = sdk.inits[0];
  assert.equal(key, 'phc_test');
  assert.equal(options.api_host, 'https://eu.i.posthog.com');
  assert.equal(options.persistence, 'memory');
  assert.equal(options.autocapture, false);
  assert.equal(options.disable_session_recording, true);
  assert.equal(options.capture_pageview, false);
  assert.equal(options.respect_dnt, true);
  assert.equal(options.ip, false);

  track('lesson_completed', {
    lessonId: 3,
    accuracy: 97.5,
    charsPerMinute: 120,
    durationSec: 40,
    hintMode: 'colors+letters',
    isRepeat: false,
    typedText: 'секретный текст',
    customText: 'мой текст',
    profileName: 'Александр',
    name: 'Александр',
    importedFile: '{"profile":{}}',
    char: 'ф',
    nested: { lessonId: 1 },
    layout: 'x'.repeat(500),
    progress: Number.NaN,
  });
  assert.deepEqual(sdk.events[0], {
    name: 'lesson_completed',
    props: {
      lessonId: 3,
      accuracy: 97.5,
      charsPerMinute: 120,
      durationSec: 40,
      hintMode: 'colors+letters',
      isRepeat: false,
    },
  });
  for (const event of sdk.events)
    for (const key of Object.keys(event.props)) assert.ok(ALLOWED_PROPS.includes(key));
  assert.equal(JSON.stringify(sdk.events).includes('Александр'), false);

  // The user switching statistics off stops sending; switching on resumes.
  setAnalyticsEnabled(false);
  track('lesson_started', { lessonId: 4 });
  assert.equal(sdk.events.length, 1);
  setAnalyticsEnabled(true);
  track('lesson_started', { lessonId: 4 });
  assert.equal(sdk.events.length, 2);
}

// Disabled in the saved profile: the SDK is never loaded, until the user opts in.
{
  resetAnalyticsForTests();
  const sdk = fakeSdk();
  initAnalytics({ analytics: false }, { config: withKey, loadSdk: sdk.load });
  track('lesson_started', { lessonId: 1 });
  await analyticsReady();
  assert.equal(sdk.loads, 0);
  assert.equal(sdk.events.length, 0);
  setAnalyticsEnabled(true);
  await analyticsReady();
  assert.equal(sdk.loads, 1);
  track('lesson_started', { lessonId: 1 });
  assert.equal(sdk.events.length, 1);
}

// Events fired while the SDK is still loading are kept; opting out drops them.
{
  resetAnalyticsForTests();
  const sdk = fakeSdk();
  initAnalytics({ analytics: true }, { config: withKey, loadSdk: sdk.load });
  track('lesson_started', { lessonId: 7, typedText: 'секрет' });
  assert.equal(sdk.events.length, 0);
  await analyticsReady();
  assert.deepEqual(sdk.events, [{ name: 'lesson_started', props: { lessonId: 7 } }]);

  resetAnalyticsForTests();
  const second = fakeSdk();
  initAnalytics({ analytics: false }, { config: withKey, loadSdk: second.load });
  setAnalyticsEnabled(true);
  track('settings_changed', { setting: 'analytics', enabled: true });
  track('lesson_started', { lessonId: 1 });
  setAnalyticsEnabled(false);
  await analyticsReady();
  assert.equal(second.events.length, 0);
}

// A failing or blocked SDK never throws into the app.
{
  resetAnalyticsForTests();
  initAnalytics(
    { analytics: true },
    {
      config: withKey,
      loadSdk: async () => {
        throw new Error('blocked');
      },
    },
  );
  await analyticsReady();
  track('lesson_started', { lessonId: 1 });
}

assert.deepEqual(sanitizeProps(null), {});
assert.deepEqual(sanitizeProps({ enabled: false, setting: 'hands' }), {
  enabled: false,
  setting: 'hands',
});

// Every event fired from app.js is on the documented list and uses only whitelisted keys.
const documented = [
  'lesson_started',
  'lesson_completed',
  'lesson_abandoned',
  'practice_mode_selected',
  'hands_overlay_toggled',
  'hint_mode_changed',
  'profile_exported',
  'profile_imported',
  'settings_changed',
];
const appSource = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const fired = [...appSource.matchAll(/track\(\s*'([a-z_]+)'/g)].map((match) => match[1]);
assert.deepEqual([...new Set(fired)].sort(), [...documented].sort());

console.log('PASS: analytics no-op without key, property whitelist, opt-out, no input text.');
