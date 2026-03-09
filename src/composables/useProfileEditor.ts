import { computed } from 'vue'
import { useAccount } from 'community-jazz-vue'

export function useProfileEditor() {
  const me = useAccount(undefined, { resolve: { profile: true } })

  const usernameWidth = computed(() => {
    const m = me.value
    if (!m?.$isLoaded) return '10ch'
    return `${m.profile?.name?.length || 10}ch`
  })

  function updateName(value: string | undefined) {
    const m = me.value
    if (!m?.$isLoaded) return
    m.profile?.$jazz.set('name', value ?? '')
  }

  return { me, usernameWidth, updateName }
}
