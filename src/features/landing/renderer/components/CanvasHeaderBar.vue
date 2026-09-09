<script setup lang="ts">
interface NavItem {
  id: string
  label: string
  href: string
  target: string
}

const props = defineProps<{
  nav: NavItem[]
  branding: { companyName: string; logoUrl: string; primary: string }
  selected: boolean
}>()

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <div
    class="canvas-header"
    :class="{ 'is-selected': props.selected }"
    role="button"
    tabindex="0"
    @click.stop="emit('select')"
    @keydown.enter.stop="emit('select')"
  >
    <span v-if="props.selected" class="canvas-header-tag">Header · semua halaman</span>

    <div class="canvas-header-inner">
      <div class="canvas-header-brand">
        <img
          v-if="props.branding.logoUrl"
          :src="props.branding.logoUrl"
          alt=""
          class="canvas-header-logo"
        />
        <span v-else class="canvas-header-name">
          {{ props.branding.companyName || 'Brand' }}
        </span>
      </div>

      <nav class="canvas-header-links">
        <span v-for="item in props.nav" :key="item.id" class="canvas-header-link">
          {{ item.label }}
        </span>
        <span v-if="props.nav.length === 0" class="canvas-header-empty">
          Belum ada item navigasi
        </span>
      </nav>

      <span class="canvas-header-cta" :style="{ backgroundColor: props.branding.primary }">
        Login
      </span>
    </div>
  </div>
</template>

<style scoped>
.canvas-header {
  position: relative;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  outline: 1px dashed transparent;
  outline-offset: -1px;
  transition: outline-color 0.12s ease;
}
.canvas-header:hover {
  outline-color: rgba(59, 130, 246, 0.5);
}
.canvas-header.is-selected {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}
.canvas-header-tag {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 30;
  padding: 2px 8px;
  border-radius: 999px;
  background: #1e293b;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}
.canvas-header-inner {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 24px;
}
.canvas-header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.canvas-header-logo {
  height: 28px;
  width: auto;
}
.canvas-header-name {
  font-weight: 800;
  font-size: 16px;
  color: #0f172a;
}
.canvas-header-links {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  justify-content: center;
  flex-wrap: wrap;
}
.canvas-header-link {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}
.canvas-header-empty {
  font-size: 13px;
  color: #94a3b8;
}
.canvas-header-cta {
  flex-shrink: 0;
  padding: 8px 18px;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
</style>
