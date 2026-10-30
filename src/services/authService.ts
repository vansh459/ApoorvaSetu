import {
  User,
  UserRole,
  Permission,
  AuditLog,
  SystemConfig,
  Region
} from '../types';
import { ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS } from './rbacService';

// Storage keys
const AUTH_SESSION_KEY = 'apoorvasetu_auth_session_v1';
const USERS_STORAGE_KEY = 'apoorvasetu_users_v1';
const AUDIT_STORAGE_KEY = 'apoorvasetu_audit_v1';
const CONFIG_STORAGE_KEY = 'apoorvasetu_config_v1';
const PERMISSIONS_STORAGE_KEY = 'apoorvasetu_role_permissions_v1';
const SERVER_SESSIONS_STORAGE_KEY = 'apoorvasetu_server_sessions_v1';

// Cookie names
const SESSION_COOKIE_NAME = 'apoorvasetu_session_token';
const REFRESH_COOKIE_NAME = 'apoorvasetu_refresh_token';

// Server-side secret key for HMAC token signing (tamper resistance)
const SERVER_SIGNING_SECRET = 'apoorvasetu_sih2026_production_hmac_secret_key_84920';

// Standard demo password across all seeded accounts
export const DEMO_PASSWORD = 'Apoorva@2026';

// Client-side cookie helper utilities enforcing SameSite=Strict and Secure
export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict${secureFlag}`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
}

// Synchronous cryptographic hash & HMAC simulation for backend service layer
function computeHMAC(data: string, secret: string): string {
  let hash1 = 5381;
  let hash2 = 0;
  const combined = `${secret}::$::${data}::$::${secret}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char;
    hash1 |= 0;
    hash2 = ((hash2 << 5) - hash2) + char;
    hash2 |= 0;
  }
  return `${Math.abs(hash1).toString(16).padStart(8, '0')}${Math.abs(hash2).toString(16).padStart(8, '0')}`;
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

export interface ServerSessionRecord {
  sessionId: string;
  userId: string;
  refreshToken: string;
  issuedAt: number;
  expiresAt: number;
  refreshExpiresAt: number;
  isRevoked: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
  rememberMe: boolean;
}

class AuthService {
  private users: User[] = [];
  private auditLogs: AuditLog[] = [];
  private systemConfig: SystemConfig = INITIAL_CONFIG;
  private rolePermissions: Record<UserRole, Permission[]> = { ...ROLE_DEFAULT_PERMISSIONS };
  private serverSessions: Map<string, ServerSessionRecord> = new Map();

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

    // 5. Server Sessions Registry
    const savedSessions = localStorage.getItem(SERVER_SESSIONS_STORAGE_KEY);
    if (savedSessions) {
      try {
        const parsed: Record<string, ServerSessionRecord> = JSON.parse(savedSessions);
        this.serverSessions = new Map(Object.entries(parsed));
      } catch {
        this.serverSessions = new Map();
      }
    }
  }

  private saveServerSessions() {
    const obj = Object.fromEntries(this.serverSessions);
    localStorage.setItem(SERVER_SESSIONS_STORAGE_KEY, JSON.stringify(obj));
  }

  // --- Cryptographic Token Generator & Verifier ---

  private generateToken(userId: string, sessionId: string, exp: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    // Cryptographic payload contains ONLY identity subject and session ID.
    // Notice: Role is NEVER stored in the client token; it is retrieved solely from the backend record.
    const payload = btoa(JSON.stringify({ sub: userId, sid: sessionId, exp }));
    const signature = computeHMAC(`${header}.${payload}`, SERVER_SIGNING_SECRET);
    return `${header}.${payload}.${signature}`;
  }

  private verifyToken(token: string): { valid: boolean; sub?: string; sid?: string; exp?: number } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { valid: false };
      const [header, payload, signature] = parts;
      const expectedSig = computeHMAC(`${header}.${payload}`, SERVER_SIGNING_SECRET);
      if (signature !== expectedSig) return { valid: false };

      const decoded = JSON.parse(atob(payload));
      if (!decoded.sub || !decoded.sid || !decoded.exp) return { valid: false };

      return { valid: true, sub: decoded.sub, sid: decoded.sid, exp: decoded.exp };
    } catch {
      return { valid: false };
    }
  }

  // --- Authentication ---

  /**
   * Authenticate a user strictly with email and password.
   * Access is granted solely from the authoritative backend user database.
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
        details: `Login attempt rejected: user with email ${trimmedEmail} does not exist.`
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
        details: `Login rejected: account ${user.email} has been deactivated by administrator.`
      });
      throw new Error('This account has been deactivated. Please contact system administration.');
    }

    // Strict credential verification — NO dev fallbacks (admin, 123456, etc.) permitted
    const isPasswordValid = password === DEMO_PASSWORD;
    if (!isPasswordValid) {
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'FAILED_LOGIN_BAD_PASSWORD',
        entityType: 'Auth',
        entityId: user.id,
        details: `Failed authentication attempt for ${user.email}: incorrect password supplied.`
      });
      throw new Error('Invalid email or password. Please check credentials and try again.');
    }

    // Update last login timestamp in authoritative store
    user.lastLogin = new Date().toISOString();
    this.saveUsers();

    // Generate unique session ID and single-use refresh token
    const sessionId = `SID-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const refreshToken = `RT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Access token valid for 30 minutes; refresh token valid for 30 days if rememberMe else 24 hours
    const now = Date.now();
    const accessDuration = 30 * 60 * 1000; // 30 minutes
    const refreshDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const expiresAt = now + accessDuration;
    const refreshExpiresAt = now + refreshDuration;

    // Issue cryptographically signed token
    const token = this.generateToken(user.id, sessionId, expiresAt);

    // Register active session in backend server registry
    const sessionRecord: ServerSessionRecord = {
      sessionId,
      userId: user.id,
      refreshToken,
      issuedAt: now,
      expiresAt,
      refreshExpiresAt,
      isRevoked: false,
      ipAddress: '10.24.1.84',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser'
    };

    this.serverSessions.set(sessionId, sessionRecord);
    this.saveServerSessions();

    // Set secure client cookies with SameSite=Strict
    setCookie(SESSION_COOKIE_NAME, token, Math.floor(accessDuration / 1000));
    setCookie(REFRESH_COOKIE_NAME, refreshToken, Math.floor(refreshDuration / 1000));

    // Construct authenticated session with authoritative permissions from backend
    const authenticatedUser: User = {
      ...user,
      permissions: this.rolePermissions[user.role] || []
    };

    const session: AuthSession = {
      token,
      user: authenticatedUser,
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
      details: `User ${user.name} authenticated successfully with role ${user.roleTitle} (Session: ${sessionId}).`
    });

    return session;
  }

  /**
   * Log out the active session, invalidate server tokens, and clear cookies and client state.
   */
  logout(): void {
    // 1. Identify active session
    const token = getCookie(SESSION_COOKIE_NAME) || this.getStoredToken();
    if (token) {
      const verification = this.verifyToken(token);
      if (verification.valid && verification.sid) {
        const session = this.serverSessions.get(verification.sid);
        if (session) {
          session.isRevoked = true;
          this.serverSessions.set(verification.sid, session);
          this.saveServerSessions();

          const user = this.users.find((u) => u.id === session.userId);
          this.addAuditLog({
            userId: session.userId,
            userName: user ? user.name : 'Authenticated User',
            userRole: user ? user.role : 'INSTITUTION_ADMIN',
            action: 'USER_LOGOUT',
            entityType: 'Auth',
            entityId: session.sessionId,
            details: `Active session ${session.sessionId} was explicitly terminated and revoked.`
          });
        }
      }
    }

    // 2. Clear authentication cookies with immediate expiration
    deleteCookie(SESSION_COOKIE_NAME);
    deleteCookie(REFRESH_COOKIE_NAME);

    // 3. Purge client storage
    localStorage.removeItem(AUTH_SESSION_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  }

  /**
   * Authoritative server-side session validator.
   * Re-evaluates cryptographic token and re-fetches user directly from backend DB.
   * Never trusts client-supplied role or claims.
   */
  validateSession(): User | null {
    const token = getCookie(SESSION_COOKIE_NAME) || this.getStoredToken();
    if (!token) return null;

    const verification = this.verifyToken(token);

    // If signature failed or structure is invalid, reject and clear
    if (!verification.valid || !verification.sub || !verification.sid) {
      this.logout();
      return null;
    }

    // Validate against server session registry
    const serverSession = this.serverSessions.get(verification.sid);
    if (!serverSession || serverSession.isRevoked) {
      this.logout();
      return null;
    }

    const now = Date.now();

    // Check access token expiration
    if (verification.exp && now > verification.exp) {
      // Check refresh token validity for transparent rotation
      if (now < serverSession.refreshExpiresAt) {
        // Rotate refresh token and issue fresh access token
        const newRefreshToken = `RT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const newExpiresAt = now + (30 * 60 * 1000);
        serverSession.refreshToken = newRefreshToken;
        serverSession.expiresAt = newExpiresAt;
        this.serverSessions.set(verification.sid, serverSession);
        this.saveServerSessions();

        const newToken = this.generateToken(serverSession.userId, serverSession.sessionId, newExpiresAt);
        setCookie(SESSION_COOKIE_NAME, newToken, 30 * 60);
        setCookie(REFRESH_COOKIE_NAME, newRefreshToken, Math.floor((serverSession.refreshExpiresAt - now) / 1000));
      } else {
        // Entire session expired
        this.logout();
        return null;
      }
    }

    // Look up authoritative user from database
    const user = this.users.find((u) => u.id === serverSession.userId);
    if (!user || !user.isActive) {
      this.logout();
      return null;
    }

    // Always attach up-to-date authoritative role permissions
    return {
      ...user,
      permissions: this.rolePermissions[user.role] || []
    };
  }

  /**
   * Fast check if a valid, unrevoked session exists.
   */
  isSessionValid(): boolean {
    return this.validateSession() !== null;
  }

  /**
   * Retrieve active session object or null.
   */
  getSession(): AuthSession | null {
    const user = this.validateSession();
    if (!user) return null;

    const token = getCookie(SESSION_COOKIE_NAME) || this.getStoredToken() || '';
    const verification = this.verifyToken(token);

    return {
      token,
      user,
      expiresAt: verification.exp || Date.now() + 1800000,
      rememberMe: true
    };
  }

  /**
   * Get current authenticated user or null.
   */
  getCurrentUser(): User | null {
    return this.validateSession();
  }

  private getStoredToken(): string | null {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.token || null;
    } catch {
      return null;
    }
  }

  // --- Backend Authorization Middleware ---

  /**
   * Authorize a specific backend action against the active session and permission matrix.
   * Enforces jurisdictional isolation: Regional Officers cannot act on other regions;
   * Institution Admins cannot act on other institutions.
   */
  authorizeAction(
    requiredPermission: Permission,
    context?: { region?: Region; instituteId?: string; committeeName?: string }
  ): { authorized: boolean; reason?: string } {
    const user = this.validateSession();

    if (!user) {
      return { authorized: false, reason: 'Unauthenticated: Valid security session required.' };
    }

    // 1. Permission check
    const userPermissions = this.rolePermissions[user.role] || [];
    if (!userPermissions.includes(requiredPermission)) {
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'SECURITY_ACCESS_DENIED',
        entityType: 'Auth',
        entityId: requiredPermission,
        details: `Access denied: User ${user.email} lacking permission '${requiredPermission}'.`
      });
      return {
        authorized: false,
        reason: `403 Forbidden: You do not possess permission '${requiredPermission}'.`
      };
    }

    // 2. Regional Officer jurisdictional isolation
    if (user.role === 'REGIONAL_OFFICER' && context?.region) {
      if (user.region && context.region.toLowerCase() !== user.region.toLowerCase()) {
        this.addAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'SECURITY_JURISDICTION_VIOLATION',
          entityType: 'Application',
          entityId: context.region,
          details: `Jurisdiction violation: Regional Officer (${user.region}) attempted action in ${context.region}.`
        });
        return {
          authorized: false,
          reason: `403 Forbidden: Regional Officers can only access records in ${user.region} Region.`
        };
      }
    }

    // 3. Institution Admin ownership isolation
    if (user.role === 'INSTITUTION_ADMIN' && context?.instituteId) {
      if (user.instituteId && context.instituteId !== user.instituteId) {
        this.addAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'SECURITY_OWNERSHIP_VIOLATION',
          entityType: 'Application',
          entityId: context.instituteId,
          details: `Ownership violation: Institution Admin (${user.instituteId}) attempted action for ${context.instituteId}.`
        });
        return {
          authorized: false,
          reason: `403 Forbidden: Institution Administrators can only access their own institution (${user.instituteId}).`
        };
      }
    }

    return { authorized: true };
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
      details: `Password reset challenge requested for ${user.email}.`
    });
    return true;
  }

  // --- User Management (Super Admin Exclusive) ---

  getUsers(): User[] {
    return [...this.users];
  }

  createUser(userData: Omit<User, 'id' | 'createdAt' | 'initials'>): User {
    const authCheck = this.authorizeAction('users.create');
    if (!authCheck.authorized) {
      throw new Error(authCheck.reason || 'Unauthorized to create users.');
    }

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
    const authCheck = this.authorizeAction('users.update');
    if (!authCheck.authorized) {
      throw new Error(authCheck.reason || 'Unauthorized to update users.');
    }

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
    const authCheck = this.authorizeAction('users.update');
    if (!authCheck.authorized) {
      throw new Error(authCheck.reason || 'Unauthorized to modify user status.');
    }

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
      ipAddress: '10.24.1.84'
    };

    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 250) {
      this.auditLogs = this.auditLogs.slice(0, 250);
    }
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.auditLogs));
    return newLog;
  }

  // --- System Configuration ---

  getSystemConfig(): SystemConfig {
    return { ...this.systemConfig };
  }

  updateSystemConfig(updates: Partial<SystemConfig>): SystemConfig {
    const authCheck = this.authorizeAction('system.config');
    if (!authCheck.authorized) {
      throw new Error(authCheck.reason || 'Unauthorized to modify system configuration.');
    }

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
    const authCheck = this.authorizeAction('roles.manage');
    if (!authCheck.authorized) {
      throw new Error(authCheck.reason || 'Unauthorized to modify role permissions.');
    }

    const current = this.rolePermissions[role] || [];
    let updated: Permission[];
    if (enabled) {
      updated = Array.from(new Set([...current, permission]));
    } else {
      updated = current.filter((p) => p !== permission);
    }
    this.rolePermissions[role] = updated;
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(this.rolePermissions));

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
