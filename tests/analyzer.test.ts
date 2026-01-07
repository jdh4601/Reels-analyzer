
import { analyzeStructure } from '../src/analyzer/structure';
import { Transcript } from '../src/types';
import { config } from '../src/config';

// Mock Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => {
    return {
      messages: {
        create: mockCreate
      }
    };
  });
});

describe('Structure Analyzer', () => {
  const mockTranscript: Transcript = {
    fullText: "Stop simple scrolling! Do you want to grow your account? Here are 3 tips. First, post daily. Second, engage. Third, use trending audio. Follow for more!",
    segments: [
      { start: 0, end: 2, text: "Stop simple scrolling!" },
      { start: 2, end: 5, text: "Do you want to grow your account?" },
      { start: 5, end: 12, text: "Here are 3 tips. First, post daily. Second, engage. Third, use trending audio." },
      { start: 12, end: 15, text: "Follow for more!" }
    ],
    duration: 15
  };

  beforeEach(() => {
    mockCreate.mockClear();
    config.anthropicApiKey = 'test-key';
  });

  it('should correctly analyze a transcript', async () => {
    // Mock Claude's response
    const mockAnalysisResponse = {
      hookTime: 2,
      hookType: "shock",
      hookText: "Stop simple scrolling!",
      sections: [
        { name: "hook", startTime: 0, endTime: 2, content: "Stop simple scrolling!", purpose: "Grab attention" },
        { name: "body", startTime: 2, endTime: 12, content: "3 tips to grow", purpose: "Deliver value" },
        { name: "cta", startTime: 12, endTime: 15, content: "Follow for more", purpose: "Conversion" }
      ],
      ctaType: "follow",
      ctaText: "Follow for more!",
      summary: "A video giving 3 tips for growth.",
      engagementHooks: ["Stop simple scrolling"],
      editingStyle: { cutFrequency: "medium", textOverlay: true, transitionEffects: [] },
      audioStyle: { hasVoiceover: true, hasTrendingSound: false, subtitleDependent: false }
    };

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockAnalysisResponse) }]
    });

    const result = await analyzeStructure(mockTranscript);

    expect(result).toBeDefined();
    expect(result.hookType).toBe('shock');
    expect(result.sections).toHaveLength(3);
    expect(result.ctaType).toBe('follow');
    expect(result.totalDuration).toBe(15);
    
    // Verify API call
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: "claude-3-haiku-20240307",
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("Stop simple scrolling")
        })
      ])
    }));
  });

  it('should handle API errors', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));
    await expect(analyzeStructure(mockTranscript)).rejects.toThrow('Failed to analyze structure');
  });

  it('should handle invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: "Not valid JSON" }]
    });
    await expect(analyzeStructure(mockTranscript)).rejects.toThrow('Invalid JSON received');
  });
});
