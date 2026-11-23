import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

process.chdir(fileURLToPath(new URL('..', import.meta.url)))
const cache = '.cache/android'
const drawable = 'app/src/main/res/drawable-nodpi'
const upstream = 'https://github.com/Delta-Icons/android.git'

function downloadIcons() {
  const git = (...args) => execFileSync('git', ['-C', cache, ...args], { stdio: 'inherit' })
  mkdirSync(cache, { recursive: true })
  if (!existsSync(join(cache, '.git'))) {
    git('init', '--quiet')
    git('remote', 'add', 'origin', upstream)
  }
  git('config', 'remote.origin.promisor', 'true')
  git('config', 'remote.origin.partialclonefilter', 'blob:none')
  git('fetch', '--depth=1', '--no-tags', '--filter=blob:none', 'origin', 'master')
  git('sparse-checkout', 'set', '--no-cone', '/' + drawable + '/')
  git('checkout', '--quiet', '--detach', 'FETCH_HEAD')
  return join(cache, drawable)
}

mkdirSync('.cache', { recursive: true })
const stage = mkdtempSync('.cache/site-')
const assets = join(stage, 'assets')
mkdirSync(join(assets, 'icons'), { recursive: true })

function emit(content, extension) {
  const bytes = Buffer.from(content)
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8)
  const name = hash + extension
  const path = join(assets, name)
  if (existsSync(path) && !readFileSync(path).equals(bytes)) {
    throw new Error('Asset hash collision: ' + name)
  }
  writeFileSync(path, bytes)
  return name
}

function staticAsset(path) {
  const content = readFileSync(path)
  if (basename(path) === 'manifest.json') {
    const manifest = JSON.parse(content)
    for (const icon of manifest.icons) icon.src = staticAsset(resolve(path, '..', icon.src))
    return emit(JSON.stringify(manifest), '.json')
  }
  return emit(content, extname(path))
}

try {
  const source = downloadIcons()
  const icons = readdirSync(source).filter(name =>
    name.endsWith('.png') && !/^(ic_|clock_(bg|hour|minute)\.png$)/.test(name)).sort()
  if (!icons.length) throw new Error('Empty Android icon catalog')
  for (const name of icons) copyFileSync(join(source, name), join(assets, 'icons', name))
  const catalog = 'assets/' + emit(JSON.stringify(icons), '.json')

  const options = { bundle: true, minify: true, write: false, target: 'es2022' }
  const css = await build({
    ...options, entryPoints: ['src/style.css'],
    plugins: [{
      name: 'hashed-css-assets',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, args => {
          if (args.kind === 'url-token') {
            return { path: 'assets/' + staticAsset(resolve(args.resolveDir, args.path)), external: true }
          }
        })
      }
    }]
  })
  const js = await build({
    ...options, entryPoints: ['src/scripts/main.js'], format: 'iife',
    define: { ICON_CATALOG_URL: JSON.stringify(catalog) }
  })
  const html = readFileSync('src/index.html', 'utf8')
    .replace(/(href|src|content)="(img\/[^"#]+)(#[^"]*)?"/g, (_, attr, path, fragment = '') =>
      attr + '="assets/' + staticAsset(join('src', path)) + fragment + '"')
    .replace('<!-- site styles -->', () => '<style>' + css.outputFiles[0].text + '</style>')
    .replace('<!-- site scripts -->', () => '<script>' + js.outputFiles[0].text + '</script>')
  writeFileSync(join(stage, 'index.html'), html)

  const installer = await fetch('https://raw.githubusercontent.com/Delta-Icons/linux/master/install.sh')
  if (!installer.ok) throw new Error('Linux installer: HTTP ' + installer.status)
  writeFileSync(join(stage, 'linux'), Buffer.from(await installer.arrayBuffer()))

  rmSync('dist', { recursive: true, force: true })
  renameSync(stage, 'dist')
  console.log('Built dist/ with ' + icons.length + ' icons.')
} finally {
  rmSync(stage, { recursive: true, force: true })
}
