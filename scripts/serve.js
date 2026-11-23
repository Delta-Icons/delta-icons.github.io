import { existsSync } from 'node:fs'
import { context } from 'esbuild'

if (!existsSync('dist/index.html')) await import('./build.js')

const server = await context({})
const host = '127.0.0.1'
const port = 8080
try {
  await server.serve({ servedir: 'dist', host, port })
  console.log(`Delta Icons: http://${host}:${port}/ (Ctrl+C to stop)`)
} catch (error) {
  await server.dispose()
  if (!/address already in use/i.test(error.message)) throw error
  console.error(`Port ${port} is in use. If the preview is already running, open http://${host}:${port}/ or stop it with Ctrl+C in its terminal.`)
  process.exitCode = 1
}
