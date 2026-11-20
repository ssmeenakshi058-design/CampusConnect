import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  type AccountStatus,
  type AdminProfile,
  type Application,
  type ApplicationStatus,
  type CampusEvent,
  type Company,
  type CompanyPrivateContact,
  type Opportunity,
  type OpportunityReport,
  type OpportunityStatus,
  type ReportReason,
  type ReportStatus,
  type StudentProfile,
  type UserRole,
  APPLICATION_STATUS_LABELS,
  CAMPUS_ASSETS,
} from '../types/campus';
import {
  clampList,
  clampText,
  db,
  generateSafeId,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  storage,
  stripUndefined,
} from './firebase';
import { invalidateMarketplaceCache } from './marketplaceStore';

// ============================================================================
// PROFILE COMPLETION CALCULATION
// ============================================================================
export function calculateProfileCompletion(profile: Partial<StudentProfile>): number {
  const checks: boolean[] = [
    Boolean(profile.fullName && profile.fullName.trim().length > 1),
    Boolean(profile.email && profile.email.trim().length > 3),
    Boolean(profile.phone && profile.phone.trim().length >= 8),
    Boolean(profile.college && profile.college.trim().length > 1),
    Boolean(profile.course && profile.course.trim().length > 1),
    Boolean(profile.specialization && profile.specialization.trim().length > 1),
    Boolean(profile.graduationYear && profile.graduationYear >= 2020),
    Boolean(profile.semester && profile.semester.trim().length > 0),
    Boolean(profile.skills && profile.skills.length >= 2),
    Boolean(profile.interests && profile.interests.length >= 1),
    Boolean(profile.preferredLocation && profile.preferredLocation.trim().length > 1),
    Boolean(profile.resumeUrl && profile.resumeUrl.trim().length > 5),
    Boolean(profile.linkedInUrl && profile.linkedInUrl.trim().length > 5),
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

// ============================================================================
// AUTH PROVISIONING & STRICT PORTAL AUTHORIZATION
// ============================================================================
export async function checkIsAuthorizedAdmin(user: User): Promise<boolean> {
  if (!user.emailVerified) return false;
  if (user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  try {
    const adminRef = doc(db, 'adminProfiles', user.uid);
    const snap = await getDoc(adminRef);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function ensureAdminAccount(user: User): Promise<AdminProfile | null> {
  const authorized = await checkIsAuthorizedAdmin(user);
  if (!authorized) {
    return null;
  }

  const uid = sanitizeId(user.uid);
  const adminRef = doc(db, 'adminProfiles', uid);
  const userRef = doc(db, 'users', uid);

  try {
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      const newAdmin = stripUndefined({
        uid,
        fullName: clampText(user.displayName || 'CampusConnect Administrator', 120),
        email: clampText(user.email || BOOTSTRAPPED_ADMIN_EMAIL, 254),
        photoUrl: user.photoURL ? clampText(user.photoURL, 1000) : undefined,
        title: 'Platform Administrator',
        department: 'Career Services & Verification',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(adminRef, newAdmin);
    }

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(
        userRef,
        stripUndefined({
          uid,
          email: clampText(user.email || BOOTSTRAPPED_ADMIN_EMAIL, 254),
          displayName: clampText(user.displayName || 'Administrator', 120),
          photoUrl: user.photoURL ? clampText(user.photoURL, 1000) : undefined,
          role: 'admin',
          accountStatus: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    const updatedSnap = await getDoc(adminRef);
    return updatedSnap.exists() ? (updatedSnap.data() as AdminProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `adminProfiles/${uid}`);
  }
}

export async function ensureStudentAccount(user: User): Promise<StudentProfile> {
  const uid = sanitizeId(user.uid);
  const userRef = doc(db, 'users', uid);
  const profileRef = doc(db, 'studentProfiles', uid);

  try {
    const userSnap = await getDoc(userRef);
    let isBrandNew = false;

    if (!userSnap.exists()) {
      isBrandNew = true;
      await setDoc(
        userRef,
        stripUndefined({
          uid,
          email: clampText(user.email || '', 254),
          displayName: clampText(user.displayName || 'Student', 120),
          photoUrl: user.photoURL ? clampText(user.photoURL, 1000) : undefined,
          role: 'student',
          accountStatus: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await updateDoc(
        userRef,
        stripUndefined({
          displayName: clampText(user.displayName || userSnap.data().displayName || 'Student', 120),
          photoUrl: user.photoURL ? clampText(user.photoURL, 1000) : undefined,
          updatedAt: serverTimestamp(),
        })
      );
    }

    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
      const initialProfile = {
        uid,
        fullName: clampText(user.displayName || 'Student', 120),
        email: clampText(user.email || '', 254),
        photoUrl: user.photoURL ? clampText(user.photoURL, 1000) : undefined,
        college: '',
        course: '',
        skills: [] as string[],
        interests: [] as string[],
        preferredLocation: 'Dehradun',
        preferredOpportunityType: 'internship',
        accountStatus: 'active' as AccountStatus,
      };
      const completion = calculateProfileCompletion(initialProfile);
      await setDoc(
        profileRef,
        stripUndefined({
          ...initialProfile,
          profileCompletion: completion,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      if (isBrandNew) {
        await createNotification({
          recipientUid: 'admins',
          recipientRole: 'admin',
          type: 'student_registered',
          title: 'New Student Registration',
          message: `${initialProfile.fullName} (${initialProfile.email}) joined CampusConnect.`,
          relatedId: uid,
        });
      }
    }

    const finalSnap = await getDoc(profileRef);
    return finalSnap.data() as StudentProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `studentProfiles/${uid}`);
  }
}

export async function updateStudentProfile(
  uid: string,
  updates: Partial<StudentProfile>
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const profileRef = doc(db, 'studentProfiles', safeUid);
  try {
    const existingSnap = await getDoc(profileRef);
    const existing = existingSnap.exists() ? (existingSnap.data() as StudentProfile) : ({} as StudentProfile);
    const merged = { ...existing, ...updates };
    const completion = calculateProfileCompletion(merged);

    const payload = stripUndefined({
      fullName: clampText(updates.fullName ?? existing.fullName, 120),
      photoUrl: updates.photoUrl !== undefined ? clampText(updates.photoUrl, 1000) : existing.photoUrl,
      phone: updates.phone !== undefined ? clampText(updates.phone, 24) : existing.phone,
      college: clampText(updates.college ?? existing.college, 160),
      course: clampText(updates.course ?? existing.course, 120),
      specialization:
        updates.specialization !== undefined
          ? clampText(updates.specialization, 120)
          : existing.specialization,
      graduationYear:
        updates.graduationYear !== undefined && !Number.isNaN(Number(updates.graduationYear))
          ? Math.min(2040, Math.max(2000, Number(updates.graduationYear)))
          : existing.graduationYear,
      semester: updates.semester !== undefined ? clampText(updates.semester, 40) : existing.semester,
      academicYear:
        updates.academicYear !== undefined ? clampText(updates.academicYear, 40) : existing.academicYear,
      skills: clampList(updates.skills ?? existing.skills ?? [], 25),
      interests: clampList(updates.interests ?? existing.interests ?? [], 15),
      preferredIndustry:
        updates.preferredIndustry !== undefined
          ? clampText(updates.preferredIndustry, 120)
          : existing.preferredIndustry,
      preferredLocation:
        updates.preferredLocation !== undefined
          ? clampText(updates.preferredLocation, 120)
          : existing.preferredLocation,
      preferredOpportunityType:
        updates.preferredOpportunityType !== undefined
          ? clampText(updates.preferredOpportunityType, 60)
          : existing.preferredOpportunityType,
      resumeUrl: updates.resumeUrl !== undefined ? clampText(updates.resumeUrl, 1000) : existing.resumeUrl,
      resumeFileName:
        updates.resumeFileName !== undefined
          ? clampText(updates.resumeFileName, 200)
          : existing.resumeFileName,
      linkedInUrl:
        updates.linkedInUrl !== undefined ? clampText(updates.linkedInUrl, 400) : existing.linkedInUrl,
      portfolioUrl:
        updates.portfolioUrl !== undefined ? clampText(updates.portfolioUrl, 400) : existing.portfolioUrl,
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(profileRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `studentProfiles/${safeUid}`);
  }
}

export async function updateAdminProfile(
  uid: string,
  updates: { fullName: string; title: string; department: string; phone?: string }
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const refDoc = doc(db, 'adminProfiles', safeUid);
  try {
    await updateDoc(
      refDoc,
      stripUndefined({
        fullName: clampText(updates.fullName, 120),
        title: clampText(updates.title, 100),
        department: clampText(updates.department, 100),
        phone: updates.phone ? clampText(updates.phone, 24) : '',
        updatedAt: serverTimestamp(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `adminProfiles/${safeUid}`);
  }
}

export async function toggleStudentAccountStatus(
  studentUid: string,
  nextStatus: AccountStatus
): Promise<void> {
  const safeUid = sanitizeId(studentUid);
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'studentProfiles', safeUid), {
      accountStatus: nextStatus,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', safeUid), {
      accountStatus: nextStatus,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `studentProfiles/${safeUid}`);
  }
}

// ============================================================================
// FIREBASE STORAGE RESUME UPLOAD (WITH SAFE FALLBACK)
// ============================================================================
export async function uploadResumeToStorage(
  uid: string,
  file: File
): Promise<{ url: string; fileName: string; usedStorage: boolean }> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 140);
  const storageRef = ref(storage, `resumes/${sanitizeId(uid)}/${Date.now()}_${safeName}`);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/pdf' });
  const url = await getDownloadURL(storageRef);
  return { url, fileName: safeName, usedStorage: true };
}

// ============================================================================
// COMPANIES + PRIVATE CONTACT SUBCOLLECTION
// ============================================================================
export async function saveCompany(
  adminUid: string,
  data: {
    companyId?: string;
    name: string;
    industry: string;
    description: string;
    website?: string;
    location: string;
    logoUrl?: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  }
): Promise<string> {
  const isEdit = Boolean(data.companyId);
  const companyId = data.companyId ? sanitizeId(data.companyId) : generateSafeId('comp');
  const companyRef = doc(db, 'companies', companyId);
  const contactRef = doc(db, 'companies', companyId, 'private', 'contact');

  try {
    if (isEdit) {
      await updateDoc(
        companyRef,
        stripUndefined({
          name: clampText(data.name, 160),
          industry: clampText(data.industry, 100),
          description: clampText(data.description, 2500),
          website: clampText(data.website, 400),
          location: clampText(data.location, 140),
          logoUrl: clampText(data.logoUrl, 1000),
          verificationStatus: data.verificationStatus,
          updatedAt: serverTimestamp(),
        })
      );
    } else {
      await setDoc(
        companyRef,
        stripUndefined({
          companyId,
          name: clampText(data.name, 160),
          industry: clampText(data.industry, 100),
          description: clampText(data.description, 2500),
          website: clampText(data.website, 400),
          location: clampText(data.location, 140),
          logoUrl: clampText(data.logoUrl, 1000),
          verificationStatus: data.verificationStatus,
          createdBy: sanitizeId(adminUid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }

    await setDoc(
      contactRef,
      stripUndefined({
        companyId,
        contactName: clampText(data.contactName, 120),
        contactEmail: clampText(data.contactEmail, 254),
        contactPhone: clampText(data.contactPhone, 30),
        updatedAt: serverTimestamp(),
      })
    );

    return companyId;
  } catch (error) {
    handleFirestoreError(
      error,
      isEdit ? OperationType.UPDATE : OperationType.CREATE,
      `companies/${companyId}`
    );
  }
}

export async function getCompanyPrivateContact(
  companyId: string
): Promise<CompanyPrivateContact | null> {
  const safeId = sanitizeId(companyId);
  try {
    const snap = await getDoc(doc(db, 'companies', safeId, 'private', 'contact'));
    return snap.exists() ? (snap.data() as CompanyPrivateContact) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `companies/${safeId}/private/contact`);
  }
}

export async function deleteCompany(companyId: string): Promise<void> {
  const safeId = sanitizeId(companyId);
  try {
    await deleteDoc(doc(db, 'companies', safeId, 'private', 'contact')).catch(() => undefined);
    await deleteDoc(doc(db, 'companies', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `companies/${safeId}`);
  }
}

// ============================================================================
// OPPORTUNITIES
// ============================================================================
export async function saveOpportunity(
  adminUid: string,
  data: Omit<Opportunity, 'opportunityId' | 'createdBy' | 'createdAt' | 'updatedAt'> & {
    opportunityId?: string;
  }
): Promise<string> {
  const isEdit = Boolean(data.opportunityId);
  const opportunityId = data.opportunityId ? sanitizeId(data.opportunityId) : generateSafeId('opp');
  const oppRef = doc(db, 'opportunities', opportunityId);
  const safeIsVerified = data.status === 'verified' ? Boolean(data.isVerified) : false;

  const basePayload = stripUndefined({
    title: clampText(data.title, 180),
    companyId: sanitizeId(data.companyId),
    companyName: clampText(data.companyName, 160),
    companyLogoUrl: data.companyLogoUrl ? clampText(data.companyLogoUrl, 1000) : '',
    industry: clampText(data.industry, 100),
    category: data.category,
    description: clampText(data.description, 4000),
    responsibilities: clampList(data.responsibilities, 15, 200),
    requiredSkills: clampList(data.requiredSkills, 20, 80),
    eligibility: clampText(data.eligibility, 1000),
    educationQualification: clampText(data.educationQualification, 200),
    workMode: data.workMode,
    location: clampText(data.location, 140),
    isPaid: Boolean(data.isPaid),
    stipendMin: Math.max(0, Number(data.stipendMin) || 0),
    stipendMax: Math.max(Number(data.stipendMin) || 0, Number(data.stipendMax) || 0),
    stipendLabel: clampText(data.stipendLabel || (data.isPaid ? 'Paid' : 'Unpaid'), 100),
    duration: clampText(data.duration, 100),
    openings:
      data.openings !== undefined && Number(data.openings) >= 1
        ? Math.min(10000, Number(data.openings))
        : undefined,
    deadline: clampText(data.deadline, 30),
    requiredDocuments: clampList(data.requiredDocuments, 10, 120),
    additionalQuestions: clampList(data.additionalQuestions, 5, 200),
    allowReapply: Boolean(data.allowReapply),
    status: data.status,
    isVerified: safeIsVerified,
    updatedAt: serverTimestamp(),
  });

  try {
    if (isEdit) {
      await updateDoc(oppRef, basePayload);
    } else {
      await setDoc(oppRef, {
        ...basePayload,
        opportunityId,
        createdBy: sanitizeId(adminUid),
        createdAt: serverTimestamp(),
      });
    }
    invalidateMarketplaceCache();
    return opportunityId;
  } catch (error) {
    handleFirestoreError(
      error,
      isEdit ? OperationType.UPDATE : OperationType.CREATE,
      `opportunities/${opportunityId}`
    );
  }
}

export async function updateOpportunityStatus(
  opportunityId: string,
  status: OpportunityStatus,
  isVerified: boolean
): Promise<void> {
  const safeId = sanitizeId(opportunityId);
  try {
    await updateDoc(doc(db, 'opportunities', safeId), {
      status,
      isVerified: status === 'verified' ? isVerified : false,
      updatedAt: serverTimestamp(),
    });
    invalidateMarketplaceCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `opportunities/${safeId}`);
  }
}

export async function deleteOpportunity(opportunityId: string): Promise<void> {
  const safeId = sanitizeId(opportunityId);
  try {
    await deleteDoc(doc(db, 'opportunities', safeId));
    invalidateMarketplaceCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `opportunities/${safeId}`);
  }
}

// ============================================================================
// APPLICATIONS
// ============================================================================
export async function submitStudentApplication(params: {
  opportunity: Opportunity;
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
}): Promise<{ applicationId: string; applicationCode: string }> {
  const safeUid = sanitizeId(params.studentUid);
  const safeOppId = sanitizeId(params.opportunity.opportunityId);

  // Deterministic ID enforces duplicate prevention when allowReapply is false
  const applicationId = params.opportunity.allowReapply
    ? generateSafeId(`app_${safeOppId.slice(0, 24)}`)
    : sanitizeId(`${safeOppId}__${safeUid}`);

  const appRef = doc(db, 'applications', applicationId);

  try {
    if (!params.opportunity.allowReapply) {
      const existing = await getDoc(appRef);
      if (existing.exists()) {
        throw new Error('DUPLICATE_APPLICATION');
      }
    }

    const isDemoOpp = Boolean(
      params.opportunity.isDemo || params.opportunity.status === 'demo_approved'
    );
    const codeNum = Math.floor(100000 + Math.random() * 900000);
    const applicationCode = isDemoOpp
      ? `DEMO-${new Date().getFullYear()}-${codeNum}`
      : `CC-${new Date().getFullYear()}-${codeNum}`;

    await setDoc(
      appRef,
      stripUndefined({
        applicationId,
        applicationCode,
        opportunityId: safeOppId,
        opportunityTitle: clampText(params.opportunity.title, 180),
        companyName: clampText(params.opportunity.companyName, 160),
        category: params.opportunity.category,
        studentUid: safeUid,
        studentName: clampText(params.studentName, 120),
        studentEmail: clampText(params.studentEmail, 254),
        studentPhone: params.studentPhone ? clampText(params.studentPhone, 24) : '',
        college: clampText(params.college, 160),
        course: clampText(params.course, 120),
        skills: clampList(params.skills, 25, 80),
        resumeUrl: clampText(params.resumeUrl, 1000),
        resumeFileName: params.resumeFileName ? clampText(params.resumeFileName, 200) : '',
        coverLetter: params.coverLetter ? clampText(params.coverLetter, 3000) : '',
        additionalAnswers: clampList(params.additionalAnswers ?? [], 5, 200),
        status: 'submitted',
        ...(isDemoOpp ? { isDemo: true, demoLabel: 'DEMO DATA' } : { isDemo: false }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Trigger in-app notifications (keep demo applications clearly labeled and out of live employer alerts)
    if (isDemoOpp) {
      await Promise.allSettled([
        createNotification({
          recipientUid: safeUid,
          recipientRole: 'student',
          type: 'demo_application_submitted',
          title: 'Demo Application Recorded',
          message: `DEMO APPLICATION (${applicationCode}) recorded for ${params.opportunity.title} at ${params.opportunity.companyName}. This simulated application is not sent to a real employer.`,
          relatedId: applicationId,
        }),
      ]);
    } else {
      await Promise.allSettled([
        createNotification({
          recipientUid: safeUid,
          recipientRole: 'student',
          type: 'application_submitted',
          title: 'Application Submitted',
          message: `Your application (${applicationCode}) for ${params.opportunity.title} at ${params.opportunity.companyName} has been received.`,
          relatedId: applicationId,
        }),
        createNotification({
          recipientUid: 'admins',
          recipientRole: 'admin',
          type: 'new_application',
          title: 'New Application Received',
          message: `${params.studentName} applied for ${params.opportunity.title} (${params.opportunity.companyName}).`,
          relatedId: applicationId,
        }),
      ]);
    }

    return { applicationId, applicationCode };
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_APPLICATION') {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, `applications/${applicationId}`);
  }
}

export async function updateApplicationStatusByAdmin(
  application: Application,
  status: ApplicationStatus,
  adminNotes: string
): Promise<void> {
  const safeId = sanitizeId(application.applicationId);
  try {
    await updateDoc(doc(db, 'applications', safeId), {
      status,
      adminNotes: clampText(adminNotes, 1500),
      updatedAt: serverTimestamp(),
    });

    const label = APPLICATION_STATUS_LABELS[status];
    await createNotification({
      recipientUid: application.studentUid,
      recipientRole: 'student',
      type: `application_${status}`,
      title: `Application ${label}`,
      message: `Your application for ${application.opportunityTitle} at ${application.companyName} is now marked as ${label}.`,
      relatedId: safeId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `applications/${safeId}`);
  }
}

// ============================================================================
// SAVED OPPORTUNITIES
// ============================================================================
export async function toggleSavedOpportunity(
  studentUid: string,
  opportunity: Opportunity,
  currentlySaved: boolean
): Promise<boolean> {
  const safeUid = sanitizeId(studentUid);
  const safeOppId = sanitizeId(opportunity.opportunityId);
  const savedId = sanitizeId(`${safeUid}__${safeOppId}`);
  const savedRef = doc(db, 'savedOpportunities', savedId);

  try {
    if (currentlySaved) {
      await deleteDoc(savedRef);
      return false;
    } else {
      const isDemoOpp = Boolean(opportunity.isDemo || opportunity.status === 'demo_approved');
      await setDoc(savedRef, {
        savedId,
        studentUid: safeUid,
        opportunityId: safeOppId,
        opportunityTitle: clampText(opportunity.title, 180),
        companyName: clampText(opportunity.companyName, 160),
        category: opportunity.category,
        location: clampText(opportunity.location, 140),
        deadline: clampText(opportunity.deadline, 30),
        isDemo: isDemoOpp,
        ...(isDemoOpp ? { demoLabel: 'DEMO DATA' } : {}),
        createdAt: serverTimestamp(),
      });
      return true;
    }
  } catch (error) {
    handleFirestoreError(
      error,
      currentlySaved ? OperationType.DELETE : OperationType.CREATE,
      `savedOpportunities/${savedId}`
    );
  }
}

export async function removeSavedById(savedId: string): Promise<void> {
  const safeId = sanitizeId(savedId);
  try {
    await deleteDoc(doc(db, 'savedOpportunities', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `savedOpportunities/${safeId}`);
  }
}

// ============================================================================
// CAMPUS EVENTS
// ============================================================================
export async function saveCampusEvent(
  adminUid: string,
  data: Omit<CampusEvent, 'eventId' | 'createdBy' | 'createdAt' | 'updatedAt'> & { eventId?: string }
): Promise<string> {
  const isEdit = Boolean(data.eventId);
  const eventId = data.eventId ? sanitizeId(data.eventId) : generateSafeId('evt');
  const evtRef = doc(db, 'events', eventId);

  const payload = stripUndefined({
    title: clampText(data.title, 180),
    eventType: data.eventType,
    organizer: clampText(data.organizer, 140),
    description: clampText(data.description, 3000),
    venue: clampText(data.venue, 160),
    location: clampText(data.location, 140),
    mode: data.mode,
    eventDate: clampText(data.eventDate, 30),
    eventTime: clampText(data.eventTime, 40),
    registrationDeadline: clampText(data.registrationDeadline, 30),
    capacity:
      data.capacity !== undefined && Number(data.capacity) >= 1
        ? Math.min(50000, Number(data.capacity))
        : undefined,
    registrationLink: data.registrationLink ? clampText(data.registrationLink, 400) : '',
    bannerUrl: data.bannerUrl ? clampText(data.bannerUrl, 1000) : '',
    status: data.status,
    updatedAt: serverTimestamp(),
  });

  try {
    if (isEdit) {
      await updateDoc(evtRef, payload);
    } else {
      await setDoc(evtRef, {
        ...payload,
        eventId,
        createdBy: sanitizeId(adminUid),
        createdAt: serverTimestamp(),
      });
    }
    invalidateMarketplaceCache();
    return eventId;
  } catch (error) {
    handleFirestoreError(
      error,
      isEdit ? OperationType.UPDATE : OperationType.CREATE,
      `events/${eventId}`
    );
  }
}

export async function deleteCampusEvent(eventId: string): Promise<void> {
  const safeId = sanitizeId(eventId);
  try {
    await deleteDoc(doc(db, 'events', safeId));
    invalidateMarketplaceCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${safeId}`);
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================
export async function createNotification(params: {
  recipientUid: string;
  recipientRole: UserRole;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
}): Promise<void> {
  const notificationId = generateSafeId('notif');
  try {
    await setDoc(
      doc(db, 'notifications', notificationId),
      stripUndefined({
        notificationId,
        recipientUid: sanitizeId(params.recipientUid),
        recipientRole: params.recipientRole,
        type: clampText(params.type, 60),
        title: clampText(params.title, 180),
        message: clampText(params.message, 600),
        relatedId: params.relatedId ? sanitizeId(params.relatedId) : undefined,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    );
  } catch (error) {
    console.warn('Notification write skipped:', error);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const safeId = sanitizeId(notificationId);
  try {
    await updateDoc(doc(db, 'notifications', safeId), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${safeId}`);
  }
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const batch = writeBatch(db);
    ids.slice(0, 50).forEach((id) => {
      batch.update(doc(db, 'notifications', sanitizeId(id)), { isRead: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

// ============================================================================
// SAFETY REPORTS
// ============================================================================
export async function submitOpportunityReport(params: {
  opportunity: Opportunity;
  studentUid: string;
  studentName: string;
  reason: ReportReason;
  details: string;
}): Promise<string> {
  const reportId = generateSafeId('rep');
  try {
    await setDoc(doc(db, 'reports', reportId), {
      reportId,
      opportunityId: sanitizeId(params.opportunity.opportunityId),
      opportunityTitle: clampText(params.opportunity.title, 180),
      companyName: clampText(params.opportunity.companyName, 160),
      reportedByUid: sanitizeId(params.studentUid),
      reportedByName: clampText(params.studentName, 120),
      reason: params.reason,
      details: clampText(params.details, 1500),
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await createNotification({
      recipientUid: 'admins',
      recipientRole: 'admin',
      type: 'opportunity_reported',
      title: 'Listing Reported by Student',
      message: `${params.opportunity.title} (${params.opportunity.companyName}) was flagged for review.`,
      relatedId: reportId,
    });

    return reportId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${reportId}`);
  }
}

export async function updateReportByAdmin(
  reportId: string,
  status: ReportStatus,
  adminActionNote: string
): Promise<void> {
  const safeId = sanitizeId(reportId);
  try {
    await updateDoc(doc(db, 'reports', safeId), {
      status,
      adminActionNote: clampText(adminActionNote, 1000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${safeId}`);
  }
}

// ============================================================================
// ADMIN STARTER CATALOG SEEDER (DEHRADUN, UTTARAKHAND)
// Only invocable by an authorized administrator from the Admin Dashboard.
// ============================================================================
export async function seedDehradunStarterCatalog(adminUid: string): Promise<void> {
  const existingOpps = await getDocs(query(collection(db, 'opportunities'), where('status', '==', 'verified')));
  if (existingOpps.size >= 4) {
    return;
  }

  const safeAdmin = sanitizeId(adminUid);

  const companies = [
    {
      companyId: 'comp_doon_tech',
      name: 'Doon Valley Systems',
      industry: 'Software & Cloud Engineering',
      description:
        'Dehradun-based engineering studio building web platforms, geospatial tools, and student-friendly cloud workflows for regional enterprises.',
      website: 'https://doonvalleysystems.example.in',
      location: 'IT Park, Sahastradhara Road, Dehradun',
      verificationStatus: 'verified' as const,
      contactName: 'Raghav Negi',
      contactEmail: 'careers@doonvalleysystems.example.in',
      contactPhone: '+91 135 270 4100',
    },
    {
      companyId: 'comp_himalayan_fin',
      name: 'Shivalik FinTech Advisors',
      industry: 'Financial Services & Analytics',
      description:
        'Advisory and financial analytics firm partnering with SMEs across Uttarakhand on digital bookkeeping, credit analysis, and market research.',
      website: 'https://shivalikfintech.example.in',
      location: 'Rajpur Road, Dehradun',
      verificationStatus: 'verified' as const,
      contactName: 'Meera Rawat',
      contactEmail: 'hr@shivalikfintech.example.in',
      contactPhone: '+91 135 274 8890',
    },
    {
      companyId: 'comp_uttarakhand_green',
      name: 'Garhwal CleanEnergy Labs',
      industry: 'CleanTech & Sustainability',
      description:
        'Applied research group deploying solar micro-grids and IoT environmental telemetry across hill campuses and rural clusters in Uttarakhand.',
      website: 'https://garhwalcleanenergy.example.in',
      location: 'Prem Nagar, Dehradun',
      verificationStatus: 'verified' as const,
      contactName: 'Dr. Ankur Joshi',
      contactEmail: 'internships@garhwalcleanenergy.example.in',
      contactPhone: '+91 135 277 1920',
    },
    {
      companyId: 'comp_pinecrest_media',
      name: 'Pinecrest Digital Collective',
      industry: 'Marketing & Product Design',
      description:
        'Independent brand strategy, content systems, and UX research studio serving emerging D2C and education startups across North India.',
      website: 'https://pinecrestdigital.example.in',
      location: 'Jakhan, Dehradun',
      verificationStatus: 'verified' as const,
      contactName: 'Niharika Bisht',
      contactEmail: 'talent@pinecrestdigital.example.in',
      contactPhone: '+91 135 273 5510',
    },
  ];

  // Commit companies first so opportunity foreign-key checks pass cleanly
  for (const comp of companies) {
    await saveCompany(safeAdmin, comp);
  }

  const now = new Date();
  const addDays = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const starterOpps: Array<Omit<Opportunity, 'createdBy' | 'createdAt' | 'updatedAt'>> = [
    {
      opportunityId: 'opp_frontend_intern_ddn',
      title: 'Frontend Engineering Intern (React & TypeScript)',
      companyId: 'comp_doon_tech',
      companyName: 'Doon Valley Systems',
      companyLogoUrl: '',
      industry: 'Software & Cloud Engineering',
      category: 'internship',
      description:
        'Work alongside senior product engineers at IT Park Dehradun to build accessible web dashboards, interactive data views, and responsive student portals using React, TypeScript, and Tailwind CSS.',
      responsibilities: [
        'Build reusable UI components and client-side workflows in React and TypeScript',
        'Collaborate with designers to ship responsive layouts across desktop and mobile viewports',
        'Write clean unit tests and participate in weekly code reviews',
      ],
      requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'Git', 'REST APIs'],
      eligibility: 'Open to 2nd, 3rd, and final year undergraduate students from B.Tech, BCA, or B.Sc Computer Science.',
      educationQualification: 'B.Tech / BCA / B.Sc (CS/IT)',
      workMode: 'hybrid',
      location: 'Dehradun, Uttarakhand',
      isPaid: true,
      stipendMin: 12000,
      stipendMax: 16000,
      stipendLabel: 'INR 12,000 - 16,000 / month',
      duration: '3 Months',
      openings: 4,
      deadline: addDays(14),
      requiredDocuments: ['Updated Resume (PDF)', 'GitHub or Portfolio Link'],
      additionalQuestions: ['Share a link to one frontend project you built and explain your role.'],
      allowReapply: false,
      status: 'verified',
      isVerified: true,
    },
    {
      opportunityId: 'opp_fin_research_intern',
      title: 'MBA Business & Financial Research Intern',
      companyId: 'comp_himalayan_fin',
      companyName: 'Shivalik FinTech Advisors',
      companyLogoUrl: '',
      industry: 'Financial Services & Analytics',
      category: 'internship',
      description:
        'Assist the advisory desk in evaluating SME financial statements, drafting sector briefs for Uttarakhand enterprises, and preparing client presentation models.',
      responsibilities: [
        'Analyze quarterly financial indicators and build Excel valuation sheets',
        'Prepare concise market research notes on regional tourism and logistics sectors',
        'Support client onboarding reviews with senior analysts',
      ],
      requiredSkills: ['Financial Modeling', 'Excel', 'Market Research', 'Business Writing'],
      eligibility: 'MBA, BBA, or B.Com (Hons) students with strong quantitative and writing fundamentals.',
      educationQualification: 'MBA / BBA / B.Com',
      workMode: 'on_site',
      location: 'Rajpur Road, Dehradun',
      isPaid: true,
      stipendMin: 10000,
      stipendMax: 14000,
      stipendLabel: 'INR 10,000 - 14,000 / month',
      duration: '2 Months',
      openings: 3,
      deadline: addDays(6),
      requiredDocuments: ['Updated Resume (PDF)', 'College ID Verification'],
      additionalQuestions: ['Which financial metrics do you inspect first when evaluating a small business?'],
      allowReapply: false,
      status: 'verified',
      isVerified: true,
    },
    {
      opportunityId: 'opp_parttime_campus_content',
      title: 'Part-Time UX & Content Research Associate',
      companyId: 'comp_pinecrest_media',
      companyName: 'Pinecrest Digital Collective',
      companyLogoUrl: '',
      industry: 'Marketing & Product Design',
      category: 'part_time',
      description:
        'Flexible 15 hours/week student role structured around college lecture schedules. Conduct usability interviews, organize editorial calendars, and support digital campaigns.',
      responsibilities: [
        'Run structured 20-minute student usability interviews and summarize findings',
        'Draft clear product copy and landing page briefs in Figma and Notion',
        'Coordinate weekly deliverables remotely with the Dehradun design team',
      ],
      requiredSkills: ['UX Research', 'Content Strategy', 'Figma', 'Communication'],
      eligibility: 'Undergraduate or postgraduate students able to commit 15 hours per week.',
      educationQualification: 'Any Graduate / Postgraduate Degree',
      workMode: 'remote',
      location: 'Remote (Dehradun Preference)',
      isPaid: true,
      stipendMin: 8000,
      stipendMax: 10000,
      stipendLabel: 'INR 8,000 - 10,000 / month',
      duration: '4 Months',
      openings: 2,
      deadline: addDays(11),
      requiredDocuments: ['Updated Resume (PDF)', 'Writing or Design Sample'],
      additionalQuestions: ['How many hours per week can you commit alongside your semester timetable?'],
      allowReapply: false,
      status: 'verified',
      isVerified: true,
    },
    {
      opportunityId: 'opp_live_project_solar_iot',
      title: 'Live Project: Campus Solar Telemetry Dashboard',
      companyId: 'comp_uttarakhand_green',
      companyName: 'Garhwal CleanEnergy Labs',
      companyLogoUrl: '',
      industry: 'CleanTech & Sustainability',
      category: 'live_project',
      description:
        'Six-week mentored industry live project focused on visualizing live inverter generation logs and battery health metrics from hill-region solar installations.',
      responsibilities: [
        'Clean and aggregate CSV and JSON sensor streams using Python or TypeScript',
        'Design clear daily energy yield charts and anomaly alerts',
        'Present final sprint demo to engineering mentors for project completion certification',
      ],
      requiredSkills: ['Python', 'Data Analysis', 'SQL', 'Dashboard Design'],
      eligibility: 'Students from Engineering, Data Science, or Applied Sciences seeking hands-on project portfolio work.',
      educationQualification: 'B.Tech / M.Sc / MCA / BCA',
      workMode: 'hybrid',
      location: 'Prem Nagar, Dehradun',
      isPaid: true,
      stipendMin: 6000,
      stipendMax: 6000,
      stipendLabel: 'INR 6,000 Project Honorarium',
      duration: '6 Weeks',
      openings: 5,
      deadline: addDays(5),
      requiredDocuments: ['Updated Resume (PDF)'],
      additionalQuestions: ['Describe your experience working with time-series datasets or IoT logs.'],
      allowReapply: false,
      status: 'verified',
      isVerified: true,
    },
    {
      opportunityId: 'opp_entry_junior_analyst',
      title: 'Graduate Operations & Data Analyst (Entry-Level)',
      companyId: 'comp_doon_tech',
      companyName: 'Doon Valley Systems',
      companyLogoUrl: '',
      industry: 'Software & Cloud Engineering',
      category: 'entry_level',
      description:
        'Full-time entry-level role for graduating 2026/2027 students transitioning into product operations, client reporting, and SQL-backed workflow monitoring.',
      responsibilities: [
        'Maintain weekly operational KPI dashboards and reconcile service tickets',
        'Write structured SQL queries to diagnose customer onboarding bottlenecks',
        'Document standard operating playbooks for newly onboarded enterprise accounts',
      ],
      requiredSkills: ['SQL', 'Excel', 'Data Analysis', 'Problem Solving'],
      eligibility: 'Final-year students and recent graduates available to join within 45 days.',
      educationQualification: 'B.Tech / MBA / BBA / B.Sc',
      workMode: 'on_site',
      location: 'IT Park, Dehradun',
      isPaid: true,
      stipendMin: 35000,
      stipendMax: 42000,
      stipendLabel: 'INR 4.2 - 5.0 LPA',
      duration: 'Full-Time',
      openings: 2,
      deadline: addDays(21),
      requiredDocuments: ['Updated Resume (PDF)', 'Latest Semester Marksheet'],
      additionalQuestions: [],
      allowReapply: false,
      status: 'verified',
      isVerified: true,
    },
    {
      opportunityId: 'opp_pending_review_demo',
      title: 'Cloud DevOps Apprenticeship Cohort (Pending Verification)',
      companyId: 'comp_uttarakhand_green',
      companyName: 'Garhwal CleanEnergy Labs',
      companyLogoUrl: '',
      industry: 'CleanTech & Sustainability',
      category: 'skill_building',
      description:
        'Hands-on 4-week guided skill-building cohort covering Linux fundamentals, Docker container packaging, and automated CI pipelines for Uttarakhand engineering students.',
      responsibilities: [
        'Complete weekly containerized deployment lab exercises',
        'Pair with mentors on real staging infrastructure reviews',
      ],
      requiredSkills: ['Linux', 'Docker', 'Git', 'Cloud Fundamentals'],
      eligibility: 'Open to pre-final and final year students across Dehradun colleges.',
      educationQualification: 'B.Tech / MCA / BCA',
      workMode: 'remote',
      location: 'Dehradun / Remote',
      isPaid: false,
      stipendMin: 0,
      stipendMax: 0,
      stipendLabel: 'Unpaid Skill Cohort',
      duration: '4 Weeks',
      openings: 20,
      deadline: addDays(18),
      requiredDocuments: ['Updated Resume (PDF)'],
      additionalQuestions: [],
      allowReapply: false,
      status: 'pending',
      isVerified: false,
    },
  ];

  for (const opp of starterOpps) {
    await saveOpportunity(safeAdmin, opp);
  }

  const starterEvents: Array<Omit<CampusEvent, 'createdBy' | 'createdAt' | 'updatedAt'>> = [
    {
      eventId: 'evt_dehradun_resume_clinic',
      title: 'Dehradun Inter-Campus Resume & Portfolio Review Clinic',
      eventType: 'placement_prep',
      organizer: 'CampusConnect Career Services',
      description:
        'Bring your current resume and project links for structured 1-on-1 feedback from hiring managers across Dehradun IT Park and regional finance firms.',
      venue: 'Seminar Hall B, Academic Innovation Center',
      location: 'Rajpur Road, Dehradun',
      mode: 'hybrid',
      eventDate: addDays(9),
      eventTime: '11:00 AM - 2:00 PM IST',
      registrationDeadline: addDays(7),
      capacity: 120,
      registrationLink: '',
      bannerUrl: CAMPUS_ASSETS.eventWorkshop,
      status: 'upcoming',
    },
    {
      eventId: 'evt_live_project_sprint',
      title: 'Industry Live-Project Kickoff: Building Production Web Apps',
      eventType: 'career_workshop',
      organizer: 'Doon Valley Systems x CampusConnect',
      description:
        'Practical 3-hour workshop walking college students through scoping real client specs, Git pull request etiquette, and preparing for technical internship screenings.',
      venue: 'IT Park Innovation Auditorium',
      location: 'Sahastradhara Road, Dehradun',
      mode: 'on_site',
      eventDate: addDays(15),
      eventTime: '3:00 PM - 6:00 PM IST',
      registrationDeadline: addDays(12),
      capacity: 80,
      registrationLink: '',
      bannerUrl: CAMPUS_ASSETS.liveProject,
      status: 'upcoming',
    },
  ];

  for (const evt of starterEvents) {
    await saveCampusEvent(safeAdmin, evt);
  }
}
