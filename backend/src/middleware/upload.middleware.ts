import fs from "node:fs";
import path from "node:path";

import multer from "multer";

const doctorVerificationUploadDir = path.join(
  process.cwd(),
  "uploads",
  "doctor-verifications"
);

if (!fs.existsSync(doctorVerificationUploadDir)) {
  fs.mkdirSync(doctorVerificationUploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, doctorVerificationUploadDir);
  },

  filename: (_req, file, callback) => {
    const timestamp = Date.now();
    const safeOriginalName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.\-_]/g, "");

    callback(null, `${timestamp}-${safeOriginalName}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

export const doctorVerificationUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new Error("Only PDF, JPG aand PNG files are allowed for verification.")
      );
      return;
    }

    callback(null, true);
  },
});