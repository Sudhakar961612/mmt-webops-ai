import { DemoPage } from '../models/DemoPage.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listDemoPages = asyncHandler(async (_req, res) => {
  const pages = await DemoPage.find({ isActive: true }).sort({ createdAt: 1 });
  res.json({ success: true, data: { pages } });
});

export default { listDemoPages };
