const axios = require('axios');

const postData = async (url = "", data = {}, method, headers) => {
    try {
        const response = await axios({
            method: method || "POST",
            url,
            headers: headers || {},
            data,
        });

        return response.data;
    } catch (error) {
        console.error("Hata:", error);
        throw error; // Hata durumunu tekrar fırlat
    }
};

export { postData } 