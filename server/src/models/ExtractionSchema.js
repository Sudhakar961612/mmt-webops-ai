import mongoose from 'mongoose';

const fieldDefinitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['string', 'number', 'date', 'boolean', 'array', 'object'],
      default: 'string',
    },
    description: { type: String, default: '' },
    selector: { type: String, default: '' }, // CSS selector for extraction
    isRequired: { type: Boolean, default: false },
    validation: {
      pattern: { type: String, default: '' }, // Regex pattern
      minLength: { type: Number, default: 0 },
      maxLength: { type: Number, default: 1000 },
      minValue: { type: Number },
      maxValue: { type: Number },
    },
    normalization: {
      transform: {
        type: String,
        enum: ['trim', 'uppercase', 'lowercase', 'parseFloat', 'parseDate', 'none'],
        default: 'trim',
      },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
    },
  },
  { _id: false }
);

const extractionSchemaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    // Schema category/type
    schemaType: {
      type: String,
      enum: ['pricing', 'offers', 'availability', 'content', 'campaign', 'custom'],
      default: 'custom',
    },
    // Field definitions
    fields: [fieldDefinitionSchema],
    // Target selector (e.g., '.product-card' or '#data-container')
    targetSelector: { type: String, default: 'body' },
    // For repeated elements (like product lists), specify the repeating selector
    repeatingSelector: { type: String, default: '' },
    // Source/task this schema is used with
    applicableTo: {
      taskTypes: [{ type: String }],
      sourceCategories: [{ type: String }],
    },
    // Version control
    version: { type: Number, default: 1 },
    previousVersions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ExtractionSchema' }],
    // Owner/creator
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Usage and testing
    testData: { type: mongoose.Schema.Types.Mixed, default: {} },
    sampleExtraction: { type: mongoose.Schema.Types.Mixed, default: {} },
    accuracyScore: { type: Number, default: 0 }, // 0-100
    lastTestedAt: { type: Date },
    usageCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    // Status
    status: {
      type: String,
      enum: ['ACTIVE', 'TESTING', 'DEPRECATED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

extractionSchemaSchema.index({ schemaType: 1, status: 1, createdAt: -1 });
extractionSchemaSchema.index({ createdBy: 1, status: 1 });
extractionSchemaSchema.index({ 'applicableTo.taskTypes': 1 });

export const ExtractionSchema = mongoose.model('ExtractionSchema', extractionSchemaSchema);
export default ExtractionSchema;
