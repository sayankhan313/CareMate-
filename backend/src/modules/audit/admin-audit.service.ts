import type { Prisma } from "../../generated/prisma/client.js";

import { prisma } from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { AdminAuditLogsQuery } from "./admin-audit.validation.js";

const auditLogRelations = {
  actor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
  patient: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  },
} as const;

const isDateOnly = (value: string) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const getFromDate = (value: string) => {
  if (isDateOnly(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  return new Date(value);
};

const getToDate = (value: string) => {
  if (isDateOnly(value)) {
    return new Date(`${value}T23:59:59.999Z`);
  }

  return new Date(value);
};

const buildAuditLogWhere = (
  query: AdminAuditLogsQuery
): Prisma.AuditLogWhereInput => {
  const where: Prisma.AuditLogWhereInput = {};

  if (query.actorRole) {
    where.actorRole = query.actorRole;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.outcome) {
    where.outcome = query.outcome;
  }

  if (query.entityType) {
    where.entityType = query.entityType;
  }

  if (query.fromDate || query.toDate) {
    where.createdAt = {
      ...(query.fromDate
        ? {
            gte: getFromDate(query.fromDate),
          }
        : {}),
      ...(query.toDate
        ? {
            lte: getToDate(query.toDate),
          }
        : {}),
    };
  }

  if (query.search) {
    const search = query.search;

    where.OR = [
      {
        action: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        entityType: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        entityId: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        requestPath: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        actor: {
          is: {
            OR: [
              {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      },
      {
        patient: {
          is: {
            OR: [
              {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      },
    ];
  }

  return where;
};

export const adminAuditService = {
  async listAuditLogs(query: AdminAuditLogsQuery) {
    const where = buildAuditLogWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: auditLogRelations,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: query.limit,
      }),
      prisma.auditLog.count({
        where,
      }),
    ]);

    const totalPages =
      total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page < totalPages,
      },
      filters: {
        actorRole: query.actorRole || null,
        action: query.action || null,
        outcome: query.outcome || null,
        entityType: query.entityType || null,
        fromDate: query.fromDate || null,
        toDate: query.toDate || null,
        search: query.search || null,
      },
    };
  },

  async getAuditLogDetail(auditLogId: string) {
    const auditLog = await prisma.auditLog.findUnique({
      where: {
        id: auditLogId,
      },
      include: auditLogRelations,
    });

    if (!auditLog) {
      throw new AppError("Audit log not found", 404);
    }

    return auditLog;
  },
};