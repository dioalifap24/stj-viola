const fs = require('fs');
const path = require('path');
const googleTTS = require('google-tts-api');

const audioList = [
  {
    filename: 'welcome.mp3',
    text: 'Perhatian... Selamat datang Bapak, Ibu, dan seluruh penumpang setia Sudiro Tungga Jaya armada Viola kelas Ekonomi. Selamat menikmati perjalanan bersama STJ Viola. Silakan duduk dengan nyaman dan tetap menjaga barang bawaan Anda.'
  },
  {
    filename: 'ticket.mp3',
    text: 'Perhatian kepada seluruh penumpang bus STJ Viola. Petugas kondektur akan segera melakukan pemeriksaan tiket dan penarikan ongkos bus kelas ekonomi. Mohon dipersiapkan tiket atau ongkos perjalanannya. Terima kasih banyak atas kerja sama Anda.'
  },
  {
    filename: 'checkpoint_generic.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di titik pemberhentian berikutnya. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan agar tidak tertinggal. Terima kasih.'
  },
  {
    filename: 'proximity_alert.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi tiba di titik pemberhentian. Penumpang yang bersiap turun dimohon bersiap-siap dan memeriksa kembali barang bawaan Anda.'
  },
  {
    filename: 'test_sample.mp3',
    text: 'Perhatian kepada seluruh penumpang, ini adalah uji coba suara asli manusia untuk armada Sudiro Tungga Jaya Viola. Suara jernih, berwibawa, dan nyaman didengarkan di sepanjang rute Magetan Surabaya.'
  },
  {
    filename: 'berangkat.mp3',
    text: 'Perhatian kepada seluruh penumpang. Pintu bus segera ditutup, armada STJ Viola bersiap meluncur menuju tujuan. Pastikan Anda sudah duduk di kursi masing-masing dengan nyaman.'
  },
  {
    filename: 'restarea.mp3',
    text: 'Pemberitahuan kepada seluruh penumpang bus STJ Viola. Sebentar lagi armada kita akan beristirahat di Rest Area. Penumpang yang ingin ke toilet atau membeli konsumsi dipersilakan bersiap.'
  },
  {
    filename: 'tol.mp3',
    text: 'Bus Sudiro Tungga Jaya Viola saat ini telah memasuki jalan tol Trans Jawa. Pengemudi akan melaju dengan kecepatan aman dan stabil. Selamat menikmati kenyamanan perjalanan Anda.'
  },
  // Checkpoints
  {
    filename: 'point_exit_dumpil.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Exit Toll Dumpil Madiun. Bagi penumpang yang turun di Exit Dumpil, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_term_madiun.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Terminal Purboyo Madiun. Bagi penumpang yang turun di Terminal Madiun, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_pertigaan_totok.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Pertigaan Totok. Bagi penumpang yang turun di Pertigaan Totok, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_garasi_stj.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Garasi Pusat Sudiro Tungga Jaya. Bagi penumpang yang turun atau transit, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_jalan_mbarat.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Jalan Mbarat Stasiun Barat. Bagi penumpang yang turun di Jalan Mbarat, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_term_maospati.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Terminal Maospati. Bagi penumpang yang turun di Maospati, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_sukomoro.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Sukomoro Magetan. Bagi penumpang yang turun di Sukomoro, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_pasar_jengglong.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Pasar Jengglong Magetan. Bagi penumpang yang turun di Pasar Jengglong, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_term_magetan.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola telah tiba di titik tujuan akhir Terminal Magetan. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.'
  },
  {
    filename: 'point_menanggal.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Menanggal Surabaya Selatan. Bagi penumpang yang turun di Menanggal, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_medaeng.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Medaeng Waru. Bagi penumpang yang turun di Medaeng, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_grab_long.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Grab Long Bungurasih. Bagi penumpang yang turun di Grab Long, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_ramayana.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Ramayana Bungurasih. Bagi penumpang yang turun di halte Ramayana, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_term_bungurasih.mp3',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola telah tiba di titik tujuan akhir Terminal Purabaya Bungurasih Surabaya. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.'
  }
];

const outputDir = path.resolve(__dirname, '../public/audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  console.log(`Generating ${audioList.length} natural human voice audio files...`);
  for (const item of audioList) {
    const filePath = path.join(outputDir, item.filename);
    try {
      console.log(`Generating ${item.filename}...`);
      const chunks = await googleTTS.getAllAudioBase64(item.text, {
        lang: 'id',
        slow: false,
        timeout: 10000,
      });
      const buffers = chunks.map(c => Buffer.from(c.base64, 'base64'));
      const combined = Buffer.concat(buffers);
      fs.writeFileSync(filePath, combined);
      console.log(`✓ Saved ${item.filename} (${combined.length} bytes)`);
    } catch (err) {
      console.error(`✗ Error generating ${item.filename}:`, err.message);
    }
    // Small pause to avoid rate limits
    await new Promise(r => setTimeout(r, 400));
  }
  console.log('Finished generating all audio files!');
}

run();
