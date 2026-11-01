import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { PLATFORM_KNOWLEDGE_BASE } from '../src/data/platformKnowledgeBase.ts';
import type { ActionLink } from '../src/data/platformKnowledgeBase.ts';

dotenv.config();

export interface ChatHistoryMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AIChatRequest {
  message: string;
  history?: ChatHistoryMessage[];
  userRole?: string;
  currentPath?: string;
}

export interface AIChatResponse {
  text: string;
  actionLinks?: ActionLink[];
  error?: string;
  isConfigError?: boolean;
}

export const STANDARD_REFUSAL_MESSAGE =
  "I'm ApoorvaSetu's dedicated AI Helpdesk Assistant. I can only help with ApoorvaSetu-related features, workflows and platform support.";

// Explicit out-of-domain patterns
const OUT_OF_DOMAIN_PATTERNS = [
  /\b(write|create|generate|solve|debug)\b.*\b(python|code|javascript|c\+\+|java|html|css|script|sql|regex|function|class)\b/i,
  /\b(what is the capital of|who is the president of|tell me a joke|weather in|cricket score|football score|ipl|recipe for|investment advice|stock market)\b/i,
  /\b(write an essay|write an assignment|do my homework|write a poem|sing a song)\b/i,
  /\b(capital of france|who won the match|solve this equation|derivative of|integral of)\b/i,
  /\b(translate to french|translate to spanish|movie recommendation)\b/i
];

// Core platform domain terms
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
  'smart india hackathon', 'sih', 'aph'
];

export class AIService {
  private ai: GoogleGenAI | null = null;
  private currentApiKey: string | null = null;

  private getClient(): GoogleGenAI | null {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key || key === 'your_gemini_api_key_here') {
      return null;
    }
    if (this.ai && this.currentApiKey === key) {
      return this.ai;
    }
    this.currentApiKey = key;
    this.ai = new GoogleGenAI({ apiKey: key });
    return this.ai;
  }

  isDomainValid(query: string): boolean {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return false;

    // Check for explicit out-of-domain patterns
    for (const pattern of OUT_OF_DOMAIN_PATTERNS) {
      if (pattern.test(trimmed)) {
        return false;
      }
    }

    // Check for presence of domain keywords
    const containsDomainKeyword = PLATFORM_DOMAIN_KEYWORDS.some((kw) =>
      trimmed.includes(kw)
    );
    if (containsDomainKeyword) {
      return true;
    }

    // Common portal usage / assistance greetings
    if (/^(hi|hello|hey|help|namaste|good morning|good afternoon|good evening|who are you|what can you do|how does this work)/i.test(trimmed)) {
      return true;
    }

    return false;
  }

  private checkRBACOverreach(query: string, role?: string): string | null {
    if (!role) return null;
    const lower = query.toLowerCase();

    if (role === 'INSTITUTION_ADMIN') {
      if (/\b(approve applications?|reject applications?|forward applications?|schedule evc|create users?|system config)\b/i.test(lower)) {
        return `As an **Institution Admin**, you do not have permission to approve/reject applications or configure system settings. \n\nYour permitted responsibilities include **filing approval applications**, **uploading compliance documents**, and **tracking your application progress**. Approval decisions are made by AICTE Central Administration and Regional Officers.`;
      }
    }

    if (role === 'REGIONAL_OFFICER') {
      if (/\b(create users?|delete users?|role permissions|maintenance mode|system config)\b/i.test(lower)) {
        return `System configuration, user provisioning, and role permission matrices are strictly restricted to the **Super Admin**. \n\nAs a **Regional Officer**, you have authority over applications, document scrutiny, and EVC coordination within your assigned region.`;
      }
    }

    if (role === 'EVC_MEMBER') {
      if (/\b(approve applications?|forward applications?|create users?|system config)\b/i.test(lower)) {
        return `As an **EVC Committee Member**, your mandate is to conduct institutional inspections, fill the inspection checklist, upload geo-tagged evidence, and submit inspection reports. Final approval decisions rest with AICTE Central Authority.`;
      }
    }

    return null;
  }

  private retrieveKnowledge(query: string, userRole?: string, currentPath?: string): { contextText: string; actionLinks: ActionLink[] } {
    const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored = PLATFORM_KNOWLEDGE_BASE.filter((article) => {
      if (article.allowedRoles && article.allowedRoles.length > 0) {
        if (!userRole) return false;
        if (userRole !== 'SUPER_ADMIN' && !article.allowedRoles.includes(userRole as any)) {
          return false;
        }
      }
      return true;
    }).map((article) => {
      let score = 0;
      for (const token of tokens) {
        for (const kw of article.keywords) {
          if (kw.includes(token) || token.includes(kw)) score += 4;
        }
        if (article.title.toLowerCase().includes(token)) score += 5;
        if (article.summary.toLowerCase().includes(token)) score += 2;
        if (article.content.toLowerCase().includes(token)) score += 1;
      }
      if (currentPath) {
        if (currentPath.includes('application') && article.category === 'applications') score += 2;
        if (currentPath.includes('evc') && article.category === 'evc') score += 2;
        if (currentPath.includes('compliance') && article.category === 'compliance') score += 2;
      }
      return { article, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topArticles = scored.filter((item) => item.score > 2).slice(0, 3).map((item) => item.article);

    if (topArticles.length === 0) {
      return { contextText: '', actionLinks: [] };
    }

    const contextText = topArticles
      .map((a) => `### ${a.title}\nCategory: ${a.category}\n${a.content}`)
      .join('\n\n---\n\n');

    const allLinks: ActionLink[] = [];
    topArticles.forEach((a) => {
      if (a.actionLinks) {
        a.actionLinks.forEach((link) => {
          if (!link.requiredRoles || link.requiredRoles.length === 0) {
            allLinks.push(link);
          } else if (userRole && (link.requiredRoles.includes(userRole as any) || userRole === 'SUPER_ADMIN')) {
            allLinks.push(link);
          }
        });
      }
    });

    return { contextText, actionLinks: allLinks };
  }

  async generateResponse(req: AIChatRequest): Promise<AIChatResponse> {
    const { message, history = [], userRole = 'Authorized User', currentPath = '/' } = req;

    // 1. Strict Domain Validation Layer
    if (!this.isDomainValid(message)) {
      return {
        text: STANDARD_REFUSAL_MESSAGE
      };
    }

    // 2. Ultra-concise greeting intercept (instant response without verbose essays)
    const isGreeting = /^(hi|hello|hey|namaste|good\s+(morning|afternoon|evening)|greetings|howdy)[\s!.]*$/i.test(message.trim());
    if (isGreeting) {
      const roleDisplay = userRole ? userRole.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'there';
      return {
        text: `Hello, **${roleDisplay}**! How can I assist you with ApoorvaSetu today?`,
        actionLinks: [
          { label: 'Applications', path: '/applications' },
          { label: 'Workflow', path: '/workflow' }
        ]
      };
    }

    // 3. Strict Role Boundary RBAC Check
    const rbacViolation = this.checkRBACOverreach(message, userRole);
    if (rbacViolation) {
      return {
        text: rbacViolation
      };
    }

    // 4. Verify Gemini API Key configuration
    const aiClient = this.getClient();
    if (!aiClient) {
      return {
        text: "**Gemini API Key Missing**: The backend is not configured with a valid `GEMINI_API_KEY`. Please configure `GEMINI_API_KEY` in your `.env` file to enable dynamic AI responses.",
        isConfigError: true,
        error: "CONFIG_ERROR"
      };
    }

    // 5. Retrieve RAG platform documentation
    const { contextText, actionLinks } = this.retrieveKnowledge(message, userRole, currentPath);

    // 6. Build Ultra-Concise System Instruction for Gemini
    const systemInstruction = `You are the AI Helpdesk Assistant for ApoorvaSetu – AICTE Approval Workflow Automation and Compliance Monitoring System.

MANDATORY RULES:
1. EXTREME BREVITY (HIGHEST PRIORITY):
   - Keep ALL answers SHORT, DIRECT, and PUNCHY.
   - Limit responses to 2–3 brief sentences or maximum 3 compact bullet points.
   - NEVER include introductory pleasantries ("I would be happy to help", "As an administrator, you have oversight..."), role summaries, or concluding filler ("Please let me know if you need anything else!").
   - Cut straight to the actionable answer immediately.
2. DOMAIN BOUNDARY: ONLY answer questions about ApoorvaSetu platform features, AICTE approval stages, EVC inspections, and compliance.
   If unrelated, reply strictly with: "${STANDARD_REFUSAL_MESSAGE}"
3. USER ROLE: "${userRole}". Respect role boundaries; do not advise unauthorized actions.
4. GROUNDING: Use the provided platform context. Do not invent features.`;

    // 6. Assemble Multi-turn Contents
    const contents: any[] = [];

    // Add previous history turns (limited to last 6 turns to keep context tight and relevant)
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      contents.push({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }

    // Add user's new message with retrieved platform context
    const userPromptWithContext = contextText
      ? `[Verified Platform Documentation Context]:\n${contextText}\n\n[User Question]:\n${message}`
      : message;

    contents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }]
    });

    // 7. Invoke Gemini API with automatic high-availability fallback
    const primaryModel = process.env.AI_MODEL || 'gemini-3-flash-preview';
    const candidateModels = Array.from(new Set([
      primaryModel,
      'gemini-3-flash-preview',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite-preview'
    ]));

    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await aiClient.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
            maxOutputTokens: 250
          }
        });

        const responseText = response.text?.trim() || "I couldn't generate a response for this query. Please rephrase your question.";

        return {
          text: responseText,
          actionLinks: actionLinks.length > 0 ? actionLinks : undefined
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[ApoorvaSetu AI] Model ${modelName} returned status ${err.status || err.message?.slice(0, 40)}. Trying fallback...`);
      }
    }

    console.error('All Gemini candidate models failed:', lastError);

    // Handle specific API errors
    if (lastError?.message?.includes('API_KEY_INVALID') || lastError?.status === 400) {
      return {
        text: "**Invalid Gemini API Key**: The configured `GEMINI_API_KEY` was rejected by Google Gemini API. Please check your key in `.env`.",
        isConfigError: true,
        error: "INVALID_API_KEY"
      };
    }

    if (lastError?.status === 429 || lastError?.message?.includes('RESOURCE_EXHAUSTED')) {
      return {
        text: "**Rate Limit Exceeded**: Google Gemini API quota limit reached. Please wait a moment before trying again.",
        error: "RATE_LIMITED"
      };
    }

    return {
      text: `**AI Service Error**: Unable to reach Google Gemini API (${lastError?.message || 'Network error'}). Please try again.`,
      error: "AI_SERVICE_ERROR"
    };
  }
}

export const aiService = new AIService();
