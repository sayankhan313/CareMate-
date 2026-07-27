import { readFileSync } from "fs";
import { isAbsolute, resolve } from "path";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

import { AppError } from "../../utils/AppError.js";

type JitsiUserRole = "PATIENT" | "DOCTOR";

type CreateMeetingConfigInput = {
  roomName: string;
  user: {
    id: string;
    name: string;
    email?: string | null;
    role: JitsiUserRole;
    moderator: boolean;
  };
};

const readPrivateKeyFromPath = (privateKeyPath: string) => {
  const resolvedPath = isAbsolute(privateKeyPath)
    ? privateKeyPath
    : resolve(process.cwd(), privateKeyPath);

  try {
    return readFileSync(resolvedPath, "utf8");
  } catch {
    throw new AppError(
      `JaaS private key file could not be read from: ${resolvedPath}`,
      500
    );
  }
};

const getPrivateKey = () => {
  if (process.env.JAAAS_PRIVATE_KEY_PATH) {
    return readPrivateKeyFromPath(process.env.JAAAS_PRIVATE_KEY_PATH);
  }

  if (process.env.JAAAS_PRIVATE_KEY) {
    return process.env.JAAAS_PRIVATE_KEY.replace(/\\n/g, "\n");
  }

  throw new AppError("JaaS private key is not configured.", 500);
};

const getJaasConfig = () => {
  const appId = process.env.JAAAS_APP_ID;
  const kid = process.env.JAAAS_KID;
  const domain = process.env.JAAAS_DOMAIN || "8x8.vc";
  const privateKey = getPrivateKey();

  if (!appId || !kid) {
    throw new AppError("JaaS video service is not configured.", 500);
  }

  return {
    appId,
    kid,
    privateKey,
    domain,
  };
};

const getTokenExpirySeconds = () => {
  const expirySeconds = Number(process.env.JAAAS_TOKEN_EXPIRES_SECONDS || 3600);

  if (!Number.isFinite(expirySeconds) || expirySeconds <= 0) {
    return 3600;
  }

  return expirySeconds;
};

export const jitsiService = {
  createRoomName(prefix: "emergency" | "manual") {
    const uniqueId = randomUUID().replaceAll("-", "");

    return `caremate_${prefix}_${uniqueId}`;
  },

  createMeetingConfig({ roomName, user }: CreateMeetingConfigInput) {
    const { appId, kid, privateKey, domain } = getJaasConfig();

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expirySeconds = getTokenExpirySeconds();

    const tokenPayload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: roomName,
      nbf: nowInSeconds - 10,
      exp: nowInSeconds + expirySeconds,
      context: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email || "",
          moderator: user.moderator ? "true" : "false",
        },
        features: {
          livestreaming: "false",
          recording: "false",
          transcription: "false",
          "outbound-call": "false",
        },
      },
    };

    const token = jwt.sign(tokenPayload, privateKey, {
      algorithm: "RS256",
      header: {
        alg: "RS256",
        kid,
        typ: "JWT",
      },
    });

    return {
      domain,
      appId,
      roomName,
      jwt: token,
      webUrl: `https://${domain}/${appId}/${roomName}?jwt=${token}`,
      userRole: user.role,
      moderator: user.moderator,
    };
  },
};