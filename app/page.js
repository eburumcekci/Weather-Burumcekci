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
  { id: "london", name: "Londra", lat: 51.5072, lon: -0.1276 },
  { id: "amsterdam", name: "Amsterdam", lat: 52.3676, lon: 4.9041 },
];

const MAX_PLACES = 30;
const STORE_KEY = "ortak-hava-pro-places-v1";
const H = "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,rain,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
const D = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max";

const WMO = {
  0:["Açık","☀️"],1:["Çoğunlukla açık","🌤️"],2:["Parçalı bulutlu","⛅"],3:["Kapalı","☁️"],
  45:["Sisli","🌫️"],48:["Kırağılı sis","🌫️"],51:["Hafif çisenti","🌦️"],53:["Çisenti","🌦️"],
  55:["Yoğun çisenti","🌧️"],61:["Hafif yağmur","🌦️"],63:["Yağmur","🌧️"],65:["Şiddetli yağmur","🌧️"],
  71:["Hafif kar","🌨️"],73:["Kar","🌨️"],75:["Yoğun kar","❄️"],80:["Sağanak","🌦️"],
  81:["Sağanak","🌧️"],82:["Şiddetli sağanak","⛈️"],95:["Gök gürültülü","⛈️"],
  96:["Dolu ihtimali","⛈️"],99:["Şiddetli fırtına","⛈️"]
};

const avg = a => {
  const v = a.filter(Number.isFinite);
  return v.length ? v.reduce((x,y)=>x+y,0)/v.length : null;
};
const mode = a => {
  const c = {};
  a.filter(Number.isFinite).forEach(x => c[x]=(c[x]||0)+1);
  return Number(Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 0);
};
const circ = (degs, weights=[]) => {
  let x=0,y=0;
  degs.forEach((d,i)=>{
    if(Number.isFinite(d)){
      const w=Number.isFinite(weights[i]) ? weights[i] : 1;
      x += Math.cos(d*Math.PI/180)*w;
      y += Math.sin(d*Math.PI/180)*w;
    }
  });
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
};
const dirs = ["K","KKD","KD","DKD","D","DGD","GD","GGD","G","GGB","GB","BGB","B","BKB","KB","KKB"];
const dir = d => Number.isFinite(d) ? dirs[Math.round(d/22.5)%16] : "—";
const weather = c => WMO[c] || ["Değişken","🌤️"];
const idFor = p => `${Number(p.lat).toFixed(4)}-${Number(p.lon).toFixed(4)}`;
const fmtWind = (w,g) => `${Math.round(w||0)}–${Math.round(g||0)} km/sa`;

function consensusCurrent(models){
  const v = k => models.map(m=>m.current?.[k]);
  const ws = v("wind_speed_10m");
  return {
    temp: avg(v("temperature_2m")),
    feels: avg(v("apparent_temperature")),
    humidity: avg(v("relative_humidity_2m")),
    pop: avg(models.map(m=>m.hourly?.precipitation_probability?.[0])),
    precip: avg(v("precipitation")),
    code: mode(v("weather_code")),
    wind: avg(ws),
    gust: avg(v("wind_gusts_10m")),
    direction: circ(v("wind_direction_10m"), ws),
    count: models.length,
  };
}

function hourlyConsensus(models, i){
  const v = k => models.map(m=>m.hourly?.[k]?.[i]);
  const ws=v("wind_speed_10m");
  return {
    time: models[0]?.hourly?.time?.[i],
    temp: avg(v("temperature_2m")),
    pop: avg(v("precipitation_probability")),
    code: mode(v("weather_code")),
    wind: avg(ws),
    gust: avg(v("wind_gusts_10m")),
    direction: circ(v("wind_direction_10m"),ws),
  };
}

function dailyConsensus(models, i){
  const v = k => models.map(m=>m.daily?.[k]?.[i]);
  return {
    date: models[0]?.daily?.time?.[i],
    max: avg(v("temperature_2m_max")),
    min: avg(v("temperature_2m_min")),
    pop: avg(v("precipitation_probability_max")),
    precip: avg(v("precipitation_sum")),
    code: mode(v("weather_code")),
    wind: avg(v("wind_speed_10m_max")),
    gust: avg(v("wind_gusts_10m_max")),
  };
}

async function fetchBatch(places){
  if(!places.length) return {};
  const lat = places.map(p=>p.lat).join(",");
  const lon = places.map(p=>p.lon).join(",");
  const jobs = MODELS.map(async model => {
    const q = new URLSearchParams({
      latitude:lat, longitude:lon, current:"temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      hourly:"precipitation_probability", timezone:"auto", forecast_days:"1", models:model.id
    });
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
    if(!r.ok) throw new Error(model.name);
    const json=await r.json();
    const arr=Array.isArray(json)?json:[json];
    return {model,arr};
  });
  const settled=await Promise.allSettled(jobs);
  const ok=settled.filter(x=>x.status==="fulfilled").map(x=>x.value);
  const out={};
  places.forEach((p,i)=>{
    const models=ok.map(x=>({...x.arr[i],_model:x.model})).filter(x=>x.current);
    out[p.id]=models.length?consensusCurrent(models):null;
  });
  return out;
}

async function fetchDetail(place){
  const jobs=MODELS.map(async model=>{
    const q=new URLSearchParams({
      latitude:String(place.lat),longitude:String(place.lon),hourly:H,daily:D,
      current:"temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      timezone:"auto",forecast_days:"7",models:model.id
    });
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
    if(!r.ok) throw new Error(model.name);
    return {...await r.json(),_model:model};
  });
  const settled=await Promise.allSettled(jobs);
  return settled.filter(x=>x.status==="fulfilled").map(x=>x.value);
}

function haversineKm(a,b,c,d){
  const R=6371, rad=x=>x*Math.PI/180;
  const dLat=rad(c-a),dLon=rad(d-b);
  const z=Math.sin(dLat/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(z));
}

async function fetchMarine(place){
  const q=new URLSearchParams({
    latitude:String(place.lat),longitude:String(place.lon),
    current:"sea_surface_temperature,wave_height",
    hourly:"sea_surface_temperature,wave_height",
    timezone:"auto",forecast_days:"7",cell_selection:"sea"
  });
  const r=await fetch(`https://marine-api.open-meteo.com/v1/marine?${q}`);
  if(!r.ok) return null;
  const j=await r.json();
  const distance=haversineKm(place.lat,place.lon,j.latitude,j.longitude);
  if(distance>120 || !Number.isFinite(j.current?.sea_surface_temperature)) return null;
  return {...j,distance};
}

export default function Page(){
  const [places,setPlaces]=useState(DEFAULT_PLACES);
  const [cards,setCards]=useState({});
  const [selected,setSelected]=useState(null);
  const [models,setModels]=useState([]);
  const [marine,setMarine]=useState(null);
  const [loading,setLoading]=useState(true);
  const [detailLoading,setDetailLoading]=useState(false);
  const [query,setQuery]=useState("");
  const [results,setResults]=useState([]);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(STORE_KEY));
      if(Array.isArray(saved)&&saved.length) setPlaces(saved);
    }catch{}
    if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
  },[]);

  useEffect(()=>{
    localStorage.setItem(STORE_KEY,JSON.stringify(places));
    setLoading(true);
    fetchBatch(places).then(setCards).finally(()=>setLoading(false));
  },[places]);

  async function search(e){
    e?.preventDefault();
    if(query.trim().length<2) return;
    setMessage("Aranıyor…");
    const q=new URLSearchParams({name:query.trim(),count:"8",language:"tr",format:"json"});
    try{
      const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${q}`);
      const j=await r.json();
      setResults((j.results||[]).map(x=>({
        id:idFor(x),lat:x.latitude,lon:x.longitude,
        name:[x.name,x.admin1,x.country].filter(Boolean).join(", ")
      })));
      setMessage(j.results?.length?"":"Sonuç bulunamadı.");
    }catch{setMessage("Arama yapılamadı.");}
  }

  function addPlace(p){
    if(places.some(x=>x.id===p.id)){setSelected(p);openDetail(p);return;}
    if(places.length>=MAX_PLACES){setMessage(`En fazla ${MAX_PLACES} konum kaydedilebilir.`);return;}
    setPlaces(prev=>[...prev,p]);
    setResults([]);setQuery("");
  }

  function removePlace(id,e){
    e.stopPropagation();
    setPlaces(prev=>prev.filter(x=>x.id!==id));
  }

  async function openDetail(p){
    setSelected(p);setDetailLoading(true);setModels([]);setMarine(null);window.scrollTo({top:0,behavior:"smooth"});
    const [m,sea]=await Promise.all([fetchDetail(p),fetchMarine(p)]);
    setModels(m);setMarine(sea);setDetailLoading(false);
  }

  const current=useMemo(()=>models.length?consensusCurrent(models):null,[models]);
  const hourly=useMemo(()=>{
    if(!models.length)return[];
    const start=Math.max(0,models[0].hourly.time.findIndex(t=>new Date(t)>=new Date()));
    return Array.from({length:48},(_,k)=>hourlyConsensus(models,start+k)).filter(x=>x.time);
  },[models]);
  const daily=useMemo(()=>models.length?Array.from({length:7},(_,i)=>dailyConsensus(models,i)):[],[models]);

  if(selected){
    const wc=current?weather(current.code):["",""];
    return <main className="shell">
      <header className="topbar">
        <button className="back" onClick={()=>setSelected(null)}>← Tüm konumlar</button>
        <div><span className="eyebrow">5 MODELLİ TAHMİN</span><h1>{selected.name}</h1></div>
      </header>
      {detailLoading?<div className="loadingPanel">Tahminler ve deniz verileri hazırlanıyor…</div>:<>
        <section className="hero">
          <div><div className="heroIcon">{wc[1]}</div><h2>{wc[0]}</h2><p>{current?.count}/5 model kullanıldı</p></div>
          <div className="heroTemp">{Math.round(current?.temp||0)}<sup>°C</sup><small>Hissedilen {Math.round(current?.feels||0)}°</small></div>
        </section>
        <section className="metrics">
          <Metric icon="💨" label="Rüzgâr – hamle" value={fmtWind(current?.wind,current?.gust)} sub={`${dir(current?.direction)} · ${Math.round(current?.direction||0)}°`}/>
          <Metric icon="💧" label="Yağış" value={`${Math.round(current?.pop||0)}%`} sub={`${(current?.precip||0).toFixed(1)} mm`}/>
          <Metric icon="💦" label="Nem" value={`${Math.round(current?.humidity||0)}%`} />
          <Metric icon="🌊" label="Deniz suyu" value={marine?`${marine.current.sea_surface_temperature.toFixed(1)}°C`:"Uygun veri yok"} sub={marine?`Dalga ${marine.current.wave_height?.toFixed(1)??"—"} m · deniz hücresi ${Math.round(marine.distance)} km`:"Denize uzak veya veri bulunamadı"}/>
        </section>
        <section className="panel">
          <div className="sectionTitle"><h2>48 saatlik tahmin</h2><span>Birleşik</span></div>
          <div className="hourly">
            {hourly.map((h,i)=>{const w=weather(h.code);return <article className="hour" key={h.time}>
              <time>{i===0?"Şimdi":new Date(h.time).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}</time>
              <b className="hourIcon">{w[1]}</b><strong>{Math.round(h.temp)}°</strong>
              <span>💧 {Math.round(h.pop||0)}%</span><span>💨 {Math.round(h.wind||0)}–{Math.round(h.gust||0)}</span>
            </article>})}
          </div>
        </section>
        <section className="panel">
          <div className="sectionTitle"><h2>7 günlük tahmin</h2><span>Rüzgâr – hamle</span></div>
          <div className="days">
            {daily.map((d,i)=>{const w=weather(d.code);return <div className="day" key={d.date}>
              <b>{i===0?"Bugün":new Date(d.date+"T12:00").toLocaleDateString("tr-TR",{weekday:"short"})}</b>
              <span>{w[1]} {w[0]}</span><span>💧 {Math.round(d.pop||0)}%</span>
              <span>💨 {Math.round(d.wind||0)}–{Math.round(d.gust||0)}</span>
              <strong>{Math.round(d.max)}° / {Math.round(d.min)}°</strong>
            </div>})}
          </div>
        </section>
        <section className="panel">
          <div className="sectionTitle"><h2>Model karşılaştırması</h2><span>Şu an</span></div>
          <div className="modelTable">
            {models.map(m=><div className="modelRow" key={m._model.id}>
              <b>{m._model.name}</b><span>{Math.round(m.current.temperature_2m)}°</span>
              <span>{Math.round(m.current.wind_speed_10m)}–{Math.round(m.current.wind_gusts_10m)} km/sa</span>
            </div>)}
          </div>
        </section>
      </>}
      <Footer/>
    </main>
  }

  return <main className="shell">
    <header className="topbar homeHead"><div><span className="eyebrow">5 MODELLİ TAHMİN</span><h1>Ortak Hava Pro</h1><p>Konumların tek ekranda, ayrıntılar bir dokunuş uzağında.</p></div><span className="count">{places.length}/{MAX_PLACES}</span></header>
    <form className="search" onSubmit={search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Şehir, ilçe veya ada ara…"/><button>Ara</button></form>
    {message&&<p className="message">{message}</p>}
    {results.length>0&&<section className="results">{results.map(r=><button key={r.id} onClick={()=>addPlace(r)}><span>＋</span>{r.name}</button>)}</section>}
    <div className="sectionTitle homeTitle"><h2>Kayıtlı konumlar</h2><span>{loading?"Güncelleniyor…":"Güncel"}</span></div>
    <section className="placeGrid">
      {places.map(p=>{
        const c=cards[p.id],w=c?weather(c.code):["Yükleniyor…","⋯"];
        return <article className="placeCard" key={p.id} onClick={()=>openDetail(p)}>
          <button className="remove" onClick={e=>removePlace(p.id,e)} aria-label="Konumu sil">×</button>
          <div className="cardTop"><div><h3>{p.name}</h3><p>{w[0]}</p></div><span>{w[1]}</span></div>
          <div className="cardBottom"><strong>{c?`${Math.round(c.temp)}°`:"--°"}</strong><div><b>💨 {c?fmtWind(c.wind,c.gust):"--–-- km/sa"}</b><span>💧 {c?`${Math.round(c.pop||0)}%`:"--%"}</span></div></div>
        </article>
      })}
    </section>
    <p className="hint">Bir karta dokununca 48 saatlik, 7 günlük, model karşılaştırması ve deniz suyu sıcaklığı açılır. Konumlar bu cihazda sürekli saklanır.</p>
    <Footer/>
  </main>
}

function Metric({icon,label,value,sub}){return <article className="metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong>{sub&&<p>{sub}</p>}</article>}
function Footer(){return <footer>Hava verileri Open-Meteo üzerinden ECMWF, GFS, ICON, UKMO ve Météo-France modellerinden; deniz verileri Open-Meteo Marine API’den alınır. Deniz tahminleri seyir amacıyla kullanılmamalıdır.</footer>}
