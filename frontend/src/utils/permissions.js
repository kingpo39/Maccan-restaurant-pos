// MACCAN RMS - Frontend RBAC Permission Matrix
// Maps page routes to the minimum permissions needed to access them.

export const PAGE_PERMISSIONS = {
  '/':             [],                    // Dashboard: everyone sees it
  '/ingredients':  ['ingredients:view'],  // All roles can view
  '/recipes':      ['recipes:view'],
  '/inventory':    ['inventory:view'],
  '/tables':       ['orders:view'],
  '/kds':          ['kds:view'],
  '/nutrition':    ['nutrition:view'],
  '/analytics':    ['analytics:view'],
  '/suppliers':    ['suppliers:view'],
  '/menu-print':   [],                    // Public menu, everyone sees it
};

// Which pages require create/edit/delete (write) permissions
export const WRITE_PERMISSIONS = {
  '/ingredients':  ['ingredients:create', 'ingredients:edit', 'ingredients:delete'],
  '/recipes':      ['recipes:create', 'recipes:edit', 'recipes:delete'],
  '/inventory':    ['inventory:receive', 'inventory:adjust'],
  '/tables':       ['orders:create', 'orders:cancel'],
  '/kds':          ['kds:manage'],
  '/nutrition':    ['nutrition:edit'],
  '/analytics':    ['analytics:export'],
  '/suppliers':    ['suppliers:create', 'suppliers:edit', 'suppliers:delete'],
};

// Role display names (bilingual)
export const ROLE_LABELS = {
  owner:     { fa: 'مالک',      en: 'Owner' },
  manager:   { fa: 'مدیر',      en: 'Manager' },
  head_chef: { fa: 'سرآشپز',   en: 'Head Chef' },
  server:    { fa: 'گارسون',    en: 'Server' },
  inventory: { fa: 'انباردار',  en: 'Inventory' },
};

// Role colors for UI badges
export const ROLE_COLORS = {
  owner:     'bg-yellow-500 text-green-900',
  manager:   'bg-blue-500 text-white',
  head_chef: 'bg-red-600 text-white',
  server:    'bg-green-600 text-white',
  inventory: 'bg-orange-500 text-white',
};

/**
 * Check if a user's permissions array includes at least one of the required permissions.
 */
export function hasPageAccess(userPermissions, pagePath) {
  const required = PAGE_PERMISSIONS[pagePath];
  if (!required || required.length === 0) return true; // no restriction
  if (!userPermissions) return false;
  return required.some(p => userPermissions.includes(p));
}

/**
 * Check if user can perform write actions on a page.
 */
export function canWrite(userPermissions, pagePath) {
  const required = WRITE_PERMISSIONS[pagePath];
  if (!required || required.length === 0) return true;
  if (!userPermissions) return false;
  return required.some(p => userPermissions.includes(p));
}

/**
 * Check if user has a specific permission.
 */
export function hasPermission(userPermissions, permission) {
  if (!userPermissions) return false;
  return userPermissions.includes(permission);
}
