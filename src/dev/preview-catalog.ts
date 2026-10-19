import type { ComponentType } from 'react'

export type ScreenModule = { default: ComponentType }
export type PreviewModule = { default: { Default: ComponentType; cases?: Record<string, ComponentType> } }

export function createCatalog(screens: Record<string, () => Promise<ScreenModule>>, previews: Record<string, () => Promise<PreviewModule>>) {
  return Object.keys(screens).sort().map(path => {
    const parts = path.replace('../screens/', '').replace(/\.tsx$/, '').split('/')
    const title = (name: string) => name.replace(/(^|-)(\w)/g, (_, prefix: string, letter: string) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`)
    return {
      id: path,
      name: title(parts.pop()!),
      group: parts.length ? parts.map(title).join(' / ') : 'Screens',
      load: async () => {
        const preview = previews[path.replace(/\.tsx$/, '.preview.tsx')]
        if (preview) {
          const { default: module } = await preview()
          return { Default: module.Default, cases: module.cases ?? {} }
        }
        return { Default: (await screens[path]()).default, cases: {} }
      },
    }
  })
}
