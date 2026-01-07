
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2';

/**
 * Calls the AI model (Claude or Ollama) with a given prompt.
 * It will try Claude first and fall back to Ollama on failure.
 */
export async function callAI(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  // Try Claude API first if key is present
  if (config.anthropicApiKey) {
    try {
      return await callClaude(prompt, systemPrompt);
    } catch (error: any) {
      console.warn('Claude API failed, falling back to Ollama...', error.message);
    }
  }

  // Fallback to Ollama
  return await callOllama(prompt, systemPrompt);
}


/**
 * Calls the Claude API.
 */
export async function callClaude(prompt: string, systemPrompt: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey,
  });

  const msg = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 2000,
    temperature: 0,
    system: systemPrompt,
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

  return contentBlock.text;
}

/**
 * Calls a local Ollama instance.
 */
export async function callOllama(prompt: string, systemPrompt: string): Promise<string> {
  console.log(`🦙 Calling Ollama with model: ${OLLAMA_MODEL}`);

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2000,
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}\n${errorBody}`);
  }

  const result = await response.json() as { response?: string };

  if (!result.response) {
    throw new Error('Empty response from Ollama');
  }
  return result.response;
}

/**
 * Parses a JSON response from an LLM, extracting it from markdown code blocks if necessary.
 * @param responseText The raw text from the LLM.
 * @returns A parsed JavaScript object.
 */
export function parseJsonFromLlmLiteral<T>(responseText: string): T {
    try {
        // Extract JSON if wrapped in markdown code blocks
        let jsonString = responseText;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonString = jsonMatch[0];
        }

        // Remove trailing commas from arrays and objects
        jsonString = jsonString.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');

        // Add missing commas between string literals in an array
        jsonString = jsonString.replace(/\"\s*\"/g, '","');
        
        return JSON.parse(jsonString) as T;

    } catch (e: any) {
        console.error('Failed to parse LLM JSON response:', responseText);
        throw new Error(`Invalid JSON received from LLM: ${e.message}`);
    }
}
