import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

type ApiSuccess<T> = { success: true; data: T; message?: string }
type ApiError = { success: false; error: string; details?: unknown }

export function apiSuccess<T>(data: T, message?: string, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, message }, { status })
}

export function apiError(error: string, status = 400, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error, details }, { status })
}

export function handleApiError(err: unknown): NextResponse<ApiError> {
  if (err instanceof ZodError) {
    return apiError('Validation error', 422, err.flatten().fieldErrors)
  }
  if (err instanceof Error) {
    console.error('[API Error]', err.message)
    return apiError(err.message, 500)
  }
  return apiError('Internal server error', 500)
}
