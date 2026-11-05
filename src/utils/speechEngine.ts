/**
 * Speech Engine Utility for STJ Viola Kondektur Digital
 * Provides multi-tier speech synthesis:
 * Tier 1: Bundled Studio WAV Audio files (GitHub Pages static ready, 0ms latency)
 * Tier 2: Backend Express server (/api/synthesize-speech)
 * Tier 3: Client-side Gemini 3.8 Flash Lite TTS direct API call (for GitHub Pages static deployment with API key)
 * Tier 4: Calibrated Indonesian Neural Browser Speech Synthesis (zero-robotics fallback)
 */

export interface VoiceOption {
  id: 'Fenrir' | 'Puck' | 'Charon' | 'Kore';
  name: string;
  role: string;
  description: string;
  gender: 'male' | 'female';
  tone: string;
}

export const GEMINI_VOICES: VoiceOption[] = [
  {
    id: 'Fenrir',
    name: 'Mas Fenrir',
    role: 'Penyiar Utama STJ',
    description: 'Suara pria berwibawa, menawan, dan hangat khas penyiar resmi PO Sudiro Tungga Jaya.',
    gender: 'male',
    tone: 'Berwibawa & Hangat'
  },
  {
    id: 'Puck',
    name: 'Mas Puck',
    role: 'Kondektur Ramah',
    description: 'Suara pria ramah, bersahabat, santai, dan akrab dengan seluruh penumpang bus.',
    gender: 'male',
    tone: 'Ramah & Energik'
  },
  {
    id: 'Charon',
    name: 'Mas Charon',
    role: 'Penyiar Eksekutif',
    description: 'Suara pria dewasa dengan nada bass mantap, tenang, dan elegan.',
    gender: 'male',
    tone: 'Tenang & Dewasa'
  },
  {
    id: 'Kore',
    name: 'Mbak Kore',
    role: 'Penyiar Terminal',
    description: 'Suara wanita penyiar stasiun bus yang merdu, lembut, anggun, dan sopan.',
    gender: 'female',
    tone: 'Merdu & Anggun'
  }
];

export const VOICE_STYLES: Record<string, string> = {
  Fenrir: 'Natural, warm, authoritative Indonesian male bus conductor and terminal announcer with clear diction and friendly tone',
  Puck: 'Friendly, energetic, clear Indonesian male bus announcer with warm intonation',
  Charon: 'Deep, mature, calm Indonesian male executive coach announcer with gentle cadence',
  Kore: 'Gentle, clear, polite Indonesian female terminal announcer with articulate Indonesian pronunciation',
};

/**
 * Phonetically formats Indonesian announcement texts to avoid robotic pronunciation in browser TTS:
 * - Spells out acronyms (STJ -> S T J, PO -> P O, WIB -> W I B)
 * - Expands units (KM -> kilometer, KM/Jam -> kilometer per jam)
 * - Inserts natural comma pauses for human-like breath pacing
 */
export function formatIndonesianTextForSpeech(rawText: string): string {
  if (!rawText) return '';

  return rawText
    // Acronyms
    .replace(/\bSTJ\b/g, 'S T J')
    .replace(/\bPO\.\b/g, 'P O')
    .replace(/\bPO\b/g, 'P O')
    .replace(/\bWIB\b/g, 'W I B')
    .replace(/\bWITA\b/g, 'W I T A')
    .replace(/\bWIT\b/g, 'W I T')
    .replace(/\bETA\b/g, 'perkiraan tiba')
    .replace(/\bGPS\b/g, 'G P S')
    .replace(/\bAKAP\b/g, 'antar kota antar provinsi')
    
    // Units
    .replace(/(\d+)\s*km\/jam/gi, '$1 kilometer per jam')
    .replace(/(\d+)\s*KM\/Jam/gi, '$1 kilometer per jam')
    .replace(/(\d+)\s*KM/gi, '$1 kilometer')
    .replace(/(\d+)\s*km/gi, '$1 kilometer')
    .replace(/(\d+)\s*m\b/gi, '$1 meter')
    
    // Terminals & locations
    .replace(/\bTerm\.\b/gi, 'Terminal ')
    .replace(/±\s*(\d+)/g, 'kurang lebih $1')
    .replace(/&lt;/g, 'kurang dari')
    .replace(/&gt;/g, 'lebih dari')
    .replace(/< 500m/gi, 'kurang dari lima ratus meter')
    .replace(/<\s*(\d+)\s*m/gi, 'kurang dari $1 meter')
    .replace(/\//g, ' atau ')
    
    // Natural breathing pause insertion
    .replace(/\.\s+/g, '. ... ')
    .replace(/,\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find the highest-quality Indonesian neural or natural voice available on the client device
 */
export function getBestIndonesianVoice(
  voices: SpeechSynthesisVoice[],
  preferredUri?: string,
  preferMale: boolean = true
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  if (preferredUri) {
    const selected = voices.find(v => v.voiceURI === preferredUri);
    if (selected) return selected;
  }

  const indonesianVoices = voices.filter(v => 
    v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().startsWith('in')
  );

  if (indonesianVoices.length === 0) {
    return voices.find(v => v.default) || voices[0] || null;
  }

  if (preferMale) {
    // Prefer male Indonesian voices (Ardi, Darma, Indra, Budi, or names containing 'male'/'pria'/'laki')
    const maleVoice = indonesianVoices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes('male') || name.includes('pria') || name.includes('ardi') || name.includes('darma') || name.includes('indra') || name.includes('budi');
    });
    if (maleVoice) return maleVoice;

    // Google Indonesian neural voice or default
    const googleId = indonesianVoices.find(v => v.name.toLowerCase().includes('google'));
    if (googleId) return googleId;
  } else {
    // Prefer female Indonesian voices (Gadis, Putri, Siti, or names containing 'female'/'wanita')
    const femaleVoice = indonesianVoices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes('female') || name.includes('wanita') || name.includes('gadis') || name.includes('putri') || name.includes('siti');
    });
    if (femaleVoice) return femaleVoice;

    const googleId = indonesianVoices.find(v => v.name.toLowerCase().includes('google'));
    if (googleId) return googleId;
  }

  return indonesianVoices[0] || voices[0] || null;
}

/**
 * Call Gemini 3.8 Flash Lite TTS directly from client-side browser
 * (Allows full 24kHz Studio Human Voice when deployed statically to GitHub Pages!)
 */
export async function synthesizeWithGeminiClientDirect(
  text: string,
  voiceName: string = 'Fenrir',
  apiKey: string
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Kunci API Gemini belum diatur.');
  }

  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${cleanKey}`;
  const style = VOICE_STYLES[voiceName] || VOICE_STYLES.Fenrir;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text,
            speechMetadata: {
              style: style,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          },
        },
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `Gemini API Error (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed?.error?.message) {
        errorMsg = parsed.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Audio) {
    throw new Error('Tidak ada data audio dari respon Gemini TTS.');
  }

  return base64Audio;
}

/**
 * Storage helpers for user Gemini API key
 */
const STORAGE_KEY_API_KEY = 'stj_gemini_api_key';
const STORAGE_KEY_VOICE_URI = 'stj_browser_voice_uri';

export function getStoredGeminiApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_API_KEY) || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  } catch {
    return '';
  }
}

export function saveStoredGeminiApiKey(key: string): void {
  try {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
    }
  } catch (e) {
    console.error('Failed to save API key to localStorage', e);
  }
}

export function getStoredVoiceUri(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_VOICE_URI) || '';
  } catch {
    return '';
  }
}

export function saveStoredVoiceUri(uri: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOICE_URI, uri);
  } catch (e) {
    console.error('Failed to save Voice URI', e);
  }
}
