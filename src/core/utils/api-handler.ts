import { NextRequest, NextResponse } from "next/server";
import { AppError, ErrorCode } from "../errors/app-error";
import { createSuccessResponse, createErrorResponse } from "../types/api-envelope";
import { ZodError } from "zod";

type RouteHandler<T> = (request: NextRequest, context?: any) => Promise<T>;

/**
 * Higher-order function that wraps Route Handlers with unified error handling,
 * Zod validation parsing, and consistent JSON envelope responses.
 */
export function handleApiRoute<T>(handler: RouteHandler<T>) {
  return async (request: NextRequest, context?: any) => {
    try {
      const data = await handler(request, context);
      return NextResponse.json(createSuccessResponse(data));
    } catch (err: any) {
      if (err instanceof AppError) {
        return NextResponse.json(
          createErrorResponse(err.message, err.code, err.details),
          { status: err.statusCode }
        );
      }

      if (err instanceof ZodError) {
        return NextResponse.json(
          createErrorResponse("Input validation failed", ErrorCode.VALIDATION_ERROR, err.errors),
          { status: 400 }
        );
      }

      console.error("[Unhandled API Error]:", err);
      return NextResponse.json(
        createErrorResponse(
          process.env.NODE_ENV === "development" ? err.message : "Internal server error",
          ErrorCode.INTERNAL_ERROR
        ),
        { status: 500 }
      );
    }
  };
}
