import { AuditLog } from '../models/AuditLog.js';

/**
 * Persist an audit log entry. Never throws: auditing failures must not break
 * the primary operation.
 */
export async function logAudit({
  user = null,
  actor = 'system',
  action,
  entityType = '',
  entityId = null,
  details = {},
  ip = '',
  status = 'success',
}) {
  try {
    await AuditLog.create({
      user: user?.id || user || null,
      actor: typeof actor === 'string' ? actor : user?.username || actor?.username || 'system',
      action,
      entityType,
      entityId,
      details,
      ip,
      status,
    });
  } catch (err) {
    // Audit failures are swallowed (logged) so the main flow continues.
    // eslint-disable-next-line no-console
    console.error('Audit log write failed:', err.message);
  }
  return null;
}

export default logAudit;
