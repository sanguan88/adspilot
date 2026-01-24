/**
 * Design Tokens - Standardisasi styling sesuai Refactoring UI & Don't Make Me Think
 * 
 * Prinsip:
 * 1. Consistency - Semua komponen menggunakan tokens yang sama
 * 2. Visual Hierarchy - Spacing, typography, colors yang konsisten
 * 3. Semantic Colors - Menggunakan semantic tokens, bukan hardcoded colors
 */

export const spacing = {
  xs: '0.5rem',   // 8px
  sm: '0.75rem',  // 12px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
  '2xl': '3rem',  // 48px
} as const

// Standard spacing untuk konsistensi
export const standardSpacing = {
  // Vertical spacing
  section: 'space-y-6', // Antara sections utama
  card: 'space-y-4', // Dalam card content
  compact: 'space-y-2', // Untuk elemen yang rapat

  // Horizontal spacing
  gap: {
    sm: 'gap-2', // Icons, badges kecil
    md: 'gap-4', // Form fields, buttons
    lg: 'gap-6', // Cards, sections
  },

  // Padding
  cardContent: 'p-6', // Standard card content padding
  cardContentCompact: 'p-4', // Compact card content
} as const

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px - untuk inputs, buttons
  md: '0.25rem',    // 4px - untuk cards
  lg: '0.5rem',     // 8px - untuk modals
  full: '9999px',   // untuk badges, avatars
} as const

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
  container: 'h-full overflow-y-auto',
  content: 'p-6 space-y-8',
  header: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
  headerTitle: typography.h1,
  headerDescription: typography.muted,
} as const

export const card = {
  default: 'bg-card text-card-foreground border shadow-sm',
  padding: {
    default: 'p-6',
    compact: 'p-4',
    none: 'p-0',
  },
  gap: {
    default: 'gap-4',
    compact: 'gap-2',
    large: 'gap-6',
  },
  // Standard heights untuk konsistensi
  height: {
    stats: 'min-h-[140px]', // Untuk summary/stats cards
    default: 'min-h-[200px]', // Untuk cards dengan konten lebih banyak
    large: 'min-h-[300px]', // Untuk cards dengan banyak konten
  },
} as const

export const badge = {
  // Status variants - menggunakan semantic colors
  success: 'bg-success/10 text-success border-success/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
  neutral: 'bg-muted text-muted-foreground border-border',

  // Role variants - konsisten dengan design system
  superadmin: 'bg-destructive/10 text-destructive border-destructive/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-info/10 text-info border-info/20',
  staff: 'bg-success/10 text-success border-success/20',
  user: 'bg-muted text-muted-foreground border-border',
} as const

export const form = {
  label: typography.label,
  input: 'w-full',
  error: 'text-destructive text-sm',
  help: typography.mutedSmall,
  spacing: 'space-y-4',
} as const

export const table = {
  container: 'w-full',
  header: 'text-left font-medium text-foreground',
  cell: 'text-sm',
  row: 'hover:bg-muted/50 transition-colors',
} as const

export const emptyState = {
  container: 'flex flex-col items-center justify-center py-12 px-4',
  icon: 'mb-4 text-muted-foreground',
  title: 'text-lg font-semibold text-foreground mb-2',
  description: 'text-sm text-muted-foreground text-center max-w-sm mb-4',
} as const

// Standard component sizes
export const componentSizes = {
  icon: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  },
  // Standard icon size untuk cards
  cardIcon: 'w-5 h-5',
  // Standard icon size untuk stats cards
  statsIcon: 'w-5 h-5',
} as const

// Standard summary card layout
export const summaryCard = {
  // Container class untuk summary card
  // Hapus padding vertical dari Card (py-6) untuk summary cards, biarkan CardContent handle semua padding
  container: `${card.height.stats} !py-0 relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 border border-border/50`,
  // Content padding - compact untuk summary cards
  // Override CardContent default px-6 dengan p-4 (16px semua sisi - lebih proporsional)
  // Ini akan handle semua padding (top, right, bottom, left) tanpa double padding dari Card
  content: '!p-4',
  // Layout untuk card dengan icon di atas - gap compact
  layoutVertical: 'flex flex-col gap-1',
  // Layout untuk card dengan icon di kanan
  layoutHorizontal: 'flex items-center justify-between',
  // Icon positioning - gap lebih kecil
  iconTop: `${componentSizes.cardIcon} text-primary`,
  iconRight: `${componentSizes.icon.lg} text-primary`,
  // Label style
  label: typography.muted,
  // Value style - konsisten di semua cards
  value: 'text-2xl font-bold text-foreground',
  // Description style
  description: typography.mutedSmall,
} as const

// Standard grid layouts
export const gridLayouts = {
  stats: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
  stats3: 'grid grid-cols-1 sm:grid-cols-3 gap-6',
  twoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
  threeColumn: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
  // Grid untuk form fields - 2 kolom untuk fields sederhana
  formGrid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  // Grid untuk metrics items dalam card - 2-3 kolom
  metricsGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
} as const

export const loading = {
  skeleton: 'bg-muted animate-pulse rounded-sm',
  container: 'space-y-3',
} as const

// Standard button spacing
// Note: Button component sudah handle gap-1.5 untuk icon-text spacing
// Jangan tambahkan mr-2 atau ml-2 pada icon di dalam Button
export const button = {
  // Icon di dalam button tidak perlu margin karena sudah ada gap
  iconInButton: 'w-4 h-4', // Standard icon size di dalam button
} as const

// Standard filter panel styling
// Filter panel harus compact - override Card py-6 dan gunakan padding yang lebih kecil
export const filterPanel = {
  // Container: override Card default py-6 dengan !py-0 untuk menghindari double padding
  container: '!py-0',
  // Content: compact padding untuk filter panel (16px semua sisi)
  // Override CardContent default px-6 dengan !p-4 untuk padding yang lebih compact
  content: '!p-4',
  // Grid layout untuk filter items
  grid: 'grid grid-cols-1 md:grid-cols-3 gap-4',
  grid4: 'grid grid-cols-1 md:grid-cols-4 gap-4',
} as const

