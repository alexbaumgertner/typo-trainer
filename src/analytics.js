// Anonymous product analytics (PostHog EU). Disabled when POSTHOG_KEY is empty.
// Never pass typed text, custom practice text, the profile name or imported file contents here.

export const ANALYTICS_CONFIG = {
  POSTHOG_KEY: 'phc_npeeU9PsVH4MewaFFn99ob8JcKkmrdWtnyr9trAPsuFY',
  POSTHOG_HOST: 'https://eu.i.posthog.com',
  POSTHOG_SDK_URL: 'https://eu-assets.i.posthog.com/static/module.js',
};

// Only these property keys ever leave the browser; everything else is dropped.
export const ALLOWED_PROPS = [
  'lessonId',
  'layout',
  'hintMode',
  'accuracy',
  'charsPerMinute',
  'durationSec',
  'isRepeat',
  'progress',
  'practiceType',
  'setting',
  'enabled',
];

const MAX_STRING_LENGTH = 40;

let config = ANALYTICS_CONFIG;
let loadSdk = (url) => import(url);
let userEnabled = true;
let client = null;
let loading = null;
let queue = [];
const MAX_QUEUE = 50;

/** True when a key is configured, so the UI knows whether statistics can be collected at all. */
export function analyticsAvailable() {
  // Automated browsers (Playwright, CI) must not pollute production statistics.
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
  return Boolean(config.POSTHOG_KEY);
}

function isActive() {
  return userEnabled && analyticsAvailable();
}

/** Keep whitelisted keys with numbers, booleans or short strings; drop everything else. */
export function sanitizeProps(props) {
  const clean = {};
  if (props === null || typeof props !== 'object') return clean;
  for (const key of ALLOWED_PROPS) {
    if (!Object.hasOwn(props, key)) continue;
    const value = props[key];
    if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === 'boolean') clean[key] = value;
    else if (typeof value === 'string' && value.length <= MAX_STRING_LENGTH) clean[key] = value;
  }
  return clean;
}

function ensureClient() {
  if (client || loading || !isActive()) return;
  loading = Promise.resolve()
    .then(() => loadSdk(config.POSTHOG_SDK_URL))
    .then((module) => {
      const posthog = module?.default ?? module?.posthog;
      if (!posthog || typeof posthog.init !== 'function') return;
      posthog.init(config.POSTHOG_KEY, {
        api_host: config.POSTHOG_HOST,
        persistence: 'memory',
        autocapture: false,
        disable_session_recording: true,
        capture_pageview: false,
        capture_pageleave: false,
        respect_dnt: true,
        ip: false,
        person_profiles: 'identified_only',
        disable_surveys: true,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
        // Send each event at once and drop anything captured while the user has opted out,
        // so no event sits in an SDK-side queue after the switch is turned off.
        request_batching: false,
        before_send: (event) => (isActive() ? event : null),
      });
      client = posthog;
      const pending = queue;
      queue = [];
      if (userEnabled) for (const event of pending) send(event);
    })
    .catch(() => {
      // Blocked or offline: analytics must never affect the trainer.
    })
    .finally(() => {
      loading = null;
    });
}

/**
 * Start analytics for the loaded profile settings. Does nothing without a key or when the user
 * has turned statistics off. `options` exists for tests.
 */
export function initAnalytics(settings = {}, options = {}) {
  if (options.config) config = options.config;
  if (options.loadSdk) loadSdk = options.loadSdk;
  userEnabled = settings.analytics !== false;
  ensureClient();
}

/** Apply the user's choice immediately: stop sending, or start loading the SDK on opt-in. */
export function setAnalyticsEnabled(enabled) {
  // track() checks this flag, so no SDK opt-out is needed (it would persist in localStorage).
  userEnabled = Boolean(enabled);
  if (!userEnabled) queue = [];
  ensureClient();
}

/** Send an event with whitelisted aggregate properties. Safe to call at any time. */
export function track(eventName, props = {}, options = {}) {
  if (!isActive()) return;
  const event = { eventName, props: sanitizeProps(props), beacon: Boolean(options.beacon) };
  if (client) send(event);
  // Keep events fired while the SDK downloads; they are flushed after init, dropped on opt-out.
  else if (loading && queue.length < MAX_QUEUE) queue.push(event);
}

function send({ eventName, props, beacon }) {
  try {
    client.capture(eventName, props, beacon ? { transport: 'sendBeacon' } : undefined);
  } catch {
    // Ignore SDK failures.
  }
}

/** Reset module state between tests. */
export function resetAnalyticsForTests() {
  config = ANALYTICS_CONFIG;
  loadSdk = (url) => import(url);
  userEnabled = true;
  client = null;
  loading = null;
  queue = [];
}

/** Resolves when a pending SDK load has finished. Used by tests. */
export function analyticsReady() {
  return loading ?? Promise.resolve();
}
