# ASM NIGERIA 2026 CONFERENCE ABSTRACT MANAGEMENT SYSTEM

## MASTER BUILD SPECIFICATION

**Project:** ASM Nigeria 2026 Conference Abstract Management System
**Location:** Abuja, Nigeria
**Purpose:** Conference abstract registration, submission, review and decision management
**Initial reviewer structure:** 5 scientific reviewers mapped to 5 conference subthemes
**Deployment target:** Vercel
**Database/backend:** Supabase
**Repository:** GitHub
**Target infrastructure cost:** $0 using free-tier services

---

# 1. YOUR ROLE

You are the lead senior full-stack software engineer responsible for designing and implementing this application.

Act as an experienced engineer in:

- Full-stack web development
- Next.js
- TypeScript
- PostgreSQL
- Supabase
- Authentication
- Role-based access control
- Academic conference management systems
- Scientific abstract review workflows
- Secure document management
- Email notification systems
- Production deployment

Do not blindly code.

First understand the requirements, inspect the repository, identify the existing environment, and then implement the system incrementally.

---

# 2. PRODUCT DEFINITION

Build a lightweight but professional web application for managing abstracts submitted to the **ASM Nigeria 2026 Conference in Abuja, Nigeria**.

The system must manage the complete abstract lifecycle:

```text
AUTHOR REGISTRATION → ABSTRACT SUBMISSION → REFERENCE NUMBER → SCREENING →
SUBTHEME ROUTING → SCIENTIFIC REVIEW → COMMITTEE DECISION → AUTHOR NOTIFICATION
```

This is NOT a journal management system.

Do NOT build:

- Journal publishing
- DOI management
- Manuscript publishing
- Citation management
- Academic indexing
- Research repository
- Payment processing
- Accommodation booking
- Conference ticketing
- Full CRM
- Social network
- AI abstract scoring

Keep the product focused.

---

# 3. PRIMARY USERS

The system has four major operational roles plus Super Admin.

## AUTHOR

Authors register, submit and track abstracts.

## REVIEWER

Five scientific reviewers review abstracts according to assigned subthemes.

## SCIENTIFIC COMMITTEE

The committee monitors reviews and makes final decisions.

## ADMIN / SECRETARIAT

The conference secretariat manages the system and submissions.

## SUPER ADMIN

Full technical/system administration.

---

# 4. TECHNOLOGY STACK

Use the following unless there is a compelling technical reason to change something.

## Application

- Next.js
- TypeScript
- React

## Styling/UI

- Tailwind CSS
- shadcn/ui

## Database

- Supabase PostgreSQL

## Authentication

- Supabase Auth

## File Storage

- Supabase Storage

## Validation

- Zod
- React Hook Form

## Hosting

- Vercel

## Source Control

- GitHub

## Email

Use a free SMTP-compatible solution.

Do not introduce paid email APIs unless explicitly approved.

## Other libraries

Use lightweight open-source libraries for:

- XLSX/Excel export
- CSV export
- PDF generation
- Charts
- QR codes, if later required

Avoid unnecessary packages.

---

# 5. COST REQUIREMENT

The project is a side/hobby project intended for the conference.

Target:

**$0 recurring infrastructure cost.**

Use free-tier services.

Do not introduce paid APIs unnecessarily.

The application must not require:

- OpenAI API
- Claude API
- Gemini API
- paid email APIs
- paid database
- paid storage
- paid authentication

AI is not required for the core system.

---

# 6. IMPORTANT DEVELOPMENT RULE

Do NOT build the entire system in one giant implementation.

Work in controlled phases.

Before coding:

1. Inspect repository.
2. Inspect existing package.json.
3. Inspect framework/version.
4. Inspect folder structure.
5. Inspect existing environment configuration.
6. Determine whether a Supabase project is already connected.
7. Determine whether authentication already exists.
8. Produce an implementation plan.
9. Identify missing configuration.
10. Then implement incrementally.

Do not destroy or overwrite existing project work without understanding it.

---

# 7. CORE SYSTEM WORKFLOW

The complete workflow is:

```text
AUTHOR REGISTRATION
        ↓
EMAIL VERIFICATION
        ↓
AUTHOR PROFILE
        ↓
CREATE ABSTRACT
        ↓
SAVE DRAFT
        ↓
ADD AUTHORS
        ↓
SELECT SUBTHEME
        ↓
ENTER ABSTRACT
        ↓
UPLOAD DOCUMENT
        ↓
REVIEW SUBMISSION
        ↓
SUBMIT
        ↓
GENERATE REFERENCE NUMBER
        ↓
EMAIL ACKNOWLEDGEMENT
        ↓
SECRETARIAT SCREENING
        ↓
AUTOMATIC SUBTHEME ROUTING
        ↓
ASSIGNED REVIEWER
        ↓
SCIENTIFIC REVIEW
        ↓
REVIEW COMPLETED
        ↓
SCIENTIFIC COMMITTEE DECISION
        ↓
ACCEPT / REVISION / REJECT
        ↓
AUTHOR NOTIFICATION
```

---

# 8. AUTHOR REGISTRATION FORM

Create a professional registration form.

## Account information

Required:

- First name
- Last name
- Email
- Password
- Confirm password

## Professional information

Required:

- Professional title
- Institution/Organization
- Department/Unit
- Country
- Phone number

Optional:

- ORCID

Do not require ORCID.

## Registration agreement

Include:

- Conference terms/declaration checkbox
- Privacy/data-use acknowledgement

After registration:

```text
Register
↓
Verify Email
↓
Login
↓
Author Dashboard
```

---

# 9. AUTHOR PROFILE

The author can manage:

- Name
- Email
- Phone
- Institution
- Department
- Country
- Professional title
- ORCID

The corresponding author information should automatically populate new submissions.

---

# 10. AUTHOR DASHBOARD

The author dashboard must show:

## Summary

- Total submissions
- Drafts
- Submitted
- Under review
- Revision required
- Accepted
- Rejected

## Submission list

Columns:

- Reference number
- Title
- Subtheme
- Date submitted
- Status
- Decision
- Last updated

Primary action:

**+ Submit New Abstract**

---

# 11. ABSTRACT SUBMISSION FORM

The submission form must be a multi-step form.

Do not create one excessively long page.

Recommended steps:

```text
1. Abstract Information
2. Authors
3. Abstract Content
4. Declarations
5. Document Upload
6. Review & Submit
```

---

# 12. STEP 1 — ABSTRACT INFORMATION

Fields:

### Abstract Title

Required.

### Scientific Subtheme

Required.

Use a controlled dropdown.

Do NOT allow authors to type arbitrary subtheme names.

The subtheme must come from the conference configuration.

### Keywords

Allow multiple keywords.

### Presentation Preference

Options:

- Oral
- Poster
- Either

---

# 13. STEP 2 — AUTHORS

The corresponding author is automatically populated from the user's profile.

Allow:

**+ Add Co-Author**

Each co-author should have:

- First name
- Last name
- Institution
- Department
- Country
- Email
- ORCID, optional

Maintain author order.

Example:

```text
1. Author A — Corresponding Author
2. Author B
3. Author C
4. Author D
```

Allow authors to reorder or remove co-authors before submission.

---

# 14. STEP 3 — ABSTRACT CONTENT

Provide a large abstract text editor.

The system must display a live word count.

Example:

```text
Word count: 187 / 250
```

The maximum word count must come from conference settings.

Do not hard-code the limit throughout the application.

Prevent final submission if the abstract exceeds the configured limit.

---

# 15. STEP 4 — DECLARATIONS

Include configurable declarations.

Possible fields:

- Conflict of interest declaration
- Ethical approval declaration
- Funding/support declaration
- Originality declaration

Administrators should eventually be able to configure which declarations are required.

For the MVP, implement the required declarations as configured for the conference.

---

# 16. STEP 5 — DOCUMENT UPLOAD

Allow:

- PDF
- DOC
- DOCX

Maximum file size should come from conference settings.

Display:

- File name
- File type
- File size
- Upload status

Allow:

- Upload
- Replace
- Remove

Files must be stored securely.

Do NOT use publicly accessible storage URLs.

Use protected access/signed URLs.

---

# 17. STEP 6 — REVIEW & SUBMIT

Before submission, display a complete summary.

The author must be able to review:

- Title
- Subtheme
- Authors
- Keywords
- Abstract
- Presentation preference
- Declarations
- Uploaded document

Display a clear warning:

> Please carefully review your submission before submitting. Once submitted, it will enter the conference review process.

Button:

**Submit Abstract**

---

# 18. DRAFT SYSTEM

Authors must be able to save unfinished submissions.

Drafts should not receive the final official reference number.

Draft status:

**DRAFT**

The author can return later and continue editing.

---

# 19. OFFICIAL SUBMISSION

When the author clicks Submit:

1. Validate all required fields.
2. Validate word count.
3. Validate document.
4. Create official submission.
5. Generate unique reference number.
6. Change status to SUBMITTED.
7. Create audit log.
8. Create notification.
9. Send acknowledgement email.
10. Route to appropriate subtheme/reviewer.

The system must not create duplicate submissions if the user double-clicks or refreshes during submission.

---

# 20. REFERENCE NUMBER

Generate:

```text
ASM-ABJ-2026-00001
ASM-ABJ-2026-00002
ASM-ABJ-2026-00003
```

The reference number must be unique.

Use a UUID as the database primary key.

Do NOT use the reference number as the database primary key.

---

# 21. FIVE SCIENTIFIC REVIEWERS

There are exactly five primary reviewers for the conference.

Each reviewer is responsible for one or more designated subthemes.

The configuration should look like:

```text
Subtheme 1 → Reviewer 1
Subtheme 2 → Reviewer 2
Subtheme 3 → Reviewer 3
Subtheme 4 → Reviewer 4
Subtheme 5 → Reviewer 5
```

The actual names and subtheme titles should be stored in the database/configuration rather than hard-coded into the application.

---

# 22. AUTOMATIC SUBTHEME ROUTING

When an author selects a subtheme:

```text
Submission
↓
Subtheme
↓
Assigned Reviewer
↓
Reviewer Assignment
```

The system automatically creates a reviewer assignment.

Example:

```text
ASM-ABJ-2026-00142
Subtheme: Antimicrobial Resistance
Reviewer: Reviewer 3
Status: Pending Review
```

---

# 23. MANUAL REASSIGNMENT

Although routing is automatic, administrators/committee members must be able to reassign a submission.

Reasons may include:

- Conflict of interest
- Reviewer absence
- Workload
- Reviewer expertise
- Administrative correction

The system must record the reassignment in the audit log.

---

# 24. REVIEWER DASHBOARD

Reviewer dashboard should show:

- Assigned abstracts
- Pending reviews
- Completed reviews
- Overdue reviews

Each submission should display:

- Reference number
- Title
- Subtheme
- Abstract
- Keywords
- Document, if available

---

# 25. BLIND REVIEW

Default review mode:

**Double Blind**

When double-blind mode is active:

Reviewer sees:

```text
ASM-ABJ-2026-00042
Abstract Title
Subtheme
Abstract
```

Reviewer must NOT see:

- Author names
- Institution
- Email
- Phone
- Other identifying author information

Administrators and authorized committee members can see author information.

---

# 26. CONFLICT OF INTEREST

Before reviewing, the reviewer must declare:

### No Conflict

or

### Conflict of Interest

If conflict is declared:

1. Lock the review.
2. Flag the assignment.
3. Notify committee/admin.
4. Allow reassignment.

---

# 27. REVIEW FORM

Use a structured review form.

## Scientific assessment

Score each from 1–5:

- Originality
- Scientific relevance
- Methodological quality
- Clarity
- Significance

Calculate average score.

## Recommendation

Options:

- Accept — Oral
- Accept — Poster
- Accept
- Minor Revision
- Major Revision
- Reject

## Comments

Provide:

- Comments to Scientific Committee
- Comments for Author, where applicable

Reviewer must confirm submission before finalizing.

Once submitted, the review should become locked.

---

# 28. REVIEW STATUS

Use:

```text
PENDING
IN_PROGRESS
COMPLETED
CONFLICT
```

Do not allow a reviewer to submit the same review multiple times accidentally.

---

# 29. SCIENTIFIC COMMITTEE DASHBOARD

Committee members should see:

- Total submissions
- Pending screening
- Under review
- Reviews completed
- Decision pending
- Accepted
- Revision required
- Rejected

For each submission show:

- Abstract
- Authors
- Subtheme
- Reviewer
- Review score
- Recommendation
- Comments
- Review status
- Submission history

---

# 30. FINAL DECISION

The committee makes the final decision.

Options:

- Accepted
- Accepted — Oral
- Accepted — Poster
- Minor Revision
- Major Revision
- Rejected

The system must NOT automatically make the final decision solely based on reviewer scores.

Reviewer recommendation is advisory.

Committee decision is authoritative.

---

# 31. REVISION WORKFLOW

If the committee requests revision:

Status:

**REVISION_REQUIRED**

Author can:

- See revision request
- See permitted comments
- Upload revised abstract
- Submit revision

Never overwrite the original submission.

Maintain version history.

Example:

```text
Submission
ASM-ABJ-2026-00100

Version 1
Original Submission

Version 2
Revision 1

Version 3
Revision 2
```

---

# 32. FINAL AUTHOR NOTIFICATION

After final decision, automatically send the appropriate notification.

## Accepted

Include:

- Congratulations
- Reference number
- Abstract title
- Acceptance decision
- Presentation type
- Next steps

## Revision Required

Include:

- Revision required
- Deadline
- Instructions
- Dashboard link

## Rejected

Send a professional decision notification.

---

# 33. NOTIFICATION TRACKING

Track every email.

Fields:

- Recipient
- Submission
- Notification type
- Subject
- Status
- Sent timestamp
- Error message
- Retry count

Statuses:

```text
PENDING
SENT
FAILED
```

If email fails, do not delete the submission.

---

# 34. ADMIN DASHBOARD

Admin dashboard should provide:

### Summary cards

- Total submissions
- Submitted
- Screening
- Under review
- Review completed
- Decision pending
- Accepted
- Revision required
- Rejected

### Submission management

Search by:

- Reference number
- Title
- Author
- Email
- Institution

Filter by:

- Status
- Subtheme
- Reviewer
- Date
- Decision
- Presentation type

---

# 35. ADMIN MANAGEMENT

Admin should be able to manage:

## Conference

- Name
- Year
- Location
- Dates
- Submission deadline
- Review deadline
- Decision date

## Subthemes

- Name
- Description
- Active/inactive

## Reviewers

- Name
- Email
- Institution
- Expertise/subtheme
- Active/inactive

## Submission settings

- Word limit
- File types
- File size
- Presentation types
- Review mode

---

# 36. DATABASE

Use Supabase PostgreSQL.

Recommended tables:

```text
users
conferences
conference_subthemes
authors
reviewers
committee_members
submissions
submission_versions
submission_authors
documents
review_assignments
reviews
decisions
notifications
audit_logs
```

Use UUID primary keys.

Use foreign keys.

Use indexes.

Use timestamps.

Use database constraints.

---

# 37. IMPORTANT DATABASE RELATIONSHIPS

```text
CONFERENCE
   │
   ├── SUBTHEMES
   │
   ├── SUBMISSIONS
          │
          ├── AUTHORS
          │
          ├── DOCUMENTS
          │
          ├── VERSIONS
          │
          ├── REVIEW ASSIGNMENTS
          │       │
          │       └── REVIEWS
          │
          ├── DECISION
          │
          └── NOTIFICATIONS
```

---

# 38. MULTI-CONFERENCE SUPPORT

The system should support future conferences.

Do not hard-code:

```text
ASM-ABJ-2026
```

everywhere.

Use conference configuration.

Future records should be able to support:

```text
ASM Nigeria 2026
ASM Nigeria 2027
ASM Nigeria 2028
```

Historical conference data must remain separate.

---

# 39. SUBMISSION STATUS

Use controlled statuses:

```text
DRAFT
SUBMITTED
SCREENING
ASSIGNED
UNDER_REVIEW
REVIEWS_COMPLETED
DECISION_PENDING
REVISION_REQUIRED
ACCEPTED
ACCEPTED_ORAL
ACCEPTED_POSTER
REJECTED
WITHDRAWN
```

Every important transition must create an audit record.

---

# 40. AUDIT LOG

Record:

- User
- Action
- Timestamp
- Related record
- Previous status
- New status
- Relevant metadata

Examples:

```text
Submission created
Submission submitted
Reference generated
Reviewer assigned
Reviewer reassigned
Conflict declared
Review completed
Decision created
Decision changed
Notification sent
```

---

# 41. EXPORTS

Admin should be able to export:

- All submissions
- Accepted submissions
- Rejected submissions
- Oral presentations
- Poster presentations
- Reviewer assignments
- Review results
- Final decisions
- Author list

Formats:

- CSV
- XLSX

---

# 42. SECURITY

Implement:

- Supabase Auth
- Email verification
- Role-based access
- Row Level Security
- Server-side authorization
- Server-side validation
- Zod validation
- Secure file storage
- Signed file URLs
- Input validation
- File type validation
- File size validation
- Rate limiting where practical
- Audit logging

Never trust frontend role information.

Never expose the Supabase service-role key to the browser.

Never commit secrets to GitHub.

---

# 43. ROLE SECURITY

### Author

Can only access own submissions.

### Reviewer

Can only access assigned submissions.

### Committee

Can access authorized conference submissions/reviews.

### Admin

Can manage conference data.

### Super Admin

Can manage system-level settings.

Every protected server operation must verify authorization.

---

# 44. UI REQUIREMENTS

The interface should look like a professional academic conference management platform.

Style:

- Clean
- Modern
- Academic
- Professional
- Minimal
- Responsive

Do not create an overly futuristic "AI dashboard".

Do not use unnecessary animations.

Prioritize usability.

---

# 45. MAIN ROUTES

Suggested:

```text
/
 /login
 /register
 /verify-email
 /forgot-password

 /author/dashboard
 /author/profile
 /author/submissions
 /author/submissions/new
 /author/submissions/[id]

 /reviewer/dashboard
 /reviewer/assignments
 /reviewer/assignments/[id]

 /committee/dashboard
 /committee/submissions
 /committee/submissions/[id]
 /committee/reviews
 /committee/decisions

 /admin/dashboard
 /admin/submissions
 /admin/users
 /admin/reviewers
 /admin/subthemes
 /admin/conference
 /admin/notifications
 /admin/exports
 /admin/audit-logs
```

Adjust if a better Next.js architecture is appropriate.

---

# 46. ERROR HANDLING

Errors must be understandable.

Examples:

### Submission failure

> Your submission could not be completed. Please try again.

### File error

> This file type or size is not permitted.

### Authorization

> You do not have permission to access this submission.

### Duplicate action

> This submission has already been submitted.

Do not expose technical database errors to normal users.

Log technical errors securely for developers/admins.

---

# 47. TESTING

Before declaring the system complete, test:

## Registration

- Create account
- Duplicate email
- Email verification
- Login
- Logout
- Password reset

## Submission

- Create draft
- Edit draft
- Add co-authors
- Select subtheme
- Word count
- Upload file
- Submit
- Reference generation
- Duplicate submission protection

## Routing

- Each subtheme routes to correct reviewer
- Reviewer receives assignment
- Conflict can be declared
- Admin can reassign

## Review

- Reviewer sees assigned abstract
- Double-blind protection works
- Reviewer can score
- Reviewer can recommend
- Review locks after submission

## Decision

- Committee can decide
- Revision works
- Acceptance works
- Rejection works
- Oral/poster works

## Notifications

- Submission acknowledgement
- Reviewer assignment
- Decision notification
- Revision notification

## Security

Attempt unauthorized access between:

- Author → Author
- Author → Reviewer
- Reviewer → Reviewer
- Reviewer → Admin
- Normal user → Admin

All unauthorized access must be blocked.

---

# 48. PERFORMANCE

Expected usage:

**Hundreds to a few thousand submissions.**

Use:

- Pagination
- Database indexes
- Server-side search
- Server-side filtering
- Efficient queries

Do not load all submissions into the browser.

---

# 49. FREE-TIER ENGINEERING

Keep infrastructure lightweight.

Do not introduce:

- Redis
- Kubernetes
- Docker infrastructure unless useful for development
- Separate backend server
- Microservices
- Paid queues
- Paid monitoring
- Paid AI APIs

Use:

```text
Vercel
+
Supabase
+
GitHub
```

as the core infrastructure.

---

# 50. PROJECT STRUCTURE

Use a clean structure similar to:

```text
app/
components/
lib/
types/
emails/
supabase/
public/
```

Organize by feature when appropriate.

Keep business logic separate from UI components.

Do not put database logic directly into presentation components.

---

# 51. ENVIRONMENT VARIABLES

Use environment variables.

Possible values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL

EMAIL_HOST
EMAIL_PORT
EMAIL_USER
EMAIL_PASSWORD
EMAIL_FROM
```

Never expose server-only secrets to client-side code.

---

# 52. DEVELOPMENT PHASES

Implement in this order.

## PHASE 1 — PROJECT FOUNDATION

- Inspect repository
- Configure Next.js
- Configure TypeScript
- Configure Tailwind
- Configure Supabase
- Establish database
- Establish authentication
- Establish roles

## PHASE 2 — AUTHOR SYSTEM

- Registration
- Email verification
- Profile
- Dashboard
- Abstract form
- Co-authors
- Drafts
- Upload
- Submission
- Reference number

## PHASE 3 — ADMIN

- Admin dashboard
- Conference settings
- Subthemes
- Reviewer management
- Submission management
- Search/filter

## PHASE 4 — REVIEW

- Reviewer accounts
- Automatic subtheme assignment
- Reviewer dashboard
- Double-blind review
- Conflict declaration
- Review form
- Review scoring

## PHASE 5 — COMMITTEE

- Committee dashboard
- Review monitoring
- Decision workflow
- Revision workflow

## PHASE 6 — NOTIFICATIONS

- Email templates
- Submission acknowledgement
- Reviewer assignment
- Revision notification
- Final decision notification
- Email tracking

## PHASE 7 — REPORTING

- Analytics
- CSV
- XLSX
- Audit logs

## PHASE 8 — QA & DEPLOYMENT

- Full testing
- Security testing
- Performance testing
- Production environment
- Vercel deployment
- Supabase production configuration

---

# 53. MVP ACCEPTANCE CRITERIA

The MVP is complete when an author can:

1. Register.
2. Verify email.
3. Log in.
4. Complete profile.
5. Create abstract.
6. Add co-authors.
7. Select subtheme.
8. Enter abstract.
9. See word count.
10. Upload document.
11. Save draft.
12. Submit.
13. Receive unique reference number.
14. Receive acknowledgement.
15. Track status.

The system must then:

16. Route the abstract to the correct one of five reviewers.
17. Allow reviewer to review.
18. Protect author identity under double-blind mode.
19. Allow conflict declaration.
20. Allow reviewer scoring.
21. Allow reviewer recommendation.
22. Allow committee to view review.
23. Allow committee to make final decision.
24. Notify author automatically.
25. Preserve complete history.

Admin must be able to:

26. Manage conference.
27. Manage subthemes.
28. Manage five reviewers.
29. Manage submissions.
30. Manage assignments.
31. View decisions.
32. Export data.
33. View audit logs.

---

# 54. FUTURE FEATURES — DO NOT BUILD NOW

Possible future features:

- Abstract book generation
- Conference programme generation
- QR abstract lookup
- Presentation scheduling
- Certificate generation
- Attendance management
- ORCID integration
- WhatsApp notifications
- SMS notifications
- Public accepted-abstract catalogue
- Automatic reviewer matching
- Advanced analytics

Do not implement these unless specifically requested.

---

# 55. FINAL ENGINEERING PRINCIPLE

Build a **small, reliable and professional conference management application**.

Do not over-engineer.

The system's primary purpose is:

# SUBMIT → REVIEW → DECIDE → NOTIFY

Every technical decision should support that objective.

---

# 56. FIRST TASK

Before writing application code, perform the following:

### Step 1

Inspect the entire repository.

### Step 2

Identify:

- Framework
- Package manager
- Existing dependencies
- Existing routes
- Existing components
- Existing database configuration
- Existing Supabase configuration
- Existing authentication
- Existing environment variables

### Step 3

Compare the existing repository with this specification.

### Step 4

Create:

```text
IMPLEMENTATION_PLAN.md
```

containing:

- Current project state
- Missing functionality
- Proposed architecture
- Database schema plan
- Authentication plan
- Role/permission plan
- Submission workflow
- Reviewer workflow
- Decision workflow
- Notification workflow
- Deployment plan
- Testing plan

### Step 5

Do NOT begin large-scale implementation yet.

Wait for approval after presenting the implementation plan.

Once approved, implement Phase 1.

---

# 57. IMPORTANT INSTRUCTION

Do not make assumptions about unspecified conference information.

For example, do not invent:

- Reviewer names
- Scientific subtheme names
- Conference dates
- Abstract requirements
- Email addresses
- Venue details
- Committee names

Use configurable placeholders where information has not yet been supplied.

The human project owner will provide the official conference information.

---

# 58. SOURCE OF TRUTH

This document is the primary product specification.

When implementation decisions are unclear:

1. Follow this document.
2. Preserve the stated scope.
3. Prefer the simplest reliable implementation.
4. Do not introduce unnecessary technologies.
5. Do not expand the product without approval.

The goal is not to build the biggest system.

The goal is to build a reliable, secure and professional **ASM Nigeria Conference Abstract Management System** that can be used for the Abuja conference and reused for future conference editions.

# END OF SPECIFICATION
