const { ipcRenderer } = require('electron');
import { getData } from './helper';

const getPlaylistByUserId = async (userData) => {
    if (!userData || !userData.id) {
        throw new Error("Kullanıcı verisi eksik veya geçersiz.");
    }

    const userId = userData.id;
    console.log("USER ID: ", userId);
    const url = `https://test.cloudmedia.com.tr/api/playlista/${userId}`;
    const apiConfig = {
        url: url,
        data: {},
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        }
    };

    try {
        const apiResponse = await getData(apiConfig.url, apiConfig.data, apiConfig.method, apiConfig.headers);
        if (apiResponse && apiResponse.success) {
            // API yanıtını alıp, main.ts dosyasına iletiyoruz
            ipcRenderer.sendMessage('getPlaylistResponse', apiResponse);
            return apiResponse;
        }
    } catch (error) {
        console.error('API hatası:', error);
        throw error;
    }
};

export { getPlaylistByUserId };