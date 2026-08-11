import type { Request } from "express";

import type { AuditRequestContext } from "./audit.types.js";

const getForwardedIpAddress = (req: Request) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(",")[0]?.trim() || null;
  }

  return null;
};

export const getAuditRequestContext = (
  req: Request
): AuditRequestContext => {
  return {
    requestMethod: req.method || null,
    requestPath: req.originalUrl || req.path || null,
    ipAddress:
      getForwardedIpAddress(req) ||
      req.ip ||
      req.socket?.remoteAddress ||
      null,
    userAgent:
      typeof req.headers["user-agent"] === "string"
        ? req.headers["user-agent"]
        : null,
  };
};