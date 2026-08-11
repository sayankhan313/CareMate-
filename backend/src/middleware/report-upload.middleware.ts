import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import multer from "multer";
import type {
  RequestHandler,
} from "express";

import { AppError } from "../utils/AppError.js";

export const patientReportUploadDir =
  path.join(
    process.cwd(),
    "private-uploads",
    "patient-reports"
  );

if (
  !fs.existsSync(
    patientReportUploadDir
  )
) {
  fs.mkdirSync(
    patientReportUploadDir,
    {
      recursive: true,
    }
  );
}

const allowedFileTypes =
  new Map<string, Set<string>>([
    [
      "application/pdf",
      new Set([".pdf"]),
    ],
    [
      "image/jpeg",
      new Set([
        ".jpg",
        ".jpeg",
      ]),
    ],
    [
      "image/jpg",
      new Set([
        ".jpg",
        ".jpeg",
      ]),
    ],
    [
      "image/png",
      new Set([".png"]),
    ],
    [
      "image/webp",
      new Set([".webp"]),
    ],
  ]);

const dangerousExtensions =
  new Set([
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

const containsBlockedExtension = (
  fileName: string
) => {
  const normalisedName =
    path
      .basename(fileName)
      .toLowerCase();

  return Array.from(
    dangerousExtensions
  ).some((extension) => {
    return (
      normalisedName.endsWith(
        extension
      ) ||
      normalisedName.includes(
        `${extension}.`
      )
    );
  });
};

const storage =
  multer.diskStorage({
    destination: (
      _req,
      _file,
      callback
    ) => {
      callback(
        null,
        patientReportUploadDir
      );
    },

    filename: (
      _req,
      file,
      callback
    ) => {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      const uniqueName =
        `${Date.now()}-${crypto.randomUUID()}${extension}`;

      callback(
        null,
        uniqueName
      );
    },
  });

const patientReportUpload =
  multer({
    storage,

    limits: {
      files: 1,
      fileSize:
        8 * 1024 * 1024,
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      const allowedExtensions =
        allowedFileTypes.get(
          file.mimetype
        );

      if (
        containsBlockedExtension(
          file.originalname
        )
      ) {
        callback(
          new Error(
            "The selected filename contains a blocked executable, archive or script extension."
          )
        );

        return;
      }

      if (
        !allowedExtensions ||
        !allowedExtensions.has(
          extension
        )
      ) {
        callback(
          new Error(
            "Only PDF, JPG, JPEG, PNG and WEBP medical report files are allowed."
          )
        );

        return;
      }

      callback(
        null,
        true
      );
    },
  });

export const uploadSinglePatientReport:
  RequestHandler = (
    req,
    res,
    next
  ) => {
    patientReportUpload.single(
      "reportFile"
    )(
      req,
      res,
      (error: unknown) => {
        if (!error) {
          next();

          return;
        }

        if (
          error instanceof
          multer.MulterError
        ) {
          if (
            error.code ===
            "LIMIT_FILE_SIZE"
          ) {
            next(
              new AppError(
                "Medical report file cannot exceed 8 MB.",
                400
              )
            );

            return;
          }

          if (
            error.code ===
            "LIMIT_FILE_COUNT"
          ) {
            next(
              new AppError(
                "Only one medical report file can be uploaded at a time.",
                400
              )
            );

            return;
          }

          next(
            new AppError(
              error.message,
              400
            )
          );

          return;
        }

        next(
          new AppError(
            error instanceof Error
              ? error.message
              : "Unable to upload the medical report file.",
            400
          )
        );
      }
    );
  };

export const removeUploadedReportFile =
  async (
    filePath?: string | null
  ) => {
    if (!filePath) {
      return;
    }

    try {
      await fs.promises.unlink(
        filePath
      );
    } catch (error) {
      if (
        error &&
        typeof error ===
          "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }

      throw error;
    }
  };

export const resolvePatientReportFilePath =
  (
    storedFileName: string
  ) => {
    return path.join(
      patientReportUploadDir,
      path.basename(
        storedFileName
      )
    );
  };