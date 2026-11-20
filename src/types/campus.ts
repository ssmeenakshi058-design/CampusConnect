import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export type OpportunityCategory =
  | 'internship'
  | 'part_time'
  | 'entry_level'
  | 'live_project'
  | 'skill_building'
  | 'campus_event';

export type WorkMode = 'on_site' | 'remote' | 'hybrid';

export type OpportunityStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'closed';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

export type CompanyVerificationStatus = 'pending' | 'verified' | 'rejected';

export type EventType =
  | 'campus_event'
  | 'career_workshop'
  | 'placement_prep'
  | 'networking'
  | 'skill_session';

export type EventMode = 'on_site' | 'online' | 'hybrid';
export type EventStatus = 'upcoming' | 'completed' | 'cancelled';

export type ReportReason =
  | 'misleading_info'
  | 'unpaid_disguised'
  | 'fee_demanded'
  | 'fake_company'
  | 'expired_listing'
  | 'other';

export type ReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentProfile {
  uid: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  phone?: string;
  college: string;
  course: string;
  specialization?: string;
  graduationYear?: number;
  semester?: string;
  academicYear?: string;
  skills: string[];
  interests: string[];
  preferredIndustry?: string;
  preferredLocation?: string;
  preferredOpportunityType?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  profileCompletion: number;
  accountStatus: AccountStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminProfile {
  uid: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  title: string;
  department: string;
  phone?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Company {
  companyId: string;
  name: string;
  industry: string;
  description: string;
  website?: string;
  location: string;
  logoUrl?: string;
  verificationStatus: CompanyVerificationStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CompanyPrivateContact {
  companyId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  updatedAt: Timestamp;
}

export interface Opportunity {
  opportunityId: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogoUrl?: string;
  industry: string;
  category: OpportunityCategory;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  eligibility: string;
  educationQualification: string;
  workMode: WorkMode;
  location: string;
  isPaid: boolean;
  stipendMin: number;
  stipendMax: number;
  stipendLabel: string;
  duration: string;
  openings?: number;
  deadline: string; // ISO YYYY-MM-DD
  requiredDocuments: string[];
  additionalQuestions: string[];
  allowReapply: boolean;
  status: OpportunityStatus;
  isVerified: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Application {
  applicationId: string;
  applicationCode: string;
  opportunityId: string;
  opportunityTitle: string;
  companyName: string;
  category: OpportunityCategory;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  college: string;
  course: string;
  skills: string[];
  resumeUrl: string;
  resumeFileName?: string;
  coverLetter?: string;
  additionalAnswers?: string[];
  status: ApplicationStatus;
  adminNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SavedOpportunity {
  savedId: string;
  studentUid: string;
  opportunityId: string;
  opportunityTitle: string;
  companyName: string;
  category: string;
  location: string;
  deadline: string;
  createdAt: Timestamp;
}

export interface CampusEvent {
  eventId: string;
  title: string;
  eventType: EventType;
  organizer: string;
  description: string;
  venue: string;
  location: string;
  mode: EventMode;
  eventDate: string;
  eventTime: string;
  registrationDeadline: string;
  capacity?: number;
  registrationLink?: string;
  bannerUrl?: string;
  status: EventStatus;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AppNotification {
  notificationId: string;
  recipientUid: string;
  recipientRole: UserRole;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: Timestamp;
}

export interface OpportunityReport {
  reportId: string;
  opportunityId: string;
  opportunityTitle: string;
  companyName: string;
  reportedByUid: string;
  reportedByName: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  adminActionNote?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  internship: 'Internship',
  part_time: 'Part-Time Job',
  entry_level: 'Entry-Level Job',
  live_project: 'Live Project',
  skill_building: 'Skill-Building',
  campus_event: 'Campus Event',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  on_site: 'On-site',
  remote: 'Remote',
  hybrid: 'Hybrid',
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  pending: 'Pending Review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
  closed: 'Closed',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  selected: 'Selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  campus_event: 'Campus Event',
  career_workshop: 'Career Workshop',
  placement_prep: 'Placement Prep',
  networking: 'Networking',
  skill_session: 'Skill Session',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  misleading_info: 'Misleading job or stipend details',
  unpaid_disguised: 'Unpaid role disguised as paid',
  fee_demanded: 'Company requested registration or training fee',
  fake_company: 'Unverifiable or suspicious company identity',
  expired_listing: 'Listing is closed or no longer accepting applicants',
  other: 'Other safety concern',
};

export const CAMPUS_ASSETS = {
  heroCampus: '/src/assets/images/hero_campus_dehradun_1795162080246.jpg',
  studentLogin: '/src/assets/images/portal_student_login_1795162080539.jpg',
  eventWorkshop: '/src/assets/images/event_career_workshop_1795162080472.jpg',
  liveProject: '/src/assets/images/campus_live_project_1795162080406.jpg',
};

export const PLATFORM_DISCLAIMER =
  'CampusConnect helps students discover career opportunities. Final selection decisions are made by the respective companies.';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'ssmeenakshi058@gmail.com';

export interface RuleBasedMatchResult {
  score: number;
  reasons: string[];
}

/**
 * Transparent rule-based matching using student skills, education,
 * preferred location, industry, and opportunity category.
 */
export function computeRuleBasedMatch(
  opportunity: Opportunity,
  profile: StudentProfile | null
): RuleBasedMatchResult {
  if (!profile) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  const studentSkills = new Set(profile.skills.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const matchedSkills = opportunity.requiredSkills.filter((skill) =>
    studentSkills.has(skill.trim().toLowerCase())
  );

  if (matchedSkills.length > 0) {
    score += Math.min(45, matchedSkills.length * 15);
    reasons.push(`Skills (${matchedSkills.slice(0, 3).join(', ')})`);
  }

  if (
    profile.preferredOpportunityType &&
    profile.preferredOpportunityType === opportunity.category
  ) {
    score += 20;
    reasons.push(`Category (${CATEGORY_LABELS[opportunity.category]})`);
  }

  const prefLoc = (profile.preferredLocation || '').trim().toLowerCase();
  const oppLoc = opportunity.location.trim().toLowerCase();
  if (prefLoc && (oppLoc.includes(prefLoc) || opportunity.workMode === 'remote')) {
    score += 15;
    reasons.push(opportunity.workMode === 'remote' ? 'Remote friendly' : `Location (${opportunity.location})`);
  }

  const prefIndustry = (profile.preferredIndustry || '').trim().toLowerCase();
  const studentInterests = profile.interests.map((i) => i.trim().toLowerCase());
  const oppIndustry = opportunity.industry.trim().toLowerCase();
  if (
    (prefIndustry && oppIndustry.includes(prefIndustry)) ||
    studentInterests.some((interest) => oppIndustry.includes(interest) || opportunity.title.toLowerCase().includes(interest))
  ) {
    score += 10;
    reasons.push(`Industry (${opportunity.industry})`);
  }

  const courseLower = (profile.course || '').trim().toLowerCase();
  const qualLower = (opportunity.educationQualification || '').trim().toLowerCase();
  if (courseLower && (qualLower.includes(courseLower) || qualLower.includes('any'))) {
    score += 10;
    reasons.push(`Education (${profile.course})`);
  }

  return { score: Math.min(100, score), reasons };
}

export function formatDeadlineRelative(deadlineIso: string): {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
  daysLeft: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${deadlineIso}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return { label: deadlineIso, isUrgent: false, isExpired: false, daysLeft: 99 };
  }
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: `Closed ${Math.abs(diffDays)}d ago`, isUrgent: false, isExpired: true, daysLeft: diffDays };
  }
  if (diffDays === 0) {
    return { label: 'Closes today', isUrgent: true, isExpired: false, daysLeft: 0 };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}d left`, isUrgent: true, isExpired: false, daysLeft: diffDays };
  }
  return {
    label: target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    isUrgent: false,
    isExpired: false,
    daysLeft: diffDays,
  };
}
