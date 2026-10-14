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
    estimates = 0,
    submissions = 0,
    answered = false;
  const jobId = randomUUID(),
    questionId = randomUUID();
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
  await expect(page.locator('.chat-routing-label')).toHaveCount(0);
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
      if (!blocking) await expect(page.locator('.agent-working')).toBeVisible();
      else await expect(page.locator('.agent-working')).toHaveCount(0);
      await expect(page.locator('iframe')).not.toBeVisible();
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
    await expect(page.locator('.chat-message.assistant > p').first()).toHaveCSS(
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
