import { tokenStorage } from "../tokenStorage";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

const getErrorMessage = (result: any) => {
  if (typeof result?.message === "string") return result.message;

  if (Array.isArray(result?.message)) {
    return result.message[0]?.message || "Unable to complete request";
  }

  return "Unable to complete request";
};

export const getPharmacyToken = async () => {
  const token = await tokenStorage.getToken();

  if (!token) {
    throw new Error("Authentication required");
  }

  return token;
};

export const getPharmacyAuthHeaders = async () => {
  const token = await getPharmacyToken();

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const readPharmacyResponse = async <T>(
  response: Response
): Promise<T> => {
  let result: ApiResponse<T> | any = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(result));
  }

  return result.data;
};