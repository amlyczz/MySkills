/**
 * validate.ts — Runtime validation utilities for VideoConfig.
 *
 * Used by:
 * - VideoComposer (render-time validation with error display)
 * - LLM matching pipeline (retry loop validation)
 * - allocate.py (via subprocess or Pydantic mirror)
 */
import { videoConfigSchema } from "./VideoConfig.schema";
import type { VideoConfig } from "../types";

export interface ValidationResult {
  success: boolean;
  data?: VideoConfig;
  errors: string[];
}

/**
 * Validate a single VideoConfig candidate.
 * Returns structured errors for display or retry.
 */
export function validateVideoConfig(config: unknown): ValidationResult {
  const result = videoConfigSchema.safeParse(config);
  if (result.success) {
    return {
      success: true,
      data: result.data as VideoConfig,
      errors: [],
    };
  }
  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    ),
  };
}

/**
 * Validate multiple candidates, return the first valid one.
 * For LLM retry loops: generate N candidates, pick the first valid.
 */
export function validateWithRetry(candidates: unknown[]): ValidationResult {
  const allErrors: string[] = [];
  for (const candidate of candidates) {
    const result = validateVideoConfig(candidate);
    if (result.success) return result;
    allErrors.push(...result.errors.map((e) => `[Candidate]: ${e}`));
  }
  return { success: false, errors: allErrors };
}

/**
 * Build a human-readable error summary for display.
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return "";
  if (errors.length === 1) return errors[0];
  return errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n");
}
