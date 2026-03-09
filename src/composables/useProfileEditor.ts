import { computed } from 'vue'
import { useCurrentUser } from './useCurrentUser'

export function useProfileEditor() {
  const me = useCurrentUser()

  const usernameWidth = computed(() => {
    const m = me.value
    if (!m?.$isLoaded) return '10ch'
    return `${(m.profile?.name?.length || 10) + 2}ch`
  })

  function updateName(value: string | undefined) {
    const m = me.value
    if (!m?.$isLoaded) return
    m.profile?.$jazz.set('name', value ?? '')
  }

  return { me, usernameWidth, updateName }
}
