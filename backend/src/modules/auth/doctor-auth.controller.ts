import fs from "node:fs";
import type { Request, Response } from "express";

import { authService } from "./auth.service.js";
import { doctorMultipartRegisterSchema } from "./auth.validation.js";
import { AppError } from "../../utils/AppError.js";

type DoctorVerificationFiles = {
  gmcDocument?: Express.Multer.File[];
  photoIdDocument?: Express.Multer.File[];
  qualificationDocument?: Express.Multer.File[];
};

const getUploadedFileUrl = (
  files: DoctorVerificationFiles,
  fieldName: keyof DoctorVerificationFiles
) => {
  const file = files[fieldName]?.[0];

  if (!file) {
    return null;
  }

  return `/uploads/doctor-verifications/${file.filename}`;
};

const getUploadedFilePaths = (files: DoctorVerificationFiles) => {
  return [
    files.gmcDocument?.[0]?.path,
    files.photoIdDocument?.[0]?.path,
    files.qualificationDocument?.[0]?.path,
  ].filter(Boolean) as string[];
};

const deleteUploadedFiles = (filePaths: string[]) => {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Unable to remove uploaded verification file:", filePath);
    }
  }
};

export const doctorAuthController = {
  async registerDoctor(req: Request, res: Response) {
    const files = (req.files || {}) as DoctorVerificationFiles;
    const uploadedFilePaths = getUploadedFilePaths(files);

    try {
      const gmcDocumentUrl = getUploadedFileUrl(files, "gmcDocument");
      const photoIdDocumentUrl = getUploadedFileUrl(files, "photoIdDocument");
      const qualificationDocumentUrl = getUploadedFileUrl(
        files,
        "qualificationDocument"
      );

      if (!gmcDocumentUrl) {
        throw new AppError("GMC registration proof document is required.", 400);
      }

      if (!photoIdDocumentUrl) {
        throw new AppError("Photo ID proof document is required.", 400);
      }

      if (!qualificationDocumentUrl) {
        throw new AppError(
          "Qualification or employment proof document is required.",
          400
        );
      }

      const validatedData = doctorMultipartRegisterSchema.parse(req.body);

      const result = await authService.register({
        ...validatedData,
        role: "DOCTOR",
        gmcDocumentUrl,
        photoIdDocumentUrl,
        qualificationDocumentUrl,
      });

      return res.status(201).json({
        success: true,
        message:
          "Doctor registration submitted. Please verify your email and wait for admin approval.",
        data: result,
      });
    } catch (error) {
      deleteUploadedFiles(uploadedFilePaths);
      throw error;
    }
  },
};