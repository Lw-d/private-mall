import { AdminRole } from '../../../generated/prisma/client';

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  role: AdminRole;
}
