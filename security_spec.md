# CampusConnect Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Portal Separation (RBAC)**: Only the bootstrapped verified admin (`ssmeenakshi058@gmail.com` with `email_verified == true`) or users present in `/adminProfiles/{uid}` (created only by an existing admin) have administrative privileges. Ordinary students can never create or edit `/adminProfiles/{uid}` or set `role: "admin"` on `/users/{uid}`.
2. **Account Status Integrity**: Students cannot reactivate their own suspended account (`accountStatus` is immutable for students).
3. **Opportunity Verification Integrity**: Only verified opportunities (`status == 'verified'` and `isVerified == true`) can be read or listed by non-admins. Only admins can create, verify, reject, expire, close, or delete opportunities.
4. **Application Immutability & Anti-Tampering**: Students can only create applications for an existing verified opportunity with `status == 'submitted'` and `studentUid == request.auth.uid`. Students can never update application status or admin notes.
5. **PII Isolation**: Student profiles (`/studentProfiles/{uid}`), user accounts (`/users/{uid}`), and company private contact details (`/companies/{companyId}/private/{docId}`) are strictly readable only by the owning user or an authorized admin.
6. **Temporal & ID Integrity**: All document IDs match `^[a-zA-Z0-9_\-]+$` (<= 128 chars). `createdAt` must equal `request.time` on creation and remain immutable on update. `updatedAt` must equal `request.time` on update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Admin Self-Escalation on User Create**: Student creates `/users/{uid}` with `role: "admin"`. Expected: `PERMISSION_DENIED`.
2. **Admin Directory Injection**: Student attempts to create `/adminProfiles/{uid}`. Expected: `PERMISSION_DENIED`.
3. **Unverified Admin Email Spoof**: Request with `email: "ssmeenakshi058@gmail.com"` and `email_verified: false` accesses `/adminProfiles`. Expected: `PERMISSION_DENIED`.
4. **Student Profile PII Harvesting**: Student A attempts `get` or `list` on `/studentProfiles/{studentB}`. Expected: `PERMISSION_DENIED`.
5. **Suspended Student Self-Reactivation**: Suspended student updates `/studentProfiles/{uid}` setting `accountStatus: "active"`. Expected: `PERMISSION_DENIED`.
6. **Application Status Forgery**: Student updates their own `/applications/{appId}` setting `status: "selected"`. Expected: `PERMISSION_DENIED`.
7. **Orphan / Unverified Opportunity Application**: Student submits application referencing a non-existent or `pending` opportunity. Expected: `PERMISSION_DENIED`.
8. **Shadow Field Injection on Profile**: Student writes `/studentProfiles/{uid}` with extra field `isVerifiedAdmin: true`. Expected: `PERMISSION_DENIED`.
9. **Company Private Contact Scraping**: Student attempts to read `/companies/{companyId}/private/contact`. Expected: `PERMISSION_DENIED`.
10. **Pending Opportunity Leakage**: Student attempts `list` on `/opportunities` without filtering `status == 'verified'`. Expected: `PERMISSION_DENIED`.
11. **Oversized String / Resource Poisoning**: Student writes a 50KB string into `fullName` or an invalid 300-char ID. Expected: `PERMISSION_DENIED`.
12. **Client-Spoofed Timestamp**: Student submits application with backdated `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
