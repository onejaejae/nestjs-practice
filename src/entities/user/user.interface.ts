import { Union } from 'src/common/type/common.interface';

export const Role = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type Role = Union<typeof Role>;