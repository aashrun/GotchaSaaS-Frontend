const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
test('app entry, authentication, project persistence, safe editor, checkpoints and template CRUD work', async ({
  page,
}) => {
  await page.route('**/v1/config', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.providers.find((p) => p.id === 'e2b').configured = false;
    await route.fulfill({ json: data });
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveURL('/auth/login');
  await page.getByRole('link', { name: 'Create an account', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your first name' }).fill('Browser Test');
  await page
    .getByRole('textbox', { name: 'Email address' })
    .fill(`browser-${randomUUID()}@nebula.test`);
  await page.getByLabel('Password', { exact: true }).fill('A secure browser password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  await page
    .getByRole('textbox', { name: 'Describe your app idea' })
    .fill('Build a simple CRM for customer tracking');
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page).toHaveURL(/\/studio\//);
  await expect(page.locator('.studio-project-name')).toContainText(
    'Build a simple CRM for customer tracking',
  );
  const frame = page.frameLocator('iframe[title="Original template preview"]');
  await expect(
    frame.getByRole('heading', { name: 'Good relationships start here.' }),
  ).toBeVisible();
  await frame.getByRole('textbox', { name: 'Customer name' }).fill('Test customer');
  await frame.getByRole('textbox', { name: 'Customer email' }).fill('customer@example.test');
  await frame.getByRole('button', { name: 'Add customer' }).click();
  await expect(frame.getByRole('cell', { name: 'Test customer', exact: true })).toBeVisible();
  await frame.getByRole('combobox', { name: 'Stage for Test customer' }).selectOption('Won');
  await frame.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(frame.getByRole('cell', { name: 'Test customer', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show source tools' }).click();
  await page.getByRole('tab', { name: 'Versions' }).click();
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).click();
  await page.getByRole('textbox', { name: 'Checkpoint name' }).fill('Before visual refinement');
  await page.getByRole('button', { name: 'Save checkpoint', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Before visual refinement' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Show source tools' }).click();
  await expect(page.getByRole('tab', { name: 'Code', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Versions' }).click();
  await expect(page.getByRole('heading', { name: 'Before visual refinement' })).toBeVisible();
  await page.getByRole('tab', { name: 'Tests' }).click();
  await expect(
    page.getByText('No sandbox validation has been run yet.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Code', exact: true }).click();
  await page.getByRole('button', { name: 'Protect src/App.tsx', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unlock src/App.tsx', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Unlock src/App.tsx', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Protect src/App.tsx', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.locator('.monaco-editor').click({ position: { x: 150, y: 90 } });
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('// Browser verified source edit');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your source is saved. Let’s verify it.' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Versions' }).click();
  const saved = page
    .locator('.version-row')
    .filter({ has: page.getByRole('heading', { name: 'Before visual refinement' }) });
  await saved.getByRole('button', { name: 'Restore source', exact: true }).click();
  await page.getByRole('button', { name: 'Restore source only' }).click();
  await expect(page.getByText('Source restored. Database unchanged.')).toBeVisible();
  await page.getByRole('tab', { name: 'Code', exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="Original template preview"]')
      .getByRole('heading', { name: 'Good relationships start here.' }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Ask Gotcha to build or edit your app' })
    .fill('Improve the mobile layout');
  await page.getByRole('button', { name: 'Estimate AI generation' }).click();
  await expect(
    page.getByText('The secure E2B sandbox is not configured. No credits were charged.'),
  ).toBeVisible();
  await page.screenshot({ path: '.local/studio.png' });
  await page.getByRole('link', { name: 'Back to projects', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Build a simple CRM for customer tracking' }),
  ).toBeVisible();
  await page.screenshot({ path: '.local/projects.png', fullPage: true });
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Open local development mailbox' }).click();
  await page.getByRole('link', { name: 'Open secure link' }).click();
  await expect(page.getByText('Your email is verified. You’re ready to build.')).toBeVisible();
  await page.getByRole('link', { name: 'Open workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  await page.getByRole('link', { name: 'Billing & usage' }).click();
  await expect(page.getByRole('heading', { name: 'Your credit ledger' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'signup grant', exact: true })).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('light');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Your profile is saved')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects');
  await expect(
    page.getByRole('heading', { name: 'Build a simple CRM for customer tracking' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Team members' })).toBeVisible();
  await page.getByRole('button', { name: 'Close navigation', exact: true }).first().click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/projects');
  await page
    .getByRole('button', { name: 'Actions for Build a simple CRM for customer tracking' })
    .click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete Build a simple CRM for customer tracking' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Build a simple CRM for customer tracking' }),
  ).toHaveCount(0);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Delete my account', exact: true }).click();
  await page.getByRole('textbox', { name: 'Type DELETE MY ACCOUNT' }).fill('DELETE MY ACCOUNT');
  await page.getByRole('button', { name: 'Permanently delete account' }).click();
  await expect(page).toHaveURL('/auth/login');
  expect(errors).toEqual([]);
});
test('mobile app entry, authentication and legal pages stay responsive', async ({ page }) => {
  const mediaRequests = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.mp4')) mediaRequests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to your workspace.' })).toBeVisible();
  await expect(page).toHaveURL('/auth/login');
  await expect(page.locator('.auth-brand')).toBeHidden();
  expect(mediaRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.local/mobile.png', fullPage: true });
  await page.getByLabel('Password', { exact: true }).fill('A visible password!');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Find your way back.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/privacy');
  await expect(
    page.getByRole('heading', { name: 'Privacy policy · draft for legal review' }),
  ).toBeVisible();
});

test('login uses a sharp still Earth image and a cloud image in light mode', async ({ page }) => {
  const mediaRequests = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.mp4')) mediaRequests.push(request.url());
  });
  await page.goto('/auth/login');
  await expect(page.locator('.auth-form > .logo')).toHaveText('Gotcha!');
  await expect(page.locator('.auth-form > .logo img, .auth-form > .logo svg')).toHaveCount(0);
  await expect(page.getByText('NEBULA STUDIO', { exact: true })).toHaveCount(0);
  const image = page.locator('.planet-scene img');
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(1000);
  await expect(image).toHaveAttribute('src', /earth-\d+/);
  await expect(page.locator('video')).toHaveCount(0);
  await page.screenshot({
    path: '.local/login-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(image).toHaveAttribute('src', /sky-clouds-/);
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(1000);
  await page.screenshot({ path: '.local/login-light.png', fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(image).toBeVisible();
  expect(mediaRequests).toEqual([]);
});

test('Earth workspace themes, rotation and sidebar footer work at every viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const email = `browser-layout-${randomUUID()}@nebula.test`;
  const password = 'A secure layout password!1';
  await page.clock.install({ time: new Date() });
  await page.goto('/auth/register');
  await page.getByRole('textbox', { name: 'Your first name' }).fill('Aashrun');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  const earth = page.locator('.earth-current');
  await expect(earth).toBeVisible();
  await expect.poll(() => earth.evaluate((image) => image.naturalWidth)).toBeGreaterThan(1000);
  await expect(page.locator('.workspace-topbar')).toHaveCount(0);
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('.sidebar .logo')).toHaveText('Gotcha!');
  await expect(page.locator('.sidebar .logo img, .sidebar .logo svg')).toHaveCount(0);
  await expect(page.locator('.sidebar .logo')).toHaveCSS(
    'font-family',
    'ClassicQuality, Arial, sans-serif',
  );
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) => font.family === 'ClassicQuality' && font.status === 'loaded',
      ),
    ),
  ).toBe(true);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.png');
  await expect(page.locator('.workspace-main')).toHaveCSS('border-radius', '24px');

  await expect(page.locator('body')).toHaveCSS('font-family', 'Arial, Helvetica, sans-serif');
  await expect(page.locator('.earth-view-control')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next background view' })).toHaveCount(0);
  await page.screenshot({
    path: '.local/earth-dashboard-dark.png',
    fullPage: false,
    animations: 'disabled',
  });
  const first = await earth.getAttribute('src');
  await page.reload();
  await expect(earth).toHaveAttribute('src', first);
  await page.clock.fastForward(2 * 60 * 60 * 1000 + 1000);
  await expect(earth).not.toHaveAttribute('src', first);
  const rotated = await earth.getAttribute('src');

  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(earth).toHaveAttribute('src', /sky-clouds-/);
  await page.screenshot({
    path: '.local/earth-dashboard-light.png',
    fullPage: false,
    animations: 'disabled',
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(earth).toHaveAttribute('src', rotated);

  for (const [width, height] of [
    [1440, 900],
    [1280, 600],
    [1024, 500],
    [390, 600],
  ]) {
    await page.setViewportSize({ width, height });
    const canvas = await page.locator('.workspace-main').boundingBox();
    expect(canvas.y).toBeGreaterThan(0);
    expect(canvas.y + canvas.height).toBeLessThan(height);
    expect(canvas.x + canvas.width).toBeLessThan(width);
    const background = await page.locator('.earth-backdrop').boundingBox();
    expect(Math.abs(background.x - canvas.x)).toBeLessThan(1);
    expect(Math.abs(background.height - canvas.height)).toBeLessThan(1);
    if (width > 760) {
      const sidebar = await page.locator('.sidebar').boundingBox();
      expect(canvas.x - sidebar.width).toBeGreaterThan(0);
    }
    if (width < 761) await page.getByRole('button', { name: 'Open navigation' }).click();
    const signOut = page.getByRole('button', { name: 'Sign out' });
    await expect(signOut).toBeVisible();
    const bounds = await signOut.boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.locator('.sidebar-scroll').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const afterScroll = await signOut.boundingBox();
    expect(afterScroll.y).toBe(bounds.y);
    if (width < 761)
      await page.getByRole('button', { name: 'Close navigation', exact: true }).first().click();
  }
  await page.screenshot({
    path: '.local/earth-dashboard-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  const beforeLogin = await earth.getAttribute('src');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/auth/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Open my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  await expect(earth).not.toHaveAttribute('src', beforeLogin);
});

test('folders organize project conversations and keep projects when a folder is deleted', async ({
  page,
}) => {
  await page.goto('/auth/register');
  await page.getByRole('textbox', { name: 'Your first name' }).fill('Folder Test');
  await page
    .getByRole('textbox', { name: 'Email address' })
    .fill(`browser-folders-${randomUUID()}@nebula.test`);
  await page.getByLabel('Password', { exact: true }).fill('A secure folder password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  for (const name of ['Client work', 'Experiments']) {
    await page.getByRole('button', { name: 'Create folder', exact: true }).click();
    await page.getByRole('textbox', { name: 'Folder name' }).fill(name);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create folder', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.locator('.folder-navigation').getByRole('link', { name: new RegExp(name) }),
    ).toBeVisible();
  }
  await page
    .locator('.folder-navigation')
    .getByRole('link', { name: /Client work/ })
    .click();
  const folderId = new URL(page.url()).searchParams.get('folderId');
  await page.getByLabel('Project options', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Save new project in folder' })).toHaveValue(
    folderId,
  );
  await expect(page.locator('.folder-selected')).toHaveCount(1);
  const idea = 'Build a customer booking calendar';
  await page.getByRole('textbox', { name: 'Describe your app idea' }).fill(idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page).toHaveURL(/\/studio\//);
  await expect(page.locator('.chat-message.user')).toHaveText('YOU' + idea);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show source tools' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.chat-message.user')).toHaveText('YOU' + idea);
  await page.getByRole('link', { name: 'Back to projects', exact: true }).click();
  await page
    .locator('.folder-navigation')
    .getByRole('link', { name: /Client work/ })
    .click();
  await expect(page.getByRole('heading', { name: idea })).toBeVisible();
  await page.getByRole('button', { name: 'Actions for ' + idea }).click();
  await page.getByRole('button', { name: 'Move to folder', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Destination folder' })
    .selectOption({ label: 'Experiments' });
  await page.getByRole('button', { name: 'Move project', exact: true }).click();
  await expect(page.getByRole('heading', { name: idea })).toHaveCount(0);
  await page
    .locator('.folder-navigation')
    .getByRole('link', { name: /Experiments/ })
    .click();
  await expect(page.getByRole('heading', { name: idea })).toBeVisible();
  await page.getByRole('button', { name: 'Actions for folder Experiments' }).click();
  await page.getByRole('button', { name: 'Rename folder', exact: true }).click();
  await page.getByRole('textbox', { name: 'Folder name' }).fill('Product lab');
  await page.getByRole('button', { name: 'Save folder name' }).click();
  await expect(page.getByRole('heading', { name: /Product lab/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Actions for folder Product lab' }).click();
  await page.getByRole('button', { name: 'Delete folder', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Your projects will stay saved');
  await page.getByRole('button', { name: 'Delete folder Product lab' }).click();
  await expect(page).toHaveURL('/projects');
  await expect(page.getByRole('heading', { name: idea })).toBeVisible();
  await expect(
    page.locator('.folder-navigation').getByRole('link', { name: /Product lab/ }),
  ).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search projects' }).fill('BOOKING');
  await expect(page.getByRole('heading', { name: idea })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search projects' }).fill('missing project');
  await expect(page.getByRole('heading', { name: idea })).toHaveCount(0);
});

test('new-project intent automatically opens a credit estimate without queuing a paid build', async ({
  page,
}) => {
  await page.goto('/auth/register');
  await page.getByRole('textbox', { name: 'Your first name' }).fill('Estimate Test');
  await page
    .getByRole('textbox', { name: 'Email address' })
    .fill(`browser-estimate-${randomUUID()}@nebula.test`);
  await page.getByLabel('Password', { exact: true }).fill('A secure estimate password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  const mail = await (await page.request.get('/v1/auth/local-mail')).json();
  const me = await (await page.request.get('/v1/auth/me')).json();
  await page.request.post('/v1/auth/verify', {
    headers: { origin: 'http://localhost:7011', 'x-csrf-token': me.csrfToken },
    data: { token: new URL(mail.mail.url).searchParams.get('token') },
  });
  // These routes simulate configured infrastructure; no live provider is called.
  const modelId = randomUUID();
  await page.route('**/v1/ai/models', (route) =>
    route.fulfill({
      json: {
        models: [
          { id: modelId, name: 'OpenRouter test model', provider: 'openrouter', configured: true },
        ],
      },
    }),
  );
  await page.route('**/v1/config', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.providers.find((p) => p.id === 'e2b').configured = true;
    await route.fulfill({ json: data });
  });
  let estimates = 0,
    jobs = 0;
  const idea = 'Build a lightweight appointment planner';
  await page.route('**/v1/ai/estimate', async (route) => {
    estimates++;
    expect(route.request().postDataJSON()).toEqual({
      projectId: expect.any(String),
      engine: 'agent-v1',
      prompt: idea,
      references: [],
    });
    await route.fulfill({ json: { min: 2, max: 4 } });
  });
  await page.route('**/v1/ai/jobs', (route) => {
    jobs++;
    return route.fulfill({
      status: 503,
      json: { error: 'No external calls allowed in this test.' },
    });
  });
  await page.reload();
  await page.getByRole('textbox', { name: 'Describe your app idea' }).fill(idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Maximum reservation: 4 credits');
  await expect(page.getByRole('button', { name: 'Approve & generate' })).toBeVisible();
  expect(estimates).toBe(1);
  expect(jobs).toBe(0);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.chat-message.user')).toContainText(idea);
  expect(jobs).toBe(0);
});

test('sidebar collapse, pinned credits, folded Manage and top-right appearance stay usable', async ({
  page,
}) => {
  await page.goto('/auth/register');
  await page.getByRole('textbox', { name: 'Your first name' }).fill('Sidebar Test');
  await page
    .getByRole('textbox', { name: 'Email address' })
    .fill(`browser-sidebar-${randomUUID()}@nebula.test`);
  await page.getByLabel('Password', { exact: true }).fill('A secure sidebar password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  const me = await (await page.request.get('/v1/auth/me')).json();
  for (let index = 0; index < 10; index++)
    await page.request.post('/v1/folders', {
      headers: { origin: 'http://localhost:7011', 'x-csrf-token': me.csrfToken },
      data: { name: 'Folder ' + index },
    });
  await page.reload();
  await expect(page.locator('.workspace-picker')).toHaveCount(0);
  await expect(page.locator('.sidebar-themes')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Manage', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('link', { name: 'Team members' })).toHaveCount(0);
  const credits = page.locator('.sidebar-bottom .credit-box');
  await expect(credits).toContainText('100');
  for (const [width, height] of [
    [1440, 900],
    [1024, 500],
    [390, 600],
  ]) {
    await page.setViewportSize({ width, height });
    if (width < 761) await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(credits).toBeVisible();
    const before = await credits.boundingBox();
    expect(before.y).toBeGreaterThanOrEqual(0);
    expect(before.y + before.height).toBeLessThanOrEqual(height);
    await page.locator('.sidebar-scroll').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    expect((await credits.boundingBox()).y).toBe(before.y);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    if (width < 761)
      await page.getByRole('button', { name: 'Close navigation', exact: true }).first().click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const appearance = await page
      .getByRole('group', { name: 'Appearance', exact: true })
      .boundingBox();
    expect(appearance.x + appearance.width).toBeGreaterThan(width - 30);
    expect(appearance.y).toBeLessThan(30);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.locator('.sidebar')).toHaveCSS('width', '76px');
  await expect(credits).toBeVisible();
  await expect(credits).toContainText('100');
  await page.screenshot({ path: '.local/sidebar-collapsed.png' });
  await page.reload();
  await expect(page.locator('.sidebar')).toHaveCSS('width', '76px');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Team members' })).toBeVisible();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL('/settings');
});

test('personalized composer, attachments, project search and connector navigation work together', async ({
  page,
}) => {
  await page.goto('/auth/register');
  await page.getByRole('textbox', { name: 'Your first name' }).fill('Maya');
  await page
    .getByRole('textbox', { name: 'Email address' })
    .fill(`browser-ref-${randomUUID()}@nebula.test`);
  await page.getByLabel('Password', { exact: true }).fill('A secure reference password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  const heading = page.locator('.project-start h1');
  await expect(heading).toContainText('Maya');
  const greeting = await heading.textContent();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(heading).not.toHaveText(greeting);
  const send = page.getByRole('button', { name: 'Create project from idea' });
  await expect(send).toHaveText('');
  await expect(send).toHaveCSS('border-radius', '50%');
  await expect(page.locator('.workspace-main')).toHaveCSS('border-top-width', '0px');
  const micBounds = await page.getByRole('button', { name: 'Start voice input' }).boundingBox();
  const sendBounds = await send.boundingBox();
  expect(sendBounds.x - (micBounds.x + micBounds.width)).toBeLessThan(12);
  expect(sendBounds.x).toBeGreaterThan(micBounds.x);
  expect((await page.locator('.project-composer').boundingBox()).height).toBeLessThan(160);
  await page.getByLabel('Add files or images').click();
  await expect(page.getByRole('button', { name: 'Add an image' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'brief.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('A customer portal with a booking calendar.'),
  });
  await expect(page.getByLabel('Attached references')).toContainText('brief.md');
  const image = require('node:fs').readFileSync(
    require('node:path').join(__dirname, 'fixtures/reference.png'),
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: image });
  await expect(page.getByLabel('Attached references')).toContainText('reference.jpg');
  await expect(page.getByLabel('Attached references').locator('img')).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  );
  await page.getByLabel('Add files or images').click();
  await page.getByLabel('Describe your app idea').fill('Build a client booking portal');
  await send.click();
  await expect(page).toHaveURL(/\/studio\//);
  await expect(page.getByLabel('Attached references')).toContainText('brief.md');
  await expect(page.getByLabel('Attached references')).toContainText('reference.jpg');
  await page.reload();
  await expect(page.getByLabel('Attached references')).toContainText('brief.md');
  await page.getByRole('button', { name: 'Remove reference brief.md' }).click();
  await expect(page.getByLabel('Attached references')).not.toContainText('brief.md');
  await page.getByRole('link', { name: 'Back to projects', exact: true }).click();
  await page.getByRole('button', { name: 'Search projects', exact: true }).click();
  await page.getByLabel('Search your projects').fill('booking');
  await expect(
    page.getByRole('dialog').getByRole('link', { name: /Build a client booking portal/ }),
  ).toBeVisible();
  await page.getByLabel('Search your projects').fill('no-such-project');
  await expect(page.getByRole('dialog')).toContainText('No projects found');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Recents', exact: true }).click();
  await expect(page.locator('.recent-projects')).toHaveCount(0);
  await page.getByRole('button', { name: 'Recents', exact: true }).click();
  await expect(page.locator('.recent-projects')).toContainText('Build a client booking portal');
  await page.getByRole('link', { name: 'Connectors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connectors', exact: true })).toBeVisible();
  await expect(page.locator('.connector-roadmap')).toContainText('Planned');
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.screenshot({ path: '.local/gotcha-composer.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.screenshot({ path: '.local/gotcha-composer-mobile.png', animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test.afterEach(async ({ page }) => {
  const request = page.request;
  const response = await request.get('/v1/auth/me');
  if (response.status() !== 200) return;
  const data = await response.json();
  if (!data.user.email.startsWith('browser-') || !data.user.email.endsWith('@nebula.test')) return;
  await request.delete('/v1/auth/account', {
    headers: { origin: 'http://localhost:7011', 'x-csrf-token': data.csrfToken },
    data: { confirmation: 'DELETE MY ACCOUNT' },
  });
});
