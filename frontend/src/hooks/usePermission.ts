'use client';

import { useAuth } from '@/context/AuthContext';

type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export function usePermission(screenKey: string, action: PermissionAction): boolean {
  const { user } = useAuth();

  if (!user) return false;

  // SUPER_ADMIN has all permissions
  if (user.role === 'SUPER_ADMIN') return true;

  if (!user.screenPermissions) return false;

  const perm = user.screenPermissions[screenKey];
  if (!perm) return false;

  switch (action) {
    case 'create': return perm.canCreate;
    case 'read': return perm.canRead;
    case 'update': return perm.canUpdate;
    case 'delete': return perm.canDelete;
    default: return false;
  }
}
