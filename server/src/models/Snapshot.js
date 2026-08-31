import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  run: { type: mongoose.Schema.Types.ObjectId, ref: 'ExecutionRun', required: true },
  url: { type: String, default: '' },
  title: { type: String, default: '' },
  // Structured data extracted from the page.
  extractedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Screenshot stored as a (compressed) base64 data URI for simple persistence.
  screenshot: { type: String, default: '' },
  // Small content hash for quick equality checks.
  contentHash: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
});

snapshotSchema.index({ task: 1, createdAt: -1 });
snapshotSchema.set('timestamps', true);

export const Snapshot = mongoose.model('Snapshot', snapshotSchema);
export default Snapshot;
