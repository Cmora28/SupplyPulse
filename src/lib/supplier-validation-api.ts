import { NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import type { z } from "zod";
import type { supplierSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import {
  validateSupplierProfile,
  SupplierValidationServiceError,
  isSupplierValidationSkipped,
} from "@/lib/supplier-validation-ai";

type SupplierData = z.infer<typeof supplierSchema>;

export type SupplierAuditContext = {
  actorUserId: string;
  actorEmail: string;
  request?: Request;
  operation: "create" | "update";
  supplierId?: string;
  supplierName?: string;
};

export async function runSupplierConsistencyCheck(
  data: SupplierData,
  audit?: SupplierAuditContext
): Promise<NextResponse | null> {
  if (isSupplierValidationSkipped()) {
    return null;
  }

  try {
    const result = await validateSupplierProfile({
      name: data.name,
      country: data.country,
      category: data.category,
      leadTimeDays: data.leadTimeDays,
      cogsPercentage: data.cogsPercentage,
      shippingRoute: data.shippingRoute,
      dependencies: data.dependencies,
    });

    if (!result.valid) {
      if (audit) {
        void logAudit({
          action: AuditAction.SUPPLIER_VALIDATION_REJECTED,
          success: false,
          actorUserId: audit.actorUserId,
          actorEmail: audit.actorEmail,
          request: audit.request,
          targetType: audit.supplierId ? "Supplier" : undefined,
          targetId: audit.supplierId,
          metadata: {
            operation: audit.operation,
            supplierName: data.name,
            summary: result.summary,
          },
        });
      }
      return NextResponse.json(
        {
          error: "Supplier profile failed consistency check",
          code: "validation_failed",
          validation: {
            valid: false,
            summary: result.summary,
            issues: result.issues,
          },
        },
        { status: 422 }
      );
    }

    return null;
  } catch (error) {
    console.error("[Supplier validation]", error);
    const message =
      error instanceof SupplierValidationServiceError
        ? error.message
        : "Unknown validation error";
    console.error(message);
    return NextResponse.json(
      {
        error: "Could not verify supplier data",
        code: "validation_unavailable",
      },
      { status: 422 }
    );
  }
}
