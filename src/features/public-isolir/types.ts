export interface IsolirInfo {
  enabled: boolean
  tenant?: { name: string; phone: string; email: string }
}

export interface IsolirInvoice {
  number: string
  /** YYYY-MM-DD */
  due_date: string
  /** Decimal string. */
  balance: string
  /** Kosong bila pembayaran online tidak tersedia. */
  pay_url: string
}

export interface IsolirLookup {
  found: boolean
  masked_name: string
  isolated: boolean
  invoices: IsolirInvoice[]
}
