import type { JWTPayload, UserRole } from '@/types'

/**
 * Checks if a role is authorized for portal access.
 */
export function canAccessPortal(role: UserRole): boolean {
  return ['lp', 'gp', 'admin'].includes(role)
}

/**
 * Checks if a role is authorized for deal room access.
 */
export function canAccessDealRoom(role: UserRole): boolean {
  return ['dealroom', 'lp', 'gp', 'admin'].includes(role)
}

/**
 * Checks if a role can access a specific asset.
 */
export function canAccessAsset(user: JWTPayload, assetSlug: string): boolean {
  if (user.role === 'admin' || user.role === 'gp') return true
  return user.asset_access.includes(assetSlug)
}

/**
 * Returns the redirect path after login based on role.
 */
export function getPostLoginRedirect(role: UserRole): string {
  if (role === 'dealroom') return '/deal-room'
  return '/portal'
}
