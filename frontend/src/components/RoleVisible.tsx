import { type ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { type PermissionArea, type PermissionLevel } from '@/constants/permissions';

interface RoleVisibleProps {
  area: PermissionArea;
  minLevel?: PermissionLevel;
  children: ReactNode;
  fallback?: ReactNode;
}

const RoleVisible = ({ area, minLevel, children, fallback = null }: RoleVisibleProps) => {
  const { canRead, canCreate, canExecute, canManage } = usePermissions();

  const hasAccess = (): boolean => {
    if (!minLevel) return canRead(area);

    switch (minLevel) {
      case 'FULL':
        return canManage(area);
      case 'CREATE':
        return canCreate(area);
      case 'EXECUTE':
      case 'OPERATIONAL':
        return canExecute(area);
      case 'READ':
      case 'OWN':
        return canRead(area);
      case 'NONE':
      default:
        return false;
    }
  };

  if (!hasAccess()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleVisible;
