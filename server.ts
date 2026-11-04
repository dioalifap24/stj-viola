import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
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
  { id: 'exit-dumpil', name: 'Exit Toll Dumpil', lat: -7.5752, lng: 111.5794, distanceKm: 145, estTime: '15:30 WIB', status: 'checkpoint', description: 'Pemberhentian pertama keluar tol Dumpil Madiun.' },
  { id: 'term-madiun', name: 'Terminal Madiun', lat: -7.6046, lng: 111.5235, distanceKm: 153, estTime: '15:45 WIB', status: 'checkpoint', description: 'Pemberhentian di Terminal Purboyo Madiun.' },
  { id: 'pertigaan-totok', name: 'Pertigaan Totok', lat: -7.5954, lng: 111.4880, distanceKm: 158, estTime: '16:00 WIB', status: 'checkpoint', description: 'Penurunan penumpang area Pertigaan Totok.' },
  { id: 'garasi-stj', name: 'Garasi STJ', lat: -7.5785, lng: 111.4550, distanceKm: 164, estTime: '16:15 WIB', status: 'checkpoint', description: 'Transit / Garasi pusat Sudiro Tungga Jaya.' },
  { id: 'jalan-mbarat', name: 'Jalan Mbarat', lat: -7.5615, lng: 111.4390, distanceKm: 167, estTime: '16:22 WIB', status: 'checkpoint', description: 'Pemberhentian area Jalan Mbarat / Stasiun Barat.' },
  { id: 'term-maospati', name: 'Terminal Maospati', lat: -7.5458, lng: 111.4344, distanceKm: 171, estTime: '16:30 WIB', status: 'checkpoint', description: 'Pemberhentian Terminal Maospati.' },
  { id: 'sukomoro', name: 'Sukomoro', lat: -7.6180, lng: 111.3850, distanceKm: 178, estTime: '16:42 WIB', status: 'checkpoint', description: 'Pemberhentian area Sukomoro Magetan.' },
  { id: 'pasar-jengglong', name: 'Pasar Jengglong', lat: -7.6410, lng: 111.3480, distanceKm: 184, estTime: '16:55 WIB', status: 'checkpoint', description: 'Pemberhentian Pasar Jengglong Magetan.' },
  { id: 'term-magetan', name: 'Terminal Magetan (Tujuan Akhir)', lat: -7.6534, lng: 111.3325, distanceKm: 188, estTime: '17:10 WIB', status: 'arrival', description: 'Terminal akhir kedatangan Magetan.' }
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
      promptText = `Buatlah naskah pengumuman stasiun / terminal resmi penyiaran suara pengeras suara untuk bus PO. Sudiro Tungga Jaya (STJ) armada "Viola" Kelas Ekonomi rute ${dirText}. Awali dengan "Perhatian... Perhatian kepada seluruh penumpang...". Gunakan gaya bahasa penyiar stasiun bus profesional, berwibawa, jelas, dan tegas (maksimal 3-4 kalimat).`;
    } else if (type === 'ticket-payment') {
      promptText = `Buatlah pengumuman pengeras suara stasiun bus STJ Viola Ekonomi untuk persiapan pemeriksaan tiket dan pembayaran ongkos bus. Awali dengan "Perhatian kepada seluruh penumpang...". Nada suara penyiar stasiun yang jelas dan tegas.`;
    } else if (type === 'checkpoint') {
      promptText = `Buatlah naskah pengumuman pengeras suara stasiun untuk pemberhentian bus STJ Viola di "${locationName}" (rute ${dirText}). Awali dengan "Perhatian kepada seluruh penumpang... Bus STJ Viola sebentar lagi akan tiba di...".`;
    } else {
      promptText = `Buatlah pengumuman stasiun bus STJ Viola dengan topik: "${customPrompt}". Gaya bahasa penyiar terminal profesional dan berwibawa.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: 'Anda adalah sistem pengumuman audio stasiun terminal bus profesional untuk Sudiro Tungga Jaya (STJ) "Viola". Awali setiap pengumuman dengan frasa khas pengumuman stasiun seperti "Perhatian... Perhatian...".',
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
  try {
    const { text, voiceName = 'Fenrir', voiceStyle } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text pengumuman wajib diisi.' });
    }

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
    console.error('Gemini TTS Error:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses suara manusia.' });
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
