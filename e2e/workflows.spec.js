const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const origin = process.env.E2E_APP_ORIGIN || 'http://localhost:7011';
test('an idea becomes a persistent chat in the same workspace with optional source and checkpoints', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveURL('/auth/login');
  await page.getByRole('link', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Your first name').fill('Browser Test');
  await page.getByLabel('Email address').fill(`browser-${randomUUID()}@nebula.test`);
  await page.getByLabel('Password', { exact: true }).fill('A secure browser password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  await expect(page.locator('.project-list-section')).toHaveCount(0);
  const sidebar = await page.locator('.sidebar').boundingBox();
  const idea = 'Build a simple CRM for customer tracking';
  await page.getByLabel('Describe your app idea').fill(idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page).toHaveURL(/\/projects\?chat=/);
  await expect(page.locator('.project-chat-header')).toContainText(idea);
  await expect(page.locator('.chat-message.user')).toContainText(idea);
  await expect(page.locator('.studio')).toHaveCount(0);
  await expect(page.locator('.earth-backdrop')).toHaveCount(0);
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(await page.locator('.sidebar').boundingBox()).toEqual(sidebar);
  await expect(
    page.getByText('Verify your email to start this build. Your idea is saved here.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show project tools' }).click();
  await page.getByRole('tab', { name: 'Checkpoints' }).click();
  await page.getByLabel('Checkpoint name').fill('Before visual refinement');
  await page.getByRole('button', { name: 'Save checkpoint' }).click();
  await expect(page.getByText('Before visual refinement', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Code', exact: true }).click();
  await expect(page.locator('.monaco-editor')).toBeVisible();
  await page.locator('.monaco-editor').click({ position: { x: 150, y: 90 } });
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('// Browser verified source edit');
  await page.getByRole('button', { name: 'Save file' }).click();
  await expect(page.getByText('Source saved. Ask Gotcha to rebuild the preview.')).toBeVisible();
  await page.getByRole('tab', { name: 'Checkpoints' }).click();
  await page
    .locator('.checkpoint-row')
    .filter({ hasText: 'Before visual refinement' })
    .getByRole('button', { name: 'Restore', exact: true })
    .click();
  await page.getByRole('button', { name: 'Restore source', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Restore this checkpoint?' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Checks' }).click();
  await expect(page.getByText('Build and browser checks appear here after a run.')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(page.locator('.chat-message.user')).toContainText(idea);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL('/library');
  await expect(page.getByRole('heading', { name: idea })).toBeVisible();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(page.locator('.project-start')).toBeVisible();
  await expect(page.locator('.project-library-grid')).toHaveCount(0);
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
  await expect(page.locator('.auth-form > .logo')).toHaveText('Gotcha SaaS');
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
  await expect(page.locator('.sidebar .logo')).toHaveText('Gotcha SaaS');
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
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project options', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Save new project in folder' })).toHaveValue(
    folderId,
  );
  await expect(page.locator('.folder-selected')).toHaveCount(1);
  const idea = 'Build a customer booking calendar';
  await page.getByRole('textbox', { name: 'Describe your app idea' }).fill(idea);
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(page).toHaveURL(/\/projects\?chat=/);
  await expect(page.locator('.chat-message.user')).toContainText(idea);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show project tools' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.chat-message.user')).toContainText(idea);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
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
  await expect(page).toHaveURL('/library');
  await expect(page.getByRole('heading', { name: idea })).toBeVisible();
  await expect(
    page.locator('.folder-navigation').getByRole('link', { name: /Product lab/ }),
  ).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search projects' }).fill('BOOKING');
  await expect(page.getByRole('heading', { name: idea })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search projects' }).fill('missing project');
  await expect(page.getByRole('heading', { name: idea })).toHaveCount(0);
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
      headers: { origin, 'x-csrf-token': me.csrfToken },
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
  await expect(page).toHaveURL(/\/projects\?chat=/);
  await expect(page.getByLabel('Attached references')).toContainText('brief.md');
  await expect(page.getByLabel('Attached references')).toContainText('reference.jpg');
  await page.reload();
  await expect(page.getByLabel('Attached references')).toContainText('brief.md');
  await page.getByRole('button', { name: 'Remove reference brief.md' }).click();
  await expect(page.getByLabel('Attached references')).not.toContainText('brief.md');
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
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

test('Manage pages share a compact borderless glass layout in both themes and explain the first build', async ({
  page,
}) => {
  await page.goto('/auth/register');
  await page.getByRole('textbox', { name: 'Your first name' }).fill('Glass Test');
  await page
    .getByRole('textbox', { name: 'Email address' })
    .fill(`browser-glass-${randomUUID()}@nebula.test`);
  await page.getByLabel('Password', { exact: true }).fill('A secure glass test password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
  await expect(page.locator('.project-composer')).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('.workspace-scroll')).toHaveCSS('scrollbar-width', 'none');
  await expect(page.locator('.sidebar-scroll')).toHaveCSS('scrollbar-width', 'none');
  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  for (const theme of ['dark', 'light']) {
    let contentWidth;
    for (const [label, path] of [
      ['Settings', '/settings'],
      ['Team members', '/team'],
      ['Billing & usage', '/billing'],
    ]) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(path);
      await expect(page.locator('.page-content')).toBeVisible();
      await expect(page.locator('.panel').first()).toBeVisible();
      if (path === '/settings')
        await expect(page.getByRole('textbox', { name: 'First name', exact: true })).toHaveCSS(
          'background-color',
          theme === 'dark' ? 'rgb(40, 40, 43)' : 'rgb(222, 222, 226)',
        );
      if (path === '/team') await expect(page.locator('.member-row').first()).toBeVisible();
      const content = await page.locator('.page-content').boundingBox();
      if (!contentWidth) contentWidth = content.width;
      expect(content.width).toBe(contentWidth);
      await expect(page.locator('.workspace-main')).toHaveCSS('border-top-width', '0px');
      const panels = page.locator('.panel');
      await expect(panels.first()).toBeVisible();
      for (const panel of await panels.all()) {
        await expect(panel).toHaveCSS('border-top-width', '0px');
        await expect(panel).toHaveCSS('padding', '24px');
        await expect(panel).toHaveCSS('backdrop-filter', /blur\(24px\)/);
        await expect(panel).toHaveCSS(
          'background-color',
          theme === 'dark' ? 'rgba(8, 8, 8, 0.75)' : 'rgba(255, 255, 255, 0.36)',
        );
      }
      await page.screenshot({
        path: `.local/manage-${path.slice(1)}-${theme}.png`,
        animations: 'disabled',
      });
      await page.locator('.workspace-scroll').evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      if (path === '/settings')
        expect(
          await page.locator('.workspace-scroll').evaluate((el) => el.scrollTop),
        ).toBeGreaterThan(0);
    }
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
  }
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(page.locator('.project-composer')).toHaveCSS('border-top-width', '0px');
  expect(
    await page.locator('.project-composer').evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toContain('255, 255, 255, 0.36');
  await page.getByLabel('Describe your app idea').fill('Build a simple customer portal');
  await page.getByRole('button', { name: 'Create project from idea' }).click();
  await expect(
    page.getByText('Verify your email to start this build. Your idea is saved here.'),
  ).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Send verification email' }).click();
  const mail = await (await page.request.get('/v1/auth/local-mail')).json();
  await page.request.post('/v1/auth/verify', {
    headers: { origin },
    data: { token: new URL(mail.mail.url).searchParams.get('token') },
  });
  await page.getByRole('button', { name: 'I’ve verified — check status' }).click();
  await expect(page.getByText('Email verified. You can continue your build.')).toBeVisible();
});

test.afterEach(async ({ page }) => {
  const request = page.request;
  const response = await request.get('/v1/auth/me');
  if (response.status() !== 200) return;
  const data = await response.json();
  if (!data.user.email.startsWith('browser-') || !data.user.email.endsWith('@nebula.test')) return;
  await request.delete('/v1/auth/account', {
    headers: { origin, 'x-csrf-token': data.csrfToken },
    data: { confirmation: 'DELETE MY ACCOUNT' },
  });
});
