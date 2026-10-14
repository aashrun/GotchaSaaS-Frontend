const { test, expect } = require('@playwright/test'),
  { randomUUID } = require('node:crypto');
const origin = process.env.E2E_APP_ORIGIN || 'http://localhost:7011';
async function register(page) {
  await page.goto('/auth/register');
  await page.getByLabel('Your first name').fill('Target Test');
  await page.getByLabel('Email address').fill('browser-target-' + randomUUID() + '@gotcha.test');
  await page.getByLabel('Password', { exact: true }).fill('A secure target password!1');
  await page.getByRole('button', { name: 'Create my workspace' }).click();
  await expect(page).toHaveURL('/projects');
}
test('app type options stay simple and explicit framework questions precede all paid generation', async ({
  page,
}) => {
  await register(page);
  let paid = 0;
  await page.route('**/v1/ai/estimate', (route) => {
    paid++;
    return route.fulfill({
      status: 503,
      json: { error: { message: 'Fixture: no paid generation' } },
    });
  });
  await page.getByLabel('Project options', { exact: true }).click();
  const target = page.getByLabel('Application type');
  await expect(target).toBeVisible();
  await expect(target.locator('option')).toHaveCount(5);
  await target.selectOption('web');
  await page
    .getByLabel('Describe your app idea')
    .fill('Build JavaScript frontend and Python backend for a bookings application');
  await page.getByLabel('Create project from idea').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('frontend framework');
  expect(paid).toBe(0);
  await page.getByRole('button', { name: 'React (recommended)', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Python');
  expect(paid).toBe(0);
  await page.getByLabel('Your framework preference').fill('Flask');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => paid).toBe(0); // Unverified account still prevents generation.
  const projectId = new URL(page.url()).searchParams.get('chat');
  const response = await page.request.get('/v1/projects/' + projectId);
  const data = await response.json();
  expect(data.project.settings.buildPlan).toMatchObject({
    target: 'web',
    frontend: 'react-js',
    backend: 'python-flask',
  });
  expect(data.files.some((f) => f.path === 'server/app.py')).toBe(true);
});
test('ambiguous mobile requests ask browser versus native without confusing responsive websites', async ({
  page,
}) => {
  await register(page);
  await page
    .getByLabel('Describe your app idea')
    .fill('Build a mobile app for tracking daily habits');
  await page.getByLabel('Create project from idea').click();
  await expect(page.getByRole('dialog')).toContainText('Where should this app run?');
  await page.getByRole('button', { name: 'Native iPhone / Android app', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const id = new URL(page.url()).searchParams.get('chat');
  const project = await (await page.request.get('/v1/projects/' + id)).json();
  expect(project.project.settings.buildPlan.target).toBe('mobile');
  expect(project.files.some((f) => f.path === 'app.json')).toBe(true);
  expect(
    project.files.some((f) => f.path === 'src/App.tsx' && f.content.includes('react-native')),
  ).toBe(true);
});
test('a named empty project plans the first actual prompt before asking about missing frameworks', async ({
  page,
}) => {
  await register(page);
  const me = await (await page.request.get('/v1/auth/me')).json();
  const response = await page.request.post('/v1/projects', {
    headers: { origin, 'x-csrf-token': me.csrfToken },
    data: { name: 'Empty project' },
  });
  expect(response.ok()).toBe(true);
  const { project } = await response.json();
  await page.goto('/projects?chat=' + project.id);
  await page
    .getByLabel('Ask Gotcha to build or edit your app')
    .fill('Build a JavaScript frontend and Python backend for bookings');
  await page.getByLabel('Send prompt').click();
  await expect(page.getByRole('dialog')).toContainText('frontend framework');
  const saved = await (await page.request.get('/v1/projects/' + project.id)).json();
  expect(saved.project.settings.buildPlan.questions).toHaveLength(2);
  expect(saved.project.description).toContain('Python backend');
});
test.afterEach(async ({ page }) => {
  const me = await page.request.get('/v1/auth/me');
  if (!me.ok()) return;
  const data = await me.json();
  if (!data.user.email.startsWith('browser-target-')) return;
  await page.request.delete('/v1/user/me', {
    headers: { origin, 'x-csrf-token': data.csrfToken },
    data: { confirmation: 'DELETE MY ACCOUNT' },
  });
});
