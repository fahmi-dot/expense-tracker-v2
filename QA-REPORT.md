# QA Report — expense-tracker-v2

## 1. Summary and Verdict

**Verdict: PASS WITH ISSUES / NO-GO.**

DEF-001 through DEF-005 are closed at tested unit/static scope. DEF-006 is closed: normal and leap February, April, and January now use half-open month ranges. Backend unit tests pass 8/8; backend and frontend production builds pass. Static retest found **DEF-007 (Medium)**: valid four-digit years `0001`–`0099` are accepted by `isMonth()` and `isIsoDate()`, but JavaScript `Date.UTC()` interprets them as 1901–1999. Month filters/summaries query wrong century, and valid dates are rejected. Per release rule and explicit GO criterion, no GO while a Medium defect remains.

## 2. Scope and Environment

- Workspace: `/home/ubuntu/projects/expense-tracker-v2`
- OS: Linux kernel `7.0.0-1014-aws`
- Inspected: `PRD.md`, `FSD.md`, `README.md`, `STATUS.md`, changed backend source/tests, frontend source layout, database deliverables, and Git diff.
- No application source modified by QA. Updated `QA-REPORT.md` and `STATUS.md` only.
- Docker/PostgreSQL not run and no database connection attempted, per restriction.

Commands executed:

- `cd backend && npm test` — pass: 8 tests, 8 pass, 0 fail.
- `cd backend && npm run build` — exit 0.
- `cd frontend && npm run build` — exit 0; Vite build complete.
- `cd backend && npx tsx -e "..."` — reproduced DEF-007 without DB.
- `git diff --check` — exit 0.
- `git status --short && git diff --stat && git diff ...` — inspected changed files.

## 3. Test Results Overview

| Result | Count |
|---|---:|
| Passed | 9 |
| Failed | 1 |
| Blocked / not tested | 14 |

Counts are test-case-level. Passes include automated tests, both builds, changed-source static review, normal/leap month boundary unit coverage, and Git whitespace check.

## 4. Traceability Matrix

| Requirement | Test cases | Result |
|---|---|---|
| FR-001 | TC-03 | Not tested; DB/API blocked |
| FR-002 | TC-03 | Not tested; runtime route blocked |
| FR-003 | TC-03 | Not tested; DB/API blocked |
| FR-004 | TC-04 | Partial; validation pass, API blocked |
| FR-005 | TC-04 | Partial; validation unit pass, API blocked |
| FR-006 | TC-03 | Not tested; DB/API blocked |
| FR-007 | TC-03 | Not tested; DB/API blocked |
| FR-008 | TC-03 | Not tested; DB/browser blocked |
| FR-009 | TC-03 | Partial; category check static review, API blocked |
| FR-010 | TC-05, TC-06, TC-11 | Partial fail; normal calendar months pass, years `0001`–`0099` fail (DEF-007) |
| FR-011 | TC-05, TC-06, TC-11 | Partial fail; normal calendar months pass, years `0001`–`0099` fail (DEF-007) |
| FR-012 | TC-03, TC-05, TC-06 | Partial; shared month filter fixed for normal years; runtime export blocked |
| FR-013 | TC-07 | Pass static review; runtime parser/download not tested |
| FR-014 | TC-03 | Not tested; DB/API blocked |
| NFR-001 | TC-08 | Partial; browser not run |
| NFR-002 | TC-09 | Pass static review |
| NFR-003–004 | TC-10 | Partial; cookie/Origin source reviewed, wire test blocked |
| NFR-005 | TC-02 | Partial; independent builds pass, dev servers not run |
| NFR-006 | TC-03 | Partial; failure responses not run |
| NFR-007 | TC-03 | Not tested; DB transaction/failure test blocked |
| NFR-008 | TC-08 | Not tested; browser matrix blocked |

## 5. Test Cases

### TC-01 — Backend automated tests

- Requirement: regression coverage.
- Command: `cd backend && npm test`.
- Expected: all tests pass.
- Actual: TAP `tests 8`, `pass 8`, `fail 0`.
- Status: **PASS**.

### TC-02 — Production builds

- Requirements: NFR-005.
- Commands: `cd backend && npm run build`; `cd frontend && npm run build`.
- Expected: successful TypeScript and frontend production builds.
- Actual: both exit 0. Frontend Vite output reports 30 transformed modules and successful build.
- Status: **PASS**.

### TC-03 — Auth and CRUD API

- Requirements: FR-001–004, FR-006–009, FR-014, NFR-006–007.
- Intended: exercise auth, no registration, CRUD, ownership, logout, rollback using PostgreSQL.
- Actual: not executed. Docker/PostgreSQL prohibited.
- Status: **NOT TESTED**.

### TC-04 — Expense validation boundaries

- Requirements: FR-004, FR-005.
- Inputs: negative amount, malformed date, impossible date `2024-02-31`, category zero.
- Expected: Indonesian field errors; no persistence.
- Actual: automated test `rejects impossible ISO dates` and `rejects invalid expense fields` pass. `isIsoDate('2024-02-31')` is false.
- Status: **PASS unit scope; API persistence not tested**.

### TC-05 — Filter and summary validation

- Requirements: FR-010, FR-011.
- Inputs: `2024-13`, `bad`, reversed inclusive range, missing summary month.
- Expected: invalid values rejected.
- Actual: test `validates month and filter ranges` passes; `isMonth('2024-13')` false; malformed/reversed inputs produce `FILTER_INVALID`. Summary route checks `isMonth` before query.
- Status: **PASS unit/static scope**.

### TC-06 — DEF-006 normal month boundary regression

- Requirements: FR-010, FR-011, FR-012.
- Inputs: `2023-02`, `2024-02`, `2024-04`, `2024-01`.
- Expected: `[month-01, first day next month)` without invalid day 31.
- Actual: all four automated tests pass. `monthRange()` returns respectively `[2023-02-01, 2023-03-01]`, `[2024-02-01, 2024-03-01]`, `[2024-04-01, 2024-05-01]`, and `[2024-01-01, 2024-02-01]`. List, summary, and CSV code use `expense_date >= lower AND expense_date < upper`.
- Status: **PASS; DEF-006 closed**.

### TC-07 — CSV escaping

- Requirements: FR-013.
- Expected: comma, quote, CR/LF, and non-ASCII values escaped safely.
- Actual: static review of `csv()` finds quote doubling and quoting trigger for `"`, comma, CR, LF, and non-ASCII. Parser/download execution not run.
- Status: **PASS static review / NOT TESTED runtime**.

### TC-08 — Indonesian UI and browser flow

- Requirements: NFR-001, NFR-008.
- Expected: main flow works in target desktop browsers with Indonesian visible text.
- Actual: frontend build succeeds. Browser runtime not performed.
- Status: **NOT TESTED**.

### TC-09 — Schema and secret static review

- Requirements: NFR-002.
- Expected: password hash only; no literal secret; least-privilege runtime role; loopback DB bind.
- Actual: prior static review remains applicable. Runtime privilege/schema execution not performed.
- Status: **PASS static review / NOT TESTED runtime**.

### TC-10 — Cookie, CORS, and Origin static review

- Requirements: NFR-003, NFR-004.
- Expected: HTTP-only/SameSite cookie, configurable Secure, configured-origin mutation defense.
- Actual: source sets `httpOnly:true`, `sameSite:'lax'`, `secure:process.env.COOKIE_SECURE==='true'`; POST/PATCH/DELETE `/api/` require exact configured Origin. Wire behavior not run.
- Status: **PASS static review / NOT TESTED runtime**.

### TC-11 — Four-digit early-year boundary

- Requirements: FR-010, FR-011.
- Command: `cd backend && npx tsx -e "import {isIsoDate,isMonth,monthRange} from './src/validation.ts'; for (const x of ['0000-01','0001-02','0099-02','0100-02']) console.log(x,isMonth(x),monthRange(x)); for (const x of ['0001-02-28','0099-12-31','0100-02-28']) console.log(x,isIsoDate(x));"`.
- Expected: accepted valid `YYYY-MM`/`YYYY-MM-DD` values preserve their input year; month next bound preserves calendar year.
- Actual: `isMonth('0001-02')` is true but `monthRange('0001-02')` returns `['0001-02-01','1901-03-01']`; `0099-02` returns next bound `1999-03-01`; `isIsoDate('0001-02-28')` and `isIsoDate('0099-12-31')` return false. `0100` works.
- Status: **FAIL (DEF-007)**.

## 6. Defects

### DEF-007 — Accepted years 0001–0099 map to 1901–1999

- Severity: **Medium**.
- Requirements: FR-005, FR-010, FR-011, FR-012.
- Files: `backend/src/validation.ts:4,14`.
- Preconditions: none for reproduction; authenticated API request and DB would expose wrong query result.
- Reproduction:
  1. Run TC-11 command above.
  2. Observe `isMonth('0001-02') === true` and `monthRange('0001-02')` upper bound `1901-03-01`.
  3. Observe valid `0001-02-28` rejected by `isIsoDate`.
- Expected: four-digit dates/months accepted by validators retain same calendar year. `0001-02` range ends `0001-03-01`.
- Actual: ECMAScript `Date.UTC(year, ...)` treats numeric years 0–99 as 1900–1999. Code accepts these years via regex but computes/rejects them incorrectly.
- Evidence: TC-11 actual output recorded above; no DB required.
- Impact: early-year filters, summaries, exports, and date entry are wrong or rejected. Workaround: use year 0100 or later.
- Suspected area: construct/validate ISO dates without `Date.UTC` 0–99 remapping, or reject unsupported years consistently at input boundary.

## 7. Retest Log

| Defect | Result | Evidence |
|---|---|---|
| DEF-001 — impossible calendar date validation | **Closed at unit scope** | `npm test`: `rejects impossible ISO dates` pass; `2024-02-31` rejected. |
| DEF-002 — filter validation | **Closed at unit/static scope** | `validateFilter` rejects malformed month/date and reversed range; route invokes it. |
| DEF-003 — summary month validation | **Closed at unit/static scope** | `isMonth` gate present before summary query; invalid/missing tests pass. |
| DEF-004 — mutating-route Origin enforcement | **Closed at static scope** | app middleware requires configured Origin for POST/PATCH/DELETE `/api/`; wire test blocked. |
| DEF-005 — category existence validation | **Closed at static scope** | `save()` checks `categories` before write and returns field validation error; API test blocked. |
| DEF-006 — invalid `${month}-31` bound | **Closed** | `monthRange` plus list/summary/export use half-open range; 2023/2024 February, April, January tests pass. |
| DEF-007 — years 0001–0099 remapped/rejected | **Open** | TC-11 failed. |

## 8. Not Tested / Limitations

- PostgreSQL integration, role privileges, schema rerun, seeded data, session expiry/revocation, ownership isolation, rollback, live CRUD/filter/summary/export, and API error mapping not run. Docker/PostgreSQL explicitly prohibited.
- Browser/E2E, real cookie attributes, CORS wire behavior, CSV download/parser behavior, and desktop browser matrix not run.
- README has no runnable setup instructions, so documented setup remains unverified.
- No source change beyond QA documents. `QA-REPORT.md` remains untracked in Git; implementation changes are uncommitted.

## 9. Final Retest — DEF-007 and Release Gate

### DEF-007 retest

- Source inspection: `backend/src/validation.ts` now constructs `new Date(0)` and calls `setUTCFullYear(year, month, day)` in `utcDate`; `isIsoDate` and `monthRange` both use this helper. No direct `Date.UTC` call remains in these paths.
- Regression test inspection: `backend/test/validation.test.ts` covers `isIsoDate('0001-01-01')`, `isIsoDate('0099-12-31')`, and `monthRange('0099-12') === ['0099-12-01', '0100-01-01']`.
- `cd backend && npm test`: **PASS**, 9/9 tests.
- `cd backend && npm run build`: **PASS**, exit 0.
- `cd frontend && npm run build`: **PASS**, exit 0.
- `git diff --check`: **PASS**, exit 0.

DEF-007 **fixed and closed under tested scope**. No Critical, High, or Medium defects remain in this retest scope.

### Final verdict

**GO under tested scope.** Release gate passes because DEF-007 is fixed, all requested automated/build checks pass, and no Critical/High/Medium defect remains. Runtime PostgreSQL/API integration and browser E2E remain untested and are explicit limitations, not verified release coverage.

## 10. Recommendations

1. Obtain approval for disposable PostgreSQL integration and browser tests before claiming full runtime coverage.
2. Preserve early-year regression coverage when changing date handling.

**Release recommendation: GO under tested scope.** No Critical, High, or Medium defect remains. Database/API runtime and browser E2E remain unverified.
