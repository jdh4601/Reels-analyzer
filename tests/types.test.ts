import {
  Platform,
  HookType,
  CTAType,
  ShotType,
  ReelMetadata,
  Reel,
  Transcript,
  TranscriptSegment,
  ReelAnalysis,
  Script,
  Storyboard,
} from '../src/types';

describe('Types', () => {
  describe('Platform type', () => {
    it('should accept valid platforms', () => {
      const instagram: Platform = 'instagram';
      const tiktok: Platform = 'tiktok';
      const youtube: Platform = 'youtube';

      expect(instagram).toBe('instagram');
      expect(tiktok).toBe('tiktok');
      expect(youtube).toBe('youtube');
    });
  });

  describe('HookType', () => {
    it('should accept valid hook types', () => {
      const types: HookType[] = ['question', 'shock', 'empathy', 'list', 'promise', 'story', 'other'];
      expect(types).toHaveLength(7);
    });
  });

  describe('CTAType', () => {
    it('should accept valid CTA types', () => {
      const types: CTAType[] = ['follow', 'like', 'comment', 'save', 'share', 'link', 'none'];
      expect(types).toHaveLength(7);
    });
  });

  describe('ShotType', () => {
    it('should accept valid shot types', () => {
      const types: ShotType[] = ['closeup', 'medium', 'wide', 'pov', 'broll', 'text-only', 'split-screen'];
      expect(types).toHaveLength(7);
    });
  });

  describe('ReelMetadata', () => {
    it('should create valid metadata object', () => {
      const metadata: ReelMetadata = {
        url: 'https://instagram.com/reel/abc123',
        platform: 'instagram',
        videoId: 'abc123',
        title: 'Test Reel',
        author: 'testuser',
        duration: 30,
        downloadedAt: new Date(),
        filePath: '/output/downloads/abc123.mp4',
      };

      expect(metadata.url).toContain('instagram');
      expect(metadata.platform).toBe('instagram');
      expect(metadata.duration).toBe(30);
    });
  });

  describe('TranscriptSegment', () => {
    it('should create valid segment', () => {
      const segment: TranscriptSegment = {
        start: 0,
        end: 3,
        text: 'Hook text here',
      };

      expect(segment.end - segment.start).toBe(3);
      expect(segment.text).toBeTruthy();
    });
  });

  describe('Transcript', () => {
    it('should create valid transcript', () => {
      const transcript: Transcript = {
        segments: [
          { start: 0, end: 3, text: 'Hook' },
          { start: 3, end: 25, text: 'Body content' },
          { start: 25, end: 30, text: 'Call to action' },
        ],
        fullText: 'Hook Body content Call to action',
        language: 'ko',
        duration: 30,
      };

      expect(transcript.segments).toHaveLength(3);
      expect(transcript.duration).toBe(30);
    });
  });

  describe('Script', () => {
    it('should create valid script structure', () => {
      const script: Script = {
        title: 'Test Script',
        hook: {
          type: 'question',
          text: 'Did you know this simple trick?',
          duration: 3,
        },
        body: {
          sections: [
            {
              text: 'Here is the main content',
              duration: 22,
              visualNotes: 'Show demonstration',
            },
          ],
        },
        cta: {
          type: 'follow',
          text: 'Follow for more tips!',
          duration: 5,
        },
        totalDuration: 30,
        notes: ['Use trending audio'],
        generatedAt: new Date(),
      };

      expect(script.hook.type).toBe('question');
      expect(script.cta.type).toBe('follow');
      expect(script.totalDuration).toBe(30);
    });
  });
});
