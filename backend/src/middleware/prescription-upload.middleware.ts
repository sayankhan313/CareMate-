import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import multer from "multer";

const prescriptionUploadDir =
  path.join(
    process.cwd(),
    "uploads",
    "prescriptions"
  );

if (
  !fs.existsSync(
    prescriptionUploadDir
  )
) {
  fs.mkdirSync(
    prescriptionUploadDir,
    {
      recursive: true,
    }
  );
}

const storage = multer.diskStorage({
  destination: (
    _req,
    _file,
    callback
  ) => {
    callback(
      null,
      prescriptionUploadDir
    );
  },

  filename: (
    _req,
    file,
    callback
  ) => {
    const safeOriginalName =
      file.originalname
        .replace(/\s+/g, "-")
        .replace(
          /[^a-zA-Z0-9.\-_]/g,
          ""
        );

    const uniquePrefix =
      `${Date.now()}-${crypto.randomUUID()}`;

    callback(
      null,
      `${uniquePrefix}-${safeOriginalName}`
    );
  },
});

const allowedMimeTypes =
  new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ]);

export const prescriptionImageUpload =
  multer({
    storage,
    limits: {
      fileSize:
        8 * 1024 * 1024,
    },
    fileFilter: (
      _req,
      file,
      callback
    ) => {
      if (
        !allowedMimeTypes.has(
          file.mimetype
        )
      ) {
        callback(
          new Error(
            "Only JPG, JPEG, PNG and WEBP prescription images are allowed."
          )
        );

        return;
      }

      callback(null, true);
    },
  });