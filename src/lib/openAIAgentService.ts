export interface OpenAIAgentRequest {
  project_path: string;
  session_id: string;
  user_instructions: string;
}

export interface OpenAIAgentResponse {
  success: boolean;
  response?: string;
  session_id: string;
  raw_output?: string;
  project_path?: string;
  user_instructions?: string;
  error?: string;
}

export class OpenAIAgentService {
  private readonly vmIP: string;
  private readonly agentPort: number;

  constructor() {
    this.vmIP = process.env.GCP_VM_EXTERNAL_IP || '';
    this.agentPort = 5000;
  }

  /**
   * Send code modification request to OpenAI agent on GCP VM
   */
  async sendCodeModificationRequest(
    projectPath: string, 
    sessionId: string, 
    userInstructions: string
  ): Promise<OpenAIAgentResponse> {
    if (!this.vmIP) {
      throw new Error('GCP VM IP not configured');
    }

    const agentUrl = `http://${this.vmIP}:${this.agentPort}/fix-sync`;
    
    const requestData: OpenAIAgentRequest = {
      project_path: projectPath,
      session_id: sessionId,
      user_instructions: userInstructions
    };

    console.log('🤖 Sending request to OpenAI agent:', {
      url: agentUrl,
      projectPath,
      sessionId,
      instructions: userInstructions.substring(0, 100) + '...'
    });

    try {
      const response = await fetch(agentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        // Add timeout for long-running operations
        signal: AbortSignal.timeout(300000) // 5 minutes timeout
      });

      if (!response.ok) {
        throw new Error(`OpenAI Agent HTTP error! status: ${response.status}`);
      }

      const data: OpenAIAgentResponse = await response.json();
      
      console.log('✅ OpenAI agent responded:', {
        success: data.success,
        sessionId: data.session_id,
        hasResponse: !!data.response,
        hasError: !!data.error
      });

      return data;
    } catch (error) {
      console.error('❌ Error calling OpenAI agent:', error);
      
      if (error instanceof Error) {
        throw new Error(`OpenAI Agent service error: ${error.message}`);
      }
      
      throw new Error('Unknown OpenAI Agent service error');
    }
  }

  /**
   * Detect if user message is asking for code changes vs explanations
   */
  static detectIntent(message: string): 'code_change' | 'explanation' {
    const lowerMessage = message.toLowerCase();
    
    // Keywords that indicate code modification requests
    const codeChangeKeywords = [
      'add', 'create', 'implement', 'build', 'make', 'write',
      'fix', 'repair', 'debug', 'solve', 'correct',
      'update', 'modify', 'change', 'edit', 'alter',
      'remove', 'delete', 'refactor', 'optimize',
      'install', 'setup', 'configure', 'integrate',
      'improve', 'enhance', 'upgrade', 'extend'
    ];

    // Keywords that indicate explanation requests
    const explanationKeywords = [
      'what', 'how', 'why', 'explain', 'describe', 'tell me',
      'show me', 'understand', 'meaning', 'purpose',
      'works', 'does', 'function', 'overview', 'summary'
    ];

    // Check for code change indicators
    const hasCodeChangeKeywords = codeChangeKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    // Check for explanation indicators
    const hasExplanationKeywords = explanationKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    // If both or neither, default based on message structure
    if (hasCodeChangeKeywords && !hasExplanationKeywords) {
      return 'code_change';
    }
    
    if (hasExplanationKeywords && !hasCodeChangeKeywords) {
      return 'explanation';
    }

    // Default logic: questions tend to be explanations, commands tend to be changes
    if (lowerMessage.includes('?') || lowerMessage.startsWith('what') || lowerMessage.startsWith('how')) {
      return 'explanation';
    }

    // Commands or imperative statements are likely code changes
    if (hasCodeChangeKeywords) {
      return 'code_change';
    }

    // Default to explanation for safety
    return 'explanation';
  }

  /**
   * Generate a unique session ID for tracking agent requests
   */
  static generateSessionId(userId: string, repositoryId: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${userId}-${repositoryId}-${timestamp}-${randomSuffix}`;
  }
}

export const openAIAgentService = new OpenAIAgentService();
