import { ExtractionSchema } from '../models/ExtractionSchema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const createExtractionSchema = asyncHandler(async (req, res) => {
  const { name, description, schemaType, fields, targetSelector, repeatingSelector, applicableTo, testData, sampleExtraction } = req.body;

  if (!name || !fields || !Array.isArray(fields)) {
    throw new ApiError(400, 'name and fields array are required');
  }

  const schema = await ExtractionSchema.create({
    name,
    description,
    schemaType: schemaType || 'custom',
    fields,
    targetSelector: targetSelector || 'body',
    repeatingSelector: repeatingSelector || '',
    applicableTo: applicableTo || {},
    testData: testData || {},
    sampleExtraction: sampleExtraction || {},
    createdBy: req.user.id,
    status: 'ACTIVE',
  });

  res.status(201).json({ success: true, data: schema });
});

export const listExtractionSchemas = asyncHandler(async (req, res) => {
  const { schemaType, status, search } = req.query;
  const filter = {};

  if (schemaType) filter.schemaType = schemaType;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
  }

  const schemas = await ExtractionSchema.find(filter)
    .populate('createdBy', 'username email')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: schemas });
});

export const getExtractionSchema = asyncHandler(async (req, res) => {
  const schema = await ExtractionSchema.findById(req.params.id).populate('createdBy', 'username email');

  if (!schema) {
    throw new ApiError(404, 'Extraction schema not found');
  }

  res.json({ success: true, data: schema });
});

export const updateExtractionSchema = asyncHandler(async (req, res) => {
  const { name, description, fields, targetSelector, repeatingSelector, applicableTo, testData, sampleExtraction, status } = req.body;

  const schema = await ExtractionSchema.findById(req.params.id);
  if (!schema) {
    throw new ApiError(404, 'Extraction schema not found');
  }

  // Only creator or admin can update
  if (schema.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this schema');
  }

  if (name) schema.name = name;
  if (description !== undefined) schema.description = description;
  if (targetSelector) schema.targetSelector = targetSelector;
  if (repeatingSelector !== undefined) schema.repeatingSelector = repeatingSelector;
  if (applicableTo) schema.applicableTo = applicableTo;
  if (testData) schema.testData = testData;
  if (sampleExtraction) schema.sampleExtraction = sampleExtraction;
  if (status) schema.status = status;

  // Increment version if fields actually change. The previous value must be
  // captured BEFORE mutating schema.fields — otherwise the comparison would
  // always be equal. Because the subschema materializes defaults, both sides
  // are canonicalized through the ExtractionSchema model so identical inputs
  // serialize identically (no false bumps) while real changes still bump.
  const canonicalizeFields = (raw) =>
    JSON.stringify(new ExtractionSchema({ name: 'probe', fields: raw }).fields);

  const oldFields = canonicalizeFields(schema.fields);
  if (fields !== undefined) {
    schema.fields = fields;
  }
  if (fields !== undefined && oldFields !== canonicalizeFields(fields)) {
    schema.version = (schema.version || 1) + 1;
  }

  await schema.save();

  res.json({ success: true, data: schema });
});

export const deleteExtractionSchema = asyncHandler(async (req, res) => {
  const schema = await ExtractionSchema.findById(req.params.id);
  if (!schema) {
    throw new ApiError(404, 'Extraction schema not found');
  }

  if (schema.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this schema');
  }

  await ExtractionSchema.deleteOne({ _id: req.params.id });

  res.json({ success: true, message: 'Schema deleted successfully' });
});

export const testExtractionSchema = asyncHandler(async (req, res) => {
  const { html } = req.body;
  if (!html) {
    throw new ApiError(400, 'html is required for testing');
  }

  const schema = await ExtractionSchema.findById(req.params.id);
  if (!schema) {
    throw new ApiError(404, 'Extraction schema not found');
  }

  // Parse HTML and extract according to schema (shared pipeline so the
  // test endpoint matches production runEngine behavior).
  const { extractFromHtml } = await import('../services/extractionService.js');
  const { data: results, confidence, warnings: validationWarnings } = await extractFromHtml(html, schema);

  const errors = validationWarnings
    .filter((w) => w.confidence < 0.6)
    .map((w) => `${w.issue} (confidence ${w.confidence})`);
  // Surface missing required fields explicitly even when confidence heuristic passes.
  for (const field of schema.fields) {
    if (field.isRequired && (results[field.name] === null || results[field.name] === undefined || results[field.name] === '')) {
      const msg = `Required field "${field.name}" not found (selector: ${field.selector})`;
      if (!errors.includes(msg)) errors.push(msg);
    }
  }

  // Update schema stats
  schema.lastTestedAt = new Date();
  if (errors.length === 0) {
    schema.accuracyScore = Math.min(100, (schema.accuracyScore || 0) + 5);
  } else {
    schema.failureCount = (schema.failureCount || 0) + 1;
  }
  await schema.save();

  res.json({
    success: true,
    data: {
      results,
      errors,
      warnings: validationWarnings,
      confidence,
      accuracy: errors.length === 0 ? 100 : Math.max(0, 100 - errors.length * 10),
    },
  });
});

export const getSchemaStats = asyncHandler(async (req, res) => {
  const total = await ExtractionSchema.countDocuments({ status: 'ACTIVE' });
  const byType = await ExtractionSchema.aggregate([
    { $match: { status: 'ACTIVE' } },
    { $group: { _id: '$schemaType', count: { $sum: 1 } } },
  ]);

  const topSchemas = await ExtractionSchema.find({ status: 'ACTIVE' })
    .sort({ usageCount: -1 })
    .limit(5)
    .select('name schemaType usageCount accuracyScore');

  res.json({
    success: true,
    data: {
      total,
      byType: Object.fromEntries(byType.map((b) => [b._id, b.count])),
      topSchemas,
    },
  });
});

export default {
  createExtractionSchema,
  listExtractionSchemas,
  getExtractionSchema,
  updateExtractionSchema,
  deleteExtractionSchema,
  testExtractionSchema,
  getSchemaStats,
};
