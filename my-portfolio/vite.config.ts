import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { Readable } from 'node:stream'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'

type NodeRes = ServerResponse & { status: (code: number) => NodeRes; json: (body: unknown) => void }

/**
 * Serves /api/* from the api/ folder during `vite dev` — the same handlers
 * Vercel runs in production, so local dev behaves like the deployed site and
 * secrets stay server-side. Supports both handler styles used there:
 *   - `export default (req, res)`          (Node style: github*.js)
 *   - `export function GET/POST(request)`  (Web style: chat.js)
 */
const apiRoutes = (): Plugin => ({
  name: 'api-routes',
  configureServer(server) {
    // Recompile knowledge/*.md into api/_lib/knowledge-data.js now and on every edit
    const buildKnowledge = () => {
      try { execFileSync(process.execPath, ['scripts/knowledge-build.mjs'], { cwd: server.config.root, stdio: 'ignore' }) }
      catch (err) { server.config.logger.error(`[knowledge] ${err}`) }
    }
    buildKnowledge()
    server.watcher.add(`${server.config.root}/knowledge`)
    server.watcher.on('change', (file) => { if (/[\\/]knowledge[\\/].+\.md$/.test(file)) buildKnowledge() })

    server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const name = url.pathname.replace(/^\/+|\/+$/g, '')
      if (!/^[\w-]+$/.test(name)) return next()
      // Unknown routes 404 like they do on Vercel, rather than falling through to index.html
      if (!existsSync(`${server.config.root}/api/${name}.js`)) { res.statusCode = 404; res.end(); return }

      try {
        const mod = await server.ssrLoadModule(`/api/${name}.js`)
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const body = chunks.length ? Buffer.concat(chunks) : undefined

        if (typeof mod.default === 'function') {
          const r = res as NodeRes
          r.status = (code) => { r.statusCode = code; return r }
          r.json = (data) => { r.setHeader('Content-Type', 'application/json'); r.end(JSON.stringify(data)) }
          const q = Object.fromEntries(url.searchParams)
          await mod.default(Object.assign(req, { query: q, body: body && JSON.parse(String(body)) }), r)
          return
        }

        const handler = mod[req.method ?? 'GET']
        if (!handler) { res.statusCode = 405; res.end(); return }
        const abort = new AbortController()
        res.on('close', () => abort.abort())
        const response: Response = await handler(new Request(`http://localhost/api${req.url}`, {
          method: req.method,
          headers: { ...req.headers as Record<string, string>, 'x-forwarded-for': req.socket.remoteAddress ?? 'local' },
          body,
          signal: abort.signal,
        }))
        res.statusCode = response.status
        response.headers.forEach((value, key) => res.setHeader(key, value))
        if (response.body) Readable.fromWeb(response.body as never).pipe(res)
        else res.end()
      } catch (err) {
        server.config.logger.error(`[api/${name}] ${err}`)
        if (!res.headersSent) res.statusCode = 500
        res.end()
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make .env values (GROQ_API_KEY etc.) visible to the dev API handlers
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), tailwindcss(), apiRoutes()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            gsap: ['gsap', '@gsap/react'],
            markdown: ['react-markdown', 'remark-gfm'],
          },
        },
      },
    },
  }
})
