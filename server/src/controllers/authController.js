import { registerUser, loginUser, getUserById, listUsers, updateUserRole, createUser as createUserService, setUserActive } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logAudit from '../services/auditService.js';

export const register = asyncHandler(async (req, res) => {
  // Public registration: never accept/trust a role from the request body.
  // The service always creates the user with the safe default role ('analyst').
  const { username, email, password } = req.body;
  const { user, token } = await registerUser({ username, email, password });
  await logAudit({
    actor: username,
    action: 'auth.register',
    entityType: 'User',
    entityId: user.id,
    ip: req.ip,
  });
  res.status(201).json({ success: true, data: { user, token } });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const { user, token } = await loginUser({ identifier, password });
  await logAudit({
    actor: user.username,
    action: 'auth.login',
    entityType: 'User',
    entityId: user.id,
    ip: req.ip,
  });
  res.json({ success: true, data: { user, token } });
});

export const me = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  res.json({ success: true, data: { user: user.toSafeJSON() } });
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await listUsers();
  res.json({ success: true, data: { users } });
});

/**
 * ADMIN-ONLY user creation. Used to provision accounts with elevated roles
 * (admin, manager, analyst, viewer). Protected by authenticate + authorize('admin').
 */
export const createUser = asyncHandler(async (req, res) => {
  const { username, email, password, role = 'analyst' } = req.body;
  const user = await createUserService({ username, email, password, role });
  await logAudit({
    actor: req.user.username,
    action: 'user.created',
    entityType: 'User',
    entityId: user.id,
    details: { username, email, role },
    ip: req.ip,
  });
  res.status(201).json({ success: true, data: { user } });
});

export const setUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const user = await updateUserRole(id, role);
  await logAudit({
    actor: req.user.username,
    action: 'user.role_updated',
    entityType: 'User',
    entityId: id,
    details: { role },
    ip: req.ip,
  });
  res.json({ success: true, data: { user } });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
  }
  const user = await setUserActive(id, isActive);
  await logAudit({
    actor: req.user.username,
    action: isActive ? 'user.activated' : 'user.deactivated',
    entityType: 'User',
    entityId: id,
    details: { isActive },
    ip: req.ip,
  });
  res.json({ success: true, data: { user } });
});

export default { register, login, me, getUsers, setUserRole, createUser, setUserStatus };
