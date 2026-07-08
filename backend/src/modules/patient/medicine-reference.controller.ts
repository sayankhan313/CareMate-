import type { Request, Response } from "express";

import { medicineReferenceService } from "./medicine-reference.service.js";

export const medicineReferenceController = {
  async searchMedicineReferences(req: Request, res: Response) {
    const query = String(req.query.query || "").trim();

    if (query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters.",
      });
    }

    const result = await medicineReferenceService.searchMedicineReferences(
      query
    );

    return res.status(200).json({
      success: true,
      message: "Medicine references fetched successfully.",
      data: result,
    });
  },

  async parseMedicineScan(req: Request, res: Response) {
    const detectedText = String(req.body.detectedText || "").trim();
    const ocrConfidence =
      typeof req.body.ocrConfidence === "number"
        ? req.body.ocrConfidence
        : 82;

    if (detectedText.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Detected text is required.",
      });
    }

    const result = await medicineReferenceService.parseMedicineScan({
      detectedText,
      ocrConfidence,
    });

    return res.status(200).json({
      success: true,
      message: result.matched
        ? "Medicine matched successfully."
        : "Medicine needs manual review.",
      data: result,
    });
  },
};