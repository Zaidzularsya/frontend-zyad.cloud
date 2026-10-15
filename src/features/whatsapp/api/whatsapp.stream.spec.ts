import { describe, expect, it } from 'vitest'

import { createSSEParser } from '@/features/whatsapp/api/whatsapp.stream'

function collect() {
  const messages: { event: string; data: string }[] = []
  return { messages, feed: createSSEParser((message) => messages.push(message)) }
}

describe('createSSEParser', () => {
  it('emits one message per complete event and ignores heartbeats', () => {
    const { messages, feed } = collect()
    feed(': connected\n\n: ping\n\nevent: wa\ndata: {"type":"message"}\n\n')
    expect(messages).toEqual([{ event: 'wa', data: '{"type":"message"}' }])
  })

  it('reassembles an event split across chunks', () => {
    const { messages, feed } = collect()
    feed('event: wa\nda')
    feed('ta: {"a":1}\n')
    expect(messages).toEqual([])
    feed('\nevent: wa\ndata: {"a":2}\n\n')
    expect(messages.map((message) => message.data)).toEqual(['{"a":1}', '{"a":2}'])
  })

  it('handles CRLF and defaults the event name', () => {
    const { messages, feed } = collect()
    feed('data: hi\r\n\r\n')
    expect(messages).toEqual([{ event: 'message', data: 'hi' }])
  })
})
