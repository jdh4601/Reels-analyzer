
import { generateStoryboard } from '../src/generator/storyboard';
import { Script } from '../src/types';
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

describe('Storyboard Generator', () => {
  beforeEach(() => {
    mockCreate.mockClear();
    config.anthropicApiKey = 'test-key';
  });

  const mockScript: Script = {
    title: "Coffee Tips",
    hook: { type: "promise", text: "Best coffee hack.", duration: 3 },
    body: {
      sections: [
        { text: "Use cold water.", duration: 5, visualNotes: "Pouring" }
      ]
    },
    cta: { type: "save", text: "Save for later.", duration: 2 },
    totalDuration: 10,
    notes: [],
    generatedAt: new Date()
  };

  it('should generate a storyboard successfully', async () => {
    const mockOutput = {
      cuts: [
        {
          cutNumber: 1,
          startTime: 0,
          endTime: 3,
          shotType: "closeup",
          description: "Close up of holding coffee cup",
          script: "Best coffee hack.",
          textOverlay: "BEST HACK",
          transition: "zoom-in"
        }
      ],
      audioTrack: "Lo-fi beats",
      notes: ["Keep it cozy"]
    };

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockOutput) }]
    });

    const storyboard = await generateStoryboard(mockScript);

    expect(storyboard.title).toBe(mockScript.title);
    expect(storyboard.cuts).toHaveLength(1);
    expect(storyboard.cuts[0].shotType).toBe('closeup');
    expect(storyboard.audioTrack).toBe("Lo-fi beats");
    
    // Check prompt content
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
            role: "user",
            content: expect.stringMatching(/Coffee Tips/i)
        })
      ])
    }));
  });

  it('should sanitize invalid shot types', async () => {
    const mockOutput = {
      cuts: [
        {
          cutNumber: 1,
          startTime: 0,
          endTime: 5,
          shotType: "invalid-shot-type", // Should fallback to medium
          description: "desc",
          script: "text"
        }
      ]
    };

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockOutput) }]
    });

    const storyboard = await generateStoryboard(mockScript);
    expect(storyboard.cuts[0].shotType).toBe('medium');
  });

  it('should handle API errors', async () => {
    mockCreate.mockRejectedValue(new Error('API Error'));
    await expect(generateStoryboard(mockScript)).rejects.toThrow('Failed to generate storyboard');
  });
});
