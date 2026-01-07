
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { Script, ScriptInput, TrendAnalysis } from '../types';

/**
 * Generates a viral short-form video script based on input parameters and optional trend data.
 */
export async function generateScript(input: ScriptInput): Promise<Script> {
  if (!config.anthropicApiKey) {
    throw new Error('Anthropic API Key not configured');
  }

  const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey,
  });

  const prompt = createScriptPrompt(input);

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Fast and creative enough for scripts
      max_tokens: 2000,
      temperature: 0.7, // Slightly higher temperature for creativity
      system: "You are an expert viral content creator and copywriter for Instagram Reels, TikTok, and YouTube Shorts. Your goal is to write high-retention scripts that hook viewers immediately and drive engagement.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const contentBlock = msg.content[0];
    if (contentBlock.type !== 'text') {
        throw new Error('Unexpected response format from Claude');
    }

    return parseScriptResponse(contentBlock.text, input.targetDuration);

  } catch (error: any) {
    throw new Error(`Failed to generate script: ${error.message}`);
  }
}

function createScriptPrompt(input: ScriptInput): string {
  const trendsResponse = input.trendAnalysis 
    ? formatTrendContext(input.trendAnalysis) 
    : "No specific trend data provided. Follow general best practices for high retention.";

  return `
Create a script for a short-form video (${input.targetDuration} seconds).

**Topic**: ${input.topic}
**Tone**: ${input.tone || 'casual'}
**Target Audience**: ${input.targetAudience || 'General audience'}

**Trend Context & Requirements**:
${trendsResponse}

${input.hookType ? `**Required Hook Type**: ${input.hookType}` : ''}
${input.ctaType ? `**Required CTA Type**: ${input.ctaType}` : ''}

**Output Format**:
Provide a valid JSON object with the following structure:
{
  "title": "Catchy internal title",
  "hook": {
    "type": "${input.hookType || 'inferred type'}",
    "text": "The spoken hook text",
    "duration": number (approx seconds)
  },
  "body": {
    "sections": [
      {
        "text": "Spoken text for this section",
        "duration": number (approx seconds),
        "visualNotes": "Description of what is shown (e.g., 'Face to camera', 'Screen recording')"
      }
    ]
  },
  "cta": {
    "type": "${input.ctaType || 'inferred type'}",
    "text": "Call to action text",
    "duration": number (approx seconds)
  },
  "totalDuration": number (sum of parts),
  "notes": ["Why this script works", "Tips for filming"]
}

Ensure the total duration is close to ${input.targetDuration} seconds. 
The script should be rhythmic, concise, and optimized for spoken word.
`;
}

function formatTrendContext(trends: TrendAnalysis): string {
  const topHook = trends.patterns.hookPatterns[0];
  const topCTA = trends.patterns.commonCTAs[0];
  
  return `
  - Proven Hook Style: ${topHook ? `${topHook.type} (e.g. "${topHook.examples[0]}")` : 'N/A'}
  - Effective CTA: ${topCTA || 'N/A'}
  - Recommended Editing Pace: ${trends.patterns.editingTrends.averageCutFrequency}
  - Insights: ${trends.insights.join('; ')}
  `;
}

function parseScriptResponse(responseText: string, targetDuration: number): Script {
  try {
     const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsed = JSON.parse(jsonString);

    // Basic validation & default filling
    return {
      title: parsed.title || 'Untitled Script',
      hook: {
        type: parsed.hook?.type || 'other',
        text: parsed.hook?.text || '',
        duration: parsed.hook?.duration || 3
      },
      body: {
        sections: Array.isArray(parsed.body?.sections) ? parsed.body.sections : []
      },
      cta: {
        type: parsed.cta?.type || 'none',
        text: parsed.cta?.text || '',
        duration: parsed.cta?.duration || 3
      },
      totalDuration: parsed.totalDuration || targetDuration,
      notes: parsed.notes || [],
      generatedAt: new Date()
    };
  } catch (e) {
    console.error('Failed to parse Script JSON:', responseText);
    throw new Error('Invalid JSON received from Claude API during script generation');
  }
}
