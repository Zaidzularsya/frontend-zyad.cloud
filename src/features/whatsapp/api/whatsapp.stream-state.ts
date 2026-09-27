import { ref } from 'vue'

/**
 * True while the realtime stream is connected. Queries read it to drop their
 * polling interval to a slow fallback; kept in its own module so the queries
 * and the stream composable do not import each other.
 */
export const whatsappStreamConnected = ref(false)
