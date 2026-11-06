/**
 * Speech Engine Utility for STJ Viola Kondektur Digital
 * Provides multi-tier speech synthesis for 1 Normal Adult Male Voice:
 * Tier 1: Bundled Studio MP3 Audio files (Natural 24kHz adult male speech)
 * Tier 2: Backend Express server (/api/synthesize-speech)
 * Tier 3: Client-side Gemini 3.8 Flash Lite TTS direct API call (for GitHub Pages static deployment)
 * Tier 4: Calibrated Indonesian Neural Browser Speech Synthesis (adult male fallback)
 */

export interface VoiceOption {
  id: 'Fenrir';
  name: string;
  role: string;
  description: string;
  gender: 'male';
  tone: string;
}

export const GEMINI_VOICES: VoiceOption[] = [
  {
    id: 'Fenrir',
    name: 'Mas Jully',
    role: 'Kondektur & Penyiar Utama STJ',
    description: 'Suara manusia pria dewasa normal, jernih, berwibawa, dan ramah khas kondektur resmi PO Sudiro Tungga Jaya.',
    gender: 'male',
    tone: 'Pria Dewasa Normal'
  }
];

export const VOICE_STYLES: Record<string, string> = {
  Fenrir: 'Energetic, engaging, professional Indonesian adult male TV presenter announcer with articulate diction, charismatic tone, and high-energy projection',
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
 * Find the highest-quality Indonesian adult male voice available on the client device
 */
export function getBestIndonesianVoice(
  voices: SpeechSynthesisVoice[],
  preferredUri?: string,
  _preferMale: boolean = true
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

  // Always search for male Indonesian voices
  const maleVoice = indonesianVoices.find(v => {
    const name = v.name.toLowerCase();
    return name.includes('male') || name.includes('pria') || name.includes('ardi') || name.includes('darma') || name.includes('indra') || name.includes('budi');
  });
  if (maleVoice) return maleVoice;

  const googleId = indonesianVoices.find(v => v.name.toLowerCase().includes('google'));
  if (googleId) return googleId;

  return indonesianVoices[0] || voices[0] || null;
}

import { ElevenLabsClient } from 'elevenlabs';

// ... (keep VoiceOption, GEMINI_VOICES, formatIndonesianTextForSpeech, getBestIndonesianVoice as is, but adapt synthesizeWithElevenLabs)

export const ELEVENLABS_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam

export async function synthesizeWithElevenLabs(
  text: string,
  apiKey: string
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Kunci API ElevenLabs belum diatur.');
  }

  const client = new ElevenLabsClient({ apiKey: apiKey.trim() });
  
  try {
    const audioStream = await client.textToSpeech.convert(ELEVENLABS_VOICE_ID, {
      text: text,
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
    });

    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return buffer.toString('base64');
  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    throw new Error('Gagal memproses suara dengan ElevenLabs.');
  }
}
// ... (rest of the file helpers)


/**
 * Storage helpers for user ElevenLabs API key
 */
const STORAGE_KEY_API_KEY = 'stj_elevenlabs_api_key';
const STORAGE_KEY_VOICE_URI = 'stj_browser_voice_uri';

export function getStoredElevenLabsApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_API_KEY) || (import.meta.env.VITE_ELEVENLABS_API_KEY as string) || '';
  } catch {
    return '';
  }
}

export function saveStoredElevenLabsApiKey(key: string): void {
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
