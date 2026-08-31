import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError, conflict, unauthorized } from '../utils/ApiError.js';

const SALT_ROUNDS = 10;

export async function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * PUBLIC registration.
 * Security: the caller must NEVER be able to choose the role. Every public
 * registration is forced to the safe default role ('analyst'), regardless of
 * anything sent in the request body (e.g. { role: 'admin' } is ignored).
 */
export async function registerUser({ username, email, password }) {
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
  if (existing) {
    throw conflict('A user with that email or username already exists');
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, email, password: hashed, role: 'analyst' });
  return { user: user.toSafeJSON(), token: await signToken(user) };
}

/**
 * ADMIN-ONLY user creation. The role is fully controlled by the (authorized)
 * admin caller. Never call this from the public registration flow.
 */
export async function createUser({ username, email, password, role = 'analyst' }) {
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
  if (existing) {
    throw conflict('A user with that email or username already exists');
  }
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ username, email, password: hashed, role });
  return user.toSafeJSON();
}

export async function loginUser({ identifier, password }) {
  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
  }).select('+password');

  if (!user) throw unauthorized('Invalid credentials');
  if (!user.isActive) throw unauthorized('Account is disabled');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { user: user.toSafeJSON(), token: await signToken(user) };
}

export async function getUserById(id) {
  const user = await User.findById(id);
  if (!user) throw ApiError(404, 'User not found');
  return user;
}

export async function listUsers() {
  const users = await User.find({}).sort({ createdAt: 1 });
  return users.map((u) => u.toSafeJSON());
}

export async function updateUserRole(id, role) {
  const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });
  if (!user) throw ApiError(404, 'User not found');
  return user.toSafeJSON();
}

/** Admin-only: activate or deactivate an account. */
export async function setUserActive(id, isActive) {
  const user = await User.findByIdAndUpdate(id, { isActive: Boolean(isActive) }, { new: true, runValidators: true });
  if (!user) throw ApiError(404, 'User not found');
  return user.toSafeJSON();
}
