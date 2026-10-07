// url(javascript:…) and @import are handled server-side; strip the few things
// that could still break out of our <style> wrapper or pull remote CSS.
export function scrubCss(css: string): string {
  return css
    .replace(/<\/style/gi, '<\\/style')
    .replace(/@import[^;]*;?/gi, '')
    .replace(/expression\s*\(/gi, '/* */(')
    .replace(/javascript:/gi, '')
}

// Index just past the string literal starting at `i` (css[i] is the quote).
function skipString(css: string, i: number): number {
  const quote = css[i]
  let j = i + 1
  while (j < css.length && css[j] !== quote) j += css[j] === '\\' ? 2 : 1
  return j + 1
}

// Index just past the comment starting at `i` (css[i..i+1] is `/*`).
function skipComment(css: string, i: number): number {
  const end = css.indexOf('*/', i + 2)
  return end === -1 ? css.length : end + 2
}

// Scans from `start` for `stops` at paren/bracket depth 0, skipping strings and
// comments. Returns the index of the stop character, or -1 if none is found.
function findTopLevel(css: string, start: number, stops: string): number {
  let depth = 0
  let i = start
  while (i < css.length) {
    const c = css[i] ?? ''
    if (c === '"' || c === "'") i = skipString(css, i)
    else if (c === '/' && css[i + 1] === '*') i = skipComment(css, i)
    else {
      if (depth === 0 && stops.includes(c)) return i
      if (c === '(' || c === '[') depth++
      else if (c === ')' || c === ']') depth = Math.max(0, depth - 1)
      i++
    }
  }
  return -1
}

// Index of the `}` matching the `{` at `open`, or -1 when unbalanced.
function findClosingBrace(css: string, open: number): number {
  let depth = 0
  let i = open
  while (i < css.length) {
    const c = css[i] ?? ''
    if (c === '"' || c === "'") i = skipString(css, i)
    else if (c === '/' && css[i + 1] === '*') i = skipComment(css, i)
    else {
      if (c === '{') depth++
      else if (c === '}' && --depth === 0) return i
      i++
    }
  }
  return -1
}

function rewriteSelector(selector: string): string {
  const s = selector
    .trim()
    // `html body`, `html > body`, `html`, `body` at the start become the page wrapper.
    .replace(/^(?:html(?![\w-])\s*(?:>\s*)?body(?![\w-])|html(?![\w-])|body(?![\w-]))/, '.zy-page')
  return s.replace(/:root(?![\w-])/g, ':host')
}

function rewriteSelectorList(prelude: string): string {
  const parts: string[] = []
  let start = 0
  for (;;) {
    const comma = findTopLevel(prelude, start, ',')
    parts.push(rewriteSelector(prelude.slice(start, comma === -1 ? undefined : comma)))
    if (comma === -1) break
    start = comma + 1
  }
  return parts.join(', ')
}

function rewriteBlocks(css: string, fontFaces: string[]): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    if (/\s/.test(css[i] ?? '')) {
      i++
      continue
    }
    if (css[i] === '/' && css[i + 1] === '*') {
      i = skipComment(css, i)
      continue
    }
    const stop = findTopLevel(css, i, '{;')
    if (stop === -1) {
      out += css.slice(i)
      break
    }
    if (css[stop] === ';') {
      out += css.slice(i, stop + 1)
      i = stop + 1
      continue
    }
    const close = findClosingBrace(css, stop)
    if (close === -1) {
      out += css.slice(i)
      break
    }
    const prelude = css.slice(i, stop).trim()
    const body = css.slice(stop + 1, close)
    const at = /^@([\w-]+)/.exec(prelude)?.[1]?.toLowerCase()
    if (at === 'font-face') fontFaces.push(`${prelude}{${body}}`)
    else if (at === 'media' || at === 'supports')
      out += `${prelude}{${rewriteBlocks(body, fontFaces)}}`
    else if (at) out += `${prelude}{${body}}`
    else out += `${rewriteSelectorList(prelude)}{${body}}`
    i = close + 1
  }
  return out
}

// Adapts page CSS written for an iframe document to a shadow root: `html`/`body`
// selectors target the `.zy-page` wrapper and `:root` targets the host. @font-face
// rules are returned separately because fonts declared inside a shadow root are
// ignored by browsers; the renderer hoists them into document.head.
export function rewritePageCss(css: string): { css: string; fontFaces: string } {
  const fontFaces: string[] = []
  const rewritten = rewriteBlocks(scrubCss(css), fontFaces)
  return { css: rewritten, fontFaces: fontFaces.join('\n') }
}
