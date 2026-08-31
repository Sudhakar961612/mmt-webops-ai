import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    run: { type: mongoose.Schema.Types.ObjectId, ref: 'ExecutionRun', required: true },
    previousSnapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot' },
    currentSnapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'Snapshot' },
    type: { type: String, enum: ['ADDED', 'REMOVED', 'MODIFIED'], required: true },
    field: { type: String, default: '' },
    path: { type: String, default: '' },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    currentValue: { type: mongoose.Schema.Types.Mixed },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    summary: { type: String, default: '' },
  },
  { timestamps: true }
);

changeSchema.index({ run: 1 });

export const Change = mongoose.model('Change', changeSchema);
export default Change;
