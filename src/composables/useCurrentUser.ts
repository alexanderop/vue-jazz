import { useAccount } from 'community-jazz-vue'

export function useCurrentUser() {
  return useAccount(undefined, { resolve: { profile: true } })
}
