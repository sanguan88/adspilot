/**
 * Design Tokens - Standardisasi styling sesuai Refactoring UI & Don't Make Me Think
 */

export const typography = {
  // Headings
  h1: 'text-2xl lg:text-3xl font-bold text-foreground',
  h2: 'text-xl lg:text-2xl font-semibold text-foreground',
  h3: 'text-lg font-semibold text-foreground',
  h4: 'text-base font-semibold text-foreground',
  
  // Body
  body: 'text-sm text-foreground',
  bodyLarge: 'text-base text-foreground',
  bodySmall: 'text-xs text-foreground',
  
  // Muted
  muted: 'text-sm text-muted-foreground',
  mutedSmall: 'text-xs text-muted-foreground',
  
  // Labels
  label: 'text-sm font-medium text-foreground',
  labelSmall: 'text-xs font-medium text-foreground',
} as const

export const pageLayout = {
  container: 'min-h-screen bg-gray-50',
  content: 'p-4 space-y-4',
  header: 'flex items-center justify-between mb-6',
  headerTitle: 'text-xl font-bold text-foreground',
  headerDescription: 'text-sm text-muted-foreground',
} as const

export const card = {
  height: {
    stats: 'min-h-[100px]',
  },
} as const

export const standardSpacing = {
  section: 'space-y-6',
  card: 'space-y-4',
  compact: 'space-y-2',
  gap: {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  },
  cardContent: 'p-6',
  cardContentCompact: 'p-4',
} as const

export const componentSizes = {
  cardIcon: 'w-5 h-5',
  icon: {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  },
} as const

export const gridLayouts = {
  stats: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
  stats3: 'grid grid-cols-1 md:grid-cols-3 gap-4',
  threeColumn: 'grid grid-cols-1 lg:grid-cols-3 gap-4',
  formGrid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  metricsGrid: 'grid grid-cols-2 md:grid-cols-3 gap-2',
} as const

export const summaryCard = {
  container: `${card.height.stats} !py-0 relative transition-all duration-200 hover:shadow-md hover:-translate-y-1`,
  content: '!p-4',
  layoutVertical: 'flex flex-col gap-1',
  layoutHorizontal: 'flex items-center justify-between',
  iconTop: `${componentSizes.cardIcon} text-primary`,
  iconRight: `${componentSizes.icon.lg} text-primary`,
  label: typography.muted,
  value: 'text-2xl font-bold text-foreground',
  description: typography.mutedSmall,
} as const

export const filterPanel = {
  container: '!py-0',
  content: '!p-4',
} as const

export const button = {
  base: 'gap-1.5',
  sizes: {
    default: 'h-9 px-5 py-2 text-sm',
    sm: 'h-8 gap-1 px-3 text-xs',
    lg: 'h-10 px-6 text-base',
    icon: 'size-9',
  },
} as const

