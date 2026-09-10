/** Device presets for the GrapesJS device manager (breakpoint-scoped styling). */
export interface GrapesDevicePreset {
  id: string
  name: string
  /** Empty string = fluid/desktop. */
  width: string
  widthMedia?: string
}

export const GRAPES_DEVICES: GrapesDevicePreset[] = [
  { id: 'desktop', name: 'Desktop', width: '' },
  { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '992px' },
  { id: 'mobile', name: 'Mobile', width: '375px', widthMedia: '480px' },
]
