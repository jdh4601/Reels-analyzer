
import {
  Transcript,
  ReelAnalysis
} from '../types';
import { callAI, parseJsonFromLlmLiteral } from '../llm';

/**
 * Analyzes the structure of a Reel based on its transcript
 * Uses Claude API if available, otherwise falls back to Ollama
 */
export async function analyzeStructure(transcript: Transcript): Promise<ReelAnalysis> {
  const prompt = createAnalysisPrompt(transcript);
  const systemPrompt = "You are an expert social media analyst specializing in short-form video content (Reels, TikTok, Shorts). Your goal is to analyze the structure of a video transcript and provide a structured JSON output. Output ONLY valid JSON, no other text.";

  const llmResponse = await callAI(prompt, systemPrompt);

  return parseLLMResponse(llmResponse, transcript.duration);
}


/**
 * Creates the prompt for Claude
 */
function createAnalysisPrompt(transcript: Transcript): string {
  return `
Here is the transcript of a short-form video:

<transcript>
${transcript.fullText}
</transcript>

And here are the timestamped segments:
${JSON.stringify(transcript.segments.slice(0, 50))} ... (truncated for brevity if too long)

Total Duration: ${transcript.duration} seconds.

Please analyze this video structure and output a VALID JSON object (no markdown, no other text) with the following fields:

1. **hookTime**: Duration of the hook (first grabber part) in seconds.
2. **hookType**: One of ['question', 'shock', 'empathy', 'list', 'promise', 'story', 'other'].
3. **hookText**: The exact text of the hook.
4. **sections**: Array of sections. Each section has:
    - name: 'hook', 'body', or 'cta'
    - startTime: number (seconds)
    - endTime: number (seconds)
    - content: summary or text of this section
    - purpose: what this section achieves
5. **ctaType**: One of ['follow', 'like', 'comment', 'save', 'share', 'link', 'none'].
6. **ctaText**: The call to action text (if any).
7. **summary**: A 1-2 sentence summary of the video.
8. **engagementHooks**: List of 2-3 specific phrases or visual cues implied by text that keep viewers watching.
9. **editingStyle**: Infer based on pace and text:
    - cutFrequency: 'low', 'medium', or 'high'
    - textOverlay: boolean (guess true if there are list items or emphasized words)
    - transitionEffects: list of inferred effects (e.g., "fast cut", "zoom")
10. **audioStyle**:
    - hasVoiceover: boolean (true if transcript exists)
    - hasTrendingSound: boolean (guess false unless lyrics imply it)
    - subtitleDependent: boolean
    - soundType: string (e.g., "speech", "mix")

Ensure the JSON is strictly valid.
`;
}

/**
 * Parses the JSON response from LLM and ensures it matches ReelAnalysis type
 */
function parseLLMResponse(responseText: string, totalDuration: number): ReelAnalysis {
  const parsed = parseJsonFromLlmLiteral<any>(responseText);

  // Validate and fill defaults if missing
  return {
    hookTime: parsed.hookTime || 3,
    hookType: parsed.hookType || 'other',
    hookText: parsed.hookText || '',
    sections: parsed.sections || [],
    ctaType: parsed.ctaType || 'none',
    ctaText: parsed.ctaText,
    editingStyle: {
      cutFrequency: parsed.editingStyle?.cutFrequency || 'medium',
      textOverlay: parsed.editingStyle?.textOverlay || false,
      transitionEffects: parsed.editingStyle?.transitionEffects || []
    },
    audioStyle: {
      hasVoiceover: parsed.audioStyle?.hasVoiceover || true,
      hasTrendingSound: parsed.audioStyle?.hasTrendingSound || false,
      subtitleDependent: parsed.audioStyle?.subtitleDependent || false,
      soundType: parsed.audioStyle?.soundType
    },
    totalDuration: totalDuration,
    engagementHooks: parsed.engagementHooks || [],
    summary: parsed.summary || ''
  };
}
