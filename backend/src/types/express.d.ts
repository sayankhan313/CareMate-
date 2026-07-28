declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        fullName: string;
        email: string;
        role: "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN";
        accountStatus:
          | "ACTIVE"
          | "PENDING_VERIFICATION"
          | "APPROVED"
          | "REJECTED"
          | "DISABLED";
        isEmailVerified: boolean;
      };
    }
  }
}

export {};