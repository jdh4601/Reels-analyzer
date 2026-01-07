
import { ReelAnalysis } from '../types';
import { callAI, parseJsonFromLlmLiteral } from '../llm';

interface TrendInsightResponse {
    insights: string[];
    recommendations: string[];
}

/**
 * Generates insights and recommendations from multiple reel analyses using an AI model.
 *
 * @param analyses - An array of ReelAnalysis objects.
 * @returns A promise that resolves to an object containing insights and recommendations.
 */
export async function generateAIInsights(analyses: ReelAnalysis[]): Promise<{ insights: string[], recommendations: string[] }> {
    const prompt = createInsightsPrompt(analyses);
    const systemPrompt = `You are a world-class social media analyst and content strategist. Your task is to analyze a collection of short-form video data (Reels) and produce a report with sharp, actionable insights and creative recommendations.

    The user will provide a JSON object containing an array of video analyses.

    Your response MUST be a valid JSON object with two keys:
    1.  "insights": An array of 3-5 key takeaways. These should be non-obvious and highlight patterns in what makes content successful (e.g., "Hooks that create a knowledge gap are outperforming emotional hooks by 30%").
    2.  "recommendations": An array of 3-5 creative, actionable ideas for new content, based on the identified trends. For example, "Create a 'Part 2' to a popular video, but frame it as a response to a common question from the comments."

    Output ONLY the JSON object. Do not include any other text or markdown formatting.`;

    const llmResponse = await callAI(prompt, systemPrompt);

    try {
        const parsed = parseJsonFromLlmLiteral<TrendInsightResponse>(llmResponse);
        return {
            insights: parsed.insights || [],
            recommendations: parsed.recommendations || []
        };
    } catch (error) {
        console.error("Failed to parse AI-generated insights, returning empty arrays.", error);
        // Fallback to empty arrays if parsing fails
        return {
            insights: [],
            recommendations: []
        };
    }
}

/**
 * Creates a string prompt from the analysis data for the AI model.
 *
 * @param analyses - An array of ReelAnalysis objects.
 * @returns A stringified, summarized version of the analyses for the prompt.
 */
function createInsightsPrompt(analyses: ReelAnalysis[]): string {
    // We can't send the full data, so we summarize it.
    const summarizedAnalyses = analyses.map(a => ({
        hookType: a.hookType,
        hookText: a.hookText.slice(0, 100), // Truncate for brevity
        ctaType: a.ctaType,
        totalDuration: a.totalDuration,
        summary: a.summary,
        cutFrequency: a.editingStyle.cutFrequency,
        textOverlay: a.editingStyle.textOverlay
    }));

    const promptData = {
        analyzedCount: analyses.length,
        data: summarizedAnalyses
    };

    return `
    Here is a summary of ${analyses.length} video analyses:

    ${JSON.stringify(promptData, null, 2)}

    Based on this data, please generate your report as a valid JSON object.
    `;
}
