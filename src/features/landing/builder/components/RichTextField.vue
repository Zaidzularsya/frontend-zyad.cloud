<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Bold, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true })],
  editorProps: {
    attributes: {
      class:
        'min-h-[110px] rounded-b-xl border border-t-0 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-950 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-brand-600 [&_a]:underline',
    },
  },
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', instance.getHTML())
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    if ((value || '') !== editor.value.getHTML()) {
      editor.value.commands.setContent(value || '', { emitUpdate: false })
    }
  },
)

function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}
function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}
function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}
function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}
function setLink() {
  const previousUrl = editor.value?.getAttributes('link').href as string | undefined
  const url = window.prompt('URL', previousUrl ?? '')
  if (url === null) return
  if (!url.trim()) {
    editor.value?.chain().focus().unsetLink().run()
    return
  }
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})

defineExpose({ editor })
</script>

<template>
  <div>
    <div
      class="flex items-center gap-1 rounded-t-xl border border-b-0 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
    >
      <button
        type="button"
        class="rounded-md p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800"
        :class="{ 'bg-gray-200 dark:bg-gray-800': editor?.isActive('bold') }"
        title="Bold"
        @click="toggleBold"
      >
        <Bold class="size-3.5" />
      </button>
      <button
        type="button"
        class="rounded-md p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800"
        :class="{ 'bg-gray-200 dark:bg-gray-800': editor?.isActive('italic') }"
        title="Italic"
        @click="toggleItalic"
      >
        <Italic class="size-3.5" />
      </button>
      <button
        type="button"
        class="rounded-md p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800"
        :class="{ 'bg-gray-200 dark:bg-gray-800': editor?.isActive('bulletList') }"
        title="Bullet list"
        @click="toggleBulletList"
      >
        <List class="size-3.5" />
      </button>
      <button
        type="button"
        class="rounded-md p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800"
        :class="{ 'bg-gray-200 dark:bg-gray-800': editor?.isActive('orderedList') }"
        title="Numbered list"
        @click="toggleOrderedList"
      >
        <ListOrdered class="size-3.5" />
      </button>
      <button
        type="button"
        class="rounded-md p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800"
        :class="{ 'bg-gray-200 dark:bg-gray-800': editor?.isActive('link') }"
        title="Link"
        @click="setLink"
      >
        <LinkIcon class="size-3.5" />
      </button>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>
