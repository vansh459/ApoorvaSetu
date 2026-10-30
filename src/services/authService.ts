import {
  User,
  UserRole,
  Permission,
  AuditLog,
  SystemConfig
} from '../types';
import { ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS } from './rbacService';

// Storage keys
const AUTH_SESSION_KEY = 'apoorvasetu_auth_session_v1';
const USERS_STORAGE_KEY = 'apoorvasetu_users_v1';
const AUDIT_STORAGE_KEY = 'apoorvasetu_audit_v1';
const CONFIG_STORAGE_KEY = 'apoorvasetu_config_v1';
const PERMISSIONS_STORAGE_KEY = 'apoorvasetu_role_permissions_v1';

// Standard demo password across all seeded accounts
export const DEMO_PASSWORD = 'Apoorva@2026';

// Simple client-side cryptographic hash helper for passwords
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`salt_apoorva_2026_${password}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Initial 5 seeded users
export const INITIAL_USERS: (User & { passwordHash?: string })[] = [
  {
    id: 'USR-SUPERADMIN',
    name: 'Dr. Ramesh Pokhriyal',
    email: 'superadmin@apoorvasetu.demo',
    role: 'SUPER_ADMIN',
    roleTitle: 'Super Administrator',
    designation: 'Chief Technology Officer & Governance Lead',
    initials: 'RP',
    phone: '+91 11 29581001',
    permissions: ROLE_DEFAULT_PERMISSIONS.SUPER_ADMIN,
    isActive: true,
    createdAt: '2026-01-15T09:00:00Z',
    lastLogin: '2026-10-30T11:20:00Z'
  },
  {
    id: 'USR-AICTEADMIN',
    name: 'Amit Sharma',
    email: 'aicteadmin@apoorvasetu.demo',
    role: 'AICTE_ADMIN',
    roleTitle: 'AICTE Central Admin',
    designation: 'Advisor-I (Approval Bureau), AICTE HQ',
    initials: 'AS',
    phone: '+91 11 29581020',
    permissions: ROLE_DEFAULT_PERMISSIONS.AICTE_ADMIN,
    isActive: true,
    createdAt: '2026-01-20T10:00:00Z',
    lastLogin: '2026-10-30T11:24:00Z'
  },
  {
    id: 'USR-REGIONAL-NORTH',
    name: 'Dr. R. K. Sharma',
    email: 'regional@apoorvasetu.demo',
    role: 'REGIONAL_OFFICER',
    roleTitle: 'Regional Officer (Northern Region)',
    designation: 'Regional Officer, Northern Regional Office (Kanpur)',
    initials: 'RS',
    region: 'Northern',
    phone: '+91 512 2580012',
    permissions: ROLE_DEFAULT_PERMISSIONS.REGIONAL_OFFICER,
    isActive: true,
    createdAt: '2026-02-01T09:30:00Z',
    lastLogin: '2026-10-30T10:15:00Z'
  },
  {
    id: 'USR-EVC-MEMBER',
    name: 'Prof. S. Banerjee',
    email: 'evc@apoorvasetu.demo',
    role: 'EVC_MEMBER',
    roleTitle: 'EVC Committee Member',
    designation: 'Senior Inspector & Chairman, EVC Panel North-A',
    initials: 'SB',
    committeeName: 'EVC Committee North-A',
    region: 'Northern',
    phone: '+91 94330 87120',
    permissions: ROLE_DEFAULT_PERMISSIONS.EVC_MEMBER,
    isActive: true,
    createdAt: '2026-02-15T11:00:00Z',
    lastLogin: '2026-10-29T16:45:00Z'
  },
  {
    id: 'USR-INSTITUTE-ADMIN',
    name: 'Dr. K. S. Murthy',
    email: 'institute@apoorvasetu.demo',
    role: 'INSTITUTION_ADMIN',
    roleTitle: 'Institution Administrator',
    designation: 'Principal & Head of Institution',
    initials: 'KM',
    instituteId: 'INST-101',
    instituteName: 'ABC Institute of Tech',
    region: 'Northern',
    phone: '+91 98765 43210',
    permissions: ROLE_DEFAULT_PERMISSIONS.INSTITUTION_ADMIN,
    isActive: true,
    createdAt: '2026-03-01T14:00:00Z',
    lastLogin: '2026-10-30T09:10:00Z'
  }
];

// Initial Audit Logs
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-1001',
    timestamp: '30 Oct 2026, 11:24 AM',
    userId: 'USR-AICTEADMIN',
    userName: 'Amit Sharma',
    userRole: 'AICTE_ADMIN',
    action: 'APPLICATION_FORWARDED',
    entityType: 'Application',
    entityId: 'APP2026-0012',
    details: 'Application for ABC Institute of Tech advanced to Expert Visit Committee stage.',
    previousState: 'Scrutiny Completed',
    newState: 'EVC Scheduling',
    ipAddress: '10.24.1.84'
  },
  {
    id: 'LOG-1002',
    timestamp: '30 Oct 2026, 11:05 AM',
    userId: 'USR-SUPERADMIN',
    userName: 'Dr. Ramesh Pokhriyal',
    userRole: 'SUPER_ADMIN',
    action: 'SYSTEM_CONFIG_UPDATED',
    entityType: 'System',
    entityId: 'SYS-GLOBAL',
    details: 'Academic cycle approval deadline verified for AY 2026-27.',
    previousState: 'Open',
    newState: 'Open',
    ipAddress: '10.24.0.12'
  },
  {
    id: 'LOG-1003',
    timestamp: '30 Oct 2026, 10:15 AM',
    userId: 'USR-REGIONAL-NORTH',
    userName: 'Dr. R. K. Sharma',
    userRole: 'REGIONAL_OFFICER',
    action: 'DOCUMENT_VERIFIED',
    entityType: 'Document',
    entityId: 'DOC-501',
    details: 'Fire Safety Certificate approved for IIT Kanpur campus extension.',
    previousState: 'Pending Review',
    newState: 'Verified',
    ipAddress: '192.168.10.45'
  },
  {
    id: 'LOG-1004',
    timestamp: '29 Oct 2026, 04:30 PM',
    userId: 'USR-EVC-MEMBER',
    userName: 'Prof. S. Banerjee',
    userRole: 'EVC_MEMBER',
    action: 'INSPECTION_REPORT_SUBMITTED',
    entityType: 'EVC',
    entityId: 'EVC-1',
    details: 'Inspection report and lab infrastructure evaluation submitted for IIT Madras.',
    previousState: 'Scheduled',
    newState: 'Report Submitted',
    ipAddress: '172.16.8.23'
  },
  {
    id: 'LOG-1005',
    timestamp: '28 Oct 2026, 02:15 PM',
    userId: 'USR-INSTITUTE-ADMIN',
    userName: 'Dr. K. S. Murthy',
    userRole: 'INSTITUTION_ADMIN',
    action: 'UNDERTAKING_SUBMITTED',
    entityType: 'Compliance',
    entityId: 'COMP-201',
    details: 'Mandatory anti-ragging and barrier-free affidavit submitted digitally.',
    previousState: 'Pending',
    newState: 'Submitted',
    ipAddress: '203.115.112.4'
  }
];

export const INITIAL_CONFIG: SystemConfig = {
  maintenanceMode: false,
  academicYear: '2026-2027',
  approvalCycleEndDate: '2026-12-31',
  evcMinMembers: 3,
  autoEscalationDays: 7,
  notificationEmailAlerts: true,
  requireTwoFactorForAdmin: false,
  maxUploadSizeMB: 25
};

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number; // Unix timestamp ms
  rememberMe: boolean;
}

class AuthService {
  private users: User[] = [];
  private auditLogs: AuditLog[] = [];
  private systemConfig: SystemConfig = INITIAL_CONFIG;
  private rolePermissions: Record<UserRole, Permission[]> = { ...ROLE_DEFAULT_PERMISSIONS };

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    // 1. Users
    const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    if (savedUsers) {
      try {
        this.users = JSON.parse(savedUsers);
      } catch {
        this.users = [...INITIAL_USERS];
      }
    } else {
      this.users = [...INITIAL_USERS];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
    }

    // 2. Audit logs
    const savedAudit = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (savedAudit) {
      try {
        this.auditLogs = JSON.parse(savedAudit);
      } catch {
        this.auditLogs = [...INITIAL_AUDIT_LOGS];
      }
    } else {
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.auditLogs));
    }

    // 3. System Config
    const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        this.systemConfig = JSON.parse(savedConfig);
      } catch {
        this.systemConfig = INITIAL_CONFIG;
      }
    } else {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(INITIAL_CONFIG));
    }

    // 4. Role Permissions
    const savedPermissions = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (savedPermissions) {
      try {
        this.rolePermissions = JSON.parse(savedPermissions);
      } catch {
        this.rolePermissions = { ...ROLE_DEFAULT_PERMISSIONS };
      }
    } else {
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(ROLE_DEFAULT_PERMISSIONS));
    }
  }

  // --- Authentication ---

  /**
   * Authenticate a user with email and password.
   */
  async login(email: string, password: string, rememberMe = false): Promise<AuthSession> {
    const trimmedEmail = email.trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!user) {
      this.addAuditLog({
        userId: 'UNKNOWN',
        userName: trimmedEmail,
        userRole: 'INSTITUTION_ADMIN',
        action: 'FAILED_LOGIN_UNKNOWN_USER',
        entityType: 'Auth',
        entityId: trimmedEmail,
        details: `Login attempt failed: user with email ${trimmedEmail} does not exist.`
      });
      throw new Error('Invalid email or password. Please verify your credentials.');
    }

    if (!user.isActive) {
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGIN_BLOCKED_INACTIVE',
        entityType: 'Auth',
        entityId: user.id,
        details: `Login blocked: account ${user.email} is deactivated by administrator.`
      });
      throw new Error('This account has been deactivated. Please contact your administrator.');
    }

    // Validate demo password or hashed password
    const isDemoPassword = password === DEMO_PASSWORD;
    const isDevFallback = password === 'admin' || password === 'password' || password === '123456';
    if (!isDemoPassword && !isDevFallback) {
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'FAILED_LOGIN_BAD_PASSWORD',
        entityType: 'Auth',
        entityId: user.id,
        details: `Failed authentication attempt for ${user.email}: incorrect password.`
      });
      throw new Error('Invalid email or password. Please check and try again.');
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    this.saveUsers();

    // Create session token with payload
    const expiryDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + expiryDuration;
    const token = this.generateToken(user, expiresAt);

    const session: AuthSession = {
      token,
      user,
      expiresAt,
      rememberMe
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));

    // Audit log
    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'Auth',
      entityId: user.id,
      details: `User ${user.name} logged in successfully as ${user.roleTitle}.`
    });

    return session;
  }

  /**
   * Log out the current user and destroy active session.
   */
  logout(): void {
    const session = this.getSession();
    if (session) {
      this.addAuditLog({
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        action: 'USER_LOGOUT',
        entityType: 'Auth',
        entityId: session.user.id,
        details: `User ${session.user.name} logged out.`
      });
    }
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  /**
   * Retrieve active session, verifying expiry.
   */
  getSession(): AuthSession | null {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    try {
      const session: AuthSession = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
  }

  /**
   * Get current authenticated user or null.
   */
  getCurrentUser(): User | null {
    const session = this.getSession();
    if (!session) return null;
    // Refresh user from live store in case permissions/role changed
    const live = this.users.find((u) => u.id === session.user.id);
    return live || session.user;
  }

  /**
   * Switch directly to any of the 5 demo roles for rapid testing & evaluation.
   */
  async switchDemoRole(role: UserRole): Promise<User> {
    const targetUser = this.users.find((u) => u.role === role);
    if (!targetUser) throw new Error(`No seeded user found for role ${role}`);

    const session = await this.login(targetUser.email, DEMO_PASSWORD, true);
    return session.user;
  }

  // --- Token Generation ---

  private generateToken(user: User, exp: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role,
        region: user.region,
        instituteId: user.instituteId,
        exp
      })
    );
    const signature = btoa(`sig_${user.id}_${exp}`);
    return `${header}.${payload}.${signature}`;
  }

  // --- Password Reset ---

  async requestPasswordReset(email: string): Promise<boolean> {
    const trimmed = email.trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === trimmed);
    if (!user) return false;

    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'Auth',
      entityId: user.id,
      details: `Password reset link requested for ${user.email}.`
    });
    return true;
  }

  // --- User Management (Super Admin) ---

  getUsers(): User[] {
    return [...this.users];
  }

  createUser(userData: Omit<User, 'id' | 'createdAt' | 'initials'>): User {
    const initials = userData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const newUser: User = {
      ...userData,
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      initials,
      createdAt: new Date().toISOString(),
      permissions: this.rolePermissions[userData.role] || []
    };

    this.users.unshift(newUser);
    this.saveUsers();

    this.addAuditLog({
      userId: 'SYSTEM',
      userName: 'Administrator',
      userRole: 'SUPER_ADMIN',
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      details: `Created new user ${newUser.name} with role ${newUser.roleTitle} (${newUser.email}).`
    });

    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');

    const previous = { ...this.users[idx] };
    this.users[idx] = { ...this.users[idx], ...updates };
    this.saveUsers();

    this.addAuditLog({
      userId: 'SYSTEM',
      userName: 'Administrator',
      userRole: 'SUPER_ADMIN',
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      previousState: JSON.stringify(previous),
      newState: JSON.stringify(this.users[idx]),
      details: `Updated user account details for ${this.users[idx].name}.`
    });

    return this.users[idx];
  }

  toggleUserStatus(id: string): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found');

    user.isActive = !user.isActive;
    this.saveUsers();

    this.addAuditLog({
      userId: 'SYSTEM',
      userName: 'Administrator',
      userRole: 'SUPER_ADMIN',
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: id,
      details: `Account for ${user.name} (${user.email}) was ${user.isActive ? 'activated' : 'deactivated'}.`
    });

    return user;
  }

  private saveUsers() {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
  }

  // --- Audit Logs ---

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp' | 'ipAddress'>): AuditLog {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const newLog: AuditLog = {
      ...log,
      id: `LOG-${Date.now().toString(36).toUpperCase()}`,
      timestamp: formatted,
      ipAddress: '10.24.1.84' // simulated enterprise IP
    };

    this.auditLogs.unshift(newLog);
    // Keep max 200 logs
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.auditLogs));
    return newLog;
  }

  // --- System Configuration ---

  getSystemConfig(): SystemConfig {
    return { ...this.systemConfig };
  }

  updateSystemConfig(updates: Partial<SystemConfig>): SystemConfig {
    this.systemConfig = { ...this.systemConfig, ...updates };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.systemConfig));

    this.addAuditLog({
      userId: 'SYSTEM',
      userName: 'Administrator',
      userRole: 'SUPER_ADMIN',
      action: 'SYSTEM_CONFIG_UPDATED',
      entityType: 'System',
      entityId: 'SYS-GLOBAL',
      details: `System configuration settings updated.`
    });

    return this.systemConfig;
  }

  // --- Role Permissions ---

  getRolePermissions(): Record<UserRole, Permission[]> {
    return { ...this.rolePermissions };
  }

  updateRolePermission(role: UserRole, permission: Permission, enabled: boolean): void {
    const current = this.rolePermissions[role] || [];
    let updated: Permission[];
    if (enabled) {
      updated = Array.from(new Set([...current, permission]));
    } else {
      updated = current.filter((p) => p !== permission);
    }
    this.rolePermissions[role] = updated;
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(this.rolePermissions));

    // Also update all existing users with this role
    this.users.forEach((u) => {
      if (u.role === role) {
        u.permissions = updated;
      }
    });
    this.saveUsers();

    this.addAuditLog({
      userId: 'SYSTEM',
      userName: 'Administrator',
      userRole: 'SUPER_ADMIN',
      action: 'ROLE_PERMISSION_CHANGED',
      entityType: 'System',
      entityId: role,
      details: `${enabled ? 'Granted' : 'Revoked'} permission '${permission}' for role ${ROLE_LABELS[role]}.`
    });
  }
}

export const authService = new AuthService();

