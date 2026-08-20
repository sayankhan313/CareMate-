import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { caregiverRelationshipService } from "./caregiver-relationship.service.js";
import { caregiverLinkRequestSchema } from "./caregiver-relationship.validation.js";

const getCaregiverId = (req: Request) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  if (req.user.role !== "CAREGIVER") throw new AppError("Only caregivers can access this resource", 403);
  return req.user.id;
};

const getValidationMessage = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues?: unknown[] }).issues)) {
    const issue = (error as { issues: { message?: string }[] }).issues[0];
    if (issue?.message) return issue.message;
  }
  return "Invalid request data";
};

export const caregiverRelationshipController = {
  async requestLink(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = caregiverLinkRequestSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(getValidationMessage(parsed.error), 400);

      const data = await caregiverRelationshipService.requestLink(getCaregiverId(req), parsed.data);
      return res.status(201).json({ success: true, message: "Caregiver link request sent successfully", data });
    } catch (error) {
      next(error);
    }
  },
};