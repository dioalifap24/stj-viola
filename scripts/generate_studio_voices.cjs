const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const checkpoints = [
  { id: 'exit_dumpil', name: 'Exit Toll Dumpil Madiun', short: 'Exit Dumpil' },
  { id: 'term_madiun', name: 'Terminal Purboyo Madiun', short: 'Terminal Madiun' },
  { id: 'pertigaan_totok', name: 'Pertigaan Totok', short: 'Pertigaan Totok' },
  { id: 'garasi_stj', name: 'Garasi Pusat Sudiro Tungga Jaya', short: 'Garasi STJ' },
  { id: 'jalan_mbarat', name: 'Jalan Mbarat Stasiun Barat', short: 'Jalan Mbarat' },
  { id: 'term_maospati', name: 'Terminal Maospati', short: 'Maospati' },
  { id: 'sukomoro', name: 'Sukomoro Magetan', short: 'Sukomoro' },
  { id: 'pasar_jengglong', name: 'Pasar Jengglong Magetan', short: 'Pasar Jengglong' },
  { id: 'term_magetan', name: 'titik tujuan akhir Terminal Magetan', short: 'Terminal Magetan' },
  { id: 'menanggal', name: 'Menanggal Surabaya Selatan', short: 'Menanggal' },
  { id: 'medaeng', name: 'Medaeng Waru', short: 'Medaeng' },
  { id: 'grab_long', name: 'Grab Long Bungurasih', short: 'Grab Long' },
  { id: 'ramayana', name: 'Halte Ramayana Bungurasih', short: 'Ramayana' },
  { id: 'term_bungurasih', name: 'titik tujuan akhir Terminal Purabaya Bungurasih Surabaya', short: 'Terminal Purabaya' }
];

const generalAudios = [
  {
    name: 'welcome',
    text: 'Perhatian... Selamat datang Bapak, Ibu, dan seluruh penumpang setia Sudiro Tungga Jaya armada Viola kelas Ekonomi. Perjalanan kita kali ini dipandu oleh pengemudi kita Mas Rifai, dan didampingi oleh saya sendiri kondektur Mas Jully. Selamat menikmati perjalanan bersama STJ Viola. Silakan duduk dengan nyaman dan tetap menjaga barang bawaan Anda. Terima kasih dan selamat menikmati perjalanan.'
  },
  {
    name: 'ticket',
    text: 'Perhatian kepada seluruh penumpang bus STJ Viola. Petugas kondektur akan segera melakukan pemeriksaan tiket dan penarikan ongkos bus kelas ekonomi. Mohon dipersiapkan tiket atau ongkos perjalanannya. Terima kasih banyak atas kerja sama Anda.'
  },
  {
    name: 'checkpoint_generic',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di titik pemberhentian berikutnya. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan agar tidak tertinggal. Terima kasih.'
  },
  {
    name: 'proximity_alert',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi tiba di titik pemberhentian. Penumpang yang bersiap turun dimohon bersiap-siap dan memeriksa kembali barang bawaan Anda.'
  },
  {
    name: 'test_sample',
    text: 'Perhatian kepada seluruh penumpang, ini adalah uji coba suara asli manusia untuk armada Sudiro Tungga Jaya Viola. Suara jernih, berwibawa, dan nyaman didengarkan di sepanjang rute Magetan Surabaya.'
  },
  {
    name: 'berangkat',
    text: 'Perhatian kepada seluruh penumpang. Pintu bus segera ditutup, armada STJ Viola bersiap meluncur menuju tujuan. Pastikan Anda sudah duduk di kursi masing-masing dengan nyaman.'
  },
  {
    name: 'restarea',
    text: 'Pemberitahuan kepada seluruh penumpang bus STJ Viola. Sebentar lagi armada kita akan beristirahat di Rest Area. Penumpang yang ingin ke toilet atau membeli konsumsi dipersilakan bersiap.'
  },
  {
    name: 'tol',
    text: 'Bus Sudiro Tungga Jaya Viola saat ini telah memasuki jalan tol Trans Jawa. Pengemudi akan melaju dengan kecepatan aman dan stabil. Selamat menikmati kenyamanan perjalanan Anda.'
  }
];

const outputDir = path.resolve(__dirname, '../public/audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function synthesizeText(text, voiceName) {
  const res = await fetch('http://localhost:3000/api/synthesize-speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed HTTP ${res.status}: ${errText}`);
  }
  const data = await res.json();
  if (!data.audioBase64) {
    throw new Error('No audioBase64 in response');
  }
  return { base64: data.audioBase64, mimeType: data.mimeType || 'audio/wav' };
}

function saveAudio(filenameBase, base64Data) {
  const tempWav = path.join(outputDir, `${filenameBase}_temp.wav`);
  const finalMp3 = path.join(outputDir, `${filenameBase}.mp3`);
  fs.writeFileSync(tempWav, Buffer.from(base64Data, 'base64'));
  try {
    execSync(`ffmpeg -y -i "${tempWav}" -codec:a libmp3lame -qscale:a 2 "${finalMp3}"`, { stdio: 'pipe' });
    fs.unlinkSync(tempWav);
    console.log(`✓ Generated MP3: ${filenameBase}.mp3 (${fs.statSync(finalMp3).size} bytes)`);
  } catch (err) {
    console.warn(`ffmpeg failed, saving as wav fallback: ${err.message}`);
    const finalWav = path.join(outputDir, `${filenameBase}.wav`);
    fs.renameSync(tempWav, finalWav);
  }
}

async function run() {
  console.log('--- Generating Studio Voices for STJ Viola ---');

  // 1. Generate general announcement files with Fenrir (Male voice)
  for (const item of generalAudios) {
    console.log(`Processing general: ${item.name} (Fenrir)...`);
    try {
      const result = await synthesizeText(item.text, 'Fenrir');
      saveAudio(item.name, result.base64);
    } catch (e) {
      console.error(`Error generating ${item.name}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  // 2. Generate checkpoint files for all checkpoints
  // We generate Fenrir as the default (point_${cp.id}.mp3 and point_${cp.id}_fenrir.mp3)
  // And also generate Puck, Charon, and Kore for the checkpoints
  const voices = ['Fenrir', 'Puck', 'Charon', 'Kore'];

  for (const cp of checkpoints) {
    const text = cp.id.includes('term_') 
      ? `Perhatian seluruh penumpang. Bus STJ Viola telah tiba di ${cp.name}. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.`
      : `Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di ${cp.name}. Bagi penumpang yang turun di ${cp.short}, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.`;

    for (const voice of voices) {
      const filename = (voice === 'Fenrir') 
        ? `point_${cp.id}`
        : `point_${cp.id}_${voice.toLowerCase()}`;

      console.log(`Generating checkpoint audio: ${filename} (${voice})...`);
      try {
        const result = await synthesizeText(text, voice);
        saveAudio(filename, result.base64);
        if (voice === 'Fenrir') {
          // Also duplicate/save as point_${cp.id}_fenrir.mp3 for explicit lookup
          const fenrirSpecific = path.join(outputDir, `point_${cp.id}_fenrir.mp3`);
          const fenrirDefault = path.join(outputDir, `point_${cp.id}.mp3`);
          if (fs.existsSync(fenrirDefault)) {
            fs.copyFileSync(fenrirDefault, fenrirSpecific);
          }
        }
      } catch (e) {
        console.error(`Error generating ${filename}:`, e.message);
      }
      await new Promise(r => setTimeout(r, 600));
    }
  }

  console.log('--- All Studio Voices Generated Successfully! ---');
}

run();
