# Order template: read-only review

**Title:** Review: (area)

**Brief:**
- Read-only: list files to inspect.
- Write `knowledge/review-<topic>.md` with Verdict, Score 0–10, Strengths, Risks (High/Med/Low), Next (3 bullets).
- Do not edit production code unless brief allows.

**doneWhen:** review file exists

**claim:** `knowledge/review-....md`

**mode:** `parallel`
