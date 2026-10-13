const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const origin = process.env.E2E_APP_ORIGIN || 'http://localhost:7011';
async function register(page) {
  await page.goto('/auth/register');
  await page.getByLabel('Your first name').fill('Chat Test');
  await page.getByLabel('Email address').fill('browser-chat-' + randomUUID() + '@nebula.test');
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
async function agentFixture(page, blocking) {
  let phase = 'new',
    projectId,
    estimates = 0,
    submissions = 0,
    answered = false;
  const jobId = randomUUID(),
    questionId = randomUUID();
  const idea = 'Build an appointment planner for my agency';
  await page.route('**/v1/ai/estimate', async (route) => {
    estimates++;
    const data = route.request().postDataJSON();
    expect(data.engine).toBe('agent-v1');
    expect(data.prompt).toBe(idea);
    expect(data.modelId).toBeUndefined();
    projectId = data.projectId;
    await route.fulfill({ json: { min: 2, max: 4 } });
  });
  await page.route('**/v1/ai/jobs', async (route) => {
    submissions++;
    expect(route.request().postDataJSON()).toMatchObject({
      projectId,
      prompt: idea,
      maxCredits: 4,
      engine: 'agent-v1',
    });
    phase = blocking === undefined ? 'queued' : blocking ? 'paused' : 'working';
    await route.fulfill({ status: 202, json: { job: { id: jobId, state: phase } } });
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
        },
      ];
      data.messages[0].jobId = jobId;
      if (phase === 'completed') {
        data.project.settings.validatedRevision = data.project.revision;
        data.messages.push({
          id: randomUUID(),
          role: 'assistant',
          content: 'Built your appointment planner. Build and browser checks passed.',
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
          blocking === undefined || !projectId
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
    const messages = [
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
        events: [
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
  return { idea, stats: () => ({ estimates, submissions, answered }) };
}
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
  await expect(page.locator('.agent-working')).toBeVisible();
  await expect(page.locator('.agent-working > i')).toHaveCSS('animation-name', 'agent-pulse');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const frame = page.frameLocator('iframe[title="Your app preview"]');
  await expect(frame.getByRole('heading', { name: 'Your appointment planner' })).toBeVisible();
  await frame.getByRole('button', { name: 'Try preview' }).click();
  await expect(frame.getByRole('button', { name: 'Saved' })).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
  await expect(page.locator('.chat-message.assistant')).toContainText(
    'Build and browser checks passed.',
  );
  expect(fixture.stats()).toEqual({ estimates: 1, submissions: 1, answered: false });
  await page.screenshot({ path: '.local/chat-preview.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Close app preview' }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
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
      if (!blocking) await expect(page.locator('.agent-working')).toBeVisible();
      else await expect(page.locator('.agent-working')).toHaveCount(0);
      await expect(page.locator('iframe')).toHaveCount(0);
      await page.locator('.chat-question-chip').click();
      await modal.getByRole('button', { name: 'Subscriptions', exact: true }).click();
      await expect(page.getByLabel('Your answer')).toHaveValue('Subscriptions');
      await page.getByRole('button', { name: 'Send answer', exact: true }).click();
      await expect(modal).toHaveCount(0);
      await expect(
        page.frameLocator('iframe').getByRole('heading', { name: 'Your appointment planner' }),
      ).toBeVisible();
      expect(fixture.stats()).toEqual({ estimates: 1, submissions: 1, answered: true });
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
    'rgba(255, 255, 255, 0.76)',
  );
  await expect(page.locator('.project-library-grid')).toHaveCount(0);
  await page.screenshot({ path: '.local/new-project-light-minimal.png', animations: 'disabled' });
});
test.afterEach(async ({ page }) => {
  const response = await page.request.get('/v1/auth/me');
  if (response.status() !== 200) return;
  const me = await response.json();
  if (!me.user.email.startsWith('browser-chat-') || !me.user.email.endsWith('@nebula.test')) return;
  await page.request.delete('/v1/auth/account', {
    headers: { origin, 'x-csrf-token': me.csrfToken },
    data: { confirmation: 'DELETE MY ACCOUNT' },
  });
});
