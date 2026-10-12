/**
 * Sagar University Branding & Configuration
 * Centralized configuration for institutional brand names, logos, programs, and metadata.
 */

export const BRANDING = {
  UNIVERSITY_NAME: 'Sagar University',
  UNIVERSITY_SHORT_NAME: 'Sagar University',
  UNIVERSITY_NAME_LINE_1: 'SAGAR',
  UNIVERSITY_NAME_LINE_2: 'UNIVERSITY',
  UNIVERSITY_TAGLINE: 'Online',
  UNIVERSITY_INITIALS: 'SU',
  UNIVERSITY_SYSTEM_NAME: 'University Management System (UMS)',
  BROWSER_PAGE_TITLE: 'Sagar University - Online',
  ADMISSIONS_HEADLINE: 'Admissions Open For July 2026 Batch',
  FOOTER_COPYRIGHT: '© 2026 Sagar University • University Management System (UMS)',
  HELPLINE_EMAIL: 'admissions@dsuonline.com',
  OFFICIAL_WEBSITE: 'www.dsuonline.com',
  PROGRAMS: ['MBA', 'MCA', 'BBA', 'BCA', 'B.Com', 'B.Tech'] as const,
  PROGRAMS_DISPLAY: 'MBA | MCA | BBA | BCA | B.Com | B.Tech',
}

export type AcademicProgram = typeof BRANDING.PROGRAMS[number]
