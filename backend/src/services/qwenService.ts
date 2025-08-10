import axios from 'axios';
import { PrismaClient, Candidate } from '@prisma/client';

const prisma = new PrismaClient();

interface QwenAnalysisRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

interface QwenResponse {
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface PolicyPosition {
  issue: string;
  position: string;
  stance: 'for' | 'against' | 'neutral' | 'nuanced';
  confidence: number; // 0-1
  evidence?: string[];
  source?: string;
}

interface CandidateComparison {
  candidates: {
    id: string;
    name: string;
    party?: string;
  }[];
  sharedIssues: {
    issue: string;
    positions: {
      candidateId: string;
      position: string;
      stance: 'for' | 'against' | 'neutral' | 'nuanced';
      confidence: number;
    }[];
    agreement: 'agree' | 'disagree' | 'mixed' | 'unclear';
    summary: string;
  }[];
  uniqueIssues: {
    candidateId: string;
    issues: {
      issue: string;
      position: string;
      defaultMessage?: string;
    }[];
  }[];
  overallSummary: string;
}

export class QwenService {
  private static readonly API_URL = process.env.QWEN3_API_URL || 'http://localhost:8000';
  private static readonly API_KEY = process.env.QWEN3_API_KEY;
  private static readonly MODEL = 'Qwen2.5-72B-Instruct';
  private static readonly MAX_RETRIES = 3;
  private static readonly TIMEOUT_MS = 30000; // 30 seconds

  /**
   * Test Qwen3 API connection
   */
  static async healthCheck(): Promise<{ status: string; model?: string; details?: any }> {
    try {
      console.log('🤖 Testing Qwen3 API connection...');
      
      const testPrompt = "Hello! Please respond with a brief confirmation that you're working correctly.";
      
      const response = await this.makeAPIRequest({
        prompt: testPrompt,
        maxTokens: 50,
        temperature: 0.1
      });

      return {
        status: 'healthy',
        model: this.MODEL,
        details: {
          responseLength: response.choices[0]?.message?.content?.length || 0,
          tokensUsed: response.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      console.error('Qwen3 health check failed:', error);
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze candidate policy positions from their content
   */
  static async analyzeCandidatePositions(
    candidateId: string,
    content?: string
  ): Promise<PolicyPosition[]> {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId }
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Combine all available candidate content
      const analysisContent = content || [
        candidate.platformSummary,
        candidate.keyIssues.join('. ')
      ].filter(Boolean).join('\n\n');

      if (!analysisContent.trim()) {
        console.log(`⚠️  No content available for candidate ${candidate.name}`);
        return [];
      }

      const prompt = this.buildPositionAnalysisPrompt(candidate.name, analysisContent);
      
      const response = await this.makeAPIRequest({
        prompt,
        maxTokens: 1000,
        temperature: 0.2 // Lower temperature for more consistent analysis
      });

      const analysisText = response.choices[0]?.message?.content || '';
      return this.parsePositionAnalysis(analysisText);

    } catch (error) {
      console.error(`Failed to analyze positions for candidate ${candidateId}:`, error);
      return [];
    }
  }

  /**
   * Compare multiple candidates' positions on shared issues
   */
  static async compareCandidates(
    candidateIds: string[],
    officeId?: string
  ): Promise<CandidateComparison> {
    try {
      console.log(`🔄 Comparing ${candidateIds.length} candidates...`);

      // Get candidate data
      const candidates = await prisma.candidate.findMany({
        where: {
          id: { in: candidateIds },
          ...(officeId ? { officeId } : {})
        },
        include: {
          office: true
        }
      });

      if (candidates.length < 2) {
        throw new Error('At least 2 candidates required for comparison');
      }

      // Analyze each candidate's positions
      const candidatePositions = await Promise.all(
        candidates.map(async candidate => ({
          candidate,
          positions: await this.analyzeCandidatePositions(candidate.id)
        }))
      );

      // Generate intelligent comparison using Qwen3
      const comparisonPrompt = this.buildComparisonPrompt(candidatePositions);
      
      const response = await this.makeAPIRequest({
        prompt: comparisonPrompt,
        maxTokens: 1500,
        temperature: 0.3
      });

      const comparisonText = response.choices[0]?.message?.content || '';
      return this.parseComparison(candidates, candidatePositions, comparisonText);

    } catch (error) {
      console.error('Candidate comparison failed:', error);
      throw error;
    }
  }

  /**
   * Generate neutral summary for a policy issue across multiple viewpoints
   */
  static async generateNeutralSummary(
    issue: string,
    positions: { candidate: string; position: string }[]
  ): Promise<string> {
    try {
      const prompt = `
As a neutral political analyst, create an objective summary of different candidate positions on: ${issue}

Candidate positions:
${positions.map((p, i) => `${i + 1}. ${p.candidate}: ${p.position}`).join('\n')}

Guidelines:
- Present all viewpoints fairly without bias
- Highlight areas of agreement and disagreement
- Use neutral, factual language
- Avoid partisan terminology
- Focus on policy substance, not political tactics
- Keep summary concise but comprehensive

Provide a balanced summary:`;

      const response = await this.makeAPIRequest({
        prompt,
        maxTokens: 400,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content?.trim() || 
        `Multiple perspectives exist on ${issue}. Candidates offer different approaches to this issue.`;

    } catch (error) {
      console.error('Failed to generate neutral summary:', error);
      return `Various candidates have different positions on ${issue}.`;
    }
  }

  /**
   * Generate default message for missing policy positions
   */
  static generateMissingPositionMessage(
    candidateName: string,
    issue: string,
    candidateId: string
  ): string {
    const messages = [
      `${candidateName} has not yet published a detailed position on ${issue}.`,
      `No public statement found from ${candidateName} on ${issue}.`,
      `${candidateName}'s stance on ${issue} has not been documented.`,
      `${candidateName} has not specifically addressed ${issue} in available materials.`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    return `${randomMessage} To inquire about their position, <a href="/messages/compose?to=${candidateId}&subject=Position on ${encodeURIComponent(issue)}" class="candidate-inquiry-link">click here to send a message</a>.`;
  }

  // Private helper methods

  private static async makeAPIRequest(request: QwenAnalysisRequest): Promise<QwenResponse> {
    try {
      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (this.API_KEY) {
        headers['Authorization'] = `Bearer ${this.API_KEY}`;
      }

      const requestData = {
        model: this.MODEL,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.maxTokens || 500,
        temperature: request.temperature || 0.3,
        top_p: request.topP || 0.9,
        stream: false
      };

      console.log(`🤖 Making Qwen3 API request (${request.maxTokens || 500} max tokens)...`);

      const response = await axios.post(`${this.API_URL}/v1/chat/completions`, requestData, {
        headers,
        timeout: this.TIMEOUT_MS
      });

      if (!response.data || !response.data.choices || response.data.choices.length === 0) {
        throw new Error('Invalid response from Qwen3 API');
      }

      console.log(`✅ Qwen3 response received (${response.data.usage?.total_tokens || 0} tokens)`);
      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error || error.message;
        throw new Error(`Qwen3 API error (${status}): ${message}`);
      }
      throw error;
    }
  }

  private static buildPositionAnalysisPrompt(candidateName: string, content: string): string {
    return `
Analyze the following content from political candidate ${candidateName} and extract their policy positions.

Content to analyze:
"${content}"

Extract policy positions in this JSON format:
{
  "positions": [
    {
      "issue": "specific policy area (e.g., healthcare, education, taxes)",
      "position": "candidate's stance in their own words or paraphrased",
      "stance": "for|against|neutral|nuanced",
      "confidence": 0.0-1.0,
      "evidence": ["supporting quotes or statements"]
    }
  ]
}

Guidelines:
- Focus on substantive policy positions, not campaign rhetoric
- Use candidate's actual words when possible
- Rate confidence based on clarity and specificity of position
- Include stance as: "for" (supports), "against" (opposes), "neutral" (no clear preference), "nuanced" (complex position)
- Only include positions that are clearly stated or strongly implied

Respond with valid JSON only:`;
  }

  private static buildComparisonPrompt(candidatePositions: any[]): string {
    const candidateData = candidatePositions.map(cp => ({
      name: cp.candidate.name,
      party: cp.candidate.party,
      positions: cp.positions
    }));

    return `
Compare the policy positions of these political candidates running for the same office:

${candidateData.map(cd => `
Candidate: ${cd.name} (${cd.party || 'No party listed'})
Positions: ${JSON.stringify(cd.positions, null, 2)}
`).join('\n')}

Provide a neutral, analytical comparison in this JSON format:
{
  "sharedIssues": [
    {
      "issue": "policy area where multiple candidates have positions",
      "agreement": "agree|disagree|mixed|unclear",
      "summary": "neutral explanation of different positions"
    }
  ],
  "uniqueIssues": [
    {
      "candidateName": "name",
      "issues": ["issues only this candidate addressed"]
    }
  ],
  "overallSummary": "brief neutral summary of the comparison"
}

Guidelines:
- Be completely neutral and factual
- Highlight both agreements and disagreements
- Note when candidates have no position on issues others address
- Use objective language without partisan framing
- Focus on policy substance, not political strategy

Respond with valid JSON only:`;
  }

  private static parsePositionAnalysis(analysisText: string): PolicyPosition[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in analysis response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.positions || [];

    } catch (error) {
      console.error('Failed to parse position analysis:', error);
      console.log('Raw analysis text:', analysisText);
      return [];
    }
  }

  private static parseComparison(
    candidates: any[],
    candidatePositions: any[],
    comparisonText: string
  ): CandidateComparison {
    try {
      const jsonMatch = comparisonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in comparison response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Build the structured comparison response
      const comparison: CandidateComparison = {
        candidates: candidates.map(c => ({
          id: c.id,
          name: c.name,
          party: c.party
        })),
        sharedIssues: parsed.sharedIssues?.map((issue: any) => ({
          issue: issue.issue,
          positions: this.extractPositionsForIssue(candidatePositions, issue.issue),
          agreement: issue.agreement || 'unclear',
          summary: issue.summary || 'No summary available'
        })) || [],
        uniqueIssues: parsed.uniqueIssues?.map((ui: any) => ({
          candidateId: this.findCandidateId(candidates, ui.candidateName),
          issues: ui.issues?.map((issue: string) => ({
            issue,
            position: this.findPositionForCandidate(candidatePositions, ui.candidateName, issue),
            defaultMessage: this.generateMissingPositionMessage(ui.candidateName, issue, this.findCandidateId(candidates, ui.candidateName))
          })) || []
        })) || [],
        overallSummary: parsed.overallSummary || 'Candidates have varying positions on key issues.'
      };

      return comparison;

    } catch (error) {
      console.error('Failed to parse comparison:', error);
      console.log('Raw comparison text:', comparisonText);
      
      // Return fallback comparison
      return {
        candidates: candidates.map(c => ({ id: c.id, name: c.name, party: c.party })),
        sharedIssues: [],
        uniqueIssues: [],
        overallSummary: 'Comparison analysis is temporarily unavailable.'
      };
    }
  }

  private static extractPositionsForIssue(candidatePositions: any[], issue: string) {
    const positions: any[] = [];
    
    candidatePositions.forEach(cp => {
      const position = cp.positions.find((p: any) => 
        p.issue.toLowerCase().includes(issue.toLowerCase()) ||
        issue.toLowerCase().includes(p.issue.toLowerCase())
      );
      
      if (position) {
        positions.push({
          candidateId: cp.candidate.id,
          position: position.position,
          stance: position.stance,
          confidence: position.confidence
        });
      }
    });
    
    return positions;
  }

  private static findCandidateId(candidates: any[], candidateName: string): string {
    const candidate = candidates.find(c => 
      c.name.toLowerCase().includes(candidateName.toLowerCase()) ||
      candidateName.toLowerCase().includes(c.name.toLowerCase())
    );
    return candidate?.id || '';
  }

  private static findPositionForCandidate(candidatePositions: any[], candidateName: string, issue: string): string {
    const cp = candidatePositions.find(cp => 
      cp.candidate.name.toLowerCase().includes(candidateName.toLowerCase())
    );
    
    if (cp) {
      const position = cp.positions.find((p: any) => 
        p.issue.toLowerCase().includes(issue.toLowerCase())
      );
      return position?.position || 'No specific position documented';
    }
    
    return 'No specific position documented';
  }


  /**
   * Get usage statistics for Qwen3 API calls
   */
  static async getUsageStats(): Promise<{
    totalRequests: number;
    totalTokens: number;
    avgResponseTime: number;
    successRate: number;
  }> {
    // This would typically be stored in a database or cache
    // For now, return placeholder data
    return {
      totalRequests: 0,
      totalTokens: 0,
      avgResponseTime: 0,
      successRate: 1.0
    };
  }
}