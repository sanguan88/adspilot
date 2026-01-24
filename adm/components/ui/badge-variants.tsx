/**
 * Badge Variants Helper
 * Standardisasi badge colors untuk status dan roles
 */

export const getStatusBadgeVariant = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    aktif: 'bg-success/10 text-success border-success/20',
    inactive: 'bg-muted text-muted-foreground border-border',
    nonaktif: 'bg-muted text-muted-foreground border-border',
    pending: 'bg-warning/10 text-warning border-warning/20',
    waiting_verification: 'bg-info/10 text-info border-info/20',
    processing: 'bg-info/10 text-info border-info/20',
    paid: 'bg-success/10 text-success border-success/20',
    completed: 'bg-success/10 text-success border-success/20',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
    revoked: 'bg-muted text-muted-foreground border-border',
    expired: 'bg-destructive/10 text-destructive border-destructive/20',
    suspended: 'bg-warning/10 text-warning border-warning/20',
    healthy: 'bg-success/10 text-success border-success/20',
    unhealthy: 'bg-destructive/10 text-destructive border-destructive/20',
  }
  
  return statusMap[status.toLowerCase()] || 'bg-muted text-muted-foreground border-border'
}

export const getRoleBadgeVariant = (role: string): string => {
  const roleMap: Record<string, string> = {
    superadmin: 'bg-destructive/10 text-destructive border-destructive/20',
    admin: 'bg-primary/10 text-primary border-primary/20',
    manager: 'bg-info/10 text-info border-info/20',
    staff: 'bg-success/10 text-success border-success/20',
    user: 'bg-muted text-muted-foreground border-border',
  }
  
  return roleMap[role.toLowerCase()] || 'bg-muted text-muted-foreground border-border'
}

