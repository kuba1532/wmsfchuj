import { Role } from './roles';

export type PermissionLevel =
  | 'FULL'
  | 'CREATE'
  | 'OPERATIONAL'
  | 'EXECUTE'
  | 'READ'
  | 'OWN'
  | 'NONE';

export type PermissionArea =
  | 'users'
  | 'systemConfig'
  | 'dictionaries'
  | 'documents'
  | 'tasks'
  | 'taskManagement'
  | 'movements'
  | 'stockStatus'
  | 'inventory'
  | 'reports';

export const PERMISSIONS: Record<PermissionArea, Record<Role, PermissionLevel>> = {
  users: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'READ',
    [Role.FOREMAN]: 'NONE',
    [Role.WORKER]: 'NONE',
  },
  systemConfig: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'NONE',
    [Role.FOREMAN]: 'NONE',
    [Role.WORKER]: 'NONE',
  },
  dictionaries: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'FULL',
    [Role.WORKER]: 'READ',
  },
  documents: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'FULL',
    [Role.WORKER]: 'OPERATIONAL',
  },
  tasks: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'FULL',
    [Role.WORKER]: 'EXECUTE',
  },
  taskManagement: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'FULL',
    [Role.WORKER]: 'NONE',
  },
  movements: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'FULL',
    [Role.WORKER]: 'EXECUTE',
  },
  stockStatus: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'FULL',
    [Role.WORKER]: 'NONE',
  },
  inventory: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'OPERATIONAL',
    [Role.WORKER]: 'NONE',
  },
  reports: {
    [Role.ADMIN]: 'FULL',
    [Role.MANAGER]: 'FULL',
    [Role.FOREMAN]: 'FULL',
    [Role.WORKER]: 'OWN',
  },
};
