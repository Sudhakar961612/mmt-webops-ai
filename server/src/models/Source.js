import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema(
  {
    // Display name for the source
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    // Domain/URL patterns (supports wildcards)
    domains: [{ type: String, required: true, trim: true }], // e.g., ['demo:*', 'competitor.example.com', 'partner.com']
    // Category for source grouping
    category: {
      type: String,
      enum: ['competitor', 'partner', 'internal', 'public', 'demo'],
      default: 'public',
    },
    // Approval status
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING_REVIEW', 'RESTRICTED', 'ARCHIVED'],
      default: 'PENDING_REVIEW',
    },
    // Rate limiting
    rateLimit: {
      requestsPerHour: { type: Number, default: 10 },
      concurrent: { type: Number, default: 1 },
    },
    // Credential requirement
    requiresAuth: { type: Boolean, default: false },
    authType: {
      type: String,
      enum: ['none', 'basic', 'bearer', 'oauth2', 'custom'],
      default: 'none',
    },
    // Whether screenshots are allowed
    allowScreenshots: { type: Boolean, default: true },
    // Extraction policies
    allowedFields: [{ type: String }], // If set, only these fields can be extracted
    // Access control
    accessControl: {
      allowedRoles: [{ type: String, enum: ['admin', 'manager', 'analyst', 'viewer'] }],
      allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    // Compliance and governance
    compliance: {
      requiresApproval: { type: Boolean, default: false },
      retentionDays: { type: Number, default: 90 },
      dataClassification: {
        type: String,
        enum: ['public', 'internal', 'confidential'],
        default: 'public',
      },
    },
    // Owner/manager
    managedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Audit trail
    lastValidatedAt: { type: Date },
    validationStatus: {
      isActive: { type: Boolean, default: true },
      lastError: { type: String, default: '' },
      checksPerformed: { type: Number, default: 0 },
    },
    // Usage statistics
    usageCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
  },
  { timestamps: true }
);

sourceSchema.index({ domains: 1, status: 1 });
sourceSchema.index({ category: 1, status: 1 });
sourceSchema.index({ managedBy: 1 });

export const Source = mongoose.model('Source', sourceSchema);
export default Source;
