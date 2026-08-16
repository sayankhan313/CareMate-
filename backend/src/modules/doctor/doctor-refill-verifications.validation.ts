import { z } from "zod";

const optionalText = (maxLength: number) =>
  z.preprocess(
    value => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed || undefined;
    },
    z.string().trim().max(maxLength).optional(),
  );

export const confirmRefillVerificationSchema = z.object({
  note: optionalText(500),
});

export const rejectRefillVerificationSchema = z.object({
  note: optionalText(500),
});