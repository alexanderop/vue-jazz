import { cva, type VariantProps } from 'class-variance-authority'

export { default as BaseBadge } from './BaseBadge.vue'

export const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-900 text-white shadow hover:bg-neutral-900/80',
        secondary: 'border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-100/80',
        destructive: 'border-transparent bg-red-500 text-white shadow hover:bg-red-500/80',
        outline: 'text-neutral-950',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
