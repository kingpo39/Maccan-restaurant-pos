// MACCAN RMS - Granular RBAC Permission System
// Each role gets a specific set of allowed actions per module.

const PERMISSIONS = {
  owner: [
    'dashboard:view', 'dashboard:edit',
    'ingredients:view', 'ingredients:create', 'ingredients:edit', 'ingredients:delete',
    'recipes:view', 'recipes:create', 'recipes:edit', 'recipes:delete', 'recipes:pricing',
    'inventory:view', 'inventory:receive', 'inventory:adjust', 'inventory:delete',
    'orders:view', 'orders:create', 'orders:cancel', 'orders:refund',
    'kds:view', 'kds:manage',
    'nutrition:view', 'nutrition:edit',
    'analytics:view', 'analytics:export',
    'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
    'users:manage', 'settings:manage',
  ],
  manager: [
    'dashboard:view',
    'ingredients:view', 'ingredients:create', 'ingredients:edit',
    'recipes:view', 'recipes:create', 'recipes:edit', 'recipes:pricing',
    'inventory:view', 'inventory:receive', 'inventory:adjust',
    'orders:view', 'orders:create', 'orders:cancel',
    'kds:view', 'kds:manage',
    'nutrition:view', 'nutrition:edit',
    'analytics:view', 'analytics:export',
    'suppliers:view', 'suppliers:create', 'suppliers:edit',
  ],
  head_chef: [
    'dashboard:view',
    'ingredients:view', 'ingredients:create', 'ingredients:edit',
    'recipes:view', 'recipes:create', 'recipes:edit',
    'inventory:view', 'inventory:receive',
    'orders:view',
    'kds:view', 'kds:manage',
    'nutrition:view',
    'analytics:view',
    'suppliers:view',
  ],
  server: [
    'dashboard:view',
    'ingredients:view',
    'recipes:view',
    'orders:view', 'orders:create',
    'kds:view',
    'nutrition:view',
    'suppliers:view',
    'menu:view',
  ],
  inventory: [
    'dashboard:view',
    'ingredients:view', 'ingredients:create', 'ingredients:edit',
    'recipes:view',
    'inventory:view', 'inventory:receive', 'inventory:adjust',
    'suppliers:view', 'suppliers:create', 'suppliers:edit',
  ],
};

// Check if a user has a specific permission
function hasPermission(userRole, permission) {
  const rolePerms = PERMISSIONS[userRole];
  if (!rolePerms) return false;
  return rolePerms.includes(permission);
}

// Express middleware: require a specific permission
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        required: permission,
        current_role: req.user.role,
      });
    }
    next();
  };
}

// Express middleware: require ANY of the listed permissions
function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const allowed = permissions.some(p => hasPermission(req.user.role, p));
    if (!allowed) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        required_any: permissions,
        current_role: req.user.role,
      });
    }
    next();
  };
}

// Get all permissions for a role (for auth response)
function getRolePermissions(role) {
  return PERMISSIONS[role] || [];
}

module.exports = {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  getRolePermissions,
};
