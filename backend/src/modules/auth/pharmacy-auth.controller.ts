import type { Request, Response, NextFunction } from "express";

import { authService } from "./auth.service.js";
import { deleteUploadedFile } from "../../middleware/upload.middleware.js";

type UploadedPharmacyFiles = {
  licenseDocument?: Express.Multer.File[];
  addressProofDocument?: Express.Multer.File[];
};

const getUploadedFiles = (req: Request) => {
  return req.files as UploadedPharmacyFiles | undefined;
};

const getFileUrl = (file?: Express.Multer.File) => {
  if (!file) {
    return "";
  }

  return `/uploads/pharmacy-verifications/${file.filename}`;
};

const cleanupUploadedFiles = (files?: UploadedPharmacyFiles) => {
  const allFiles = [
    ...(files?.licenseDocument || []),
    ...(files?.addressProofDocument || []),
  ];

  allFiles.forEach((file) => {
    deleteUploadedFile(file.path);
  });
};

export const pharmacyAuthController = {
  async registerPharmacy(req: Request, res: Response, next: NextFunction) {
    const uploadedFiles = getUploadedFiles(req);

    try {
      const licenseDocument = uploadedFiles?.licenseDocument?.[0];
      const addressProofDocument = uploadedFiles?.addressProofDocument?.[0];

      const result = await authService.register({
        fullName: req.body.fullName,
        email: req.body.email,
        password: req.body.password,
        role: "PHARMACY",

        phoneNumber: req.body.phoneNumber,
        pharmacyName: req.body.pharmacyName,
        staffName: req.body.staffName,
        registrationNumber: req.body.registrationNumber,
        licenseNumber: req.body.licenseNumber,
        address: req.body.address,
        city: req.body.city,
        postcode: req.body.postcode,
        openingHours: req.body.openingHours,
        serviceType: req.body.serviceType,

        licenseDocumentUrl: getFileUrl(licenseDocument),
        addressProofDocumentUrl: getFileUrl(addressProofDocument),
      });

      return res.status(201).json({
        success: true,
        message:
          "Pharmacy registration submitted successfully. Awaiting admin approval.",
        data: result,
      });
    } catch (error) {
      cleanupUploadedFiles(uploadedFiles);
      next(error);
    }
  },
};