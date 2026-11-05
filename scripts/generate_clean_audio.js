import googleTTS from 'google-tts-api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const audioDir = path.join(__dirname, '../public/audio');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const baseAudioMap = {
  'point_exit_dumpil.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Exit Toll Dumpil Gerbang Tol Madiun. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_term_madiun.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Terminal Madiun. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_pertigaan_totok.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Pertigaan Totok. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_garasi_stj.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Garasi Sudiro Tungga Jaya. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_jalan_mbarat.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Jalan Mbarat Stasiun Barat. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_term_maospati.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Terminal Maospati. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_sukomoro.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Sukomoro Magetan. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_pasar_jengglong.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Pasar Jengglong. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_term_magetan.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola telah tiba di Terminal Magetan. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.',
  'point_menanggal.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Menanggal. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_medaeng.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Medaeng Waru. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_grab_long.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Grab Long. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_ramayana.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Halte Ramayana Bungurasih. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'point_term_bungurasih.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola telah tiba di Terminal Purabaya Bungurasih Surabaya. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.',
  'welcome.mp3': 'Perhatian... Selamat datang Bapak, Ibu, dan seluruh penumpang setia Sudiro Tungga Jaya armada Viola kelas Ekonomi. Perjalanan kita kali ini dipandu oleh pengemudi kita Mas Rifai, dan didampingi oleh kondektur Jully. Selamat menikmati perjalanan bersama STJ Viola. Silakan duduk dengan nyaman dan tetap menjaga barang bawaan Anda. Terima kasih dan selamat menikmati perjalanan.',
  'ticket.mp3': 'Perhatian kepada seluruh penumpang bus STJ Viola. Petugas kondektur akan segera melakukan pemeriksaan tiket dan penarikan ongkos bus kelas ekonomi. Mohon dipersiapkan tiket atau ongkos perjalanannya. Terima kasih banyak atas kerja sama Anda.',
  'berangkat.mp3': 'Perhatian kepada seluruh penumpang. Pintu bus segera ditutup, armada STJ Viola bersiap meluncur menuju tujuan. Pastikan Anda sudah duduk di kursi masing-masing dengan nyaman.',
  'tol.mp3': 'Bus Sudiro Tungga Jaya Viola saat ini telah memasuki jalan tol Trans Jawa. Pengemudi akan melaju dengan kecepatan aman dan stabil. Selamat menikmati kenyamanan perjalanan Anda.',
  'checkpoint_generic.mp3': 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di titik pemberhentian point berikutnya. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.',
  'proximity_alert.mp3': 'Peringatan kondektur! Bus STJ Viola berjarak kurang dari lima ratus meter dari titik pemberhentian point. Mohon bersiap-siap.',
  'test_sample.mp3': 'Perhatian kepada seluruh penumpang, ini adalah uji coba suara manusia jernih untuk armada Sudiro Tungga Jaya Viola. Suara jernih, berwibawa, dan nyaman didengarkan di sepanjang perjalanan.'
};

async function generateAllCleanNaturalAudio() {
  console.log('Generating', Object.keys(baseAudioMap).length, 'clean natural human audio files...');
  let count = 0;

  for (const [filename, text] of Object.entries(baseAudioMap)) {
    try {
      if (text.length > 200) {
        const results = await googleTTS.getAllAudioBase64(text, {
          lang: 'id',
          slow: false,
          host: 'https://translate.google.com',
          timeout: 10000,
        });
        const buffers = results.map((item) => Buffer.from(item.base64, 'base64'));
        fs.writeFileSync(path.join(audioDir, filename), Buffer.concat(buffers));
      } else {
        const base64 = await googleTTS.getAudioBase64(text, {
          lang: 'id',
          slow: false,
          host: 'https://translate.google.com',
          timeout: 10000,
        });
        fs.writeFileSync(path.join(audioDir, filename), Buffer.from(base64, 'base64'));
      }
      count++;
      console.log(`[${count}/${Object.keys(baseAudioMap).length}] Saved ${filename}`);
    } catch (e) {
      console.error('Failed for', filename, e.message);
    }
    // Rate-limit
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log('Successfully generated ALL', count, 'clean natural human audio files!');
}

generateAllCleanNaturalAudio();
