import { ClassType } from '../types.ts';

const CLASS_TYPES = Object.values(ClassType);

export const slugifyClassType = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const resolveClassTypeFromSlug = (slug: string) => {
  const normalizedSlug = (slug || '').toLowerCase();
  return CLASS_TYPES.find((type) => slugifyClassType(type) === normalizedSlug) || '';
};
