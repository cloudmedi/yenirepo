// getSongsForPlaylist fonksiyonunun içeriği
const axios = require('axios'); // Axios modülünü kullanarak HTTP istekleri yapmak için içe aktarın

async function getSongsForPlaylist(playlistId) {
  const url = `https://test.cloudmedia.com.tr/api/getsong/${playlistId}`;
  try {
    const response = await axios.get(url);
    return response.data; // Çalma listesi şarkılarını döndür
  } catch (error) {
    console.error(`Çalma listesi şarkıları alınamadı: ${error}`);
    throw error; // Hata durumunda hatayı fırlat
  }
}

module.exports = { getSongsForPlaylist }; // getSongsForPlaylist fonksiyonunu dışa aktar