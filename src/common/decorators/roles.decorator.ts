import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Role metadata is just compared as strings in the guard,
// so we store them as plain string literals.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
