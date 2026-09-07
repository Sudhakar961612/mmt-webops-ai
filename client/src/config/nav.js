// Role-aware navigation and route access rules.
// `roles` = which roles may access the route. Navigation items are filtered by role.

export const NAV = {
  admin: [
    { to: '/', label: 'Dashboard', icon: 'home', end: true },
    { to: '/users', label: 'Users', icon: 'users' },
    { to: '/tasks', label: 'Tasks', icon: 'tasks' },
    { to: '/tasks/new', label: 'Create Task', icon: 'plus' },
    { to: '/approvals', label: 'Approvals', icon: 'approve' },
    { to: '/schedules', label: 'Schedules', icon: 'calendar' },
    { to: '/runs', label: 'Runs', icon: 'runs' },
    { to: '/insights', label: 'Insights', icon: 'bulb' },
    { to: '/sources', label: 'Sources', icon: 'link' },
    { to: '/templates', label: 'Task Templates', icon: 'template' },
    { to: '/schemas', label: 'Extraction Schemas', icon: 'schema' },
    { to: '/audit', label: 'Audit Log', icon: 'audit' },
    { to: '/health', label: 'System Health', icon: 'health' },
    { to: '/ops', label: 'Ops Lab', icon: 'runs' },
    { to: '/demo', label: 'Demo Pages', icon: 'demo' },
  ],
  manager: [
    { to: '/', label: 'Dashboard', icon: 'home', end: true },
    { to: '/tasks', label: 'Team Tasks', icon: 'tasks' },
    { to: '/tasks/new', label: 'Create Task', icon: 'plus' },
    { to: '/approvals', label: 'Approvals', icon: 'approve' },
    { to: '/schedules', label: 'Schedules', icon: 'calendar' },
    { to: '/runs', label: 'Runs', icon: 'runs' },
    { to: '/insights', label: 'Insights', icon: 'bulb' },
    { to: '/sources', label: 'Sources', icon: 'link' },
    { to: '/templates', label: 'Task Templates', icon: 'template' },
    { to: '/schemas', label: 'Extraction Schemas', icon: 'schema' },
    { to: '/audit', label: 'Audit Log', icon: 'audit' },
    { to: '/ops', label: 'Ops Lab', icon: 'runs' },
  ],
  analyst: [
    { to: '/', label: 'Dashboard', icon: 'home', end: true },
    { to: '/tasks', label: 'My Tasks', icon: 'tasks' },
    { to: '/tasks/new', label: 'Create Task', icon: 'plus' },
    { to: '/runs', label: 'My Runs', icon: 'runs' },
    { to: '/extracted', label: 'Extracted Data', icon: 'database' },
    { to: '/insights', label: 'Insights', icon: 'bulb' },
    { to: '/feedback', label: 'Feedback', icon: 'sparkle' },
  ],
  viewer: [
    { to: '/', label: 'Dashboard', icon: 'home', end: true },
    { to: '/tasks', label: 'Tasks', icon: 'tasks' },
    { to: '/runs', label: 'Runs', icon: 'runs' },
    { to: '/insights', label: 'Insights', icon: 'bulb' },
  ],
};

// Roles allowed to view each route (for gating fallback / unauthorized).
export const ROUTE_ROLES = {
  '/': ['admin', 'manager', 'analyst', 'viewer'],
  '/tasks': ['admin', 'manager', 'analyst', 'viewer'],
  '/tasks/new': ['admin', 'manager', 'analyst'],
  '/tasks/:id': ['admin', 'manager', 'analyst', 'viewer'],
  '/approvals': ['admin', 'manager'],
  '/schedules': ['admin', 'manager'],
  '/runs': ['admin', 'manager', 'analyst', 'viewer'],
  '/runs/:id': ['admin', 'manager', 'analyst', 'viewer'],
  '/insights': ['admin', 'manager', 'analyst', 'viewer'],
  '/extracted': ['analyst', 'manager', 'admin'],
  '/feedback': ['analyst'],
  '/sources': ['admin', 'manager'],
  '/templates': ['admin', 'manager'],
  '/schemas': ['admin', 'manager'],
  '/audit': ['admin', 'manager', 'analyst'],
  '/health': ['admin'],
  '/ops': ['admin', 'manager'],
  '/demo': ['admin', 'manager', 'analyst'],
  '/users': ['admin'],
};

export function canAccess(role, path) {
  const roles = ROUTE_ROLES[path];
  if (!roles) return true;
  return roles.includes(role);
}

export function roleLabel(role) {
  return { admin: 'Administrator', manager: 'Manager', analyst: 'Analyst', viewer: 'Viewer' }[role] || role;
}