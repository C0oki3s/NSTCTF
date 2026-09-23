# retest: recon now routed to fast model tier (2026-09-23T10:09:09Z)
# retest attempt 2: mirror now synced before trigger (2026-09-23T10:14:04Z)
# retest attempt 3: application_type column widened to TEXT (2026-09-23T10:20:05Z)

- 2026-09-23T10:55:55Z: retry after fixing the changed_file_review prompt so uncertain-due-to-missing-context routes through the candidate+expansion pipeline instead of abstaining into unused coverage_gaps.
- 2026-09-23T11:36:00Z: retry after adding bounded retry-on-empty-completion to LiteLLMChangedFileReviewer (previous two attempts both hit an intermittent empty output_text from the l1 model, unrelated to the prompt fix).
- 2026-09-23T11:40:00Z: retry with l1 reviewer switched from kimi-k2.7-code (standard tier, no reasoning_effort support per OpenRouter's supported_parameters) to kimi-k3 (deep tier, confirmed reasoning_effort support), to see if it actually catches the planted /api/pdfs IDOR that the previous model missed with only 16-18 reasoning tokens.
