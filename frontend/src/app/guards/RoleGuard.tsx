import { Navigate, Outlet } from 'react-router';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionArea, PermissionLevel } from '@/constants/permissions';

interface RoleGuardProps {
  area: PermissionArea;
  minLevel?: PermissionLevel;
  redirectTo?: string;
}

const RoleGuard = ({ area, minLevel, redirectTo = '/dashboard' }: RoleGuardProps) => {
  const { canRead, canCreate, canExecute, canManage } = usePermissions();

  const hasAccess = (): boolean => {
    // domyślnie: wystarczy, że nie jest NONE
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
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
