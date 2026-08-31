import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    run: { type: mongoose.Schema.Types.ObjectId, ref: 'ExecutionRun', required: true },
    insight: { type: mongoose.Schema.Types.ObjectId, ref: 'Insight' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

feedbackSchema.index({ run: 1 });

export const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
