
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { Script, Storyboard, StoryboardCut } from '../types';

/**
 * Generates a visual storyboard based on a provided script.
 */
export async function generateStoryboard(script: Script): Promise<Storyboard> {
  if (!config.anthropicApiKey) {
    throw new Error('Anthropic API Key not configured');
  }

  const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey,
  });

  const prompt = createStoryboardPrompt(script);

  try {
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2500,
      temperature: 0.5,
      system: "You are an expert video director and cinematographer. Your goal is to visualize a script into a concrete shot list and storyboard.",
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

    return parseStoryboardResponse(contentBlock.text, script);

  } catch (error: any) {
    throw new Error(`Failed to generate storyboard: ${error.message}`);
  }
}

function createStoryboardPrompt(script: Script): string {
  return `
Create a visual storyboard for the following short-form video script.

**Title**: ${script.title}
**Total Duration**: ${script.totalDuration}s

**Script Content**:
1. Hook (${script.hook.duration}s): "${script.hook.text}" [Type: ${script.hook.type}]
2. Body Sections:
${script.body.sections.map((s, i) => `   - Section ${i+1} (${s.duration}s): "${s.text}" (Note: ${s.visualNotes || 'N/A'})`).join('\n')}
3. CTA (${script.cta.duration}s): "${script.cta.text}" [Type: ${script.cta.type}]

**Requirements**:
- Break this down into individual CUTS (shots).
- A 60s video usually has 10-20 cuts. A 15s video might have 3-5.
- Assign a **Shot Type** for each cut: ['closeup', 'medium', 'wide', 'pov', 'broll', 'text-only', 'split-screen'].
- Provide a detailed **Visual Description** for the cameraperson/editor.
- Suggest **Text Overlays** where appropriate (key words).
- Suggest **Transitions** between cuts if needed.

**Output Format**:
Provide a valid JSON object with the following structure:
{
  "cuts": [
    {
      "cutNumber": 1,
      "startTime": 0,
      "endTime": number,
      "shotType": "closeup",
      "description": "Visual details...",
      "script": "Corresponding spoken words or part of them",
      "textOverlay": "Text on screen",
      "transition": "cut, zoom-in, whip-pan, etc."
    }
  ],
  "audioTrack": "Suggested background music vibe",
  "notes": ["Director notes"]
}
`;
}

function parseStoryboardResponse(responseText: string, script: Script): Storyboard {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsed = JSON.parse(jsonString);

    const cuts: StoryboardCut[] = parsed.cuts || [];
    
    // Sanity check: ensure valid shot types
    cuts.forEach(cut => {
       const validShots = ['closeup', 'medium', 'wide', 'pov', 'broll', 'text-only', 'split-screen'];
       if (!validShots.includes(cut.shotType)) {
           cut.shotType = 'medium'; // fallback
       }
    });

    return {
      title: script.title,
      cuts: cuts,
      totalDuration: script.totalDuration,
      audioTrack: parsed.audioTrack || 'Trending upbeat audio',
      notes: parsed.notes || [],
      generatedAt: new Date()
    };
  } catch (e) {
    console.error('Failed to parse Storyboard JSON:', responseText);
    throw new Error('Invalid JSON received from Claude API during storyboard generation');
  }
}
