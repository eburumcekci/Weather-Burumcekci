"use client";

import { useEffect, useMemo, useState } from "react";

const MODELS = [
  { id: "ecmwf_ifs025", name: "ECMWF IFS" },
  { id: "gfs_seamless", name: "NOAA GFS" },
  { id: "icon_seamless", name: "DWD ICON" },
  { id: "ukmo_seamless", name: "UK Met Office" },
  { id: "meteofrance_seamless", name: "Météo-France" },
];

const DEFAULT_PLACES = [
  { id: "bodrum", name: "Bodrum, Muğla", lat: 37.0344, lon: 27.4305 },
  { id: "istanbul", name: "İstanbul", lat: 41.0082, lon: 28.9784 },
  { id: "london", name: "London", lat: 51.5072, lon: -0.1276 },
  { id: "amsterdam", name: "Amsterdam", lat: 52.3676, lon: 4.9041 },
];

const MAX_PLACES = 30;
const STORE_KEY = "ortak-hava-pro-places-v1"; // Keeps existing saved locations.
const SETTINGS_KEY = "weather-consensus-settings-v1";
const H = "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,rain,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
const D = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max";

const COPY = {
  tr: {
    appName: "Weather Consensus", eyebrow: "5 MODELLİ TAHMİN",
    tagline: "Konumların tek ekranda, ayrıntılar bir dokunuş uzağında.",
    searchPlaceholder: "Şehir, ilçe veya ada ara…", search: "Ara", searching: "Aranıyor…",
    noResults: "Sonuç bulunamadı.", searchFailed: "Arama yapılamadı.",
    savedPlaces: "Kayıtlı konumlar", updated: "Güncel", updating: "Güncelleniyor…",
    manage: "Konumları yönet", done: "Bitti", settings: "Ayarlar", language: "Dil",
    turkish: "Türkçe", english: "English", close: "Kapat", delete: "Sil",
    deleteConfirm: "Bu konumu kayıtlı listenizden silmek istiyor musunuz?",
    maxReached: `En fazla ${MAX_PLACES} konum kaydedilebilir. Yeni bir konum eklemek için önce kayıtlı bir konumu silin.`,
    emptyPlaces: "Henüz kayıtlı konum yok. Yukarıdaki aramadan bir konum ekleyin.",
    back: "Tüm konumlar", loadingDetail: "Tahminler ve deniz verileri hazırlanıyor…",
    modelsUsed: "model kullanıldı", feels: "Hissedilen", windGust: "Rüzgâr – hamle",
    precipitation: "Yağış", humidity: "Nem", sea: "Deniz suyu", noSea: "Uygun veri yok",
    noSeaSub: "Denize uzak veya veri bulunamadı", wave: "Dalga", seaCell: "deniz hücresi",
    hourly: "48 saatlik tahmin", combined: "Birleşik", now: "Şimdi",
    daily: "7 günlük tahmin", modelComparison: "Model karşılaştırması", current: "Şu an",
    today: "Bugün", windUnit: "km/sa", hint: "Bir karta dokununca 48 saatlik, 7 günlük, model karşılaştırması ve deniz suyu sıcaklığı açılır. Konumlar bu cihazda sürekli saklanır.",
    footer: "Hava verileri Open-Meteo üzerinden ECMWF, GFS, ICON, UKMO ve Météo-France modellerinden; deniz verileri Open-Meteo Marine API’den alınır. Deniz tahminleri seyir amacıyla kullanılmamalıdır.",
    weather: {
      0:"Açık",1:"Çoğunlukla açık",2:"Parçalı bulutlu",3:"Kapalı",45:"Sisli",48:"Kırağılı sis",
      51:"Hafif çisenti",53:"Çisenti",55:"Yoğun çisenti",61:"Hafif yağmur",63:"Yağmur",
      65:"Şiddetli yağmur",71:"Hafif kar",73:"Kar",75:"Yoğun kar",80:"Sağanak",81:"Sağanak",
      82:"Şiddetli sağanak",95:"Gök gürültülü",96:"Dolu ihtimali",99:"Şiddetli fırtına", unknown:"Değişken"
    },
    dirs:["K","KKD","KD","DKD","D","DGD","GD","GGD","G","GGB","GB","BGB","B","BKB","KB","KKB"]
  },
  en: {
    appName: "Weather Consensus", eyebrow: "5-MODEL FORECAST",
    tagline: "All your locations at a glance, with details one tap away.",
    searchPlaceholder: "Search city, district or island…", search: "Search", searching: "Searching…",
    noResults: "No results found.", searchFailed: "Search could not be completed.",
    savedPlaces: "Saved locations", updated: "Updated", updating: "Updating…",
    manage: "Manage locations", done: "Done", settings: "Settings", language: "Language",
    turkish: "Türkçe", english: "English", close: "Close", delete: "Delete",
    deleteConfirm: "Remove this location from your saved list?",
    maxReached: `You can save up to ${MAX_PLACES} locations. Delete a saved location before adding another one.`,
    emptyPlaces: "No saved locations yet. Add one using the search above.",
    back: "All locations", loadingDetail: "Preparing weather and marine forecasts…",
    modelsUsed: "models used", feels: "Feels like", windGust: "Wind – gusts",
    precipitation: "Precipitation", humidity: "Humidity", sea: "Sea temperature", noSea: "No suitable data",
    noSeaSub: "Too far inland or no marine data available", wave: "Wave", seaCell: "marine cell",
    hourly: "48-hour forecast", combined: "Consensus", now: "Now",
    daily: "7-day forecast", modelComparison: "Model comparison", current: "Current",
    today: "Today", windUnit: "km/h", hint: "Tap a card for the 48-hour and 7-day forecasts, model comparison and sea temperature. Locations stay saved on this device.",
    footer: "Weather data is supplied through Open-Meteo using ECMWF, GFS, ICON, UKMO and Météo-France models; marine data comes from the Open-Meteo Marine API. Marine forecasts must not be used for navigation.",
    weather: {
      0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Rime fog",
      51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",
      71:"Light snow",73:"Snow",75:"Heavy snow",80:"Showers",81:"Showers",82:"Heavy showers",
      95:"Thunderstorm",96:"Thunderstorm with hail",99:"Severe thunderstorm", unknown:"Variable"
    },
    dirs:["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
  }
};

const ICONS = {0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌧️",61:"🌦️",63:"🌧️",65:"🌧️",71:"🌨️",73:"🌨️",75:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",95:"⛈️",96:"⛈️",99:"⛈️"};
const avg = a => { const v=a.filter(Number.isFinite); return v.length?v.reduce((x,y)=>x+y,0)/v.length:null; };
const mode = a => { const c={}; a.filter(Number.isFinite).forEach(x=>c[x]=(c[x]||0)+1); return Number(Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]??0); };
const circ = (degs,weights=[]) => { let x=0,y=0; degs.forEach((d,i)=>{if(Number.isFinite(d)){const w=Number.isFinite(weights[i])?weights[i]:1;x+=Math.cos(d*Math.PI/180)*w;y+=Math.sin(d*Math.PI/180)*w;}}); return (Math.atan2(y,x)*180/Math.PI+360)%360; };
const idFor = p => `${Number(p.lat).toFixed(4)}-${Number(p.lon).toFixed(4)}`;
const fmtWind = (w,g,unit) => `${Math.round(w||0)}–${Math.round(g||0)} ${unit}`;
const weather = (code,t) => [t.weather[code]||t.weather.unknown,ICONS[code]||"🌤️"];
const direction = (degrees,t) => Number.isFinite(degrees)?t.dirs[Math.round(degrees/22.5)%16]:"—";

function consensusCurrent(models){
  const v=k=>models.map(m=>m.current?.[k]); const ws=v("wind_speed_10m");
  return {temp:avg(v("temperature_2m")),feels:avg(v("apparent_temperature")),humidity:avg(v("relative_humidity_2m")),pop:avg(models.map(m=>m.hourly?.precipitation_probability?.[0])),precip:avg(v("precipitation")),code:mode(v("weather_code")),wind:avg(ws),gust:avg(v("wind_gusts_10m")),direction:circ(v("wind_direction_10m"),ws),count:models.length};
}
function hourlyConsensus(models,i){const v=k=>models.map(m=>m.hourly?.[k]?.[i]);const ws=v("wind_speed_10m");return{time:models[0]?.hourly?.time?.[i],temp:avg(v("temperature_2m")),pop:avg(v("precipitation_probability")),code:mode(v("weather_code")),wind:avg(ws),gust:avg(v("wind_gusts_10m")),direction:circ(v("wind_direction_10m"),ws)}}
function dailyConsensus(models,i){const v=k=>models.map(m=>m.daily?.[k]?.[i]);return{date:models[0]?.daily?.time?.[i],max:avg(v("temperature_2m_max")),min:avg(v("temperature_2m_min")),pop:avg(v("precipitation_probability_max")),precip:avg(v("precipitation_sum")),code:mode(v("weather_code")),wind:avg(v("wind_speed_10m_max")),gust:avg(v("wind_gusts_10m_max"))}}

async function fetchBatch(places){
  if(!places.length)return{}; const lat=places.map(p=>p.lat).join(","),lon=places.map(p=>p.lon).join(",");
  const jobs=MODELS.map(async model=>{const q=new URLSearchParams({latitude:lat,longitude:lon,current:"temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",hourly:"precipitation_probability",timezone:"auto",forecast_days:"1",models:model.id});const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);if(!r.ok)throw new Error(model.name);const json=await r.json();return{model,arr:Array.isArray(json)?json:[json]}});
  const settled=await Promise.allSettled(jobs),ok=settled.filter(x=>x.status==="fulfilled").map(x=>x.value),out={};
  places.forEach((p,i)=>{const models=ok.map(x=>({...x.arr[i],_model:x.model})).filter(x=>x.current);out[p.id]=models.length?consensusCurrent(models):null;});return out;
}
async function fetchDetail(place){
  const jobs=MODELS.map(async model=>{const q=new URLSearchParams({latitude:String(place.lat),longitude:String(place.lon),hourly:H,daily:D,current:"temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",timezone:"auto",forecast_days:"7",models:model.id});const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);if(!r.ok)throw new Error(model.name);return{...await r.json(),_model:model}});const settled=await Promise.allSettled(jobs);return settled.filter(x=>x.status==="fulfilled").map(x=>x.value);
}
function haversineKm(a,b,c,d){const R=6371,rad=x=>x*Math.PI/180,dLat=rad(c-a),dLon=rad(d-b),z=Math.sin(dLat/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(z))}
async function fetchMarine(place){const q=new URLSearchParams({latitude:String(place.lat),longitude:String(place.lon),current:"sea_surface_temperature,wave_height",hourly:"sea_surface_temperature,wave_height",timezone:"auto",forecast_days:"7",cell_selection:"sea"});const r=await fetch(`https://marine-api.open-meteo.com/v1/marine?${q}`);if(!r.ok)return null;const j=await r.json(),distance=haversineKm(place.lat,place.lon,j.latitude,j.longitude);if(distance>120||!Number.isFinite(j.current?.sea_surface_temperature))return null;return{...j,distance}}

export default function Page(){
  const [places,setPlaces]=useState(DEFAULT_PLACES),[cards,setCards]=useState({}),[selected,setSelected]=useState(null),[models,setModels]=useState([]),[marine,setMarine]=useState(null),[loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false),[query,setQuery]=useState(""),[results,setResults]=useState([]),[message,setMessage]=useState(""),[language,setLanguage]=useState("tr"),[settingsOpen,setSettingsOpen]=useState(false),[manageMode,setManageMode]=useState(false),[hydrated,setHydrated]=useState(false);
  const t=COPY[language],locale=language==="tr"?"tr-TR":"en-US";

  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(STORE_KEY));if(Array.isArray(saved))setPlaces(saved);const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY));if(settings?.language==="tr"||settings?.language==="en")setLanguage(settings.language);}catch{}setHydrated(true);if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});},[]);
  useEffect(()=>{if(!hydrated)return;localStorage.setItem(STORE_KEY,JSON.stringify(places));setLoading(true);fetchBatch(places).then(setCards).finally(()=>setLoading(false));},[places,hydrated]);
  useEffect(()=>{if(hydrated)localStorage.setItem(SETTINGS_KEY,JSON.stringify({language}));},[language,hydrated]);

  async function search(e){e?.preventDefault();if(query.trim().length<2)return;setMessage(t.searching);const q=new URLSearchParams({name:query.trim(),count:"8",language,format:"json"});try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${q}`),j=await r.json();setResults((j.results||[]).map(x=>({id:idFor(x),lat:x.latitude,lon:x.longitude,name:[x.name,x.admin1,x.country].filter(Boolean).join(", ")})));setMessage(j.results?.length?"":t.noResults);}catch{setMessage(t.searchFailed)}}
  function addPlace(p){if(places.some(x=>x.id===p.id)){openDetail(p);return;}if(places.length>=MAX_PLACES){setMessage(t.maxReached);setManageMode(true);setResults([]);return;}setPlaces(prev=>[...prev,p]);setResults([]);setQuery("");setMessage("");}
  function removePlace(id,e){e?.stopPropagation();if(!window.confirm(t.deleteConfirm))return;setPlaces(prev=>prev.filter(x=>x.id!==id));}
  async function openDetail(p){setSelected(p);setDetailLoading(true);setModels([]);setMarine(null);window.scrollTo({top:0,behavior:"smooth"});const[m,sea]=await Promise.all([fetchDetail(p),fetchMarine(p)]);setModels(m);setMarine(sea);setDetailLoading(false)}

  const current=useMemo(()=>models.length?consensusCurrent(models):null,[models]);
  const hourly=useMemo(()=>{if(!models.length)return[];const start=Math.max(0,models[0].hourly.time.findIndex(x=>new Date(x)>=new Date()));return Array.from({length:48},(_,k)=>hourlyConsensus(models,start+k)).filter(x=>x.time)},[models]);
  const daily=useMemo(()=>models.length?Array.from({length:7},(_,i)=>dailyConsensus(models,i)):[],[models]);

  const Settings=()=>settingsOpen?<div className="modalBackdrop" onClick={()=>setSettingsOpen(false)}><section className="settingsModal" onClick={e=>e.stopPropagation()}><div className="modalHead"><h2>{t.settings}</h2><button onClick={()=>setSettingsOpen(false)} aria-label={t.close}>×</button></div><label>{t.language}</label><div className="languageButtons"><button className={language==="tr"?"active":""} onClick={()=>setLanguage("tr")}>Türkçe</button><button className={language==="en"?"active":""} onClick={()=>setLanguage("en")}>English</button></div><button className="primaryWide" onClick={()=>setSettingsOpen(false)}>{t.close}</button></section></div>:null;

  if(selected){const wc=current?weather(current.code,t):["",""];return <main className="shell"><Settings/><header className="topbar detailHead"><button className="back" onClick={()=>setSelected(null)}>← {t.back}</button><div className="detailTitle"><span className="eyebrow">{t.eyebrow}</span><h1>{selected.name}</h1></div><button className="iconButton" onClick={()=>setSettingsOpen(true)} aria-label={t.settings}>⚙︎</button></header>{detailLoading?<div className="loadingPanel">{t.loadingDetail}</div>:<><section className="hero"><div><div className="heroIcon">{wc[1]}</div><h2>{wc[0]}</h2><p>{current?.count}/5 {t.modelsUsed}</p></div><div className="heroTemp">{Math.round(current?.temp||0)}<sup>°C</sup><small>{t.feels} {Math.round(current?.feels||0)}°</small></div></section><section className="metrics"><Metric icon="💨" label={t.windGust} value={fmtWind(current?.wind,current?.gust,t.windUnit)} sub={`${direction(current?.direction,t)} · ${Math.round(current?.direction||0)}°`}/><Metric icon="💧" label={t.precipitation} value={`${Math.round(current?.pop||0)}%`} sub={`${(current?.precip||0).toFixed(1)} mm`}/><Metric icon="💦" label={t.humidity} value={`${Math.round(current?.humidity||0)}%`}/><Metric icon="🌊" label={t.sea} value={marine?`${marine.current.sea_surface_temperature.toFixed(1)}°C`:t.noSea} sub={marine?`${t.wave} ${marine.current.wave_height?.toFixed(1)??"—"} m · ${t.seaCell} ${Math.round(marine.distance)} km`:t.noSeaSub}/></section><section className="panel"><div className="sectionTitle"><h2>{t.hourly}</h2><span>{t.combined}</span></div><div className="hourly">{hourly.map((h,i)=>{const w=weather(h.code,t);return <article className="hour" key={h.time}><time>{i===0?t.now:new Date(h.time).toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"})}</time><b className="hourIcon">{w[1]}</b><strong>{Math.round(h.temp)}°</strong><span>💧 {Math.round(h.pop||0)}%</span><span>💨 {Math.round(h.wind||0)}–{Math.round(h.gust||0)}</span></article>})}</div></section><section className="panel dailyPanel"><div className="sectionTitle"><h2>{t.daily}</h2><span>{t.windGust}</span></div><div className="days">{daily.map((d,i)=>{const w=weather(d.code,t);return <div className="day" key={d.date}><b className="dayName">{i===0?t.today:new Date(d.date+"T12:00").toLocaleDateString(locale,{weekday:"short"})}</b><span className="dayWeather">{w[1]} {w[0]}</span><span className="dayRain">💧 {Math.round(d.pop||0)}%</span><span className="dayWind">💨 <b>{Math.round(d.wind||0)}–{Math.round(d.gust||0)}</b> <small>{t.windUnit}</small></span><strong className="dayTemp">{Math.round(d.max)}° / {Math.round(d.min)}°</strong></div>})}</div></section><section className="panel"><div className="sectionTitle"><h2>{t.modelComparison}</h2><span>{t.current}</span></div><div className="modelTable">{models.map(m=><div className="modelRow" key={m._model.id}><b>{m._model.name}</b><span>{Math.round(m.current.temperature_2m)}°</span><span>{Math.round(m.current.wind_speed_10m)}–{Math.round(m.current.wind_gusts_10m)} {t.windUnit}</span></div>)}</div></section></>}<Footer text={t.footer}/></main>}

  return <main className="shell"><Settings/><header className="topbar homeHead"><div><span className="eyebrow">{t.eyebrow}</span><h1>{t.appName}</h1><p>{t.tagline}</p></div><div className="headActions"><span className="count">{places.length}/{MAX_PLACES}</span><button className="iconButton" onClick={()=>setSettingsOpen(true)} aria-label={t.settings}>⚙︎</button></div></header><form className="search" onSubmit={search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.searchPlaceholder}/><button>{t.search}</button></form>{message&&<p className={`message ${places.length>=MAX_PLACES?"warning":""}`}>{message}</p>}{results.length>0&&<section className="results">{results.map(r=><button key={r.id} onClick={()=>addPlace(r)}><span>＋</span>{r.name}</button>)}</section>}<div className="sectionTitle homeTitle"><h2>{t.savedPlaces}</h2><div className="locationTools"><span>{loading?t.updating:t.updated}</span><button className="manageButton" onClick={()=>setManageMode(x=>!x)}>{manageMode?t.done:t.manage}</button></div></div>{!places.length?<div className="emptyState">{t.emptyPlaces}</div>:<section className="placeGrid">{places.map(p=>{const c=cards[p.id],w=c?weather(c.code,t):[t.updating,"⋯"];return <article className={`placeCard ${manageMode?"managing":""}`} key={p.id} onClick={()=>!manageMode&&openDetail(p)}><button className="remove" onClick={e=>removePlace(p.id,e)} aria-label={`${t.delete}: ${p.name}`} title={t.delete}>🗑</button><div className="cardTop"><div><h3>{p.name}</h3><p>{w[0]}</p></div><span>{w[1]}</span></div><div className="cardBottom"><strong>{c?`${Math.round(c.temp)}°`:"--°"}</strong><div><b>💨 {c?fmtWind(c.wind,c.gust,t.windUnit):`--–-- ${t.windUnit}`}</b><span>💧 {c?`${Math.round(c.pop||0)}%`:"--%"}</span></div></div>{manageMode&&<div className="deleteOverlay">{t.delete}</div>}</article>})}</section>}<p className="hint">{t.hint}</p><Footer text={t.footer}/></main>
}
function Metric({icon,label,value,sub}){return <article className="metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong>{sub&&<p>{sub}</p>}</article>}
function Footer({text}){return <footer>{text}</footer>}
