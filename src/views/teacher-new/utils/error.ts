/**
 * Type-safe error handling utilities.
 * All apiClient errors are Error instances, so instanceof checks are reliable.
 */

/** Check if an error is an AbortError (from AbortController). */
export function isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === 'AbortError';
}

/** Extract the message from an unknown error value. */
export function getErrorMessage(err: unknown, fallback = '操作失败'): string {
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === 'string') return err;
    return fallback;
}

/** Check if an error is an Ant Design form validation error. */
export function isFormValidationError(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'errorFields' in err;
}
