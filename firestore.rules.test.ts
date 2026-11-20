/**
 * CampusConnect Firestore Security Rules Verification Specification
 * Covers all 12 "Dirty Dozen" adversarial payloads defined in security_spec.md.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  actor: 'studentA' | 'studentB' | 'unverifiedAdmin' | 'admin';
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Admin Self-Escalation on User Create',
    actor: 'studentA',
    operation: 'create',
    path: '/users/studentA',
    payload: { uid: 'studentA', role: 'admin', accountStatus: 'active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Admin Directory Injection',
    actor: 'studentA',
    operation: 'create',
    path: '/adminProfiles/studentA',
    payload: { uid: 'studentA', fullName: 'Fake Admin', email: 'fake@example.com' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof',
    actor: 'unverifiedAdmin',
    operation: 'list',
    path: '/studentProfiles',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Student Profile PII Harvesting',
    actor: 'studentA',
    operation: 'get',
    path: '/studentProfiles/studentB',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Suspended Student Self-Reactivation',
    actor: 'studentA',
    operation: 'update',
    path: '/studentProfiles/studentA',
    payload: { accountStatus: 'active' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Application Status Forgery',
    actor: 'studentA',
    operation: 'update',
    path: '/applications/opp1__studentA',
    payload: { status: 'selected' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphan or Pending Opportunity Application',
    actor: 'studentA',
    operation: 'create',
    path: '/applications/pendingOpp__studentA',
    payload: { opportunityId: 'pendingOpp', studentUid: 'studentA', status: 'submitted' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Shadow Field Injection on Profile',
    actor: 'studentA',
    operation: 'update',
    path: '/studentProfiles/studentA',
    payload: { isVerifiedAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Company Private Contact Scraping',
    actor: 'studentA',
    operation: 'get',
    path: '/companies/comp1/private/contact',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Pending Opportunity Leakage via Unfiltered List',
    actor: 'studentA',
    operation: 'list',
    path: '/opportunities',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Oversized String / Resource Poisoning',
    actor: 'studentA',
    operation: 'update',
    path: '/studentProfiles/studentA',
    payload: { fullName: 'A'.repeat(50000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Client-Spoofed Timestamp on Application',
    actor: 'studentA',
    operation: 'create',
    path: '/applications/opp1__studentA',
    payload: { createdAt: '2020-01-01T00:00:00Z', status: 'submitted' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
