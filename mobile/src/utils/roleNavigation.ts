export type AppUserRole = "PATIENT" | "DOCTOR" | "CAREGIVER" | "PHARMACY" | "ADMIN";

export type AppUser = {
  id: string;
  fullName: string;
  email: string;
  role: AppUserRole;
  accountStatus?: string;
  isEmailVerified?: boolean;
};

const isActiveAccount = (status?: string) => status === "ACTIVE" || status === "APPROVED";

export const getRoleHomeRoute = (user: AppUser) => {
  if (user.role === "ADMIN") {
    return {
      name: "AdminTabs" as const,
      params: { user },
    };
  }

  if (user.role === "PATIENT") {
    return {
      name: "PatientTabs" as const,
      params: { user },
    };
  }

  if (user.role === "CAREGIVER") {
    return {
      name: "CaregiverTabs" as const,
      params: { user },
    };
  }

  if (user.role === "DOCTOR") {
    if (!isActiveAccount(user.accountStatus)) {
      return {
        name: "DoctorPendingApproval" as const,
        params: { user, email: user.email },
      };
    }

    return {
      name: "DoctorTabs" as const,
      params: { user },
    };
  }

  if (user.role === "PHARMACY") {
    if (isActiveAccount(user.accountStatus)) {
      return {
        name: "PharmacyTabs" as const,
        params: { user },
      };
    }

    return {
      name: "PharmacyPendingApproval" as const,
      params: { user, email: user.email },
    };
  }

  return null;
};