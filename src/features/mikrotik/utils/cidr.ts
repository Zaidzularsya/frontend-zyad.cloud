export const DEFAULT_POOL_CIDR = '10.255.254.0/24'

const POOL_CIDR_MESSAGE = 'Pool CIDR harus alamat jaringan privat, mis. 10.255.254.0/24'

function isPrivate(a: number, b: number) {
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

// Same rules as the backend normalizeSetup: private IPv4, prefix /16../29 and a
// network address (host bits zero). Checked here only so the operator gets a
// field error instead of a generic 422; the backend stays authoritative.
export function poolCidrError(raw: string): string {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(raw.trim())
  if (!match) return POOL_CIDR_MESSAGE
  const octets = match.slice(1, 5).map(Number)
  const bits = Number(match[5])
  if (octets.some((o) => o > 255) || bits < 16 || bits > 29) return POOL_CIDR_MESSAGE
  const [a = 0, b = 0, c = 0, d = 0] = octets
  if (!isPrivate(a, b)) return POOL_CIDR_MESSAGE
  const value = ((a << 24) | (b << 16) | (c << 8) | d) >>> 0
  const hostMask = bits === 32 ? 0 : (2 ** (32 - bits) - 1) >>> 0
  if ((value & hostMask) !== 0) return POOL_CIDR_MESSAGE
  return ''
}
