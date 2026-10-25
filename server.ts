import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client if key is provided
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// API: Analyze overnight group chats
app.post('/api/analyze-chats', async (req: Request, res: Response) => {
  try {
    const { messages, userName = 'Alex', tone = 'crisp', sleepStart = '23:00', sleepEnd = '07:00' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided to analyze' });
    }

    if (!ai) {
      // Local intelligent synthesis fallback if GEMINI_API_KEY is not set
      return res.json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured; synthesized via local rules engine.',
      });
    }

    // Format messages for prompt
    const chatTranscript = messages
      .map((m: any) => `[${m.timestamp}] [${m.platform.toUpperCase()}] [${m.groupName}] ${m.sender}: ${m.text}`)
      .join('\n');

    const toneDirectives: Record<string, string> = {
      crisp: 'Ultra-concise, high-efficiency, zero small talk. Maximum signal per syllable.',
      witty: 'Clever, slightly dry, protective of the user’s morning peace, gently noting nighttime chaos.',
      executive: 'Boardroom-ready, decision-focused, emphasizing risk mitigation and deadlines.',
      protective: 'Calm, grounding, ensuring no panic, prioritizing what genuinely matters vs noise.',
    };

    const prompt = `You are DawnBrief, a local overnight agent monitoring group chats while the user (${userName}) sleeps (${sleepStart} to ${sleepEnd}).
Analyze the following overnight group chat transcript:

${chatTranscript}

Your goal: Produce a high-precision morning briefing.
CRITICAL CONSTRAINT: You MUST provide an exact TWO-LINE morning summary:
- line1: The single most impactful overnight verdict, incidents, and major group shifts (what went down while they slept).
- line2: The exact immediate decisions, deadlines, or direct replies required from ${userName} this morning.

Tone requirement: ${toneDirectives[tone] || toneDirectives.crisp}.

Return valid JSON adhering to the specified schema.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out after 18s')), 18000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            line1: {
              type: Type.STRING,
              description: 'Line 1 of the morning brief: Key overnight developments & breakthroughs.',
            },
            line2: {
              type: Type.STRING,
              description: 'Line 2 of the morning brief: Immediate actions, deadlines, and replies needed today.',
            },
            keyTakeawayTitle: {
              type: Type.STRING,
              description: 'A 5-8 word punchy headline for the overnight summary.',
            },
            peakHour: {
              type: Type.STRING,
              description: 'The time window when overnight chats were most active (e.g. "01:30 AM – 03:00 AM").',
            },
            actionItems: {
              type: Type.ARRAY,
              description: 'Specific tasks or replies required from the user.',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  groupName: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  from: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  task: { type: Type.STRING },
                  urgency: { type: Type.STRING, description: 'high, medium, or low' },
                  suggestedReply: { type: Type.STRING, description: 'Natural 1-click reply draft for user' },
                },
                required: ['id', 'groupName', 'platform', 'from', 'task', 'urgency', 'suggestedReply'],
              },
            },
            groupSummaries: {
              type: Type.ARRAY,
              description: 'Breakdown per active group chat.',
              items: {
                type: Type.OBJECT,
                properties: {
                  groupId: { type: Type.STRING },
                  groupName: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  messageCount: { type: Type.INTEGER },
                  vibe: { type: Type.STRING, description: 'chill, productive, fiery, chaotic, or urgent' },
                  oneLineSummary: { type: Type.STRING },
                  keyDecisions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  topSpeakers: { type: Type.ARRAY, items: { type: Type.STRING } },
                  overnightPeak: { type: Type.STRING },
                },
                required: ['groupId', 'groupName', 'platform', 'vibe', 'oneLineSummary', 'keyDecisions'],
              },
            },
            nightTimeline: {
              type: Type.ARRAY,
              description: 'Key timeline milestones during the night.',
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  groupName: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  event: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  intensity: { type: Type.STRING, description: 'low, medium, or high' },
                },
                required: ['time', 'groupName', 'platform', 'event', 'speaker', 'intensity'],
              },
            },
            audioScript: {
              type: Type.STRING,
              description: 'Spoken morning briefing audio script (~45 seconds) reading the 2-line brief and key actions.',
            },
          },
          required: [
            'line1',
            'line2',
            'keyTakeawayTitle',
            'peakHour',
            'actionItems',
            'groupSummaries',
            'nightTimeline',
            'audioScript',
          ],
        },
      },
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze overnight chats',
      details: error?.message || String(error),
    });
  }
});

// API: Generate Morning Briefing Voice (TTS)
app.post('/api/generate-tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured for TTS' });
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TTS call timed out')), 10000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: 'Clear, warm, sophisticated morning radio briefing tone, calm and articulate',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice, // 'Kore', 'Puck', 'Fenrir', 'Zephyr'
            },
          },
        },
      },
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS' });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (err: any) {
    console.error('Gemini TTS error:', err);
    return res.status(500).json({
      error: 'Failed to generate speech',
      details: err?.message || String(err),
    });
  }
});

// API: Transcribe Audio using gemini-3.5-transcribe
app.post('/api/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured' });
    }

    // Clean MIME type, removing codecs parameter if present
    const cleanMime = (mimeType || 'audio/webm').split(';')[0];

    const audioPart = {
      inlineData: {
        mimeType: cleanMime,
        data: audioBase64,
      },
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Transcription timed out after 15s')), 15000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe this spoken audio accurately. Output only the plain transcribed words with standard punctuation, no commentary or formatting.' },
        ],
      },
    });

    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const transcription = response.text?.trim() || '';

    return res.json({ transcription });
  } catch (err: any) {
    console.error('Gemini transcription error:', err);
    return res.status(500).json({
      error: 'Failed to transcribe audio',
      details: err?.message || String(err),
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DawnBrief Server running on port ${PORT}`);
  });
}

startServer();
