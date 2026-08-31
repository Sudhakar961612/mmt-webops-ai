import mongoose from 'mongoose';

const insightSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    run: { type: mongoose.Schema.Types.ObjectId, ref: 'ExecutionRun', required: true },
    title: { type: String, default: '' },
    summary: { type: String, required: true },
    // Human-readable reasoning produced by the reasoner (AI or fallback).
    reasoning: { type: String, default: '' },
    // Machine-friendly data: affected fields, direction of change, magnitude.
    insights: { type: mongoose.Schema.Types.Mixed, default: [] },
    changeCount: { type: Number, default: 0 },
    hasChanges: { type: Boolean, default: false },
    confidence: { type: Number, default: 0.5 },
    source: { type: String, enum: ['ai', 'fallback'], default: 'fallback' },
  },
  { timestamps: true }
);

insightSchema.index({ task: 1, createdAt: -1 });

export const Insight = mongoose.model('Insight', insightSchema);
export default Insight;
