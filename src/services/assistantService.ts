import { User, UserRole } from '../types';
import {
  PLATFORM_KNOWLEDGE_BASE,
  KnowledgeArticle,
  ActionLink
} from '../data/platformKnowledgeBase';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionLinks?: ActionLink[];
}

export const STANDARD_REFUSAL_MESSAGE =
  "I'm ApoorvaSetu's dedicated AI Helpdesk Assistant. I can only help with questions related to the ApoorvaSetu platform, its modules, workflows, features and troubleshooting. Please ask me something about using ApoorvaSetu.";

export const UNVERIFIED_FEATURE_MESSAGE =
  "I don't have verified information about this particular ApoorvaSetu feature yet. Please contact your administrator or support team.";

// Patterns indicating out-of-domain queries
const OUT_OF_DOMAIN_PATTERNS = [
  /\b(write|create|generate|solve|debug)\b.*\b(python|code|javascript|c\+\+|java|html|css|script|sql|regex|function|class)\b/i,
  /\b(what is the capital of|who is the president of|tell me a joke|weather in|cricket score|football score|ipl|recipe for|investment advice|stock market)\b/i,
  /\b(write an essay|write an assignment|do my homework|write a poem|sing a song)\b/i,
  /\b(capital of france|who won the match|solve this equation|derivative of|integral of)\b/i,
  /\b(translate to french|translate to spanish|movie recommendation)\b/i
];

// Core terms proving relevance to ApoorvaSetu / AICTE Approval
const PLATFORM_DOMAIN_KEYWORDS = [
  'apoorvasetu', 'aicte', 'application', 'applications', 'institute', 'institutes',
  'institution', 'evc', 'inspection', 'scrutiny', 'workflow', 'stage', 'stages',
  'approval', 'approve', 'reject', 'return', 'compliance', 'undertaking', 'undertakings',
  'document', 'documents', 'fire safety', 'land', 'lease', 'affidavit', 'sac', 'shc',
  'regional', 'officer', 'super admin', 'evc member', 'checklist', 'evidence', 'dossier',
  'status', 'tracking', 'track', 'login', 'logout', 'role', 'roles', 'permission',
  'permissions', 'audit', 'logs', 'system config', 'portal', 'extension of approval',
  'eoa', 'intake', 'program', 'programs', 'escalation', 'escalations', 'notification',
  'notifications', 'report', 'reports', 'helpdesk', 'how do i', 'where can i', 'who can',
  'e-governance', 'smart india hackathon', 'sih', 'aph'
];

class AssistantService {
  /**
   * Determine if the input query belongs strictly to the ApoorvaSetu domain.
   */
  isDomainValid(query: string): boolean {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return false;

    // 1. Check for explicit out-of-domain patterns (coding, general knowledge, sports, entertainment)
    for (const pattern of OUT_OF_DOMAIN_PATTERNS) {
      if (pattern.test(trimmed)) {
        return false;
      }
    }

    // 2. Check for presence of domain keywords or navigational/system phrases
    const containsDomainKeyword = PLATFORM_DOMAIN_KEYWORDS.some((kw) =>
      trimmed.includes(kw)
    );

    // If it contains domain keywords, it's valid
    if (containsDomainKeyword) {
      return true;
    }

    // Short greeting or help-seeking phrasing related to using the site
    if (/^(hi|hello|hey|help|namaste|good morning|good afternoon|good evening|who are you|what can you do)/i.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Process a user's question, applying role isolation, page context, and knowledge retrieval.
   */
  async processMessage(
    userMessage: string,
    currentUser: User | null,
    currentPath: string
  ): Promise<{ text: string; actionLinks?: ActionLink[] }> {
    const trimmed = userMessage.trim();

    // 1. Enforce strict domain boundary
    if (!this.isDomainValid(trimmed)) {
      return {
        text: STANDARD_REFUSAL_MESSAGE
      };
    }

    // 2. Handle polite greetings
    if (/^(hi|hello|hey|namaste|good morning|good afternoon|good evening)\b/i.test(trimmed)) {
      const roleName = currentUser?.roleTitle || 'Authorized User';
      const greeting = `Hello, **${currentUser?.name || 'User'}**! I am your **ApoorvaSetu Helpdesk Assistant**.\n\nYou are signed in as **${roleName}**. How can I assist you with the portal today?`;
      return {
        text: greeting,
        actionLinks: this.getRoleQuickLinks(currentUser?.role)
      };
    }

    // 3. Handle questions about "who are you" or "what can you do"
    if (/\b(who are you|what can you do|your purpose|help me)\b/i.test(trimmed)) {
      return {
        text: `I am the dedicated **ApoorvaSetu AI Helpdesk Assistant** for the AICTE Approval and Compliance Platform.\n\nI can help you with:\n• **Navigating** between applications, documents, workflow stages, and EVC visits.\n• **Explaining** approval statuses, deficiency queries, and undertaking requirements.\n• **Guiding** you through role-specific actions tailored for **${currentUser?.roleTitle || 'your role'}**.\n• **Understanding** deadlines, committee scheduling, and portal guidelines.`,
        actionLinks: this.getRoleQuickLinks(currentUser?.role)
      };
    }

    // 4. Role-based RBAC boundary check
    // If an unauthorized role asks to perform restricted operations (e.g., Institution Admin asking to approve applications or modify system settings)
    const rbacViolation = this.checkRBACOverreach(trimmed, currentUser?.role);
    if (rbacViolation) {
      return { text: rbacViolation };
    }

    // 5. Retrieve matching knowledge articles from platform knowledge base
    const matchedArticles = this.retrieveKnowledgeArticles(trimmed, currentUser?.role, currentPath);

    if (matchedArticles.length === 0) {
      return {
        text: UNVERIFIED_FEATURE_MESSAGE
      };
    }

    // Primary matched article
    const topArticle = matchedArticles[0];

    // Filter action links based on current user's role
    const filteredActionLinks = (topArticle.actionLinks || []).filter((link) => {
      if (!link.requiredRoles || link.requiredRoles.length === 0) return true;
      if (!currentUser?.role) return false;
      return link.requiredRoles.includes(currentUser.role) || currentUser.role === 'SUPER_ADMIN';
    });

    return {
      text: topArticle.content,
      actionLinks: filteredActionLinks.length > 0 ? filteredActionLinks : undefined
    };
  }

  /**
   * Check if the user is asking to perform an action outside their role's authority.
   */
  private checkRBACOverreach(query: string, role?: UserRole): string | null {
    if (!role) return null;
    const lower = query.toLowerCase();

    // Institution Admin trying to approve or reject applications
    if (role === 'INSTITUTION_ADMIN') {
      if (/\b(approve application|reject application|forward application|schedule evc|create user|system config)\b/i.test(lower)) {
        return `As an **Institution Admin**, you do not have permission to approve/reject applications or configure system settings. \n\nYour permitted responsibilities include **filing approval applications**, **uploading compliance documents**, and **tracking your application progress**. Approval decisions are made by AICTE Central Administration and Regional Officers.`;
      }
    }

    // Regional Officer trying to access Super Admin settings
    if (role === 'REGIONAL_OFFICER') {
      if (/\b(create user|delete user|role permissions|maintenance mode|system config)\b/i.test(lower)) {
        return `System configuration, user provisioning, and role permission matrices are strictly restricted to the **Super Admin**. \n\nAs a **Regional Officer**, you have authority over applications, document scrutiny, and EVC coordination within your assigned region.`;
      }
    }

    // EVC Member trying to perform administrative actions
    if (role === 'EVC_MEMBER') {
      if (/\b(approve application|forward application|create user|system config)\b/i.test(lower)) {
        return `As an **EVC Committee Member**, your mandate is to conduct institutional inspections, fill the inspection checklist, upload geo-tagged evidence, and submit inspection reports. Final approval decisions rest with AICTE Central Authority.`;
      }
    }

    return null;
  }

  /**
   * Search knowledge articles using keyword relevance, role filtering, and path weighting.
   */
  private retrieveKnowledgeArticles(
    query: string,
    userRole?: UserRole,
    currentPath?: string
  ): KnowledgeArticle[] {
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored = PLATFORM_KNOWLEDGE_BASE.filter((article) => {
      // Role filtering: If article specifies allowedRoles, check against user's role
      if (article.allowedRoles && article.allowedRoles.length > 0) {
        if (!userRole) return false;
        if (userRole !== 'SUPER_ADMIN' && !article.allowedRoles.includes(userRole)) {
          return false;
        }
      }
      return true;
    }).map((article) => {
      let score = 0;

      // Check keywords
      for (const token of tokens) {
        for (const kw of article.keywords) {
          if (kw.includes(token) || token.includes(kw)) {
            score += 4;
          }
        }
        if (article.title.toLowerCase().includes(token)) {
          score += 5;
        }
        if (article.summary.toLowerCase().includes(token)) {
          score += 2;
        }
        if (article.content.toLowerCase().includes(token)) {
          score += 1;
        }
      }

      // Contextual route boost
      if (currentPath) {
        if (currentPath.includes('application') && article.category === 'applications') score += 2;
        if (currentPath.includes('evc') && article.category === 'evc') score += 2;
        if (currentPath.includes('compliance') && article.category === 'compliance') score += 2;
        if (currentPath.includes('document') && article.category === 'documents') score += 2;
        if (currentPath.includes('admin') && article.category === 'admin') score += 2;
      }

      return { article, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.filter((item) => item.score > 2).map((item) => item.article);
  }

  /**
   * Quick navigation links based on user role.
   */
  private getRoleQuickLinks(role?: UserRole): ActionLink[] {
    switch (role) {
      case 'INSTITUTION_ADMIN':
        return [
          { label: 'Submit Application', path: '/institution/apply' },
          { label: 'Track Application', path: '/institution/tracking' },
          { label: 'Upload Compliance', path: '/compliance' }
        ];
      case 'EVC_MEMBER':
        return [
          { label: 'My Assigned Visits', path: '/evc/my-visits' },
          { label: 'Inspection Checklist', path: '/evc/checklist' },
          { label: 'Evidence Upload', path: '/evc/evidence' }
        ];
      case 'REGIONAL_OFFICER':
        return [
          { label: 'Regional Applications', path: '/applications' },
          { label: 'EVC Coordination', path: '/evc-scheduling' },
          { label: 'Escalations', path: '/regional/escalations' }
        ];
      case 'AICTE_ADMIN':
        return [
          { label: 'All Applications', path: '/applications' },
          { label: 'Workflow Stages', path: '/workflow' },
          { label: 'Schedule EVC', path: '/evc-scheduling' }
        ];
      case 'SUPER_ADMIN':
        return [
          { label: 'User Management', path: '/admin/users' },
          { label: 'Role Permissions', path: '/admin/roles' },
          { label: 'Audit Logs', path: '/admin/audit-logs' }
        ];
      default:
        return [
          { label: 'Dashboard', path: '/' },
          { label: 'Applications', path: '/applications' }
        ];
    }
  }

  // --- Local Conversation History Storage ---

  getStorageKey(userId?: string): string {
    return `apoorvasetu_ai_chat_v1_${userId || 'guest'}`;
  }

  loadHistory(userId?: string): ChatMessageItem[] {
    try {
      const saved = localStorage.getItem(this.getStorageKey(userId));
      if (saved) return JSON.parse(saved);
    } catch { }
    return [];
  }

  saveHistory(messages: ChatMessageItem[], userId?: string): void {
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(messages));
    } catch { }
  }

  clearHistory(userId?: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(userId));
    } catch { }
  }
}

export const assistantService = new AssistantService();

