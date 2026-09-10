import type { EditorConfig } from 'grapesjs'
import blocksBasic from 'grapesjs-blocks-basic'

import { GRAPES_BLOCKS } from './grapes.blocks'
import { GRAPES_DEVICES } from './grapes.devices'
import { GRAPES_ID_MESSAGES } from './grapes.i18n.id'

/** Style-manager sectors — `buildProps` reuses GrapesJS' built-in property defs. */
export const GRAPES_STYLE_SECTORS = [
  {
    name: 'Dimensi',
    open: false,
    buildProps: ['width', 'height', 'min-height', 'padding', 'margin'],
  },
  {
    name: 'Tipografi',
    open: false,
    buildProps: [
      'font-family',
      'font-size',
      'font-weight',
      'letter-spacing',
      'color',
      'line-height',
      'text-align',
      'text-decoration',
    ],
  },
  {
    name: 'Dekorasi',
    open: false,
    buildProps: [
      'background-color',
      'background',
      'border-radius',
      'border',
      'box-shadow',
      'opacity',
    ],
  },
  {
    name: 'Flex / Grid',
    open: false,
    buildProps: ['display', 'flex-direction', 'justify-content', 'align-items', 'flex-wrap'],
  },
  {
    name: 'Posisi',
    open: false,
    buildProps: ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
  },
]

export interface GrapesMountEls {
  container: HTMLElement
  blocks: HTMLElement
  layers: HTMLElement
  styles: HTMLElement
  traits: HTMLElement
}

/**
 * Build the `grapesjs.init` config. `storageManager: none` — persistence is
 * driven manually by the host component (autosave to our own API in a later phase).
 */
export function buildGrapesConfig(els: GrapesMountEls): EditorConfig {
  return {
    container: els.container,
    height: '100%',
    width: 'auto',
    fromElement: false,
    storageManager: { type: 'none' },
    // Assets + uploads are wired to our media API at runtime in GrapesEditor.vue
    // (populate via AssetManager.add, override uploadFile, listen for asset:remove).
    assetManager: { assets: [], upload: false, dropzone: true },
    // Only borrow the flex column primitives; every other block is hand-rolled
    // (grapes.blocks.ts) so the palette stays on-brand.
    plugins: [
      (editor) =>
        blocksBasic(editor, {
          flexGrid: true,
          blocks: ['column1', 'column2', 'column3'],
          category: 'Layout',
        }),
    ],
    deviceManager: { devices: GRAPES_DEVICES },
    blockManager: { appendTo: els.blocks, blocks: GRAPES_BLOCKS },
    layerManager: { appendTo: els.layers },
    selectorManager: { appendTo: els.styles, componentFirst: true },
    styleManager: { appendTo: els.styles, sectors: GRAPES_STYLE_SECTORS },
    traitManager: { appendTo: els.traits },
    // We render our own top bar / tabs in Vue, so suppress GrapesJS' default panels.
    panels: { defaults: [] },
    i18n: { locale: 'id', localeFallback: 'en', messages: { id: GRAPES_ID_MESSAGES } },
  }
}
