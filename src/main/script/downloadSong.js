// downloadSong fonksiyonunun içeriği
const fs = require('fs'); // Dosyaları işlemek için fs modülünü içe aktarın
const axios = require('axios'); // Axios modülünü kullanarak HTTP istekleri yapmak için içe aktarın

async function downloadSong(song) {
  const { playlink } = song;
  const path = `appdata/songs/${song.id}.mp3`; // İndirilecek dosyanın yolunu belirleyin
  const writer = fs.createWriteStream(path); // Dosyayı yazmak için bir yazıcı oluşturun

  const response = await axios({
    url: playlink,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer); // Veriyi dosyaya yaz

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve); // Yazma tamamlandığında bir işlem sonuçlandırma sağlayın
    writer.on('error', reject); // Yazma sırasında bir hata olursa, reddet
  });
}
