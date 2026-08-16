import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { RequestHandler } from "express";
import multer from "multer";

import { AppError } from "../utils/AppError.js";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

export const patientRefillEvidenceUploadDir = path.join(
  process.cwd(),
  "private-uploads",
  "patient-refill-evidence",
);

if (!fs.existsSync(patientRefillEvidenceUploadDir)) {
  fs.mkdirSync(patientRefillEvidenceUploadDir, {
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
      name.includes(`${extension}.`),
  );
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, patientRefillEvidenceUploadDir);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const fileName =
      `${Date.now()}-${crypto.randomUUID()}${extension}`;

    callback(null, fileName);
  },
});

const refillEvidenceUpload = multer({
  storage,

  limits: {
    files: 1,
    fileSize: MAX_FILE_SIZE,
  },

  fileFilter: (_req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const allowedExtensions = allowedFileTypes.get(
      file.mimetype,
    );

    if (containsBlockedExtension(file.originalname)) {
      callback(
        new Error(
          "The selected filename contains a blocked executable, archive or script extension.",
        ),
      );
      return;
    }

    if (
      !allowedExtensions ||
      !allowedExtensions.has(extension)
    ) {
      callback(
        new Error(
          "Only PDF, JPG, JPEG, PNG and WEBP medicine evidence files are allowed.",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

export const removeUploadedRefillEvidence = async (
  filePath?: string | null,
) => {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
};

export const uploadPatientRefillEvidence: RequestHandler = (
  req,
  res,
  next,
) => {
  refillEvidenceUpload.single("evidenceFile")(
    req,
    res,
    async (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (req.file?.path) {
        await removeUploadedRefillEvidence(
          req.file.path,
        ).catch(() => undefined);
      }

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(
            new AppError(
              "Medicine evidence file cannot exceed 8 MB.",
              400,
            ),
          );
          return;
        }

        if (
          error.code === "LIMIT_FILE_COUNT" ||
          error.code === "LIMIT_UNEXPECTED_FILE"
        ) {
          next(
            new AppError(
              "Only one medicine evidence file can be uploaded.",
              400,
            ),
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
            : "Unable to upload medicine evidence.",
          400,
        ),
      );
    },
  );
};