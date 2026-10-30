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

    // 2. Strict Role Boundary RBAC Check
    const rbacViolation = this.checkRBACOverreach(message, userRole);
    if (rbacViolation) {
      return {
        text: rbacViolation
      };
    }

    // 3. Verify Gemini API Key configuration
    const aiClient = this.getClient();
    if (!aiClient) {
      return {
        text: "⚠️ **Gemini API Key Missing**: The backend is not configured with a valid `GEMINI_API_KEY`. Please configure `GEMINI_API_KEY` in your `.env` file to enable dynamic AI responses.",
        isConfigError: true,
        error: "CONFIG_ERROR"
      };
    }

    // 4. Retrieve RAG platform documentation
    const { contextText, actionLinks } = this.retrieveKnowledge(message, userRole, currentPath);

    // 5. Build System Instruction for Gemini
    const systemInstruction = `You are the official AI Helpdesk Assistant for ApoorvaSetu – AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System (developed for Smart India Hackathon 2026).
Your job is to assist users with understanding portal workflows, submitting/reviewing applications, EVC inspections, compliance undertakings, and navigating platform features.

STRICT INSTRUCTIONS:
1. DOMAIN BOUNDARY: ONLY answer questions about the ApoorvaSetu platform, AICTE approvals, and technical education governance.
   Never write generic computer programs (e.g. Python scripts, sorting algorithms), solve homework, explain world trivia, or give investment/sports advice. If asked anything unrelated, respond with:
   "${STANDARD_REFUSAL_MESSAGE}"
2. ROLE-BASED ACCESS CONTROL (RBAC):
   The user's currently authenticated role is: "${userRole}".
   Tailor your answers strictly to this role's authority and responsibilities. Never guide users to bypass access controls or access modules unauthorized for their role.
3. GROUNDING: Base your explanations on the provided ApoorvaSetu Platform Documentation. Do not invent or hallucinate non-existent features. If a detail is not in the documentation, clearly state that you don't have verified information and advise contacting the system administrator.
4. TONE & FORMAT: Professional, clear, concise, and helpful. Use bullet points and bold key terms for readability.`;

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

    // 7. Invoke Gemini API
    const modelName = process.env.AI_MODEL || 'gemini-2.5-flash';

    try {
      const response = await aiClient.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 800
        }
      });

      const responseText = response.text?.trim() || "I couldn't generate a response for this query. Please rephrase your question.";

      return {
        text: responseText,
        actionLinks: actionLinks.length > 0 ? actionLinks : undefined
      };
    } catch (err: any) {
      console.error('Gemini API execution error:', err);

      // Handle specific API errors
      if (err.message?.includes('API_KEY_INVALID') || err.status === 400) {
        return {
          text: "⚠️ **Invalid Gemini API Key**: The configured `GEMINI_API_KEY` was rejected by Google Gemini API. Please check your key in `.env`.",
          isConfigError: true,
          error: "INVALID_API_KEY"
        };
      }

      if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        return {
          text: "⚠️ **Rate Limit Exceeded**: Google Gemini API quota limit reached. Please wait a moment before trying again.",
          error: "RATE_LIMITED"
        };
      }

      return {
        text: `⚠️ **AI Service Error**: Unable to reach Google Gemini API (${err.message || 'Network error'}). Please try again.`,
        error: "AI_SERVICE_ERROR"
      };
    }
  }
}

export const aiService = new AIService();
