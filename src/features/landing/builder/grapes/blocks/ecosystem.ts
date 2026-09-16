import {
  CONTAINER,
  COLOR,
  eyebrow,
  icon,
  SECTION_PAD,
  SECTION_PAD_TIGHT,
  type GrapesBlockDef,
} from './tokens'

function logoTile(): string {
  return `<div style="aspect-ratio:2/1;border-radius:12px;background:${COLOR.surface};border:1px solid ${COLOR.hairline};display:flex;align-items:center;justify-content:center;color:${COLOR.muted};font-weight:700;font-size:14px">LOGO</div>`
}

const integrationsBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:32px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 8px">Terhubung dengan tools favorit Anda</h2>
      <p style="text-align:center;color:${COLOR.muted};margin:0 0 40px">Integrasikan tanpa perlu kode tambahan.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px">
        ${Array.from({ length: 6 })
          .map(() => logoTile())
          .join('')}
      </div>
    </div>
  </section>`

const partnersBlock = `
  <section style="padding:${SECTION_PAD_TIGHT};background:${COLOR.surface}">
    <div style="${CONTAINER}">
      ${eyebrow('Mitra kami')}
      <div style="display:flex;flex-wrap:wrap;gap:32px;align-items:center;justify-content:center;opacity:.7;margin-top:12px">
        ${['LOGO', 'LOGO', 'LOGO', 'LOGO'].map((l) => `<span style="font-weight:800;font-size:20px;color:${COLOR.ink}">${l}</span>`).join('')}
      </div>
    </div>
  </section>`

const clientsBlock = `
  <section style="padding:${SECTION_PAD_TIGHT}">
    <div style="${CONTAINER}">
      <p style="text-align:center;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${COLOR.muted};margin:0 0 24px">Dipercaya oleh klien kami</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px">
        ${Array.from({ length: 5 })
          .map(() => logoTile())
          .join('')}
      </div>
    </div>
  </section>`

const supportedPlatformsBlock = `
  <section style="padding:${SECTION_PAD};background:${COLOR.surface}">
    <div style="${CONTAINER};text-align:center">
      <h2 style="font-size:28px;font-weight:700;color:${COLOR.navy};margin:0 0 32px">Tersedia di semua platform</h2>
      <div style="display:flex;flex-wrap:wrap;gap:32px;justify-content:center">
        ${['web', 'phone_iphone', 'desktop_windows', 'tablet_mac']
          .map(
            (glyph) => `
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
            <div style="width:56px;height:56px;border-radius:16px;background:#fff;border:1px solid ${COLOR.hairline};display:flex;align-items:center;justify-content:center;color:${COLOR.sky}">${icon(glyph)}</div>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  </section>`

const technologyStackBlock = `
  <section style="padding:${SECTION_PAD}">
    <div style="${CONTAINER}">
      <h2 style="font-size:28px;font-weight:700;text-align:center;color:${COLOR.navy};margin:0 0 8px">Dibangun di atas teknologi andal</h2>
      <p style="text-align:center;color:${COLOR.muted};margin:0 0 40px">Stack yang teruji untuk performa dan keamanan.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px">
        ${Array.from({ length: 6 })
          .map(() => logoTile())
          .join('')}
      </div>
    </div>
  </section>`

export const ECOSYSTEM_BLOCKS: GrapesBlockDef[] = [
  {
    id: 'eco-integrations',
    label: 'Integrations',
    category: 'Ecosystem',
    media: icon('hub'),
    content: integrationsBlock,
  },
  {
    id: 'eco-partners',
    label: 'Partners',
    category: 'Ecosystem',
    media: icon('handshake'),
    content: partnersBlock,
  },
  {
    id: 'eco-clients',
    label: 'Clients',
    category: 'Ecosystem',
    media: icon('business'),
    content: clientsBlock,
  },
  {
    id: 'eco-supported-platforms',
    label: 'Supported Platforms',
    category: 'Ecosystem',
    media: icon('devices'),
    content: supportedPlatformsBlock,
  },
  {
    id: 'eco-technology-stack',
    label: 'Technology Stack',
    category: 'Ecosystem',
    media: icon('memory'),
    content: technologyStackBlock,
  },
]
