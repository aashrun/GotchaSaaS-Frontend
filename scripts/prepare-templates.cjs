const fs = require('node:fs'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process');
const frontend = path.resolve(__dirname, '..');
const integratedTemplates = path.resolve(frontend, '../GotchaSaaS-Backend/Templates');
const { templates, templateFiles } = require(
  fs.existsSync(integratedTemplates) ? integratedTemplates : path.join(frontend, 'templates'),
);
const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
// Only repository-owned curated templates are built locally. Never accepts project/user code.
for (const t of templates) {
  const directory = path.join(frontend, '.local/trusted-templates', t.id);
  fs.mkdirSync(directory, { recursive: true });
  for (const f of templateFiles(t.id)) {
    const file = path.join(directory, f.path);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, f.content);
  }
  execFileSync(
    process.execPath,
    [
      vite,
      'build',
      '--outDir',
      path.join(frontend, 'public/templates', t.id),
      '--emptyOutDir',
      '--base',
      `/templates/${t.id}/`,
    ],
    { cwd: directory, stdio: 'inherit' },
  );
  const output = path.join(frontend, 'public/templates', t.id);
  let html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  for (const match of [
    ...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>|<link[^>]*href="([^"]+)"[^>]*>/g),
  ]) {
    const asset = match[1] || match[2];
    const local = asset.split('/assets/')[1];
    if (!local) continue;
    const content = fs.readFileSync(path.join(output, 'assets', local), 'utf8');
    html = html.replace(match[0], () =>
      local.endsWith('.js')
        ? '<script type="module">' + content.replace(/<\/script/gi, '<\\/script') + '</script>'
        : '<style>' + content.replace(/<\/style/gi, '<\\/style') + '</style>',
    );
  }
  html = html.replace(
    '<head>',
    '<head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src &#39;unsafe-inline&#39;; style-src &#39;unsafe-inline&#39;; img-src data: blob:; connect-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">',
  );
  fs.writeFileSync(path.join(output, 'preview.html'), html);
}
