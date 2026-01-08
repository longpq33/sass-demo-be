type Role = 'system_admin' | 'customer_admin' | 'operator';

export type JwtPayload = {
  sub: string;
  tenantId: string | null;
  role: Role;
};
