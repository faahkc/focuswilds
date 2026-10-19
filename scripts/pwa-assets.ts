import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

export function pwaAssets(): Plugin {
  let publicDir: string
  let base: string
  let packagePath: string
  function iconUrl(name: string) {
    if (!/^(icon-(16|32|48|192|512)|apple-touch-icon)\.png$/.test(name)) throw new Error(`Unexpected app icon: ${name}`)
    const hash = createHash('sha256').update(readFileSync(join(publicDir, name))).digest('hex').slice(0, 12)
    return `${name}?v=${hash}`
  }
  function manifest() {
    const value = JSON.parse(readFileSync(join(publicDir, 'manifest.webmanifest'), 'utf8'))
    value.icons = value.icons.map((icon: { src: string }) => ({ ...icon, src: iconUrl(icon.src) }))
    return JSON.stringify(value, null, 2) + '\n'
  }
  return {
    name: 'focuswilds-pwa-assets',
    configResolved(config) { publicDir = config.publicDir; base = config.base; packagePath = join(config.root, 'package.json') },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const { version } = JSON.parse(readFileSync(packagePath, 'utf8'))
        return html.replace('%APP_VERSION%', version).replace(/href="\/((?:icon-(?:16|32|48)|apple-touch-icon)\.png)"/g, (_, name: string) => `href="/${iconUrl(name)}"`)
      },
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== `${base}manifest.webmanifest`) return next()
        response.setHeader('Content-Type', 'application/manifest+json')
        response.setHeader('Cache-Control', 'no-cache')
        response.end(request.method === 'HEAD' ? undefined : manifest())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest() })
    },
  }
}
