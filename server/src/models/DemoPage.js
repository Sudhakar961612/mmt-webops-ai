import mongoose from 'mongoose';

const demoPageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    tourType: { type: String, enum: ['flights', 'hotels', 'generic'], default: 'generic' },
    url: { type: String, required: true },
    description: { type: String, default: '' },
    // Roles: which field names exist in the embedded data (used by the planner).
    fields: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const DemoPage = mongoose.model('DemoPage', demoPageSchema);
export default DemoPage;
