// Recipient fields are comma/semicolon separated text ("a@x.com, Budi <b@y.com>").
const simpleEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

export function splitRecipients(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Address part of "Name <addr>" or the value itself. */
export function addressOf(recipient: string): string {
  const match = recipient.match(/<([^>]+)>\s*$/)
  return (match?.[1] ?? recipient).trim()
}

export function invalidRecipients(recipients: string[]): string[] {
  return recipients.filter((recipient) => !simpleEmail.test(addressOf(recipient)))
}

export function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Mirrors the backend allow-list (mailbox/service/attachment_types.go).
export const ATTACHMENT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip'
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_TOTAL_ATTACHMENT_BYTES = 18 * 1024 * 1024

export function isAllowedAttachment(filename: string): boolean {
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
  return ATTACHMENT_ACCEPT.split(',').includes(extension)
}
