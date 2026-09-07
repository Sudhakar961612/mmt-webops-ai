import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    action: {
      type: String,
      enum: ['navigate', 'wait', 'extract', 'screenshot', 'compare', 'reason', 'notify'],
      required: true,
    },
    description: { type: String, default: '' },
    selector: { type: String, default: '' },
    url: { type: String, default: '' },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    type: {
      type: String,
      enum: ['flight_monitor', 'hotel_monitor', 'price_monitor', 'generic'],
      default: 'generic',
    },
    // The page to operate on: a local demo page key (demo:<key>) or an absolute URL.
    target: { type: String, required: true, trim: true },
    // Optional structured extractors, e.g. { price: '#price', ... }
    extractors: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Optional reusable extraction schema (ExtractionSchema _id). When set,
    // runEngine extracts + validates against it and records per-field confidence.
    extractionSchema: { type: mongoose.Schema.Types.ObjectId, ref: 'ExtractionSchema', default: null },
    // Optional cron expression for scheduled runs (e.g. "*/5 * * * *")
    schedule: { type: String, default: '' },
    // When true, a freshly-generated plan runs immediately without manual approval.
    autoApprove: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['DRAFT', 'PLANNED', 'AWAITING_APPROVAL', 'APPROVED', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED'],
      default: 'DRAFT',
    },
    lastStatus: { type: String, default: '' },
    plan: {
      type: [stepSchema],
      default: [],
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastRunAt: { type: Date },
    lastRunRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ExecutionRun' },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

taskSchema.index({ owner: 1, createdAt: -1 });

export const Task = mongoose.model('Task', taskSchema);
export default Task;
