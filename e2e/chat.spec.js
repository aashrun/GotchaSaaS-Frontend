const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const origin = process.env.E2E_APP_ORIGIN || 'http://localhost:7011';
async function register(page) {
  await page.goto('/auth/register');
  await page.getByLabel('Your first name').fill('Chat Test');
  await page.getByLabel('Email address').fill('browser-chat-' + randomUUID() + '@gotcha.test');
  await page.getByLabel('Password', { exact: true }).fill('A secure chat password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  const mail = await (await page.request.get('/v1/auth/local-mail')).json();
  await page.request.post('/v1/auth/verify', {
    headers: { origin },
    data: { token: new URL(mail.mail.url).searchParams.get('token') },
  });
  await page.reload();
}
async function agentFixture(page, blocking, idea = 'Build an appointment planner for my agency') {
  let phase = 'new',
    projectId,
    submissions = 0,
    answered = false;
  const jobId = randomUUID(),
    questionId = randomUUID();
  let jobDetails = {},
    activityEntries = null;
  await page.route('**/v1/ai/turns', async (route) => {
    submissions++;
    const data = route.request().postDataJSON();
    expect(data.prompt).toBe(idea);
    expect(data.modelId).toBeUndefined();
    projectId = data.projectId;
    phase = blocking === undefined ? 'queued' : blocking ? 'paused' : 'working';
    await route.fulfill({
      status: 202,
      json: {
        turn: { id: data.idempotencyKey, projectId, prompt: idea, state: 'dispatched', jobId },
      },
    });
  });
  await page.route(/\/v1\/projects\/[a-f0-9-]+$/, async (route) => {
    const response = await route.fetch(),
      data = await response.json();
    if (data.project?.id === projectId && phase !== 'new') {
      data.jobs = [
        {
          id: jobId,
          state: phase,
          stage:
            phase === 'paused'
              ? 'Waiting for your answer: Billing choice'
              : phase === 'completed'
                ? 'Build and browser checks passed.'
                : 'Updating the appointment planner',
          result: { engine: 'agent-v1', pauseReason: phase === 'paused' ? 'question' : null },
          ...jobDetails,
        },
      ];
      data.messages[0].jobId = jobId;
      if (phase === 'completed') {
        data.project.settings.validatedRevision = data.project.revision;
        data.messages.push({
          id: randomUUID(),
          role: 'assistant',
          content:
            jobDetails.result?.summary ||
            '**The booking flow is working.**\n\nHere is what you can try:\n\n- Save an appointment and look for its confirmation.\n- Online payments are not connected yet.',
          jobId,
        });
      }
    }
    await route.fulfill({ json: data });
  });
  await page.route('**/v1/agent/*/questions', (route) =>
    route.fulfill({
      json: {
        questions:
          blocking == null || !projectId
            ? []
            : [
                {
                  id: questionId,
                  jobId,
                  title: 'Billing choice',
                  question: 'Should appointments require a subscription?',
                  blocking,
                  deferredPaths: ['src/App.tsx'],
                  options: ['Subscriptions', 'One-off payments'],
                  state: answered ? 'answered' : 'pending',
                  answer: answered ? 'Subscriptions' : null,
                },
              ],
      },
    }),
  );
  await page.route('**/v1/agent/*/questions/*/answer', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ answer: 'Subscriptions' });
    answered = true;
    phase = 'completed';
    await route.fulfill({ json: { question: { id: questionId, state: 'answered' } } });
  });
  await page.route('**/v1/ai/jobs/*/events', async (route) => {
    if (blocking === undefined) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      phase = 'completed';
    }
    const messages = activityEntries || [
      { id: randomUUID(), sequence: 0, state: 'working', message: 'Updating src/App.tsx' },
      {
        id: randomUUID(),
        sequence: 1,
        state: phase,
        message:
          phase === 'completed'
            ? 'Build and browser checks passed.'
            : 'Checking independent styles',
      },
    ];
    await route.fulfill({
      contentType: 'text/event-stream',
      body:
        messages.map((m) => 'data: ' + JSON.stringify(m) + '\n\n').join('') +
        'event: done\ndata: ' +
        JSON.stringify({ state: phase }) +
        '\n\n',
    });
  });
  await page.route('**/v1/ai/jobs/*/activity', (route) =>
    route.fulfill({
      json: {
        events: activityEntries || [
          {
            id: randomUUID(),
            sequence: 0,
            state: 'completed',
            message: 'Build and browser checks passed.',
          },
        ],
      },
    }),
  );
  await page.route('**/v1/projects/*/preview', (route) =>
    route.fulfill({
      json: {
        html: '<html><head></head><body><h1>Your appointment planner</h1><button onclick="this.textContent=\'Saved\'">Try preview</button></body></html>',
      },
    }),
  );
  return {
    idea,
    stats: () => ({ submissions, answered }),
    setBuild(next, details, entries) {
      phase = next;
      jobDetails = details;
      activityEntries = entries;
    },
  };
}
test('inline work feed groups repeats, keeps accurate clocks and shows an honest completion report', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page, null);
  const startedAt = new Date(Date.now() - 65000).toISOString();
  const entries = [
    { id: randomUUID(), sequence: 0, state: 'generating', message: 'Preparing the next changes.' },
    ...Array.from({ length: 4 }, (_, i) => ({
      id: randomUUID(),
      sequence: i + 1,
      createdAt: startedAt,
      state: 'working',
      message: 'Reviewed your booking form.',
      progress: {
        action: 'read',
        phase: 'completed',
        subject: 'your booking form',
        note: 'I’m checking how your booking form saves appointments. The form and appointment list should agree before I change the flow.',
      },
    })),
    ...['failed', 'started', 'completed'].map((phase, i) => ({
      id: randomUUID(),
      sequence: i + 5,
      createdAt: startedAt,
      state: 'working',
      message:
        phase === 'failed' ? 'This change needs another pass.' : 'Updating your booking form.',
      progress: {
        action: 'change',
        phase,
        subject: 'your booking form',
        note: 'I’m adding a clear booking confirmation. Once you save an appointment, the next step should be obvious—no guessing games.',
      },
    })),
  ];
  fixture.setBuild(
    'working',
    { createdAt: startedAt, timing: { startedAt, activeMs: 0, activeSince: startedAt } },
    entries,
  );
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  const activity = page.locator('.chat-job-activity');
  await expect(activity).toContainText('I’m adding a clear booking confirmation.');
  await expect(activity.locator('.build-elapsed')).toContainText('Working');
  const initial = await activity.locator('.build-elapsed time').textContent();
  await expect.poll(() => activity.locator('.build-elapsed time').textContent()).not.toBe(initial);
  await expect(activity.locator('.build-timeline li')).toHaveCount(3);
  await expect(activity.locator('.build-timeline')).toBeVisible();
  await expect(activity.locator('.build-timeline li[data-phase="failed"]')).toHaveCount(1);
  await expect(activity.locator('.build-action-row')).toContainText([
    'Read app files',
    'needs another pass',
    'Edited app files',
  ]);
  await expect(activity).not.toContainText('Preparing the next changes');
  await expect(activity.locator('.build-update').first()).toHaveCSS('font-size', '16px');
  await activity.locator('summary').click();
  await expect(activity.locator('.build-timeline')).not.toBeVisible();
  await activity.locator('summary').press('Enter');
  await expect(activity.locator('.build-timeline')).toBeVisible();
  await activity.locator('.build-update').first().click();
  await page.locator('.project-conversation').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: '.local/work-feed-working-dark.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(activity.locator('.build-update').first()).toHaveCSS('color', 'rgb(19, 19, 22)');
  await page.screenshot({ path: '.local/work-feed-working-light.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  fixture.setBuild(
    'paused',
    {
      stage: 'Paused. Your work is saved.',
      timing: { startedAt, activeMs: 67000, activeSince: null },
    },
    entries,
  );
  await page.reload();
  await expect(activity.locator('.build-elapsed')).toHaveText('Paused after 1m 07s');
  await page.waitForTimeout(1200);
  await expect(activity.locator('.build-elapsed')).toHaveText('Paused after 1m 07s');
  fixture.setBuild(
    'completed',
    {
      chargedCredits: 9,
      timing: {
        startedAt,
        activeMs: 3728000,
        activeSince: null,
        finishedAt: new Date().toISOString(),
      },
      result: {
        functionalityVerified: true,
        settled: true,
        changes: { files: 3, added: 47, removed: 12 },
        report: {
          built: ['An appointment form', 'Booking confirmation messages'],
          excluded: ['Online payments'],
          approach: ['Keep the first version focused on taking bookings'],
          checks: ['3 browser checks passed'],
        },
      },
    },
    entries,
  );
  await page.reload();
  const report = page.getByRole('region', { name: 'Build summary' });
  await expect(report).toContainText('Booking confirmation messages');
  await expect(report).toContainText('Online payments');
  await expect(report).toContainText('Keep the first version focused on taking bookings');
  await expect(activity.locator('.build-elapsed')).toHaveText('Worked for 1h 02m 08s');
  await page.waitForTimeout(1200);
  await expect(activity.locator('.build-elapsed')).toHaveText('Worked for 1h 02m 08s');
  const changes = page.getByLabel('Changes made');
  await expect(changes).toContainText('3 files changed');
  await expect(changes.getByLabel('47 lines added')).toBeVisible();
  await expect(changes.getByLabel('12 lines removed')).toBeVisible();
  await expect(report).toContainText('Used 9 credits');
  await expect(page.locator('.assistant-response strong')).toContainText(
    'The booking flow is working.',
  );
  await expect(page.locator('.assistant-response li')).toHaveCount(2);
  await expect(report).toHaveCSS('border-top-width', '0px');
  await page.screenshot({ path: '.local/build-progress-dark.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(report).toBeVisible();
  await expect(report).toHaveCSS('border-top-width', '0px');
  await page.screenshot({ path: '.local/build-progress-light.png', animations: 'disabled' });
});
test('unannotated tool events stay with real commentary and completed work collapses automatically', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page, null);
  const entries = [
    {
      id: randomUUID(),
      sequence: 0,
      state: 'working',
      message: 'Starting the booking update.',
      progress: {
        action: 'read',
        phase: 'completed',
        subject: 'your booking form',
        note: 'I’m rebuilding your booking form around a clear confirmation. The appointment list should show exactly what was saved.',
      },
    },
    ...Array.from({ length: 18 }, (_, i) => ({
      id: randomUUID(),
      sequence: i + 1,
      state: 'working',
      message: i % 2 ? 'Changes to your app are saved for checking.' : 'Reviewed your app.',
      progress: { action: i % 2 ? 'change' : 'read', phase: 'completed', subject: 'your app' },
    })),
  ];
  fixture.setBuild('working', {}, entries);
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  const activity = page.locator('.chat-job-activity');
  await expect(activity.locator('.build-update')).toHaveCount(1);
  await expect(activity).not.toContainText('Reviewed your app');
  await expect(activity).not.toContainText('saved for checking');
  await expect(activity.locator('.build-action-row')).toHaveCount(1);
  await expect(activity.locator('.build-timeline')).toBeVisible();
  fixture.setBuild(
    'completed',
    { result: { functionalityVerified: true, settled: true } },
    entries,
  );
  await expect(activity.locator('.build-timeline')).not.toBeVisible({ timeout: 12000 });
  await expect(page.locator('.assistant-response')).toContainText(
    'Online payments are not connected yet.',
  );
  await expect(page.locator('.recent-projects svg')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Recents', exact: true })).toHaveCSS(
    'font-size',
    '15px',
  );
  expect((await page.locator('.sidebar').boundingBox()).width).toBe(248);
});
test('formatted assistant replies cannot execute HTML, load images or link to active scripts', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page, null);
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.locator('.chat-job-activity')).toBeVisible();
  fixture.setBuild(
    'completed',
    {
      result: {
        settled: true,
        summary:
          '**Your answer**\n\n- A clear next step\n\n[Unsafe action](javascript:alert(1))\n\n![Do not load](https://example.invalid/untrusted-image.png)\n\n<script>alert(1)</script><img src="https://example.invalid/untrusted-image.png" onerror="alert(1)">',
      },
    },
    [],
  );
  await page.reload();
  const response = page.locator('.assistant-response');
  await expect(response.locator('strong')).toHaveText('Your answer');
  await expect(response.locator('li')).toHaveText('A clear next step');
  await expect(response.locator('img, script')).toHaveCount(0);
  expect((await response.getByText('Unsafe action').getAttribute('href')) || '').not.toContain(
    'javascript:',
  );
});

test('slow project creation and chat submission show the prompt immediately without waiting for refreshes', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page);
  let openProject;
  const projectGate = new Promise((resolve) => {
    openProject = resolve;
  });
  await page.route('**/v1/projects', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await projectGate;
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.getByRole('main', { name: 'Starting your project' })).toBeVisible({
    timeout: 1000,
  });
  await expect(page.locator('.chat-message.user')).toHaveText(fixture.idea);
  openProject();
  await expect(page.locator('.assistant-response')).toBeVisible();
  let finishEstimate;
  const estimateGate = new Promise((resolve) => {
    finishEstimate = resolve;
  });
  let messageWrites = 0;
  await page.route('**/v1/projects/*/messages', (route) => {
    messageWrites++;
    return route.abort();
  });
  await page.route('**/v1/ai/turns', async (route) => {
    await estimateGate;
    await route.fulfill({
      status: 503,
      json: { error: { message: 'Please retry this request.' } },
    });
  });
  const prompt = 'Make the appointment buttons larger and clearer';
  await page.getByLabel('Ask Gotcha to build or edit your app').fill(prompt);
  await page.getByRole('button', { name: 'Send prompt' }).click();
  await expect(page.locator('.chat-message.user').last()).toHaveText(prompt, { timeout: 1000 });
  await expect(page.getByLabel('Ask Gotcha to build or edit your app')).toHaveValue('');
  await expect(
    page.getByRole('button', { name: 'Send prompt' }).locator('.lucide-loader-circle'),
  ).toHaveCount(0);
  expect(messageWrites).toBe(0);
  finishEstimate();
  await expect(
    page.getByRole('status').filter({ hasText: 'Please retry this request.' }),
  ).toBeVisible();
  await expect(page.locator('.chat-message.user').last()).toHaveText(prompt);
  await page.reload();
  await expect(page.locator('.chat-message.user').last()).toHaveText(prompt);
  await expect(page.getByRole('button', { name: 'Retry this build' })).toBeVisible();
});
test('long activity stays readable, expands earlier updates and fits a phone', async ({ page }) => {
  await register(page);
  const fixture = await agentFixture(page, null);
  const entries = Array.from({ length: 9 }, (_, i) => ({
    id: randomUUID(),
    sequence: i,
    state: 'working',
    message: `Reviewed booking step ${i + 1}.`,
    progress: {
      action: 'read',
      phase: 'completed',
      subject: 'your booking form',
      note: `Checking booking step ${i + 1}. Keeping your appointment flow clear.`,
    },
  }));
  fixture.setBuild('working', {}, entries);
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  const activity = page.locator('.chat-job-activity');
  await expect(activity.locator('.build-timeline li')).toHaveCount(6);
  await expect(activity).not.toContainText('Checking booking step 1.');
  await activity.getByRole('button', { name: 'Show 3 earlier updates' }).click();
  await expect(activity.locator('.build-timeline li')).toHaveCount(9);
  await expect(activity).toContainText('Checking booking step 1.');
  await activity.getByRole('button', { name: 'Show fewer updates' }).click();
  await expect(activity.locator('.build-timeline li')).toHaveCount(6);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(activity.locator('.build-update').last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('sending an idea queues one bounded build and opens the verified mini-browser beside the chat', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page);
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page).toHaveURL(/\/projects\?chat=/);
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('.chat-message.user')).toContainText(fixture.idea);
  await expect(page.locator('.build-live-status.activity-indicator')).toBeVisible();
  await expect(page.locator('.build-live-status canvas')).toBeVisible();
  await expect(page.locator('.build-live-status .activity-shimmer')).toHaveCSS(
    'animation-name',
    'activity-light-sweep',
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const frame = page.frameLocator('iframe[title="Your app preview"]');
  await expect(frame.getByRole('heading', { name: 'Your appointment planner' })).toBeVisible();
  await page
    .locator('.chat-preview')
    .evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {}))),
    );
  await frame.getByRole('button', { name: 'Try preview' }).click();
  await expect(frame.getByRole('button', { name: 'Saved' })).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  await expect(page.locator('.chat-message.assistant')).toContainText(
    'The booking flow is working.',
  );
  expect(fixture.stats()).toEqual({ submissions: 1, answered: false });
  await expect(page.locator('.chat-routing-label')).toHaveCount(0);
  await expect(page.locator('.chat-composer-note')).toHaveCount(0);
  await expect(page.getByLabel('App preview address')).toHaveValue(
    /\/v1\/projects\/[^/]+\/preview\/document$/,
  );
  const before = await page.locator('.chat-preview').boundingBox();
  const divider = page.getByRole('separator', { name: 'Resize app preview' });
  const handle = await divider.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 100, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await page.locator('.chat-preview').boundingBox()).width)
    .toBeGreaterThan(before.width + 80);
  const value = Number(await divider.getAttribute('aria-valuenow'));
  await divider.focus();
  await divider.press('ArrowLeft');
  await expect(divider).toHaveAttribute('aria-valuenow', String(value - 5));
  await page.getByRole('button', { name: 'Hide project chat' }).click();
  await expect(page.getByRole('region', { name: 'Project chat' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Show project chat' }).click();
  await expect(page.getByLabel('Ask Gotcha to build or edit your app')).toBeVisible();
  await page.screenshot({ path: '.local/chat-preview.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Close app preview' }).click();
  await expect(page.locator('iframe')).not.toBeVisible();
  await page.getByRole('button', { name: 'Toggle app preview' }).click();
  await expect(page.locator('iframe')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(page.locator('iframe')).toBeVisible();
  await page.getByRole('button', { name: 'Close app preview' }).click();
  await expect(page.getByLabel('Ask Gotcha to build or edit your app')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('Enter sends home and chat prompts while Shift+Enter and IME composition preserve the draft', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page);
  const home = page.getByLabel('Describe your app idea');
  await home.fill(fixture.idea);
  await home.press('Shift+Enter');
  await expect(home).toHaveValue(fixture.idea + '\n');
  await home.dispatchEvent('keydown', { key: 'Enter', isComposing: true, keyCode: 229 });
  expect(fixture.stats().submissions).toBe(0);
  await expect(home).toHaveValue(fixture.idea + '\n');
  await home.press('Enter');
  await expect(page.locator('iframe')).toBeVisible();
  await expect.poll(() => fixture.stats().submissions).toBe(1);
  await page.getByRole('button', { name: 'Close app preview' }).click();
  const chat = page.getByLabel('Ask Gotcha to build or edit your app');
  await chat.fill(fixture.idea);
  await chat.press('Shift+Enter');
  await expect(chat).toHaveValue(fixture.idea + '\n');
  expect(fixture.stats().submissions).toBe(1);
  await chat.press('Enter');
  await expect.poll(() => fixture.stats().submissions).toBe(2);
});
for (const blocking of [true, false])
  test(
    (blocking ? 'blocking' : 'non-blocking') +
      ' agent questions stay in chat and resume after answering',
    async ({ page }) => {
      await register(page);
      const fixture = await agentFixture(page, blocking);
      await page.getByLabel('Describe your app idea').fill(fixture.idea);
      await page.getByRole('button', { name: 'Create project from idea' }).click();
      const modal = page.getByRole('dialog', { name: 'Billing choice' });
      await expect(modal).toContainText(
        blocking ? 'The build is paused at a saved checkpoint' : 'Independent work continues',
      );
      await expect(modal).toContainText('Should appointments require a subscription?');
      await page.screenshot({
        path: '.local/chat-question-' + blocking + '.png',
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Close dialog' }).click();
      await expect(page.locator('.chat-question-chip')).toBeVisible();
      if (!blocking)
        await expect(page.locator('.build-live-status.activity-indicator')).toBeVisible();
      else await expect(page.locator('.build-live-status.activity-indicator')).toHaveCount(0);
      await expect(page.locator('iframe')).not.toBeVisible();
      await page.locator('.chat-question-chip').click();
      await modal.getByRole('button', { name: 'Subscriptions', exact: true }).click();
      await expect(page.getByLabel('Your answer')).toHaveValue('Subscriptions');
      await page.getByRole('button', { name: 'Send answer', exact: true }).click();
      await expect(modal).toHaveCount(0);
      await expect(
        page.frameLocator('iframe').getByRole('heading', { name: 'Your appointment planner' }),
      ).toBeVisible();
      expect(fixture.stats()).toEqual({ submissions: 1, answered: true });
    },
  );
test('login remains static and minimal sidebar controls and light glass stay borderless', async ({
  page,
}) => {
  await page.goto('/auth/login');
  for (const [width, height] of [
    [1440, 900],
    [1024, 500],
    [390, 600],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open my workspace' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true);
    await page.mouse.wheel(0, 500);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await register(page);
  for (const theme of ['dark', 'light']) {
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    const primary = page.getByRole('button', { name: 'New project', exact: true });
    await expect(primary).toHaveCSS('border-top-width', '0px');
    expect(await primary.evaluate((el) => getComputedStyle(el).boxShadow)).not.toContain('inset');
    await expect(page.locator('.project-composer')).toHaveCSS('border-top-width', '0px');
    expect(
      await page.locator('.project-composer').evaluate((el) => getComputedStyle(el).backdropFilter),
    ).toContain('blur(24px)');
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page.locator('.primary-navigation a.active')).toHaveCSS('border-top-width', '0px');
    await page.getByRole('button', { name: 'New project', exact: true }).click();
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  }
  await expect(page.locator('.project-composer')).toHaveCSS(
    'background-color',
    'rgba(255, 255, 255, 0.36)',
  );
  await expect(page.locator('.project-library-grid')).toHaveCount(0);
  await page.screenshot({ path: '.local/new-project-light-minimal.png', animations: 'disabled' });
});
test('chat uses compact unlabelled user bubbles, neutral gray themes and translucent light glass', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(
    page,
    undefined,
    'Build an appointment planner for my agency. Keep the customer bookings clear, give each appointment a time and a customer name, and make the entire application easy to use on a phone.',
  );
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.locator('iframe')).toBeVisible();
  await page.getByRole('button', { name: 'Close app preview' }).click();
  for (const theme of ['dark', 'light']) {
    await expect(page.locator('.project-chat')).toHaveCSS(
      'background-color',
      theme === 'dark' ? 'rgb(23, 23, 23)' : 'rgb(237, 237, 240)',
    );
    await expect(page.getByText('YOU', { exact: true })).toHaveCount(0);
    const bubble = page.locator('.chat-message.user > p').first();
    await expect(bubble).toBeVisible();
    await expect(bubble).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(245, 245, 245)' : 'rgb(19, 19, 22)',
    );
    await expect(page.locator('.chat-message.assistant .assistant-response p').first()).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(245, 245, 245)' : 'rgb(19, 19, 22)',
    );
    expect((await bubble.boundingBox()).width).toBeLessThanOrEqual(460);
    await expect(page.locator('.credit-box')).toHaveCSS('border-width', '0px');
    await expect(page.locator('.chat-composer')).toHaveCSS('border-width', '0px');
    await expect(page.locator('.chat-composer')).toHaveCSS('backdrop-filter', /blur\(24px\)/);
    if (theme === 'light') {
      await expect(page.locator('.chat-composer')).toHaveCSS(
        'background-color',
        'rgba(255, 255, 255, 0.36)',
      );
      await expect(page.locator('.chat-composer')).toHaveCSS('background-image', /linear-gradient/);
    }
    await page.screenshot({
      path: '.local/chat-contrast-' + theme + '.png',
      animations: 'disabled',
    });
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  }
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect
    .poll(() => page.locator('.earth-current').evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(1000);
  await expect(page.locator('.earth-current')).toHaveCSS('opacity', '1');
  await expect(page.locator('.project-composer')).toHaveCSS('background-image', /linear-gradient/);
  await page.screenshot({ path: '.local/home-glass-light.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('attachment menus dismiss outside and stay above the bottom chat composer in both themes', async ({
  page,
}) => {
  await register(page);
  const attach = page.getByLabel('Add files or images');
  const menu = page.locator('.reference-menu');
  const home = page.getByLabel('Describe your app idea');
  await attach.click();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('border-width', '0px');
  await home.click();
  await expect(menu).not.toBeVisible();
  await attach.click();
  await attach.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(attach).toBeFocused();
  const homeGlass = await page.locator('.project-composer').evaluate((el) => ({
    color: getComputedStyle(el).backgroundColor,
    sheen: getComputedStyle(el).backgroundImage,
  }));
  expect(homeGlass.color).toBe('rgba(5, 5, 6, 0.9)');
  const fixture = await agentFixture(page);
  await home.fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.locator('iframe')).toBeVisible();
  await page.getByRole('button', { name: 'Close app preview' }).click();
  const chat = page.getByLabel('Ask Gotcha to build or edit your app');
  await expect(page.locator('.chat-composer')).toHaveCSS('background-color', homeGlass.color);
  await expect(page.locator('.chat-composer')).toHaveCSS('background-image', homeGlass.sheen);
  for (const theme of ['dark', 'light']) {
    for (const [width, height] of [
      [1440, 1000],
      [1024, 500],
      [390, 700],
    ]) {
      await page.setViewportSize({ width, height });
      await attach.click();
      await expect(menu).toBeVisible();
      await expect(menu).toHaveCSS('border-width', '0px');
      await expect(menu.getByRole('button', { name: 'Add a text file' })).toBeVisible();
      await expect(menu.getByRole('button', { name: 'Add an image' })).toBeVisible();
      const bounds = await menu.boundingBox();
      const trigger = await attach.boundingBox();
      const composer = await page.locator('.chat-composer').boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThan(trigger.y);
      expect(bounds.y + bounds.height).toBeLessThan(composer.y);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await chat.click();
      await expect(menu).not.toBeVisible();
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await attach.click();
    await page.screenshot({
      path: '.local/chat-attachments-' + theme + '.png',
      animations: 'disabled',
    });
    await attach.press('Escape');
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  }
});
test('public hosting is blocked until ready and requires approval of the reviewed revision', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page);
  let ready = false,
    approved = null;
  await page.route('**/v1/resources/*/publication', (route) =>
    route.fulfill({
      json: {
        ready,
        revision: 0,
        url: ready ? 'https://app.example.test' : null,
        provider: 'cloudflare',
        reasons: ready ? [] : ['Cloudflare hosting is not configured.'],
        operations: approved
          ? [{ id: randomUUID(), state: 'succeeded', result: { url: 'https://app.example.test' } }]
          : [],
      },
    }),
  );
  await page.route('**/v1/resources', async (route) => {
    expect(route.request().method()).toBe('POST');
    approved = route.request().postDataJSON();
    await route.fulfill({ status: 202, json: { operation: { state: 'pending' } } });
  });
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.locator('iframe')).toBeVisible();
  await page.getByRole('button', { name: 'Publish app', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review publication' })).toBeDisabled();
  await expect(page.getByText('Cloudflare hosting is not configured.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download playable app' })).toBeVisible();
  expect(approved).toBeNull();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  ready = true;
  await page.getByRole('button', { name: 'Publish app', exact: true }).click();
  await page.getByRole('button', { name: 'Review publication' }).click();
  const review = page.getByRole('dialog', { name: 'Publish this app publicly?' });
  await expect(review).toContainText('Revision 0 will be uploaded to Cloudflare');
  await expect(review).toContainText('https://app.example.test');
  expect(approved).toBeNull();
  await review.getByRole('button', { name: 'Close dialog', exact: true }).click();
  expect(approved).toBeNull();
  await page.getByRole('button', { name: 'Review publication' }).click();
  await review.getByRole('button', { name: 'Approve public deployment' }).click();
  await expect(review).toHaveCount(0);
  expect(approved).toMatchObject({
    projectId: new URL(page.url()).searchParams.get('chat'),
    kind: 'deployment',
    provider: 'cloudflare',
    revision: 0,
    confirmation: 'APPROVE PAID RESOURCE',
  });
  expect(approved.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.getByRole('link', { name: 'https://app.example.test' })).toBeVisible();
});
test.afterEach(async ({ page }) => {
  const response = await page.request.get('/v1/auth/me');
  if (response.status() !== 200) return;
  const me = await response.json();
  if (!me.user.email.startsWith('browser-chat-') || !me.user.email.endsWith('@gotcha.test')) return;
  await page.request.delete('/v1/auth/account', {
    headers: { origin, 'x-csrf-token': me.csrfToken },
    data: { confirmation: 'DELETE MY ACCOUNT' },
  });
});

test('follow-ups can be queued, survive reload, and sent now or removed without a duplicate build', async ({
  page,
}) => {
  await register(page);
  const fixture = await agentFixture(page, null);
  await page.getByLabel('Describe your app idea').fill(fixture.idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.locator('.chat-job-activity')).toBeVisible();
  const url = new URL(page.url()),
    projectId = url.searchParams.get('chat');
  let turns = [],
    body;
  const runningId = randomUUID();
  await page.route('**/v1/ai/turns', async (route) => {
    body = route.request().postDataJSON();
    const turn = {
      id: body.idempotencyKey,
      projectId,
      prompt: body.prompt,
      state: 'pending',
      mode: body.mode,
    };
    turns = [turn, ...turns];
    await route.fulfill({ status: 202, json: { turn } });
  });
  await page.route('**/v1/ai/turns?*', (route) => route.fulfill({ json: { turns } }));
  await page.route('**/v1/projects/' + projectId, async (route) => {
    const response = await route.fetch(),
      data = await response.json();
    data.jobs = [{ id: runningId, state: 'working', stage: 'Working', result: {} }];
    data.turns = turns;
    data.messages.push(...turns.map((t) => ({ id: t.id, role: 'user', content: t.prompt })));
    await route.fulfill({ json: data });
  });
  await page.route('**/v1/ai/turns/*/*', async (route) => {
    const action = route.request().url().split('/').at(-1);
    const turn = turns[0];
    turns = [
      {
        ...turn,
        state: action === 'cancel' ? 'cancelled' : 'pending',
        mode: action === 'cancel' ? turn.mode : 'interrupt',
      },
      ...turns.slice(1),
    ];
    await route.fulfill({ json: { turn: turns[0] } });
  });
  const prompt = page.getByLabel('Ask Gotcha to build or edit your app');
  await prompt.fill('Add a customer filter after the current work');
  await page.getByRole('button', { name: 'Queue message', exact: true }).click();
  expect(body.mode).toBe('queue');
  await expect(page.getByLabel('Queued messages')).toContainText(body.prompt);
  await expect(page.getByText('Sending your request', { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Queued messages')).toContainText(body.prompt);
  await page.getByRole('button', { name: 'Send now', exact: true }).click();
  expect(turns[0].mode).toBe('interrupt');
  await page.getByRole('button', { name: 'Remove queued message: ' + body.prompt }).click();
  await expect(page.getByLabel('Queued messages')).toHaveCount(0);
  await prompt.fill('Use a simpler layout instead');
  await page.getByRole('button', { name: 'Interrupt & send', exact: true }).click();
  expect(body.mode).toBe('interrupt');
  // Let outstanding mocked project reads finish before account cleanup removes the project.
  await page.unrouteAll({ behavior: 'wait' });
});

test('a conversational reply appears without any build activity or preview', async ({ page }) => {
  await register(page);
  const idea = 'Did you even understand my blank-screen problem?';
  let projectId, turnId;
  await page.route('**/v1/ai/turns', async (route) => {
    const body = route.request().postDataJSON();
    projectId = body.projectId;
    turnId = body.idempotencyKey;
    await route.fulfill({
      status: 202,
      json: { turn: { id: turnId, projectId, prompt: idea, state: 'pending' } },
    });
  });
  await page.route(/\/v1\/projects\/[a-f0-9-]+$/, async (route) => {
    const response = await route.fetch(),
      data = await response.json();
    if (data.project.id === projectId) {
      data.turns = [{ id: turnId, projectId, prompt: idea, state: 'answered' }];
      data.messages.push({
        id: randomUUID(),
        role: 'assistant',
        content:
          'Yes. Story map and Edit planner go blank. You also asked how this can scale. I have not made changes.',
      });
    }
    await route.fulfill({ json: data });
  });
  await page.getByLabel('Describe your app idea').fill(idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.locator('.assistant-response')).toContainText(
    'Story map and Edit planner go blank',
  );
  await expect(page.locator('.chat-job-activity')).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
});

async function openEmptyChat(page) {
  await register(page);
  const me = await (await page.request.get('/v1/auth/me')).json();
  const response = await page.request.post('/v1/projects', {
    headers: { origin, 'x-csrf-token': me.csrfToken },
    data: { name: 'Composer feedback test', template: 'blank' },
  });
  expect(response.ok()).toBe(true);
  const { project } = await response.json();
  await page.goto('/projects?chat=' + project.id);
  await expect(page.getByLabel('Ask Gotcha to build or edit your app')).toBeVisible();
  return project.id;
}

test('message feedback is immediate before a slow API, follows intent processing, and stops for an answer', async ({
  page,
}) => {
  const projectId = await openEmptyChat(page);
  const prompt = 'Explain what my app can do without making changes';
  let release,
    turnId,
    phase = 'accepting',
    submissions = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/v1/ai/turns', async (route) => {
    submissions++;
    turnId = route.request().postDataJSON().idempotencyKey;
    await gate;
    phase = 'pending';
    await route.fulfill({
      status: 202,
      json: { turn: { id: turnId, projectId, prompt, state: phase } },
    });
  });
  await page.route('**/v1/ai/turns?*', async (route) => {
    if (phase === 'pending') phase = 'processing';
    await route.fulfill({ json: { turns: [{ id: turnId, projectId, prompt, state: phase }] } });
  });
  await page.route('**/v1/projects/' + projectId, async (route) => {
    const response = await route.fetch(),
      data = await response.json();
    data.turns = [{ id: turnId, projectId, prompt, state: phase }];
    data.messages = [{ id: turnId, role: 'user', content: prompt }];
    if (phase === 'answered')
      data.messages.push({
        id: randomUUID(),
        role: 'assistant',
        content: 'Your app is a saved blank project. No changes were made.',
      });
    await route.fulfill({ json: data });
  });
  await page.getByLabel('Ask Gotcha to build or edit your app').fill(prompt);
  await page.getByRole('button', { name: 'Send prompt', exact: true }).click();
  const feedback = page.locator('.assistant-pending');
  // The response is held indefinitely: this must not depend on an API response or timer.
  await expect(feedback).toContainText('Connecting', { timeout: 1000 });
  await expect(feedback.locator('canvas')).toBeVisible();
  await expect(page.locator('.chat-message.user').last()).toContainText(prompt);
  await expect(page.getByText('Sending your request', { exact: false })).toHaveCount(0);
  await page.screenshot({ path: '.local/orb-immediate-feedback-dark.png' });
  release();
  await expect(feedback).toContainText('Thinking');
  await expect(feedback.locator('.activity-shimmer')).toHaveCSS(
    'animation-name',
    'activity-light-sweep',
  );
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await page.screenshot({ path: '.local/orb-thinking-light.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(feedback.locator('.activity-shimmer')).toHaveCSS('animation-name', 'none');
  phase = 'answered';
  await expect(page.locator('.assistant-response')).toContainText('No changes were made.');
  await expect(feedback).toHaveCount(0);
  await expect(page.locator('.chat-job-activity')).toHaveCount(0);
  expect(submissions).toBe(1);
});

test('a rejected send stops its immediate activity and keeps the error and user message', async ({
  page,
}) => {
  await openEmptyChat(page);
  await page.route('**/v1/ai/turns', (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: 'Temporarily unavailable. Try again.' } },
    }),
  );
  const prompt = 'Add a customer directory';
  await page.getByLabel('Ask Gotcha to build or edit your app').fill(prompt);
  await page.getByRole('button', { name: 'Send prompt', exact: true }).click();
  await expect(page.locator('.chat-notice')).toContainText('Temporarily unavailable');
  await expect(page.locator('.assistant-pending')).toHaveCount(0);
  await expect(page.locator('.chat-message.user')).toContainText(prompt);
  await expect(page.getByRole('button', { name: 'Retry this build' })).toBeVisible();
});

test('home and chat prompts expand for long text, cap their height and shrink after clearing', async ({
  page,
}) => {
  await register(page);
  const home = page.getByLabel('Describe your app idea');
  const start = (await home.boundingBox()).height;
  const long = Array.from(
    { length: 35 },
    (_, i) => `Requirement ${i + 1}: Keep this useful detail visible while I write.`,
  ).join('\n');
  await home.fill(long);
  await expect.poll(async () => (await home.boundingBox()).height).toBeGreaterThan(start + 100);
  await expect(home).toHaveCSS('overflow-y', 'auto');
  expect((await home.boundingBox()).height).toBeLessThanOrEqual(361);
  await page.screenshot({ path: '.local/growing-prompt-home.png' });
  await home.fill('A short idea');
  await expect.poll(async () => (await home.boundingBox()).height).toBe(start);
  const me = await (await page.request.get('/v1/auth/me')).json();
  const { project } = await (
    await page.request.post('/v1/projects', {
      headers: { origin, 'x-csrf-token': me.csrfToken },
      data: { name: 'Growing composer', template: 'blank' },
    })
  ).json();
  await page.goto('/projects?chat=' + project.id);
  const input = page.getByLabel('Ask Gotcha to build or edit your app');
  const conversation = page.locator('.project-conversation');
  const before = (await conversation.boundingBox()).height;
  await input.fill(long);
  await expect.poll(async () => (await input.boundingBox()).height).toBeGreaterThan(200);
  expect((await conversation.boundingBox()).height).toBeLessThan(before - 100);
  await input.press('Shift+Enter');
  await expect(input).toHaveValue(long + '\n');
  await page.screenshot({ path: '.local/growing-prompt-chat.png' });
  await page.setViewportSize({ width: 390, height: 760 });
  await expect.poll(async () => (await input.boundingBox()).height).toBeLessThanOrEqual(289);
  await expect(page.getByRole('button', { name: 'Send prompt', exact: true })).toBeInViewport();
  await input.fill('Short');
  await expect.poll(async () => (await input.boundingBox()).height).toBeLessThan(80);
});
