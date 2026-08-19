import fs from "fs";
import path from "path";
import multer from "multer";
import type { Request } from "express";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const ensureFolderExists = (folderPath: string) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, {
      recursive: true,
    });
  }
};

const createVerificationUpload = (folderName: string) => {
  const uploadFolder = path.join(process.cwd(), "uploads", folderName);

  ensureFolderExists(uploadFolder);

  const storage = multer.diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      callback
    ) => {
      callback(null, uploadFolder);
    },
    filename: (
      _req: Request,
      file: Express.Multer.File,
      callback
    ) => {
      const timestamp = Date.now();
      const safeOriginalName = file.originalname.replace(/\s+/g, "-");

      callback(null, `${timestamp}-${safeOriginalName}`);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        callback(
          new Error("Only PDF, JPG, JPEG and PNG files are allowed.")
        );
        return;
      }

      callback(null, true);
    },
  });
};

export const doctorVerificationUpload = createVerificationUpload(
  "doctor-verifications"
);

export const pharmacyVerificationUpload = createVerificationUpload(
  "pharmacy-verifications"
);

export const deleteUploadedFile = (filePath?: string) => {
  if (!filePath) {
    return;
  }

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};