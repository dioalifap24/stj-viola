import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as googleTTS from 'google-tts-api';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Accurate route distances and real GPS coordinates for STJ Viola Ekonomi
const CHECKPOINTS_SURABAYA_TO_MAGETAN = [
  { id: 'exit-dumpil', name: 'Exit Toll Dumpil', lat: -7.5752, lng: 111.5794, distanceKm: 150, estTime: '15:30 WIB', status: 'checkpoint', description: 'Pemberhentian pertama keluar tol Dumpil Madiun.' },
  { id: 'term-madiun', name: 'Terminal Madiun', lat: -7.6046, lng: 111.5235, distanceKm: 156, estTime: '15:45 WIB', status: 'checkpoint', description: 'Pemberhentian di Terminal Purboyo Madiun.' },
  { id: 'pertigaan-totok', name: 'Pertigaan Totok', lat: -7.5954, lng: 111.4880, distanceKm: 161, estTime: '16:00 WIB', status: 'checkpoint', description: 'Penurunan penumpang area Pertigaan Totok.' },
  { id: 'garasi-stj', name: 'Garasi STJ', lat: -7.5785, lng: 111.4550, distanceKm: 166, estTime: '16:15 WIB', status: 'checkpoint', description: 'Transit / Garasi pusat Sudiro Tungga Jaya.' },
  { id: 'jalan-mbarat', name: 'Jalan Mbarat', lat: -7.5615, lng: 111.4390, distanceKm: 169, estTime: '16:22 WIB', status: 'checkpoint', description: 'Pemberhentian area Jalan Mbarat / Stasiun Barat.' },
  { id: 'term-maospati', name: 'Terminal Maospati', lat: -7.5458, lng: 111.4344, distanceKm: 173, estTime: '16:30 WIB', status: 'checkpoint', description: 'Pemberhentian Terminal Maospati.' },
  { id: 'sukomoro', name: 'Sukomoro', lat: -7.6180, lng: 111.3850, distanceKm: 180, estTime: '16:42 WIB', status: 'checkpoint', description: 'Pemberhentian area Sukomoro Magetan.' },
  { id: 'pasar-jengglong', name: 'Pasar Jengglong', lat: -7.6410, lng: 111.3480, distanceKm: 185, estTime: '16:55 WIB', status: 'checkpoint', description: 'Pemberhentian Pasar Jengglong Magetan.' },
  { id: 'term-magetan', name: 'Terminal Magetan (Tujuan Akhir)', lat: -7.6534, lng: 111.3325, distanceKm: 190, estTime: '17:10 WIB', status: 'arrival', description: 'Terminal akhir kedatangan Magetan.' }
];

const CHECKPOINTS_MAGETAN_TO_SURABAYA = [
  { id: 'menanggal', name: 'Menanggal', lat: -7.3392, lng: 112.7230, distanceKm: 178, estTime: '11:00 WIB', status: 'checkpoint', description: 'Pemberhentian pertama area Menanggal Surabaya Selatan.' },
  { id: 'medaeng', name: 'Medaeng', lat: -7.3562, lng: 112.7205, distanceKm: 182, estTime: '11:12 WIB', status: 'checkpoint', description: 'Pemberhentian Halte Medaeng / Waru.' },
  { id: 'grab-long', name: 'Grab Long', lat: -7.3540, lng: 112.7235, distanceKm: 184, estTime: '11:25 WIB', status: 'checkpoint', description: 'Pemberhentian area Grab Long / Bungurasih luar.' },
  { id: 'ramayana', name: 'Ramayana', lat: -7.3530, lng: 112.7250, distanceKm: 186, estTime: '11:38 WIB', status: 'checkpoint', description: 'Pemberhentian halte dekat Ramayana Bungurasih.' },
  { id: 'term-bungurasih', name: 'Terminal Purabaya Bungurasih (Tujuan Akhir)', lat: -7.3524, lng: 112.7265, distanceKm: 188, estTime: '11:50 WIB', status: 'arrival', description: 'Terminal akhir kedatangan Purabaya Bungurasih Surabaya.' }
];

// API: Get Checkpoints
app.get('/api/checkpoints', (req, res) => {
  const route = req.query.route as string || 'surabaya-magetan';
  if (route === 'magetan-surabaya') {
    res.json(CHECKPOINTS_MAGETAN_TO_SURABAYA);
  } else {
    res.json(CHECKPOINTS_SURABAYA_TO_MAGETAN);
  }
});

// API: Generate AI Announcement Script & Tone
app.post('/api/generate-announcement', async (req, res) => {
  try {
    const { type, locationName, customPrompt, routeDirection } = req.body;
    
    let promptText = '';
    const dirText = routeDirection === 'magetan-surabaya' ? 'Magetan menuju Surabaya' : 'Surabaya menuju Magetan';

    if (type === 'welcome') {
      promptText = `Buatlah naskah pengumuman resmi kondektur / penyiar bus PO. Sudiro Tungga Jaya (STJ) armada "Viola" Kelas Ekonomi rute ${dirText}. Awali dengan "Perhatian... Perhatian kepada seluruh penumpang...". Sambut penumpang dan ingatkan menjaga barang bawaan. JANGAN pernah menyebutkan angka jarak tempuh, kilometer, ataupun angka kecepatan.`;
    } else if (type === 'ticket-payment') {
      promptText = `Buatlah pengumuman kondektur bus STJ Viola Ekonomi untuk persiapan pemeriksaan tiket dan pembayaran ongkos bus. Awali dengan "Perhatian kepada seluruh penumpang...". JANGAN menyebutkan angka jarak tempuh kilometer ataupun kecepatan.`;
    } else if (type === 'checkpoint') {
      promptText = `Buatlah naskah pengumuman kondektur bus STJ Viola yang akan tiba di titik pemberhentian "${locationName}" (rute ${dirText}). Awali dengan "Perhatian seluruh penumpang... Bus STJ Viola sebentar lagi akan tiba di ${locationName}...". Ingatkan penumpang yang turun untuk bersiap dan memeriksa barang. JANGAN menyebutkan angka jarak tempuh kilometer ataupun kecepatan.`;
    } else {
      promptText = `Buatlah pengumuman bus STJ Viola dengan topik: "${customPrompt}". Gaya bahasa kondektur bus ramah, profesional, dan berwibawa. Jangan menyebutkan angka jarak tempuh atau angka kecepatan.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: 'Anda adalah kondektur dan penyiar audio profesional untuk bus Sudiro Tungga Jaya (STJ) "Viola" rute Surabaya - Magetan. Awali pengumuman dengan ramah dan sopan seperti "Perhatian...". DILARANG menyebutkan angka sisa jarak tempuh ataupun angka kecepatan bus dalam pengumuman suara.',
      }
    });

    res.json({ script: response.text || 'Perhatian... Perhatian kepada seluruh penumpang STJ Viola...' });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Gagal menghasilkan naskah pengumuman.' });
  }
});

// API: Synthesize Studio-Quality Natural Human Voice (Gemini 3.8 Flash Lite TTS)
app.post('/api/synthesize-speech', async (req, res) => {
  const { text, voiceName = 'Fenrir', voiceStyle } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text pengumuman wajib diisi.' });
  }

  try {

    const defaultStyles: Record<string, string> = {
      Fenrir: 'Natural, warm, charming, authoritative Indonesian male bus conductor and terminal announcer with clear diction',
      Puck: 'Friendly, energetic, clear Indonesian male bus announcer with warm intonation',
      Charon: 'Deep, mature, elegant Indonesian male executive coach announcer with calm cadence',
      Kore: 'Gentle, clear, polite Indonesian female terminal announcer',
    };

    const styleToUse = voiceStyle || defaultStyles[voiceName] || defaultStyles.Fenrir;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text,
              speechMetadata: {
                style: styleToUse,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('Tidak ada data audio yang dihasilkan oleh Gemini TTS.');
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.warn('Gemini TTS Error, falling back to Google TTS API:', error?.message || error);
    try {
      const getAudioFn = (googleTTS as any).getAllAudioBase64 || (googleTTS as any).default?.getAllAudioBase64;
      if (!getAudioFn) {
        throw new Error('getAllAudioBase64 is not a function');
      }
      const chunks = await getAudioFn(text, {
        lang: 'id',
        slow: false,
        timeout: 10000,
      });
      const buffers = chunks.map((c: any) => Buffer.from(c.base64, 'base64'));
      const combined = Buffer.concat(buffers);
      return res.json({
        audioBase64: combined.toString('base64'),
        mimeType: 'audio/mp3',
      });
    } catch (fallbackErr: any) {
      console.error('Google TTS fallback also failed:', fallbackErr?.message || fallbackErr);
      res.status(500).json({ error: 'Gagal memproses suara: ' + (fallbackErr?.message || error?.message) });
    }
  }
});

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
