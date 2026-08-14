import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import multer from "multer";
import type { RequestHandler } from "express";

import { AppError } from "../utils/AppError.js";

const MAX_FILES = 3;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export const patientPharmacyExemptionUploadDir = path.join(
  process.cwd(),
  "private-uploads",
  "patient-pharmacy-exemptions"
);

if (!fs.existsSync(patientPharmacyExemptionUploadDir)) {
  fs.mkdirSync(patientPharmacyExemptionUploadDir, {
    recursive: true,
  });
}

const allowedFileTypes = new Map<string, Set<string>>([
  ["application/pdf", new Set([".pdf"])],
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/jpg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/webp", new Set([".webp"])],
]);

const blockedExtensions = new Set([
  ".apk",
  ".app",
  ".bat",
  ".cmd",
  ".com",
  ".dll",
  ".dmg",
  ".exe",
  ".html",
  ".htm",
  ".jar",
  ".js",
  ".msi",
  ".php",
  ".ps1",
  ".scr",
  ".sh",
  ".vbs",
  ".zip",
]);

const containsBlockedExtension = (fileName: string) => {
  const name = path.basename(fileName).toLowerCase();

  return Array.from(blockedExtensions).some(
    extension =>
      name.endsWith(extension) ||
      name.includes(`${extension}.`)
  );
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, patientPharmacyExemptionUploadDir);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    callback(null, fileName);
  },
});

const exemptionEvidenceUpload = multer({
  storage,

  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE,
  },

  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = allowedFileTypes.get(file.mimetype);

    if (containsBlockedExtension(file.originalname)) {
      callback(
        new Error(
          "The selected filename contains a blocked executable, archive or script extension."
        )
      );
      return;
    }

    if (!allowedExtensions || !allowedExtensions.has(extension)) {
      callback(
        new Error(
          "Only PDF, JPG, JPEG, PNG and WEBP exemption evidence files are allowed."
        )
      );
      return;
    }

    callback(null, true);
  },
});

export const removePatientPharmacyExemptionFiles = async (
  filePaths: Array<string | null | undefined>
) => {
  const validPaths = filePaths.filter(
    (filePath): filePath is string => Boolean(filePath)
  );

  await Promise.allSettled(
    validPaths.map(filePath => {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      return fs.promises.unlink(absolutePath);
    })
  );
};

export const uploadPatientPharmacyExemptionEvidence: RequestHandler = (
  req,
  res,
  next
) => {
  exemptionEvidenceUpload.array("evidenceDocuments", MAX_FILES)(
    req,
    res,
    async (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      const uploadedFiles = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];

      await removePatientPharmacyExemptionFiles(
        uploadedFiles.map(file => file.path)
      );

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(
            new AppError(
              "Each exemption evidence file cannot exceed 8 MB.",
              400
            )
          );
          return;
        }

        if (
          error.code === "LIMIT_FILE_COUNT" ||
          error.code === "LIMIT_UNEXPECTED_FILE"
        ) {
          next(
            new AppError(
              "A maximum of three exemption evidence files can be uploaded.",
              400
            )
          );
          return;
        }

        next(new AppError(error.message, 400));
        return;
      }

      next(
        new AppError(
          error instanceof Error
            ? error.message
            : "Unable to upload exemption evidence.",
          400
        )
      );
    }
  );
};