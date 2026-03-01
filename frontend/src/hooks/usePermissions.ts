import { useAuth } from '@/context/AuthContext';
import { Role } from '@/constants/roles';
import { PERMISSIONS, type PermissionArea } from '@/constants/permissions';

export const usePermissions = () => {
  const { user } = useAuth();
  const role = (user?.role as Role) || Role.WORKER;

  const getLevel = (area: PermissionArea) => {
    const areaPermissions = PERMISSIONS[area];
    if (!areaPermissions) return 'NONE';
    return areaPermissions[role] || 'NONE';
  };

  const canRead = (area: PermissionArea) => getLevel(area) !== 'NONE';

  const canCreate = (area: PermissionArea) => {
    const level = getLevel(area);
    return level === 'FULL' || level === 'CREATE';
  };

  const canExecute = (area: PermissionArea) => {
    const level = getLevel(area);
    return level === 'FULL' || level === 'EXECUTE' || level === 'OPERATIONAL';
  };

  const canManage = (area: PermissionArea) => {
    const level = getLevel(area);
    return level === 'FULL';
  };

  const isAdmin = () => role === Role.ADMIN;
  const isManager = () => role === Role.MANAGER;
  const isForeman = () => role === Role.FOREMAN;
  const isWorker = () => role === Role.WORKER;

  const canApproveInventory = () => role === Role.ADMIN || role === Role.MANAGER;

  const canCountInventory = () => {
    const level = getLevel('inventory');
    return level !== 'NONE';
  };

  const canChangeStockStatus = () => getLevel('stockStatus') !== 'NONE';
  const canCreateTask = () => getLevel('taskManagement') !== 'NONE';

  return {
    role,
    getLevel,
    canRead,
    canCreate,
    canExecute,
    canManage,
    isAdmin,
    isManager,
    isForeman,
    isWorker,
    canApproveInventory,
    canCountInventory,
    canChangeStockStatus,
    canCreateTask,
  };
};
