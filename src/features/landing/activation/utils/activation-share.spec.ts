import { describe, expect, it } from 'vitest'

import { buildShareMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from './activation-share'

describe('normalizeWhatsAppNumber', () => {
  it.each([
    ['081234567890', '6281234567890'],
    ['0812-3456-7890', '6281234567890'],
    ['+62 812 3456 7890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['81234567890', '6281234567890'],
    ['(0812) 3456 7890', '6281234567890'],
    ['+1 415 555 0132', '14155550132'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeWhatsAppNumber(input)).toBe(expected)
  })

  it.each(['', '   ', 'abc', '0812', '12345', '0812345678901234567'])(
    'menolak nomor yang tidak layak: %j',
    (input) => {
      expect(normalizeWhatsAppNumber(input)).toBeNull()
    },
  )
})

describe('buildShareMessage', () => {
  it('memuat salam, nama halaman, dan kedua link', () => {
    const text = buildShareMessage({
      buyerName: 'Budi',
      pageTitle: 'Undangan Budi & Sari',
      previewUrl: 'https://reseller.zyad.cloud/preview/TOKEN',
      paymentUrl: 'https://zyad.cloud/i/PAY',
    })
    expect(text).toContain('Budi')
    expect(text).toContain('Undangan Budi & Sari')
    expect(text).toContain('https://reseller.zyad.cloud/preview/TOKEN')
    expect(text).toContain('https://zyad.cloud/i/PAY')
  })

  it('hanya memuat link yang diberikan', () => {
    const onlyPreview = buildShareMessage({
      buyerName: 'Budi',
      pageTitle: 'Halaman',
      previewUrl: 'https://x/preview/T',
    })
    expect(onlyPreview).toContain('https://x/preview/T')
    expect(onlyPreview).not.toMatch(/pembayaran/i)

    const onlyPayment = buildShareMessage({
      buyerName: 'Budi',
      pageTitle: 'Halaman',
      paymentUrl: 'https://x/i/P',
    })
    expect(onlyPayment).toContain('https://x/i/P')
    expect(onlyPayment).not.toMatch(/pratinjau|preview/i)
  })
})

describe('buildWhatsAppUrl', () => {
  it('menargetkan nomor pelanggan dan meng-encode pesan', () => {
    const url = buildWhatsAppUrl('0812-3456-7890', 'Halo Budi & Sari\nlink: https://x/y?a=1')
    expect(url).toBe(
      `https://wa.me/6281234567890?text=${encodeURIComponent('Halo Budi & Sari\nlink: https://x/y?a=1')}`,
    )
  })

  it('null bila nomor tidak valid, supaya tombol tidak membuka chat salah alamat', () => {
    expect(buildWhatsAppUrl('0812', 'halo')).toBeNull()
  })
})
