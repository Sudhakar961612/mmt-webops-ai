import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actor: { type: String, default: 'system' },
    action: { type: String, required: true },
    entityType: { type: String, default: '' },
    entityId: { type: mongoose.Schema.Types.Mixed },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    status: { type: String, enum: ['success', 'error'], default: 'success' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
