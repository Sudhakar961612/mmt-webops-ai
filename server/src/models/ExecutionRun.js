import mongoose from 'mongoose';

const runStatusEnum = [
  'PLANNED',
  'AWAITING_APPROVAL',
  'APPROVED',
  'RUNNING',
  'EXTRACTING',
  'COMPARING',
  'REASONING',
  'SUCCEEDED',
  'FAILED',
  'REJECTED',
];

const runSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    status: { type: String, enum: runStatusEnum, default: 'PLANNED' },
    plan: { type: mongoose.Schema.Types.Mixed, default: [] },
    trigger: { type: String, enum: ['manual', 'scheduler', 'api'], default: 'manual' },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    error: { type: String, default: '' },
    // Links to downstream artifacts
    snapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot' },
    changes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Change' }],
    insight: { type: mongoose.Schema.Types.ObjectId, ref: 'Insight' },
    summary: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

runSchema.index({ task: 1, createdAt: -1 });

export const ExecutionRun = mongoose.model('ExecutionRun', runSchema);
export default ExecutionRun;
