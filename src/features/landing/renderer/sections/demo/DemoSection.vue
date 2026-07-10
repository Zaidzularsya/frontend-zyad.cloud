<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type DemoFeature = {
  id?: string
  title: string
  desc: string
  icon: string
}

defineProps<{
  content: {
    title: string
    description: string
    features?: DemoFeature[]
  }
}>()

// Minimal implementation of demo functionality matching the original DemoPage.jsx
type ChatKey = 'sarah' | 'john' | 'alex'

interface ChatMessage {
  sender: 'user' | 'other'
  text: string
  time: string
}

interface ChatMeta {
  name: string
  role: string
  avatar: string
  active: boolean
}

const activeChat = ref<ChatKey>('sarah')
const inputMessage = ref('')
const messages = ref<Record<ChatKey, ChatMessage[]>>({
  sarah: [
    {
      sender: 'other',
      text: 'Hai! Apakah mockup dashboard terintegrasi sudah siap direview?',
      time: '09:15',
    },
    {
      sender: 'user',
      text: 'Sudah! Saya sudah melampirkan file Figma rancangan dashboard di bawah.',
      time: '09:22',
    },
  ],
  john: [
    {
      sender: 'other',
      text: 'Halo tim HEY, invoice untuk integrasi WhatsApp automation sudah masuk?',
      time: '10:02',
    },
    { sender: 'user', text: 'Sudah dikirim ya Pak John, kodenya INV-2026-001.', time: '10:10' },
  ],
  alex: [
    {
      sender: 'other',
      text: 'Bagaimana delivery rate project bulan ini? Apakah data visualisasinya aman?',
      time: '11:30',
    },
    {
      sender: 'user',
      text: 'Aman Pak Alex, saat ini menyentuh 98.2%. Bisa dilihat di panel analitik.',
      time: '11:35',
    },
  ],
})

const chatMeta: Record<ChatKey, ChatMeta> = {
  sarah: { name: 'Sarah Connor', role: 'UI/UX Lead', avatar: 'SC', active: true },
  john: { name: 'John Doe', role: 'B2B Client', avatar: 'JD', active: false },
  alex: { name: 'Alex Smith', role: 'Operations VP', avatar: 'AS', active: true },
}
const activeChatMeta = computed(() => chatMeta[activeChat.value])
const activeMessages = computed(() => messages.value[activeChat.value])

const handleSendMessage = () => {
  if (!inputMessage.value.trim()) return

  const newMsg: ChatMessage = {
    sender: 'user',
    text: inputMessage.value,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }

  activeMessages.value.push(newMsg)
  inputMessage.value = ''

  setTimeout(() => {
    const replies: Record<string, string> = {
      sarah:
        'Terima kasih! Saya sedang membuka file Figma-nya. Kelihatannya grid system dan glassmorphism-nya sangat presisi. Kita bisa jadwalkan serah terima besok.',
      john: 'Baik, terima kasih konfirmasinya. Saya akan segera melakukan transfer pembayaran lewat tombol simulasi invoice di bawah.',
      alex: 'Luar biasa! Angka 98.2% itu adalah rekor baru bagi operasional kita. Teruskan kerja kerasnya!',
    }

    const replyMsg: ChatMessage = {
      sender: 'other',
      text: replies[activeChat.value] || 'Pesan Anda diterima. Tim teknis HEY sedang memprosesnya.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    activeMessages.value.push(replyMsg)
  }, 1500)
}

// Billing
const invoicePaid = ref(false)
const isPaying = ref(false)

const handlePayInvoice = () => {
  if (invoicePaid.value) return
  isPaying.value = true
  setTimeout(() => {
    invoicePaid.value = true
    isPaying.value = false
  }, 1800)
}

// Analytics
const analyticsRange = ref('30d')
const chartData = ref([45, 68, 52, 85, 98, 72])

watch(analyticsRange, (newRange) => {
  const datasets: Record<string, number[]> = {
    '7d': [25, 40, 32, 60, 52, 45],
    '30d': [45, 68, 52, 85, 98, 72],
    '1y': [65, 80, 75, 90, 110, 125],
  }
  chartData.value = datasets[newRange] ?? datasets['30d'] ?? []
})
</script>

<template>
  <section
    id="demo-portal"
    class="bg-background text-on-background py-24 transition-colors duration-300 fade-up"
  >
    <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop w-full">
      <div class="text-center max-w-3xl mx-auto mb-16 fade-up">
        <span class="text-sm font-bold text-secondary uppercase tracking-wider mb-2 block">
          Live Preview
        </span>
        <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-6">
          {{ content.title }}
        </h2>
        <p class="font-body-lg text-body-lg text-on-surface-variant mb-6">
          {{ content.description }}
        </p>
      </div>

      <!-- Add shortened demo content layout here... -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Chat Demo -->
        <div class="lg:col-span-7 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h2 class="font-headline-md text-xl font-bold text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">forum</span>
              1. WhatsApp Automation
            </h2>
            <span class="text-xs text-on-surface-variant font-mono">Status: Terkoneksi</span>
          </div>

          <div
            class="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden flex h-[480px]"
          >
            <!-- Sidebar -->
            <div
              class="w-1/3 border-r border-outline-variant/20 bg-surface-container-low/30 flex flex-col"
            >
              <div class="p-3 border-b border-outline-variant/20">
                <h3 class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Inbox
                </h3>
              </div>
              <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                <button
                  v-for="(meta, key) in chatMeta"
                  :key="key"
                  :class="`w-full text-left p-2.5 rounded-lg flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeChat === key
                      ? 'bg-secondary/10 border-l-4 border-secondary text-secondary'
                      : 'hover:bg-outline-variant/10 text-on-surface-variant'
                  }`"
                  @click="activeChat = key as ChatKey"
                >
                  <div
                    class="w-8 h-8 rounded-full bg-secondary-fixed/70 text-on-secondary-fixed flex items-center justify-center font-bold text-xs"
                  >
                    {{ meta.avatar }}
                  </div>
                  <div class="hidden sm:block overflow-hidden">
                    <p class="text-xs font-bold truncate text-on-surface">{{ meta.name }}</p>
                    <p class="text-[10px] opacity-75 truncate">{{ meta.role }}</p>
                  </div>
                  <span
                    v-if="meta.active"
                    class="w-2 h-2 rounded-full bg-secondary ml-auto animate-pulse"
                  ></span>
                </button>
              </div>
            </div>

            <!-- Chat -->
            <div class="w-2/3 flex flex-col bg-surface-container-lowest">
              <div
                class="p-3 border-b border-outline-variant/20 bg-surface-container-low/20 flex items-center justify-between"
              >
                <div>
                  <h4 class="text-xs font-bold text-on-surface">{{ activeChatMeta.name }}</h4>
                  <p class="text-[10px] text-on-surface-variant">{{ activeChatMeta.role }}</p>
                </div>
                <span
                  class="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-semibold"
                  >Online</span
                >
              </div>

              <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                <div
                  v-for="(msg, i) in activeMessages"
                  :key="i"
                  :class="`flex flex-col max-w-[80%] ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`"
                >
                  <div
                    :class="`p-3 rounded-xl text-xs ${
                      msg.sender === 'user'
                        ? 'bg-secondary text-on-secondary rounded-tr-none'
                        : 'bg-surface-container-low border border-outline-variant/20 rounded-tl-none text-on-surface'
                    }`"
                  >
                    {{ msg.text }}
                  </div>
                  <span class="text-[9px] text-on-surface-variant/70 mt-1">{{ msg.time }}</span>
                </div>
              </div>

              <form
                class="p-3 border-t border-outline-variant/20 bg-surface-container-low/20 flex gap-2"
                @submit.prevent="handleSendMessage"
              >
                <input
                  v-model="inputMessage"
                  type="text"
                  :placeholder="`Kirim pesan...`"
                  class="flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-on-surface"
                />
                <button
                  type="submit"
                  class="bg-secondary text-on-secondary px-4 rounded-lg flex items-center justify-center hover:bg-secondary/95 transition-all cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm">send</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Billing Demo -->
        <div class="lg:col-span-5 flex flex-col gap-3">
          <h2 class="font-headline-md text-xl font-bold text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary">receipt_long</span>
            2. Sistem Registrasi & Tiketing
          </h2>

          <div
            class="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[480px]"
          >
            <div class="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="text-sm font-bold text-primary">Tiket Konferensi Tech 2026</h3>
                  <p class="text-[10px] text-on-surface-variant">TKT-2026-001</p>
                </div>
                <div class="text-right">
                  <span
                    :class="`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      invoicePaid
                        ? 'bg-tertiary-fixed-dim/35 text-on-tertiary-container'
                        : 'bg-error-container/40 text-error font-semibold'
                    }`"
                  >
                    <span class="material-symbols-outlined text-xs">
                      {{ invoicePaid ? 'check_circle' : 'pending' }}
                    </span>
                    {{ invoicePaid ? 'TERKONFIRMASI' : 'PENDING' }}
                  </span>
                </div>
              </div>

              <!-- Lines -->
              <div class="flex-1 flex flex-col gap-2.5 mt-4">
                <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Detail
                </p>
                <div
                  class="flex justify-between items-center text-xs border-b border-outline-variant/10 pb-1.5"
                >
                  <span class="text-on-surface">Tiket VIP Akses Penuh 3 Hari</span>
                  <span class="font-mono text-on-surface-variant">$299.00</span>
                </div>
              </div>

              <div
                class="flex justify-between items-center bg-surface-container-low/40 border border-outline-variant/15 p-3.5 rounded-xl mt-auto"
              >
                <span class="text-xs font-bold text-on-surface">Total Pembayaran</span>
                <span class="text-sm font-bold text-secondary font-mono">$299.00 USD</span>
              </div>
            </div>

            <div class="p-4 bg-surface-container-low/20 border-t border-outline-variant/20">
              <button
                :disabled="invoicePaid || isPaying"
                :class="`w-full py-3 rounded-xl font-label-sm text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  invoicePaid
                    ? 'bg-tertiary-fixed-dim/35 text-on-tertiary-container shadow-none cursor-default'
                    : isPaying
                      ? 'bg-secondary/70 text-on-secondary shadow-none cursor-wait'
                      : 'bg-secondary text-on-secondary hover:bg-secondary/95 shadow-secondary/15 hover:-translate-y-0.5'
                }`"
                @click="handlePayInvoice"
              >
                <template v-if="isPaying"> Memproses... </template>
                <template v-else-if="invoicePaid"> Pembayaran Berhasil! </template>
                <template v-else> Simulasi Pembayaran Tiket </template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
