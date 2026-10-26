/**
 * MEZON SPRINT OS - ADMIN GODMODE SHARED TYPES
 */

export interface AdminStats {
  users: {
    students: number;
    mentors: number;
    parents: number;
    admins: number;
    total: number;
  };
  cohorts: {
    grade8?: number;
    grade9: number;
    grade10: number;
    grade11: number;
  };
  slots: {
    total: number;
    done: number;
    migrated: number;
    dropped: number;
    pending: number;
    completionRate: number;
    migrationRate: number;
  };
  sprints: {
    total: number;
    weeksTotal: number;
    submittedRetrosTotal: number;
  };
  atRiskStudents: Array<{
    id: string;
    fullName: string;
    gradeLevel: number;
    email: string;
    username: string;
    migrationRate: number;
    flags: string[];
  }>;
}

export interface AdminUser {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  role: 'STUDENT' | 'MENTOR' | 'PARENT' | 'ADMIN';
  gradeLevel: number | null;
  isActive: boolean;
  sprintsCount: number;
  parents: Array<{ id: string; fullName: string; accessLevel: string }>;
  students: Array<{ id: string; fullName: string; accessLevel: string }>;
  createdAt: string;
}

export interface TimetableSlot {
  id: string;
  gradeLevel: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  orderIndex: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

export type TabType = 'analytics' | 'users' | 'register' | 'timetable' | 'audit' | 'system';
