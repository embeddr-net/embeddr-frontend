export const baseScopes = [
  'lotus:list',
  'lotus:dispatch',
  'lotus:*',
  'artifacts:read',
  'artifacts:write',
  'collections:read',
  'collections:write',
  'system:read',
  'system:write',
  'plugins:read',
  'keys:create:self',
]

export const scopeGroups = [
  {
    label: 'Core data access',
    description: 'Read and write artifacts and collections.',
    scopes: [
      'artifacts:read',
      'artifacts:write',
      'collections:read',
      'collections:write',
    ],
  },
  {
    label: 'System access',
    description: 'Diagnostics and system settings.',
    scopes: ['system:read', 'system:write'],
  },
  {
    label: 'Plugins',
    description: 'Discover plugin metadata.',
    scopes: ['plugins:read'],
  },
  {
    label: 'Key management',
    description: 'Allow creating personal keys.',
    scopes: ['keys:create:self'],
  },
  {
    label: 'Lotus global',
    description: 'Search and dispatch Lotus capabilities.',
    scopes: ['lotus:list', 'lotus:dispatch', 'lotus:*'],
  },
]

export const areArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false
  return a.every((val, idx) => val === b[idx])
}
