import { NextResponse } from "next/server";
import type { z } from "zod";
import type { supplierSchema } from "@/lib/validations";
import {
  validateSupplierProfile,
  SupplierValidationServiceError,
  isSupplierValidationSkipped,
} from "@/lib/supplier-validation-ai";

type SupplierData = z.infer<typeof supplierSchema>;

export async function runSupplierConsistencyCheck(
  data: SupplierData
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
