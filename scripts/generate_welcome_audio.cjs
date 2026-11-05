const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputDir = path.resolve(__dirname, '../public/audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const welcomeText = 'Perhatian... Selamat datang Bapak, Ibu, dan seluruh penumpang setia Sudiro Tungga Jaya armada Viola kelas Ekonomi. Perjalanan kita kali ini dipandu oleh pengemudi kita Mas Rifai, dan didampingi oleh saya sendiri kondektur Mas Jully. Selamat menikmati perjalanan bersama STJ Viola. Silakan duduk dengan nyaman dan tetap menjaga barang bawaan Anda. Terima kasih dan selamat menikmati perjalanan.';

const voices = ['Fenrir', 'Puck', 'Charon', 'Kore'];

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
    if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
    console.log(`✓ Generated MP3: ${filenameBase}.mp3 (${fs.statSync(finalMp3).size} bytes)`);
  } catch (err) {
    console.warn(`ffmpeg failed, saving as wav fallback: ${err.message}`);
    const finalWav = path.join(outputDir, `${filenameBase}.wav`);
    fs.renameSync(tempWav, finalWav);
  }
}

async function run() {
  console.log('--- Generating Updated Welcome Audio with Mas Rifai & Mas Jully ---');
  for (const voice of voices) {
    console.log(`Synthesizing welcome for ${voice}...`);
    try {
      const result = await synthesizeText(welcomeText, voice);
      const filename = `welcome_${voice.toLowerCase()}`;
      saveAudio(filename, result.base64);

      if (voice === 'Fenrir') {
        // Also save as default welcome.mp3
        saveAudio('welcome', result.base64);
      }
    } catch (err) {
      console.error(`Error for ${voice}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 600));
  }
  console.log('--- Done generating welcome audio! ---');
}

run();
