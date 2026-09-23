# retest: recon now routed to fast model tier (2026-09-23T10:09:09Z)
# retest attempt 2: mirror now synced before trigger (2026-09-23T10:14:04Z)
# retest attempt 3: application_type column widened to TEXT (2026-09-23T10:20:05Z)

- 2026-09-23T10:55:55Z: retry after fixing the changed_file_review prompt so uncertain-due-to-missing-context routes through the candidate+expansion pipeline instead of abstaining into unused coverage_gaps.
- 2026-09-23T11:36:00Z: retry after adding bounded retry-on-empty-completion to LiteLLMChangedFileReviewer (previous two attempts both hit an intermittent empty output_text from the l1 model, unrelated to the prompt fix).
- 2026-09-23T11:40:00Z: retry with l1 reviewer switched from kimi-k2.7-code (standard tier, no reasoning_effort support per OpenRouter's supported_parameters) to kimi-k3 (deep tier, confirmed reasoning_effort support).
- 2026-09-23T11:50:00Z: prior note above accidentally spoiled the review by naming the specific vulnerable route/class in the diff, so the model flagged this file for information disclosure instead of independently reviewing app.js. Redacted for a clean blind retest.
- 2026-09-23T12:05:00Z: fresh commit to reset the review attempt budget after fixing two unrelated pipeline crashes upstream of the model call.
- 2026-09-23T12:40:56Z: automated end-to-end flow run.
- 2026-09-23T12:41:22Z: automated end-to-end flow run.
- 2026-09-23T12:59:27Z: verify mirror-sync fix end-to-end.
