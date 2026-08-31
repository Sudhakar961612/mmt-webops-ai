import mongoose from 'mongoose';

const taskTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    category: {
      type: String,
      enum: ['competitor_offer', 'hotel_pricing', 'campaign_page', 'partner_update', 'travel_trend', 'custom'],
      default: 'custom',
    },
    // Template configuration - used to create tasks
    taskType: {
      type: String,
      enum: ['flight_monitor', 'hotel_monitor', 'price_monitor', 'generic'],
      default: 'generic',
    },
    targetPattern: { type: String, required: true, trim: true }, // e.g., "demo:flights", "https://example.com/offers"
    // Extractors: field -> selector mapping
    extractors: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Default schedule (cron) for tasks created from this template
    defaultSchedule: { type: String, default: '' },
    // Auto-approve plan for tasks created from this template
    defaultAutoApprove: { type: Boolean, default: false },
    // Validation rules for extraction results
    validationRules: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Field descriptions for documentation
    fieldDescriptions: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Sample output for documentation
    sampleOutput: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Owner/creator
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Usage statistics
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    // Template visibility
    isPublic: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED', 'DRAFT'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

taskTemplateSchema.index({ category: 1, status: 1, createdAt: -1 });
taskTemplateSchema.index({ createdBy: 1, status: 1 });
taskTemplateSchema.index({ tags: 1 });

export const TaskTemplate = mongoose.model('TaskTemplate', taskTemplateSchema);
export default TaskTemplate;
