/**
 * Indonesian locale for GrapesJS. Passed as `i18n.messages.id`. Only the strings
 * the editor actually surfaces in our config are translated; anything missing
 * falls back to English.
 */
export const GRAPES_ID_MESSAGES = {
  assetManager: {
    addButton: 'Tambah gambar',
    inputPlh: 'http://path/gambar.jpg',
    modalTitle: 'Pilih gambar',
    uploadTitle: 'Jatuhkan file di sini atau klik untuk unggah',
  },
  blockManager: {
    labels: {},
    categories: {
      Layout: 'Layout',
      Dasar: 'Dasar',
      Media: 'Media',
    },
  },
  domComponents: {
    names: {
      '': 'Kotak',
      wrapper: 'Body',
      text: 'Teks',
      comment: 'Komentar',
      image: 'Gambar',
      video: 'Video',
      label: 'Label',
      link: 'Tautan',
      map: 'Peta',
      tfoot: 'Table foot',
      tbody: 'Table body',
      thead: 'Table head',
      table: 'Tabel',
      row: 'Baris',
      cell: 'Sel',
    },
  },
  deviceManager: {
    device: 'Perangkat',
    devices: { Desktop: 'Desktop', Tablet: 'Tablet', 'Mobile portrait': 'Mobile' },
  },
  panels: {
    buttons: {
      titles: {
        'open-sm': 'Buka Style Manager',
        'open-tm': 'Setelan',
        'open-layers': 'Buka Layer Manager',
        'open-blocks': 'Buka Blok',
      },
    },
  },
  selectorManager: {
    label: 'Kelas',
    selected: 'Terpilih',
    emptyState: '- Status -',
    states: {
      hover: 'Hover',
      active: 'Klik',
      'nth-of-type(2n)': 'Genap/Ganjil',
    },
  },
  styleManager: {
    empty: 'Pilih elemen sebelum mengatur style',
    layer: 'Layer',
    fileButton: 'Gambar',
    sectors: {
      general: 'Umum',
      layout: 'Layout',
      typography: 'Tipografi',
      decorations: 'Dekorasi',
      extra: 'Lainnya',
      flex: 'Flex',
      dimension: 'Dimensi',
    },
  },
  traitManager: {
    empty: 'Pilih elemen sebelum mengatur setelan',
    label: 'Setelan komponen',
    traits: {
      labels: { id: 'Id', alt: 'Alt', title: 'Judul', href: 'Href' },
      attributes: { id: { placeholder: 'mis. teks-saya' } },
    },
  },
} as const
