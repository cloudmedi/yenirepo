/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
//@ts-nocheck
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, Menu, remote, dialog, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

const Store = require('electron-store');
const store = new Store();

const { download } = require('electron-dl');

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const checkinternetconnected = require('check-internet-connected');

import { getData } from './script/helper';

import { getPlaylistByUserId } from './script/getPlaylist';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    transparent: true,
    titleBarOverlay: {
      color: '#242526',
      symbolColor: '#405cf5',
      height: 10
    },
    maximizable: false,
    icon: getAssetPath('/assets/img/logo134x134.png'),
    webPreferences: {
      webSecurity: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
*/

ipcMain.on('appStart', async (event) => {
  const config = {
    timeout: 5000,
    retries: 3,
    domain: 'apple.com'
  };

  const textOnline = "ONLINE";
  const textOfline = "OFLINE";

  checkinternetconnected(config)
    .then(() => {
      event.reply('appStart-reply', textOnline);   
    }).catch((err) => {
      event.reply('appStart-reply', textOfline);
    });
});

const checkUserData = () => {
  const userData = store.get('user');

  if (userData) {
    const serverDateString = userData.token_expire;
    const serverDate = new Date(serverDateString);

    const serverUnixTime = Math.floor(serverDate.getTime() / 1000);
    const currentUnixTime = Math.floor(new Date().getTime() / 1000);

    if (serverUnixTime > currentUnixTime) {
      console.log("Token tarihi geçerli.");
      return userData;
    } else {
      store.delete('user');
      console.log("Token süresi geçmiş. Kullanıcı verileri silindi.");
      return null;
    }
  } else {
    console.log('Veri deposunda kullanıcı verisi bulunamadı.');
    return null;
  }
};

ipcMain.on('checkUserData', (event) => {
  const userData = checkUserData();

  if (userData) {
    event.reply('checkUserData-reply', userData);
  } else {
    // Kullanıcı verisi yoksa, uygun bir işlem yapabilirsiniz.
    event.reply('checkUserData-reply', null);
  }
});

ipcMain.on("checkUserPlaylists", async (event, userData) => {
  const userPlaylistData = store.get('playlists');

  if (!userPlaylistData) {
    try {
      const userId = userData.id;
      console.log("KULLANICI ID'si: ", userId);
      const url = `https://test.cloudmedia.com.tr/api/playlista/${userId}`;

      const apiConfig = {
        url: url,
        data: {},
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      };

      const apiResponse = await getData(apiConfig.url, apiConfig.data, apiConfig.method, apiConfig.headers);

      if (apiResponse && apiResponse.success) {
        const playlists = apiResponse.Playlist.map(playlist => ({
          id: playlist.id,
          title: playlist.title,
          artworkUrl: playlist.artwork_url
        }));
        console.log(playlists, "CEVAP API");

        const allPlaylists = [];

        for (const playlist of playlists) {
          const songs = await getSongsForPlaylist(playlist.id);
          if (songs && songs.length > 0) {
            console.log(`Çalma Listesi ID: ${playlist.id}, Şarkı Sayısı: ${songs.length}`);
            const playlistData = {
              id: playlist.id,
              title: playlist.title,
              artworkUrl: playlist.artworkUrl,
              songs: songs
            };
            allPlaylists.push(playlistData);
          } else {
            console.error(`Çalma Listesi ID: ${playlist.id} için şarkı bulunamadı veya API yanıtı boş.`);
          }
        }

        // Tüm çalma listeleri 'playlists' anahtarının altında bir dizi olarak saklanır
        store.set('playlists', allPlaylists);

        // Tüm çalma listelerini indirin ve ardından dosya yolunu localStorage'e ekleyin
        for (const playlist of allPlaylists) {
          const folderName = "bin"; // Kullanıcı adını kullanarak bir dizin adı oluşturun
          const folderPath = createFolderInUserData(folderName); // Kullanıcının veri dizini içinde bu dizini oluşturun

          for (const song of playlist.songs) {
            const artworkFilePath = path.join(folderPath, `${playlist.title}-artwork.jpg`); // Artwork dosya yolu
            const playlinkFilePath = path.join(folderPath, `${song.title}-playlink.mp3`); // Playlink dosya yolu

            // Artwork'ü indir
            await download(mainWindow, playlist.artworkUrl, {
              directory: folderPath, // İndirilecek dizin
              filename: `${playlist.title}-artwork.jpg`, // Dosya adı
              onCompleted: () => {
                console.log(`${playlist.title} çalma listesi artwork indirme tamamlandı.`);
              },
              onProgress: (progress) => {
                console.log(`${playlist.title} çalma listesi artwork indirme ilerlemesi: ${progress}%`);
              }
            });

            // Playlink'i indir
            await download(mainWindow, song.playlink, {
              directory: folderPath, // İndirilecek dizin
              filename: `${song.title}-playlink.mp3`, // Dosya adı
              onCompleted: () => {
                console.log(`${song.title} şarkısı playlink indirme tamamlandı.`);
              },
              onProgress: (progress) => {
                console.log(`${song.title} şarkısı playlink indirme ilerlemesi: ${progress}%`);
              }
            });

            // Mevcut çalma listesi verilerine yeni indirilen dosya yollarını ekleyin
            const existingPlaylist = allPlaylists.find(item => item.id === playlist.id);
            if (existingPlaylist) {
              existingPlaylist.artworkUrl = artworkFilePath;
              const existingSong = existingPlaylist.songs.find(item => item.id === song.id);
              if (existingSong) {
                existingSong.playlink = playlinkFilePath;
              }
            }
          }
        }

        // Güncellenmiş çalma listesi verilerini saklayın
        store.set('playlists', allPlaylists);

        // Kullanıcı verilerini yanıt olarak gönder
        event.reply('checkUserPlaylists-reply', allPlaylists);
      } else {
        console.error("API yanıtı başarısız:", apiResponse);
      }
    } catch (error) {
      console.error('API hatası:', error);
      throw error;
    }
  } else {
    // Saklanmış kullanıcı verilerini yanıt olarak gönder
    event.reply('checkUserPlaylists-reply', userPlaylistData);
  }
});

async function getSongsForPlaylist(playlistId) {
  try {
    const url = `https://test.cloudmedia.com.tr/api/getsong/${playlistId}`;
      
    const apiConfig = {
      url: url,
      data: {},
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      }
    };

    const apiResponse = await getData(apiConfig.url, apiConfig.data, apiConfig.method, apiConfig.headers);

    if (apiResponse && apiResponse.success) {
      console.log("api response", apiResponse)
      const songs = apiResponse.song.map(song => ({
        id: song.id,
        title: song.title,
        duration: song.duration,
        genre: song.genre,
        mood: song.mood,
        playlink: song.playlink
      }));
    
      // Şarkılar dizisini döndür
      return songs;
    } else {
      console.error(`Çalma Listesi ID: ${playlistId} için şarkı bulunamadı veya API yanıtı başarısız:`, apiResponse);
      return null;
    }
  } catch (error) {
    console.error(`Çalma Listesi ID: ${playlistId} için şarkı alınırken bir hata oluştu:`, error);
    throw error; // Hata durumunda dışarıya at
  }
};

async function downloadAllMedia(playlists) {
  for (const playlist of playlists) {
    await downloadMedia(playlist.artworkUrl, `downloads/${playlist.song.id}-artwork.jpg`);
    for (const song of playlist.songs) {
      await downloadMedia(song.playlink, `downloads/${song.id}.mp3`);
    }
  }
};

async function downloadMedia(url, filename) {
  const downloadOptions = {
    saveAs: false, // Dosyanın otomatik olarak kaydedilmesini sağlar
    filename: filename // İndirilen dosyanın adını belirtir
  };

  const win = new BrowserWindow({ show: false });
  const session = win.webContents.session;

  await session.downloadURL(url, downloadOptions);
};

const createFolderInUserData = (folderName) => {
  const userDataPath = app.getPath('userData'); // userData dizini
  const folderPath = path.join(userDataPath, folderName); // klasörün tam yolu

  // Klasörü oluşturma
  fs.mkdirSync(folderPath, { recursive: true });

  console.log(`${folderName} klasörü ${userDataPath} dizinine oluşturuldu.`);
  return folderPath; // Oluşturulan klasörün tam yolunu döndürme
};

const downloadPlaylists = async (playlists) => {
  const updatedPlaylists = await Promise.all(playlists.map(async (playlist) => {
    const extension = playlist.artworkUrl.split('.').pop();
    const folderName = "Playlists";
    const folderPath = createFolderInUserData(folderName);
    const fileName = `${playlist.title}.${extension}`;
    const playlistFilePath = path.join(folderPath, fileName);

    if (fs.existsSync(playlistFilePath)) {
      return { ...playlist, artworkUrl: playlistFilePath };
    }

    await download(mainWindow, playlist.artworkUrl, {
      directory: folderPath,
      filename: fileName,
      onCompleted: () => {
        console.log(`${playlist.title} çalma listesi indirme tamamlandı.`);
      },
      onProgress: (progress) => {
        console.log(`${playlist.title} çalma listesi indirme ilerlemesi: ${progress}%`);
      }
    });

    return { ...playlist, artworkUrl: playlistFilePath };
  }));
};

ipcMain.on("login-success", (event, data) => {
  store.set({
    user: {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      ezan: data.user.ezan,
      token: data.access_token,
      token_expire: data.expires_at
    }
  });

  const userData = store.get('user');
  event.reply("checkUserData-reply", userData);
});

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
