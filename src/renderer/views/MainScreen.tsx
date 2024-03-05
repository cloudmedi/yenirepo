//@ts-nocheck
import React, { useEffect, useState } from 'react';
import './MainScreen.css';

import CustomTextInput from '../components/input/TextInput';
import Spinner from '../components/spinner/Spinner';

import LoginPageBanner from '../../../assets/img/loginPageBanner.png';
import LoginPageLogo from '../../../assets/img/logo134x134.png';

import { postData } from '../../script/helper';

const MainScreen = () => {

    const [page, setPage] = useState(1);
    const [loadingDatas, setLoadingDatas] = useState('Kullanıcı Verileri Alınıyor...');

    const [songs, setSongs] = useState();

    const [myData, setMyData] = useState(null);
    const [myPlaylistsInLocal, setMyPlaylistsInLocal] = useState(null);
    const sixPlaylists = myPlaylistsInLocal && myPlaylistsInLocal.length >= 6 ? myPlaylistsInLocal.slice(0, 6) : myPlaylistsInLocal;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginSuccessful, setLoginSuccessful] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [loginInProgress, setLoginInProgress] = useState(false)

    const [inputValues, setInputValues] = useState<string[]>(['', '']);
    const inputLabels = ['E-Posta', 'Şifre'];
    const inputTypes = ['text', 'password'];

 
    const [playingSongTitle, setPlayingSongTitle] = useState('');
    const [currentPlaylistTitle, setCurrentPlaylistTitle] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);

    // Verilen playlist içindeki şarkıları karıştırıp sonra çalacak fonksiyon
    function shuffleAndPlay(playlist) {
        // Playlist içindeki şarkıları karıştır
        const shuffledSongs = shuffle(playlist.songs);

        // Karıştırılmış playlist'i oynat
        playPlaylist({ ...playlist, songs: shuffledSongs });
    }

    // Karıştırma fonksiyonu
    function shuffle(array) {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle
        while (currentIndex !== 0) {
            // Pick a remaining element
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    // Oynatma fonksiyonu
    function playPlaylist(playlist) {
        console.log("Oynatılıyor...");
        console.log("Karışık Playlist:", playlist);
    
        // Audio elementini oluştur
        const audio = new Audio();
    
        // İlk şarkıyı ayarla
        audio.src = playlist.songs[0].playlink; // Örneğin, her şarkının bir audioUrl özelliği varsa ve bu özellik şarkının ses dosyasının URL'sini içeriyorsa

        setCurrentPlaylistTitle(playlist.title);
        setPlayingSongTitle(playlist.songs[0].title);

        console.log(playingSongTitle)
    
        // Şarkıyı oynat
        audio.play();

        console.log("current ", audio.src);
    
        // Şarkı oynarken, bir sonraki şarkıya geçmek için event dinleyicisi ekle
        audio.addEventListener('ended', () => {
            // Şu an oynatılan şarkının indeksini al
            const currentIndex = playlist.songs.findIndex(song => song.playlink === audio.src);
    
            // Bir sonraki şarkının indeksini belirle (dairesel olarak, son şarkıdan sonra ilk şarkıya geç)
            const nextIndex = (currentIndex + 1) % playlist.songs.length;
    
            // Bir sonraki şarkının audioUrl özelliğini al ve audio elementine ayarla
            audio.src = playlist.songs[nextIndex].playlink;
    
            // Yeni şarkıyı oynat
            audio.play();
        });
    }

    const handleLogin = async () => {
        setLoginInProgress(true);
        const enteredEmail = email;
        const enteredPassword = password;
    
        const startTime = new Date(); // İstek başlatma zamanını kaydet
    
        const apiConfig = {
            url: "https://test.cloudmedia.com.tr/auth/login",
            data: {
                email: enteredEmail,
                password: enteredPassword
            },
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            }
        };
    
        try {
            const apiResponse = await postData(apiConfig.url, apiConfig.data, apiConfig.method, apiConfig.headers);
    
            const endTime = new Date(); // İstek tamamlanma zamanını kaydet
            const elapsedTime = endTime - startTime; // İstek süresini hesapla
    
            console.log("API Yanıtı:", apiResponse);
            console.log("API LOGİN isteği " + elapsedTime + " milisaniye sürdü");
    
            if (apiResponse && apiResponse.access_token) {
                console.log('Giriş başarılı!');
    
                window.api.ipcRenderer.send('login-success', apiResponse);
            } else {
                console.log('Giriş başarısız: Yanlış kullanıcı adı veya şifre.');
                setLoginSuccessful(false);
                setErrorVisible(true);
            }
        } catch (error) {
            console.error('API isteği hatası:', error);
            setLoginSuccessful(false);
            setErrorVisible(true);
        } finally {
            setLoginInProgress(false);
        }
    };

    const handleInputChange = (index: number, value: string) => {
        const newInputValues = [...inputValues];
        newInputValues[index] = value;
        if (index === 0) {
            setEmail(value);
        } else if (index === 1) {
            setPassword(value);
        }
        setInputValues(newInputValues);
    };

    const customTextInputs = inputValues.map((value, index) => ( 
        <CustomTextInput 
            key = {index}
            label = {inputLabels[index]}
            type = {inputTypes[index]}
            value = {value}
            onChange = {(newValue) => handleInputChange(index, newValue)}
        />
    ));

    const startGetUserDatas = () => {
        window.api.ipcRenderer.send('checkUserData');
    
        // checkUserData-reply olayına bir kere abone ol
        window.electron.ipcRenderer.on('checkUserData-reply', handleUserData);
    };

    const handleUserData = async (userData) => {

        if (userData) {
            setMyData(userData);
            setLoadingDatas('Playlist Verileri Kontrol Ediliyor...');
            getMyPlaylistStart(userData);
        } else {
            setLoadingDatas('Kullanıcı Verisi Bulunamadı Giriş Ekranına Yönlendiriliyor...');
            setLoginSuccessful(false);
            setPage(2);
        }
        
    };

    const getMyPlaylistStart = async (userInfo) => {
        window.api.ipcRenderer.send('checkUserPlaylists', userInfo);

        window.electron.ipcRenderer.on('checkUserPlaylists-reply', getMyPlaylists);
    }

    const getMyPlaylists = (myPlaylists) => {
        console.log("playlists", myPlaylists)
        setMyPlaylistsInLocal(myPlaylists);
    }

    useEffect(() => {
        if (myPlaylistsInLocal && myData) {
            setLoadingDatas('Playlist İçerikleri Kontrol Ediliyor...');
            setLoginSuccessful(true);
            setPage(2);
        } else if(!myData) {
            setLoginSuccessful(false)
        }
    }, [myPlaylistsInLocal, myData]);

    useEffect(() => {
        const checkUserDatas = async () => {
            window.api.ipcRenderer.send('appStart');
    
            const userLanConnection = async (info) => {
                console.log("INTERNET DURUMU: ", info)
                startGetUserDatas();
            };
    
            window.electron.ipcRenderer.on('appStart-reply', userLanConnection);
    
            return () => {
                window.electron.ipcRenderer.removeAllListeners('appStart-reply', userLanConnection);
            };
        };
    
        checkUserDatas();
    }, []);

    return (
        <div className="lp-main-bg">
            <div className='lp-card-container'>
                {page === 1 && (
                    <>
                        <div className='spinner-wrapper fd-column'>
                            <Spinner />
                            <p className='text-p m-30px'>{loadingDatas}</p>
                        </div>
                    </>
                )}
                {page === 2 && (
                    <div className='lp-card-input-wrapper'>
                        <div className='lp-card-img-wrapper'>
                            <img src={LoginPageBanner} alt="Login Banner" />
                        </div>
                        <div className='lp-card-form-wrapper'>
                            <div className='lp-card-form-logo-wrapper'>
                                <img src={LoginPageLogo} alt="Logo" />
                            </div>
                            <div className='lp-card-form-inputs'>
                                {loginInProgress ? (
                                    <div className='spinner-wrapper'>
                                        <Spinner />
                                    </div>
                                ) : (
                                    <>
                                        {isLoginSuccessful ? (
                                            <div className='main-wrapper'>
                                                <div className='main-playlist-container'>
                                                    {myPlaylistsInLocal.map((playlist, index) => (
                                                        <div className={`div${index + 1}`} key={playlist.id}>
                                                            {/* Playlist adını ve resmini göstermek için içerik oluşturun */}
                                                            <h3>{playlist.title}</h3>
                                                            <img src={playlist.artworkUrl} alt={`Playlist ${index + 1}`} />
                                                            {/* Oynat butonuna onClick olayı ekleyin */}
                                                            <button onClick={() => shuffleAndPlay(playlist)}>Oynat</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {customTextInputs}
                                                <div className='lp-card-form-button'>
                                                    {errorVisible && (
                                                        <div className='lp-error'>
                                                            <h1>Kullanıcı adı ve ya şifre boş olamaz!</h1>
                                                        </div>
                                                    )}
                                                    <button className="lp-button" role="button" onClick={handleLogin}>GİRİŞ</button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            {playingSongTitle && (
                                <div className='main-bottomBar-wrapper'>
                                    <div className='bottomBar-wave-wrapper'>
                                        <div className="boxContainer">
                                            <div className="box box1"></div>
                                            <div className="box box2"></div>
                                            <div className="box box3"></div>
                                            <div className="box box4"></div>
                                            <div className="box box5"></div>
                                        </div>
                                    </div>
                                    <div className='bottomBar-music-info'>
                                        <h1>{playingSongTitle}</h1>
                                        <h2>{currentPlaylistTitle}</h2>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MainScreen;