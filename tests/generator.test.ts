
import { generateScript } from '../src/generator/script';
import { ScriptInput, TrendAnalysis } from '../src/types';
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

describe('Script Generator', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    config.anthropicApiKey = 'test-key';
  });

  const basicInput: ScriptInput = {
    topic: 'How to make coffee',
    targetDuration: 30,
    tone: 'casual'
  };

  it('should generate a script successfully', async () => {
    const mockOutput = {
      title: "Perfect Coffee at Home",
      hook: { type: "promise", text: "Stop buying expensive coffee!", duration: 3 },
      body: {
        sections: [
          { text: "Grind fresh beans.", duration: 5, visualNotes: "Grinder close up" },
          { text: "Use filtered water.", duration: 5, visualNotes: "Pouring water" },
          { text: "Brew for 4 minutes.", duration: 10, visualNotes: "French press waiting" }
        ]
      },
      cta: { type: "save", text: "Save this recipe for later.", duration: 4 },
      totalDuration: 27,
      notes: ["High contrast visuals recommended"]
    };

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockOutput) }]
    });

    const script = await generateScript(basicInput);

    expect(script.title).toBe("Perfect Coffee at Home");
    expect(script.hook.type).toBe("promise");
    expect(script.body.sections).toHaveLength(3);
    
    // Check prompt content
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
            role: "user",
            content: expect.stringMatching(/How to make coffee/i)
        })
      ])
    }));
  });

  it('should incorporate trend analysis into prompt', async () => {
    const mockTrends: TrendAnalysis = {
        analyzedCount: 5,
        patterns: {
            hookPatterns: [{ type: 'shock', frequency: 5, examples: ['Wait!']}],
            popularFormats: [],
            averageDuration: 30,
            commonCTAs: ['share'],
            editingTrends: { averageCutFrequency: 'high', textOverlayUsage: 80, popularTransitions: [] }
        },
        insights: ['High energy works best'],
        recommendations: [],
        analyzedAt: new Date()
    };

    mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: "{}" }]
    });

    await generateScript({ ...basicInput, trendAnalysis: mockTrends });

    // Verify that the prompt included trend info
    const callArgs = mockCreate.mock.calls[0][0];
    const prompt = callArgs.messages[0].content;
    
    expect(prompt).toContain('Proven Hook Style: shock');
    expect(prompt).toContain('High energy works best');
  });

  it('should handle API errors', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));
    await expect(generateScript(basicInput)).rejects.toThrow('Failed to generate script');
  });
});
