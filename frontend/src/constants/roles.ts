export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  FOREMAN = 'FOREMAN',
  WORKER = 'WORKER',
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Administrator',
  [Role.MANAGER]: 'Kierownik',
  [Role.FOREMAN]: 'Brygadzista',
  [Role.WORKER]: 'Magazynier',
};

export const roleLabelPl = (role: string | undefined | null): string => {
  if (!role) return '—';
  return ROLE_LABELS[role as Role] ?? role;
};

