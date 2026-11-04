const fs = require('fs');
const path = require('path');

const audioList = [
  {
    filename: 'welcome.wav',
    text: 'Perhatian... Selamat datang Bapak, Ibu, dan seluruh penumpang setia Sudiro Tungga Jaya armada Viola kelas Ekonomi. Bus kita sedang dalam perjalanan dengan nyaman dan aman. Silakan duduk santai dan selamat menikmati perjalanan bersama STJ Viola.'
  },
  {
    filename: 'ticket.wav',
    text: 'Perhatian kepada seluruh penumpang bus STJ Viola. Petugas kondektur akan segera melakukan pemeriksaan tiket dan penarikan ongkos bus kelas ekonomi. Mohon dipersiapkan tiket atau ongkos perjalanannya. Terima kasih banyak atas kerja sama Anda.'
  },
  {
    filename: 'checkpoint_generic.wav',
    text: 'Perhatian seluruh penumpang. Berdasarkan koordinat satelit GPS real-time, bus STJ Viola sebentar lagi akan tiba di titik pemberhentian point berikutnya. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan agar tidak tertinggal. Terima kasih.'
  },
  {
    filename: 'proximity_alert.wav',
    text: 'Perhatian. Bus STJ Viola sebentar lagi tiba. Jarak ke titik pemberhentian tersisa kurang dari lima ratus meter. Penumpang yang bersiap turun dimohon bersiap-siap.'
  },
  {
    filename: 'test_voice.wav',
    text: 'Perhatian kepada seluruh penumpang, ini adalah uji coba suara asli manusia untuk armada Sudiro Tungga Jaya Viola. Suara jernih, berwibawa, dan nyaman didengarkan di sepanjang rute Magetan Surabaya.'
  },
  {
    filename: 'point_exit_dumpil.wav',
    text: 'Perhatian seluruh penumpang. Berdasarkan koordinat satelit GPS real-time, bus STJ Viola sebentar lagi akan tiba di Exit Toll Dumpil Madiun. Bagi penumpang yang turun di Exit Dumpil, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_term_madiun.wav',
    text: 'Perhatian seluruh penumpang. Berdasarkan koordinat satelit GPS real-time, bus STJ Viola sebentar lagi akan tiba di Terminal Purboyo Madiun. Bagi penumpang yang turun di Terminal Madiun, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_pertigaan_totok.wav',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Pertigaan Totok. Bagi penumpang yang turun di Pertigaan Totok, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_garasi_stj.wav',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Garasi Pusat Sudiro Tungga Jaya. Bagi penumpang yang turun, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_jalan_mbarat.wav',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Jalan Mbarat Stasiun Barat. Bagi penumpang yang turun, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_term_maospati.wav',
    text: 'Perhatian seluruh penumpang. Berdasarkan koordinat satelit GPS real-time, bus STJ Viola sebentar lagi akan tiba di Terminal Maospati. Bagi penumpang yang turun di Maospati, dipersilakan mempersiapkan barang bawaan.'
  },
  {
    filename: 'point_sukomoro.wav',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Sukomoro Magetan. Bagi penumpang yang turun di Sukomoro, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_pasar_jengglong.wav',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di Pasar Jengglong Magetan. Bagi penumpang yang turun di Pasar Jengglong, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_term_magetan.wav',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola telah tiba di titik tujuan akhir Terminal Magetan. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.'
  },
  {
    filename: 'point_medaeng.wav',
    text: 'Perhatian seluruh penumpang. Berdasarkan koordinat satelit GPS real-time, bus STJ Viola sebentar lagi akan tiba di Medaeng Waru. Bagi penumpang yang turun di Medaeng, dipersilakan bersiap-siap.'
  },
  {
    filename: 'point_term_bungurasih.wav',
    text: 'Perhatian seluruh penumpang. Bus STJ Viola telah tiba di titik tujuan akhir Terminal Purabaya Bungurasih Surabaya. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.'
  }
];

const outputDir = path.resolve(__dirname, '../public/audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
  console.log(`Generating ${audioList.length} human audio files...`);
  for (const item of audioList) {
    const filePath = path.join(outputDir, item.filename);
    try {
      console.log(`Generating ${item.filename}...`);
      const res = await fetch('http://localhost:3000/api/synthesize-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          voiceName: 'Fenrir'
        })
      });
      const data = await res.json();
      if (data && data.audioBase64) {
        const buffer = Buffer.from(data.audioBase64, 'base64');
        fs.writeFileSync(filePath, buffer);
        console.log(`✓ Saved ${item.filename} (${buffer.length} bytes)`);
      } else {
        console.error(`✗ Error generating ${item.filename}:`, data);
      }
    } catch (err) {
      console.error(`✗ Exception for ${item.filename}:`, err);
    }
    // Small pause
    await new Promise(r => setTimeout(r, 600));
  }
  console.log('All audio files generated successfully!');
}

run();
