const { test, expect } = require('@playwright/test'),
  { randomUUID } = require('node:crypto'),
  fs = require('node:fs'),
  path = require('node:path');
const fixture = path.resolve('.local/e2e-voice.wav');
fs.mkdirSync(path.dirname(fixture), { recursive: true });
const data = Buffer.alloc(44 + 3 * 32000);
data.write('RIFF');
data.writeUInt32LE(data.length - 8, 4);
data.write('WAVEfmt ', 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(1, 22);
data.writeUInt32LE(16000, 24);
data.writeUInt32LE(32000, 28);
data.writeUInt16LE(2, 32);
data.writeUInt16LE(16, 34);
data.write('data', 36);
data.writeUInt32LE(data.length - 44, 40);
for (let i = 44; i < data.length; i += 2)
  data.writeInt16LE(Math.sin(((i - 44) / 2 / 16000) * 440 * 2 * Math.PI) * 5000, i);
fs.writeFileSync(fixture, data);
test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--use-file-for-fake-audio-capture=' + fixture,
    ],
  },
  permissions: ['microphone'],
});
test('voice waveform cancels without uploading and inserts dictation in home and studio', async ({
  page,
}) => {
  let requests = 0;
  let releaseTranscript;
  const transcriptGate = new Promise((resolve) => {
    releaseTranscript = resolve;
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/auth/register');
  await page.getByLabel('Your first name').fill('Voice Test');
  await page.getByLabel('Email address').fill('browser-voice-' + randomUUID() + '@gotcha.test');
  await page.getByLabel('Password', { exact: true }).fill('A secure voice password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  await page.route('**/v1/voice/transcribe', async (route) => {
    requests++;
    expect(route.request().headers()['content-type']).toBe('audio/wav');
    expect(route.request().headers()['x-recording-id']).toMatch(/^[a-f0-9-]{36}$/);
    const bytes = route.request().postDataBuffer();
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.readUInt32LE(24)).toBe(16000);
    if (requests === 1) await transcriptGate;
    await route.fulfill({
      json: {
        text: 'Build a customer dashboard',
        chargedCredits: 1,
      },
    });
  });
  const composer = page.getByLabel('Describe your app idea');
  await composer.fill('Existing idea');
  await page.getByRole('button', { name: 'Start voice input' }).click();
  await expect(page.getByRole('group', { name: 'Voice recording' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create project from idea' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel voice recording' }).click();
  expect(requests).toBe(0);
  await expect(composer).toHaveValue('Existing idea');
  await page.getByRole('button', { name: 'Start voice input' }).click();
  await expect(page.getByRole('group', { name: 'Voice recording' })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.local/voice-recording.png' });
  await page.getByRole('button', { name: 'Finish voice recording' }).click();
  await expect(page.getByRole('button', { name: 'Adding voice input' })).toBeVisible();
  await expect(page.getByText('Transcribing…', { exact: true })).toHaveCount(0);
  await expect(page.locator('.voice-recording .voice-spinner')).toHaveCount(0);
  releaseTranscript();
  await expect(composer).toHaveValue('Existing idea\nBuild a customer dashboard');
  await expect(page.getByText('Dictation added', { exact: true })).toHaveCount(0);
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page).toHaveURL(/\/projects\?chat=/);
  const studio = page.getByLabel('Ask Gotcha to build or edit your app');
  await studio.fill('Add a table');
  await page.getByRole('button', { name: 'Start voice input' }).click();
  await expect(page.getByRole('group', { name: 'Voice recording' })).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Finish voice recording' }).click();
  await expect(studio).toHaveValue('Add a table\nBuild a customer dashboard');
  expect(requests).toBe(2);
  expect(errors).toEqual([]);
  const me = await (await page.request.get('/v1/auth/me')).json();
  const deleted = await page.request.delete('/v1/auth/account', {
    headers: {
      origin: process.env.E2E_APP_ORIGIN || 'http://localhost:7011',
      'x-csrf-token': me.csrfToken,
    },
    data: { confirmation: 'DELETE MY ACCOUNT' },
  });
  expect(deleted.ok()).toBe(true);
});
