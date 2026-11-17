// Saklar sementara: pembuatan invoice dan pelanggan manual dimatikan supaya pelanggan hanya
// berasal dari kontak CRM (WhatsApp dan relasinya lurus). Backend menolak POST /receivable/invoices
// dan /accounts lewat RECEIVABLE_MANUAL_CREATION_ENABLED; ubah keduanya bersamaan untuk menghidupkan lagi.
export const MANUAL_CREATION_ENABLED = false
