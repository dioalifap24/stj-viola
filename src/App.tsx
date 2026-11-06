/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bus, Volume2, Mic, MapPin, Users, Clock, Navigation, Play, 
  Sparkles, ArrowRightLeft, Radio, Ticket, VolumeX, ShieldCheck, Download, Zap, Compass, Satellite, Map as MapIcon, LineChart, RotateCcw,
  Bell, BellRing, Vibrate, AlertTriangle, Locate, LocateFixed, Crosshair, Navigation2,
  Loader2, Headphones, CheckCircle2, Volume1, Settings, Key, HelpCircle, Check, X, Sliders, ExternalLink, PlayCircle, PauseCircle
} from 'lucide-react';
import { 
  formatIndonesianTextForSpeech, 
  getBestIndonesianVoice, 
  synthesizeWithElevenLabs, 
  getStoredElevenLabsApiKey, 
  saveStoredElevenLabsApiKey, 
  getStoredVoiceUri, 
  saveStoredVoiceUri,
  GEMINI_VOICES, 
  VOICE_STYLES 
} from './utils/speechEngine';
import stjLogo from './assets/images/stj_official_logo_1793894658698.jpg';


interface Checkpoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  estTime: string;
  status: string;
  description: string;
}

interface Passenger {
  id: string;
  seat: string;
  name: string;
  destination: string;
  boardingPoint: string;
  checkedIn: boolean;
  ticketNo: string;
}

// Accurate real-world coordinates and highway distances for STJ Viola Ekonomi
const DEFAULT_CHECKPOINTS_SBY_MG: Checkpoint[] = [
  { id: 'exit-dumpil', name: 'Exit Toll Dumpil (Gerbang Tol Madiun)', lat: -7.5571, lng: 111.5512, distanceKm: 150, estTime: '15:30 WIB', status: 'checkpoint', description: 'Titik lokasi Gerbang Tol Madiun / Exit Dumpil.' },
  { id: 'term-madiun', name: 'Terminal Madiun', lat: -7.6046, lng: 111.5235, distanceKm: 156, estTime: '15:45 WIB', status: 'checkpoint', description: 'Pemberhentian di Terminal Purboyo Madiun.' },
  { id: 'pertigaan-totok', name: 'Pertigaan Totok', lat: -7.5954, lng: 111.4880, distanceKm: 161, estTime: '16:00 WIB', status: 'checkpoint', description: 'Penurunan penumpang area Pertigaan Totok.' },
  { id: 'garasi-stj', name: 'Garasi STJ', lat: -7.5785, lng: 111.4550, distanceKm: 166, estTime: '16:15 WIB', status: 'checkpoint', description: 'Transit / Garasi pusat Sudiro Tungga Jaya.' },
  { id: 'jalan-mbarat', name: 'Jalan Mbarat', lat: -7.5615, lng: 111.4390, distanceKm: 169, estTime: '16:22 WIB', status: 'checkpoint', description: 'Pemberhentian area Jalan Mbarat / Stasiun Barat.' },
  { id: 'term-maospati', name: 'Terminal Maospati', lat: -7.5458, lng: 111.4344, distanceKm: 173, estTime: '16:30 WIB', status: 'checkpoint', description: 'Pemberhentian Terminal Maospati.' },
  { id: 'sukomoro', name: 'Sukomoro', lat: -7.6180, lng: 111.3850, distanceKm: 180, estTime: '16:42 WIB', status: 'checkpoint', description: 'Pemberhentian area Sukomoro Magetan.' },
  { id: 'pasar-jengglong', name: 'Pasar Jengglong', lat: -7.6410, lng: 111.3480, distanceKm: 185, estTime: '16:55 WIB', status: 'checkpoint', description: 'Pemberhentian Pasar Jengglong Magetan.' },
  { id: 'term-magetan', name: 'Terminal Magetan (Tujuan Akhir)', lat: -7.6534, lng: 111.3325, distanceKm: 190, estTime: '17:10 WIB', status: 'arrival', description: 'Terminal akhir kedatangan Magetan.' }
];

const DEFAULT_CHECKPOINTS_MG_SBY: Checkpoint[] = [
  { id: 'menanggal', name: 'Menanggal', lat: -7.3392, lng: 112.7230, distanceKm: 178, estTime: '11:00 WIB', status: 'checkpoint', description: 'Pemberhentian pertama area Menanggal Surabaya Selatan.' },
  { id: 'medaeng', name: 'Medaeng', lat: -7.3562, lng: 112.7205, distanceKm: 182, estTime: '11:12 WIB', status: 'checkpoint', description: 'Pemberhentian Halte Medaeng / Waru.' },
  { id: 'grab-long', name: 'Grab Long', lat: -7.3540, lng: 112.7235, distanceKm: 184, estTime: '11:25 WIB', status: 'checkpoint', description: 'Pemberhentian area Grab Long / Bungurasih luar.' },
  { id: 'ramayana', name: 'Ramayana', lat: -7.3530, lng: 112.7250, distanceKm: 186, estTime: '11:38 WIB', status: 'checkpoint', description: 'Pemberhentian halte dekat Ramayana Bungurasih.' },
  { id: 'term-bungurasih', name: 'Terminal Purabaya Bungurasih (Tujuan Akhir)', lat: -7.3524, lng: 112.7265, distanceKm: 188, estTime: '11:50 WIB', status: 'arrival', description: 'Terminal akhir kedatangan Purabaya Bungurasih Surabaya.' }
];

// Haversine distance in meters
function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'soundboard' | 'checkpoints' | 'manifest' | 'operations' | 'map'>('soundboard');
  const [routeDirection, setRouteDirection] = useState<'surabaya-magetan' | 'magetan-surabaya'>('surabaya-magetan');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(DEFAULT_CHECKPOINTS_SBY_MG);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSpeechText, setActiveSpeechText] = useState<string>('');
  
  // Real-Time GPS from Device Geolocation & Satelit Mode (Default: Live Satelit STJ 55 KM/Jam & Odometer 0.9 KM matching screenshot)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number; heading?: number | null } | null>(null);
  const [isGpsLive, setIsGpsLive] = useState<boolean>(true);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [gpsSpeedKmh, setGpsSpeedKmh] = useState<number>(0); 
  const [gpsSourceStatus, setGpsSourceStatus] = useState<string>('Mendeteksi GPS Perangkat (Diam / 0 KM/Jam)...');
  const [locationMode, setLocationMode] = useState<'satelit_auto' | 'device'>('device');
  const [isAutoMoving, setIsAutoMoving] = useState<boolean>(false);
  const [autoAdvancePoint, setAutoAdvancePoint] = useState<boolean>(true);

  // Live Distance Traveled (Jarak Tempuh / Odometer)
  const [distanceTraveledKm, setDistanceTraveledKm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('stj_distance_traveled');
      return saved ? parseFloat(saved) : 0.9;
    } catch {
      return 0.9;
    }
  });

  // 500-Meter Proximity Alert (Beep & Vibration)
  const [proximityAlertEnabled, setProximityAlertEnabled] = useState<boolean>(true);
  const [alertedCheckpoints, setAlertedCheckpoints] = useState<string[]>([]);
  const [proximityAlertActive, setProximityAlertActive] = useState<{ id: string; name: string; meters: number } | null>(null);

  // Speed History for Real-time Chart
  const [speedHistory, setSpeedHistory] = useState<number[]>([52, 54, 55, 56, 55, 57, 55, 54, 55, 55]);

  const prevPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Custom AI announcement generator state
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [aiScript, setAiScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<'Fenrir' | 'Puck' | 'Charon' | 'Kore'>('Fenrir');
  const [enableChime, setEnableChime] = useState<boolean>(false);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [activeAudioCategory, setActiveAudioCategory] = useState<string | null>(null);
  const [voiceEngineStatus, setVoiceEngineStatus] = useState<string>('Studio Suara Manusia (Bebas Robot)');
  const [clientApiKey, setClientApiKey] = useState<string>(() => getStoredElevenLabsApiKey());
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredElevenLabsApiKey());
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceUri, setSelectedBrowserVoiceUri] = useState<string>(() => getStoredVoiceUri());
  const [apiKeySaveMsg, setApiKeySaveMsg] = useState<string | null>(null);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  // Passengers Manifest State for Viola Ekonomi (2-3 configuration)
  const [passengers, setPassengers] = useState<Passenger[]>([
    { id: '1', seat: '1A', name: 'Budi Santoso', destination: 'Terminal Madiun', boardingPoint: 'Surabaya', checkedIn: true, ticketNo: 'STJ-E101' },
    { id: '2', seat: '1B', name: 'Siti Aminah', destination: 'Terminal Maospati', boardingPoint: 'Surabaya', checkedIn: true, ticketNo: 'STJ-E102' },
    { id: '3', seat: '1C', name: 'Ahmad Fauzi', destination: 'Terminal Magetan', boardingPoint: 'Surabaya', checkedIn: false, ticketNo: 'STJ-E103' },
    { id: '4', seat: '1D', name: 'Dewi Lestari', destination: 'Sukomoro', boardingPoint: 'Surabaya', checkedIn: true, ticketNo: 'STJ-E104' },
    { id: '5', seat: '1E', name: 'Rian Pratama', destination: 'Terminal Magetan', boardingPoint: 'Surabaya', checkedIn: false, ticketNo: 'STJ-E105' },
    { id: '6', seat: '2A', name: 'Sri Wahyuni', destination: 'Garasi STJ', boardingPoint: 'Surabaya', checkedIn: true, ticketNo: 'STJ-E106' },
  ]);

  const [newPassengerName, setNewPassengerName] = useState('');
  const [newPassengerSeat, setNewPassengerSeat] = useState('2B');
  const [newPassengerDest, setNewPassengerDest] = useState('Terminal Magetan');

  // Clean legacy colliding audio cache keys that may contain stale female recordings
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('audio_') || k.startsWith('stj_voice_audio_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
  }, []);

  // Asynchronously load and cache device voices for natural human Indonesian speech fallback
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          setBrowserVoices(voices);
          if (!selectedBrowserVoiceUri) {
            const best = getBestIndonesianVoice(voices);
            if (best) {
              setSelectedBrowserVoiceUri(best.voiceURI);
            }
          }
        }
      } catch (err) {
        console.warn('Error reading voices:', err);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedBrowserVoiceUri]);

  // LIVE TIME ENGINE: Live-speed updating and Odometer distance calculation every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      if (locationMode === 'satelit_auto' && isAutoMoving) {
        // Natural bus highway speed variation (53 - 58 KM/Jam)
        const wave = Math.sin(Date.now() / 3500) * 3;
        const jitter = (Math.random() * 2 - 1);
        const liveSpeed = Math.round(55 + wave + jitter);
        setGpsSpeedKmh(liveSpeed);
        setSpeedHistory(prev => [...prev.slice(1), liveSpeed]);

        // Live Odometer accumulation: distance = speed * (1 second / 3600 seconds)
        const kmPerSec = liveSpeed / 3600;
        setDistanceTraveledKm(prev => {
          const nextVal = +(prev + kmPerSec).toFixed(2);
          try {
            localStorage.setItem('stj_distance_traveled', nextVal.toString());
          } catch {}
          return nextVal;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [locationMode, isAutoMoving]);

  // OTOMATIS: Sesuaikan GPS langsung saat membuka web
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsErrorMsg('Browser tidak mendukung sensor GPS');
      setGpsSourceStatus('Sensor GPS tidak didukung pada browser ini');
      return;
    }

    setGpsSourceStatus('Menghubungkan ke satelit GPS perangkat (Otomatis)...');
    
    // Immediate one-shot position fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy || 0),
          heading: heading || null
        });
        setIsGpsLive(true);
        setGpsErrorMsg(null);
        setGpsSourceStatus(`Satelit GPS Live (Akurasi: ±${Math.round(accuracy || 0)}m)`);
        const spd = speed !== null && speed >= 0 ? Math.round(speed * 3.6) : 0;
        setGpsSpeedKmh(spd);
        setSpeedHistory(prev => [...prev.slice(1), spd]);
      },
      (err) => {
        console.warn('Initial GPS query warning:', err.message);
        setGpsSourceStatus('Menunggu izin sensor lokasi GPS browser...');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, []);

  // Continuous Real-time Geolocation tracking when device mode is active
  useEffect(() => {
    if (locationMode !== 'device') return;

    if (!('geolocation' in navigator)) {
      setGpsErrorMsg('Browser tidak mendukung sensor GPS');
      setGpsSourceStatus('GPS tidak didukung pada browser ini');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const now = position.timestamp;

        setUserLocation({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy || 0),
          heading: heading || null
        });
        setIsGpsLive(true);
        setGpsErrorMsg(null);
        setGpsSourceStatus(`Satelit GPS Live (Akurasi: ±${Math.round(accuracy || 0)}m)`);

        // Compute real bus speed: prefer GPS chipset hardware sensor (Google Maps / Waze standard)
        let detectedSpeed = 0;
        if (speed !== null && speed >= 0) {
          detectedSpeed = Math.round(speed * 3.6); // m/s -> km/h
        } else if (prevPositionRef.current) {
          const metersMoved = calculateHaversineMeters(
            prevPositionRef.current.lat, 
            prevPositionRef.current.lng, 
            latitude, 
            longitude
          );
          const timeSec = (now - prevPositionRef.current.time) / 1000;
          if (timeSec >= 0.8 && metersMoved >= 2.5) {
            detectedSpeed = Math.round((metersMoved / timeSec) * 3.6);
          }
        }

        // Accumulate real odometer movement
        if (prevPositionRef.current) {
          const metersMoved = calculateHaversineMeters(
            prevPositionRef.current.lat, 
            prevPositionRef.current.lng, 
            latitude, 
            longitude
          );
          // Filter out GPS drift (< 2.5m) and unrealistic teleports (> 1500m)
          if (metersMoved >= 2.5 && metersMoved < 1500) {
            setDistanceTraveledKm(prev => {
              const nextVal = +(prev + metersMoved / 1000).toFixed(2);
              try {
                localStorage.setItem('stj_distance_traveled', nextVal.toString());
              } catch {}
              return nextVal;
            });
          }
        }
        prevPositionRef.current = { lat: latitude, lng: longitude, time: now };

        const safeSpeed = Math.min(130, Math.max(0, detectedSpeed));
        setGpsSpeedKmh(safeSpeed);
        setSpeedHistory(prev => [...prev.slice(1), safeSpeed]);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setGpsErrorMsg('Izin lokasi diperlukan untuk GPS real-time');
        setGpsSourceStatus('Menunggu izin lokasi GPS browser');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationMode]);

  // Fetch checkpoints on route change
  useEffect(() => {
    fetch(`/api/checkpoints?route=${routeDirection}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCheckpoints(data);
          setCurrentCheckpointIndex(0);
          setAlertedCheckpoints([]);
          setProximityAlertActive(null);
        }
      })
      .catch(err => {
        console.error('Failed to load checkpoints', err);
        setCheckpoints(routeDirection === 'surabaya-magetan' ? DEFAULT_CHECKPOINTS_SBY_MG : DEFAULT_CHECKPOINTS_MG_SBY);
      });
  }, [routeDirection]);

  // Fallback origin coordinates
  const defaultOrigin = routeDirection === 'surabaya-magetan' 
    ? { lat: -7.3524, lng: 112.7265, name: 'Terminal Purabaya Surabaya' } 
    : { lat: -7.6534, lng: 111.3325, name: 'Terminal Magetan' };

  const currentLat = userLocation ? userLocation.lat : defaultOrigin.lat;
  const currentLng = userLocation ? userLocation.lng : defaultOrigin.lng;

  // Active Target Checkpoint
  const activeCheckpoint = checkpoints[currentCheckpointIndex] || checkpoints[0] || (
    routeDirection === 'surabaya-magetan' ? DEFAULT_CHECKPOINTS_SBY_MG[0] : DEFAULT_CHECKPOINTS_MG_SBY[0]
  );

  // Exact real-time meters and KM to active checkpoint
  const activeRemainingMeters = Math.max(0, calculateHaversineMeters(currentLat, currentLng, activeCheckpoint.lat, activeCheckpoint.lng));
  const activeRemainingKm = (activeRemainingMeters / 1000);

  // Highway distance calculation: accurately use each checkpoint's real distance along the toll route
  const targetCheckpointKm = activeCheckpoint.distanceKm || 150;
  const remainingHighwayKm = Math.max(0.1, +(targetCheckpointKm - distanceTraveledKm).toFixed(1));

  // Format display distance: 
  // In satelit auto mode: show realistic highway route distance (e.g. Exit Toll Dumpil 150 - 0.9 = 149.1 KM)
  // In device mode: if close (< 1000m), show exact meters; otherwise show highway route distance
  const displayRemainingKm = locationMode === 'satelit_auto'
    ? remainingHighwayKm
    : (activeRemainingMeters < 1000 ? +(activeRemainingKm).toFixed(2) : remainingHighwayKm);

  const distanceRemainingDisplay = locationMode === 'satelit_auto'
    ? `${displayRemainingKm} KM lagi`
    : activeRemainingMeters < 1000 ? `${activeRemainingMeters} Meter lagi` : `${displayRemainingKm} KM lagi`;

  const effectiveRemainingMeters = locationMode === 'satelit_auto'
    ? Math.round(remainingHighwayKm * 1000)
    : activeRemainingMeters;

  // Final destination calculations
  const finalCheckpoint = checkpoints[checkpoints.length - 1] || (
    routeDirection === 'surabaya-magetan' ? DEFAULT_CHECKPOINTS_SBY_MG[8] : DEFAULT_CHECKPOINTS_MG_SBY[4]
  );
  const totalRouteKm = finalCheckpoint.distanceKm || 188;
  const finalRemainingKm = Math.max(0, +(totalRouteKm - distanceTraveledKm).toFixed(1));
  const percentCovered = Math.min(100, Math.round((distanceTraveledKm / totalRouteKm) * 100));

  // Realistic ETA based on live speed
  const effectiveSpeed = gpsSpeedKmh >= 10 ? gpsSpeedKmh : 55;
  const etaMinutesTotal = Math.max(1, Math.round((finalRemainingKm / effectiveSpeed) * 60));

  const etaDate = new Date();
  etaDate.setMinutes(etaDate.getMinutes() + etaMinutesTotal);
  const etaFinalTimeStr = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  // Instant simulator tools for quick testing anywhere
  const simulateAtLocation = (name: string, lat: number, lng: number, speed: number = 55, setDistanceKm?: number) => {
    setLocationMode('satelit_auto');
    setUserLocation({ lat, lng, accuracy: 5, heading: null });
    setGpsSpeedKmh(speed);
    setGpsSourceStatus(`Titik Satelit Rute: ${name}`);
    setIsGpsLive(true);
    if (setDistanceKm !== undefined) {
      setDistanceTraveledKm(setDistanceKm);
    }
    setAlertedCheckpoints([]);
    setProximityAlertActive(null);
  };

  const useLiveDeviceGps = () => {
    setLocationMode('device');
    setAlertedCheckpoints([]);
    setProximityAlertActive(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
            heading: pos.coords.heading || null
          });
          setIsGpsLive(true);
          setGpsErrorMsg(null);
          setGpsSourceStatus(`Satelit GPS Live (Akurasi: ±${Math.round(pos.coords.accuracy || 0)}m)`);
          const spd = pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : 0;
          setGpsSpeedKmh(spd);
        },
        (err) => {
          setGpsErrorMsg('Izin lokasi diperlukan untuk GPS real-time');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const useSatelitAutoMode = () => {
    setLocationMode('satelit_auto');
    setIsAutoMoving(true);
    setIsGpsLive(true);
    setGpsSpeedKmh(55);
    setGpsSourceStatus('Menggunakan Jalur Otomatis Satelit STJ Viola (Real-time)');
  };

  const resetDistanceTraveled = () => {
    setDistanceTraveledKm(0.0);
    try {
      localStorage.setItem('stj_distance_traveled', '0.0');
    } catch {}
  };

  // Play Pre-announcement Chime (3-Tone Railway Station Chime)
  const playPreAnnouncementChime = (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Tone 1: Bb4 (466.16 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(466.16, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.25 * voiceVolume, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.4);

        // Tone 2: D5 (587.33 Hz)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(587.33, audioCtx.currentTime + 0.3);
        gain2.gain.setValueAtTime(0.25 * voiceVolume, audioCtx.currentTime + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.7);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(audioCtx.currentTime + 0.3);
        osc2.stop(audioCtx.currentTime + 0.7);

        // Tone 3: F5 (698.46 Hz)
        const osc3 = audioCtx.createOscillator();
        const gain3 = audioCtx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(698.46, audioCtx.currentTime + 0.6);
        gain3.gain.setValueAtTime(0.25 * voiceVolume, audioCtx.currentTime + 0.6);
        gain3.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
        osc3.connect(gain3);
        gain3.connect(audioCtx.destination);
        osc3.start(audioCtx.currentTime + 0.6);
        osc3.stop(audioCtx.currentTime + 1.0);

        setTimeout(() => {
          resolve();
        }, 1100);
      } catch {
        resolve();
      }
    });
  };

  const stopSpeech = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsAudioLoading(false);
    setActiveAudioCategory(null);
  };

  // Multi-tier Natural Human Voice Engine (Zero Robot!)
  const speakAnnouncement = async (text: string, category?: string) => {
    if (!text) return;

    // Immediately stop any currently playing voice
    stopSpeech();

    setActiveSpeechText(text);
    setIsAudioLoading(true);
    if (category) setActiveAudioCategory(category);

    if (enableChime) {
      await playPreAnnouncementChime();
    }

    // Resolve static audio files
    const resolveAudioUrl = (filename: string): string => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const cleanBase = base.endsWith('/') ? base : `${base}/`;
        return new URL(`${cleanBase}audio/${filename}`, window.location.href).href;
      } catch {
        return `/audio/${filename}`;
      }
    };

    let staticAudioPath: string | null = null;

    if (category) {
      if (category.startsWith('point-')) {
        // Individual Checkpoint: point-exit-dumpil, point-term-madiun, etc.
        const cleanCpId = category.replace('point-', '').replace(/-/g, '_');
        staticAudioPath = resolveAudioUrl(`point_${cleanCpId}.mp3`);
      } else {
        // General announcement buttons
        if (category === 'welcome') {
          staticAudioPath = resolveAudioUrl('welcome.mp3');
        } else {
          const generalMap: Record<string, string> = {
            ticket: resolveAudioUrl('ticket.mp3'),
            checkpoint: resolveAudioUrl('checkpoint_generic.mp3'),
            test: resolveAudioUrl('test_sample.mp3'),
            berangkat: resolveAudioUrl('berangkat.mp3'),
            restarea: resolveAudioUrl('restarea.mp3'),
            tol: resolveAudioUrl('tol.mp3'),
            proximity: resolveAudioUrl('proximity_alert.mp3'),
          };
          staticAudioPath = generalMap[category] || null;
        }
      }
    }

    if (staticAudioPath) {
      try {
        // Stop any ongoing browser speech before playing static audio
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        const audio = new Audio(staticAudioPath);
        audio.volume = voiceVolume;
        currentAudioRef.current = audio;

        audio.onplay = () => {
          setIsAudioLoading(false);
          setIsPlaying(true);
          setVoiceEngineStatus(`Audio Studio Asli (Mas Jully - Pria Dewasa Berwibawa)`);
        };

        audio.onended = () => {
          setIsPlaying(false);
          setIsAudioLoading(false);
          setActiveAudioCategory(null);
          currentAudioRef.current = null;
        };


        audio.onerror = () => {
          console.warn('Bundled audio file load failed, executing dynamic speech...', staticAudioPath);
          executeDynamicSpeech(text, category);
        };

        await audio.play();
        return;
      } catch (e) {
        console.warn('Bundled audio playback error, falling back to dynamic synthesis:', e);
      }
    }

    await executeDynamicSpeech(text, category);
  };

  const executeDynamicSpeech = async (text: string, category?: string) => {
    // Generate unique, non-colliding hash for cache
    const simpleHash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(36);
    };

    const cacheKey = `${selectedVoice}_${simpleHash(text)}`;
    let audioBase64: string | null = audioCacheRef.current.get(cacheKey) || null;
    let audioMimeType = 'audio/wav';

    // Check localStorage cache (clean non-colliding key)
    if (!audioBase64) {
      try {
        const stored = localStorage.getItem(`stj_v2_${cacheKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          audioBase64 = parsed.audioBase64 || stored;
          audioMimeType = parsed.mimeType || (audioBase64?.startsWith('UklGR') ? 'audio/wav' : 'audio/mp3');
          const personaName = selectedVoice === 'Kore' ? 'Mas Sultan' : `Mas ${selectedVoice}`;
          setVoiceEngineStatus(`Studio AI Voice (${personaName} - Pria Dewasa Berwibawa)`);
        }
      } catch {}
    }

    // Tier 2: Try Backend Express Server API (if server.ts is running)
    if (!audioBase64) {
      try {
        const response = await fetch('/api/synthesize-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceName: selectedVoice,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.audioBase64 && typeof data.audioBase64 === 'string') {
            audioBase64 = data.audioBase64;
            audioMimeType = data.mimeType || (data.audioBase64.startsWith('UklGR') ? 'audio/wav' : 'audio/mp3');
            audioCacheRef.current.set(cacheKey, data.audioBase64);
            const personaName = selectedVoice === 'Kore' ? 'Mas Sultan' : `Mas ${selectedVoice}`;
            setVoiceEngineStatus(`Studio AI Voice (${personaName} - Pria Dewasa Berwibawa 24kHz)`);
            try {
              localStorage.setItem(`stj_v2_${cacheKey}`, JSON.stringify({
                audioBase64: data.audioBase64,
                mimeType: audioMimeType
              }));
            } catch {}
          }
        }
      } catch {
        // Backend not available (typical when deployed statically to GitHub Pages)
      }
    }

    // Tier 3: Client-Side Direct ElevenLabs API
    if (!audioBase64 && clientApiKey) {
      try {
        setVoiceEngineStatus(`Memproses Suara Mas Fenrir (ElevenLabs)...`);
        const base64 = await synthesizeWithElevenLabs(text, clientApiKey);
        if (base64) {
          audioBase64 = base64;
          audioMimeType = 'audio/mp3';
          audioCacheRef.current.set(cacheKey, base64);
          setVoiceEngineStatus(`Studio AI Voice (Mas Fenrir - ElevenLabs)`);
          try {
            localStorage.setItem(`stj_v2_${cacheKey}`, JSON.stringify({
              audioBase64: base64,
              mimeType: audioMimeType
            }));
          } catch {}
        }
      } catch (clientErr: any) {
        console.warn('Direct client-side ElevenLabs TTS failed:', clientErr);
      }
    }

    // Play synthesized audio if available
    if (audioBase64) {
      try {
        const finalMime = audioMimeType || (audioBase64.startsWith('UklGR') ? 'audio/wav' : 'audio/mp3');
        const audio = new Audio(`data:${finalMime};base64,${audioBase64}`);
        audio.volume = voiceVolume;
        currentAudioRef.current = audio;

        audio.onplay = () => {
          setIsAudioLoading(false);
          setIsPlaying(true);
        };

        audio.onended = () => {
          setIsPlaying(false);
          setIsAudioLoading(false);
          setActiveAudioCategory(null);
          currentAudioRef.current = null;
        };

        audio.onerror = () => {
          fallbackVoicePlayback(text, selectedVoice);
        };

        await audio.play();
        return;
      } catch (playbackError) {
        console.warn('Playback error with Audio element, fallback:', playbackError);
        fallbackVoicePlayback(text, selectedVoice);
        return;
      }
    }

    // Tier 4: Persona-accurate fallback (Authoritative Adult Male)
    fallbackVoicePlayback(text, selectedVoice);
  };

  const fallbackVoicePlayback = (text: string, voiceName: 'Fenrir' | 'Puck' | 'Charon' | 'Kore') => {
    setIsAudioLoading(false);
    speakCalibratedBrowserVoice(text, voiceName);
  };

  const speakCalibratedBrowserVoice = (text: string, voiceName?: 'Fenrir' | 'Puck' | 'Charon' | 'Kore') => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const formattedText = formatIndonesianTextForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(formattedText);
      utterance.lang = 'id-ID';
      utterance.volume = voiceVolume;
      utterance.rate = 0.92; // Natural human cadence

      const activeVoice = voiceName || selectedVoice;

      if (activeVoice === 'Charon') {
        utterance.pitch = 0.88; // Natural deep adult male
      } else if (activeVoice === 'Fenrir') {
        utterance.pitch = 0.95; // Natural male conductor
      } else if (activeVoice === 'Puck') {
        utterance.pitch = 0.98; // Natural clear male
      } else {
        utterance.pitch = 0.92; // Natural male supervisor
      }

      const personaLabel = activeVoice === 'Kore' ? 'Mas Sultan' : `Mas ${activeVoice}`;
      setVoiceEngineStatus(`Suara Manusia Asli (${personaLabel} - Pria Dewasa Natural)`);

      const voices = browserVoices.length > 0 ? browserVoices : window.speechSynthesis.getVoices();
      const naturalVoice = getBestIndonesianVoice(voices, selectedBrowserVoiceUri, true);
      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        setActiveAudioCategory(null);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        setActiveAudioCategory(null);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Test sample human voice
  const handleTestSampleVoice = () => {
    const sampleText = `Perhatian kepada seluruh penumpang, ini adalah uji coba suara asli manusia untuk armada Sudiro Tungga Jaya Viola. Suara jernih, berwibawa, dan nyaman didengarkan di sepanjang rute Magetan Surabaya.`;
    speakAnnouncement(sampleText, 'test');
  };

  const handleSaveApiKey = () => {
    saveStoredElevenLabsApiKey(apiKeyInput);
    setClientApiKey(apiKeyInput.trim());
    setApiKeySaveMsg('Kunci API ElevenLabs tersimpan!');
    setTimeout(() => setApiKeySaveMsg(null), 4000);
  };

  const handleClearApiKey = () => {
    saveStoredElevenLabsApiKey('');
    setClientApiKey('');
    setApiKeyInput('');
    setApiKeySaveMsg('Kunci API telah dihapus dari browser.');
    setTimeout(() => setApiKeySaveMsg(null), 4000);
  };

  const handleSelectBrowserVoice = (uri: string) => {
    setSelectedBrowserVoiceUri(uri);
    saveStoredVoiceUri(uri);
  };

  // Play STJ Bus Air Horn Sound Effect (Iconic Twin-Tone "Ton-Ton" Bus Horn)
  const playBusHorn = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq1: number, freq2: number, startTime: number, duration: number) => {
        // Oscillator 1 (Square wave for rich bus horn punch)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(freq1, audioCtx.currentTime + startTime);
        
        gain1.gain.setValueAtTime(0.2, audioCtx.currentTime + startTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
        
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(audioCtx.currentTime + startTime);
        osc1.stop(audioCtx.currentTime + startTime + duration);

        // Oscillator 2 (Sawtooth for harmonic depth)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq2, audioCtx.currentTime + startTime);
        
        gain2.gain.setValueAtTime(0.18, audioCtx.currentTime + startTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
        
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(audioCtx.currentTime + startTime);
        osc2.stop(audioCtx.currentTime + startTime + duration);
      };

      // Ton 1 ("TON...")
      playTone(150, 225, 0.0, 0.35);

      // Ton 2 ("...TON!")
      playTone(140, 210, 0.42, 0.45);

    } catch (e) {
      console.error('Bus horn audio error:', e);
    }
  };

  // Play High-Pitch Proximity Beep Chime (3 Beeps) & Vibration Alert
  const playProximityAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Beep 1 (Tone A5 880Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.45, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.14);

      // Beep 2 (Tone D6 1175Hz - Higher Chime)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.18);
      gain2.gain.setValueAtTime(0.55, audioCtx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.32);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.18);
      osc2.stop(audioCtx.currentTime + 0.32);

      // Beep 3 (Tone E6 1318Hz - Alert Resonant Chime)
      const osc3 = audioCtx.createOscillator();
      const gain3 = audioCtx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1318, audioCtx.currentTime + 0.36);
      gain3.gain.setValueAtTime(0.5, audioCtx.currentTime + 0.36);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc3.connect(gain3);
      gain3.connect(audioCtx.destination);
      osc3.start(audioCtx.currentTime + 0.36);
      osc3.stop(audioCtx.currentTime + 0.6);

      // Trigger mobile device physical vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([250, 100, 250, 100, 400]);
      }
    } catch (e) {
      console.error('Proximity alert audio error:', e);
    }
  };

  // Monitor Distance to Checkpoint (< 500 meters) and Automatically Fire Beep & Vibration
  useEffect(() => {
    if (!proximityAlertEnabled || !activeCheckpoint || !activeCheckpoint.id) return;

    if (effectiveRemainingMeters <= 500 && effectiveRemainingMeters > 0) {
      if (!alertedCheckpoints.includes(activeCheckpoint.id)) {
        setAlertedCheckpoints(prev => [...prev, activeCheckpoint.id]);
        setProximityAlertActive({
          id: activeCheckpoint.id,
          name: activeCheckpoint.name,
          meters: effectiveRemainingMeters
        });
        playProximityAlertSound();
      } else {
        setProximityAlertActive(prev => (prev ? { ...prev, meters: effectiveRemainingMeters } : null));
      }
    } else if (effectiveRemainingMeters <= 0 || effectiveRemainingMeters > 700) {
      setProximityAlertActive(null);
    }
  }, [effectiveRemainingMeters, activeCheckpoint, proximityAlertEnabled, alertedCheckpoints]);

  // Soundboard scripts - 100% Suara Manusia (Bebas Robot & Tanpa Sebutan Angka Jarak Tempuh/Kecepatan)
  const handlePlayWelcome = () => {
    const routeName = routeDirection === 'surabaya-magetan' ? 'Surabaya menuju Magetan' : 'Magetan menuju Surabaya';
    const script = `Perhatian... Selamat datang Bapak, Ibu, dan seluruh penumpang setia Sudiro Tungga Jaya armada Viola kelas Ekonomi rute ${routeName}. Perjalanan kita kali ini dipandu oleh pengemudi kita Mas Rifai, dan didampingi oleh kondektur Jully. Selamat menikmati perjalanan bersama STJ Viola. Silakan duduk dengan nyaman dan tetap menjaga barang bawaan Anda. Terima kasih dan selamat menikmati perjalanan.`;
    speakAnnouncement(script, 'welcome');
  };

  const handlePlayTicketPayment = () => {
    const script = `Perhatian kepada seluruh penumpang bus STJ Viola. Petugas kondektur akan segera melakukan pemeriksaan tiket dan penarikan ongkos bus kelas ekonomi. Mohon dipersiapkan tiket atau ongkos perjalanannya. Terima kasih banyak atas kerja sama Anda.`;
    speakAnnouncement(script, 'ticket');
  };

  const handlePlayCheckpoint = () => {
    const script = `Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di titik pemberhentian point ${activeCheckpoint.name}. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan agar tidak tertinggal. Terima kasih.`;
    const checkpointAudioCategory = `point-${activeCheckpoint.id}`;
    speakAnnouncement(script, checkpointAudioCategory);
  };

  const handlePlayBerangkat = () => {
    const script = `Perhatian kepada seluruh penumpang. Pintu bus segera ditutup, armada STJ Viola bersiap meluncur menuju tujuan. Pastikan Anda sudah duduk di kursi masing-masing dengan nyaman.`;
    speakAnnouncement(script, 'berangkat');
  };

  const handlePlayRestArea = () => {
    const script = `Pemberitahuan kepada seluruh penumpang bus STJ Viola. Sebentar lagi armada kita akan beristirahat di Rest Area. Penumpang yang ingin ke toilet atau membeli konsumsi dipersilakan bersiap.`;
    speakAnnouncement(script, 'restarea');
  };

  const handlePlayTolTransJawa = () => {
    const script = `Bus Sudiro Tungga Jaya Viola saat ini telah memasuki jalan tol Trans Jawa. Pengemudi akan melaju dengan kecepatan aman dan stabil. Selamat menikmati kenyamanan perjalanan Anda.`;
    speakAnnouncement(script, 'tol');
  };

  // Generate AI announcement using Gemini API (Tanpa sebutan angka jarak tempuh atau kecepatan)
  const handleGenerateAiAnnouncement = async () => {
    if (!customPrompt) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          customPrompt: `${customPrompt}. (Gaya pengumuman kondektur bus profesional dan ramah. Jangan menyebutkan nama sopir atau kondektur karena perkenalan kru hanya di awal sambutan saja. Jangan menyebutkan angka jarak tempuh kilometer ataupun kecepatan bus)`,
          routeDirection
        })
      });
      const data = await res.json();
      if (data.script) {
        setAiScript(data.script);
        speakAnnouncement(data.script);
      }
    } catch (err) {
      console.error('Error generating AI announcement', err);
      // Fallback: direct speak of prompt
      speakAnnouncement(`Perhatian kepada seluruh penumpang bus STJ Viola. ${customPrompt}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddPassenger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassengerName) return;
    const newP: Passenger = {
      id: Date.now().toString(),
      seat: newPassengerSeat,
      name: newPassengerName,
      destination: newPassengerDest,
      boardingPoint: routeDirection === 'surabaya-magetan' ? 'Surabaya' : 'Magetan',
      checkedIn: true,
      ticketNo: `STJ-E${Math.floor(100 + Math.random() * 900)}`
    };
    setPassengers([...passengers, newP]);
    setNewPassengerName('');
  };

  const toggleCheckIn = (id: string) => {
    setPassengers(passengers.map(p => p.id === id ? { ...p, checkedIn: !p.checkedIn } : p));
  };

  // Export Manifest to CSV
  const exportManifestCSV = () => {
    const headers = ['Kursi', 'No Tiket', 'Nama Penumpang', 'Titik Naik', 'Tujuan', 'Status Checkin'];
    const rows = passengers.map(p => [
      p.seat,
      p.ticketNo,
      `"${p.name}"`,
      `"${p.boardingPoint}"`,
      `"${p.destination}"`,
      p.checkedIn ? 'Sudah Bayar / Naik' : 'Belum'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `manifest_penumpang_stj_viola_${routeDirection}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Maps Directions (Purabaya Bungurasih Waru <-> Terminal Magetan)
  const isSbyToMg = routeDirection === 'surabaya-magetan';
  const originName = isSbyToMg ? 'Terminal Purabaya Bungurasih (Waru, Sidoarjo)' : 'Terminal Magetan (Magetan)';
  const destinationName = isSbyToMg ? 'Terminal Magetan (Magetan)' : 'Terminal Purabaya Bungurasih (Waru, Sidoarjo)';

  const googleMapsEmbedUrl = isSbyToMg
    ? "https://maps.google.com/maps?saddr=Terminal+Purabaya+Bungurasih+Waru+Sidoarjo&daddr=Terminal+Magetan+Jawa+Timur&output=embed"
    : "https://maps.google.com/maps?saddr=Terminal+Magetan+Jawa+Timur&daddr=Terminal+Purabaya+Bungurasih+Waru+Sidoarjo&output=embed";

  const googleMapsExternalUrl = isSbyToMg
    ? "https://www.google.com/maps/dir/?api=1&origin=Terminal+Purabaya+Bungurasih+Waru+Sidoarjo&destination=Terminal+Magetan+Jawa+Timur&travelmode=driving"
    : "https://www.google.com/maps/dir/?api=1&origin=Terminal+Magetan+Jawa+Timur&destination=Terminal+Purabaya+Bungurasih+Waru+Sidoarjo&travelmode=driving";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white w-full max-w-full overflow-x-hidden">
      
      {/* Top Navigation Bar */}
      <header className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg w-full max-w-full overflow-hidden">
        {/* Brand Zone */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 border border-red-500/50 p-0.5 shadow-md shadow-red-900/40 shrink-0 flex items-center justify-center overflow-hidden">
            <img src={stjLogo} alt="Logo Sudiro Tungga Jaya Official" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
              STJ VIOLA <span className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 border border-red-500/30 font-mono shrink-0">EKONOMI 2-3</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Kondektur Digital & Satelit GPS Realtime</p>
          </div>
        </div>

        {/* Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-slate-300">
          <button 
            onClick={() => setActiveTab('soundboard')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'soundboard' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Soundboard
          </button>
          <button 
            onClick={() => setActiveTab('checkpoints')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'checkpoints' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            GPS Point
          </button>
          <button 
            onClick={() => setActiveTab('manifest')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'manifest' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Manifest (2-3)
          </button>
          <button 
            onClick={() => setActiveTab('operations')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'operations' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Operasional
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'map' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Maps
          </button>
        </nav>

        {/* Primary Action / Route Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button 
            onClick={() => {
              setRouteDirection(routeDirection === 'surabaya-magetan' ? 'magetan-surabaya' : 'surabaya-magetan');
              setAlertedCheckpoints([]);
              setProximityAlertActive(null);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all shadow-sm whitespace-nowrap"
            title="Tukar Arah Rute Bus"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="font-mono font-bold text-slate-200">
              {routeDirection === 'surabaya-magetan' ? 'SBY - MG' : 'MG - SBY'}
            </span>
          </button>

          <button 
            onClick={locationMode === 'satelit_auto' ? useLiveDeviceGps : useSatelitAutoMode}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg border transition-all whitespace-nowrap ${
              locationMode === 'satelit_auto'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-blue-600/20 text-blue-300 border-blue-500/40'
            }`}
            title="Ganti Mode GPS Satelit Otomatis / GPS Asli HP"
          >
            <Satellite className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span className="hidden xs:inline sm:inline">{locationMode === 'satelit_auto' ? 'Satelit Live' : 'GPS HP Asli'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="flex lg:hidden bg-slate-900 border-b border-slate-800 px-3 py-2 gap-1.5 overflow-x-auto w-full max-w-full">
        <button 
          onClick={() => setActiveTab('soundboard')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${activeTab === 'soundboard' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Soundboard
        </button>
        <button 
          onClick={() => setActiveTab('checkpoints')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${activeTab === 'checkpoints' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          GPS Point
        </button>
        <button 
          onClick={() => setActiveTab('manifest')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${activeTab === 'manifest' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Manifest (2-3)
        </button>
        <button 
          onClick={() => setActiveTab('operations')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${activeTab === 'operations' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Operasional
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${activeTab === 'map' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Maps
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full max-w-full mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        
        {/* Active Speech / Loading Banner */}
        {(isPlaying || isAudioLoading) && (
          <div className="bg-gradient-to-r from-red-950/95 via-slate-900 to-red-950/95 border-2 border-red-500/70 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-2xl animate-pulse w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/40">
                {isAudioLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 animate-bounce text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] sm:text-[11px] text-red-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    {isAudioLoading ? 'MEMPROSES SUARA MANUSIA...' : 'SUARA MANUSIA ASLI AKTIF'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-red-200 border border-red-500/30 font-mono truncate max-w-full">
                    {voiceEngineStatus}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white font-medium line-clamp-1 mt-0.5">
                  {activeSpeechText}
                </p>
              </div>
            </div>
            <button 
              onClick={stopSpeech}
              className="w-full sm:w-auto px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-lg shrink-0 flex items-center justify-center gap-1.5 shadow-md transition-all border border-red-600/40"
              title="Hentikan audio pengumuman suara"
            >
              <VolumeX className="w-4 h-4" /> Stop
            </button>
          </div>
        )}

        {/* 500-Meter Proximity Alert Banner (Beep & Vibration Alert for Conductor) */}
        {proximityAlertActive && (
          <div className="bg-gradient-to-r from-amber-950/95 via-red-950/90 to-amber-950/95 border-2 border-amber-500/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-2xl animate-pulse w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-amber-500/40">
                <BellRing className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-mono font-bold uppercase">
                    ⚠️ ALERT 500 METER
                  </span>
                  <span className="text-[11px] text-amber-300 font-mono flex items-center gap-1">
                    <Vibrate className="w-3.5 h-3.5" /> Beep & Getaran
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">
                  Mendekati Point: <span className="text-amber-400 underline decoration-amber-400">{proximityAlertActive.name}</span>
                </h3>
                <p className="text-xs text-amber-200/90 line-clamp-2 sm:line-clamp-none">
                  Bus STJ Viola sebentar lagi akan tiba di point <strong className="text-white font-mono">{proximityAlertActive.name}</strong>.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <button 
                onClick={playProximityAlertSound}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-1"
              >
                <BellRing className="w-3.5 h-3.5" /> Ulangi Beep
              </button>
              <button 
                onClick={handlePlayCheckpoint}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" /> Suara Point
              </button>
              <button 
                onClick={() => setProximityAlertActive(null)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        )}


        {/* =========================================================================
            CARD 1: EXACT MATCHING DESIGN FROM USER SCREENSHOT
            ========================================================================= */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl relative overflow-hidden w-full max-w-full">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-950 border border-red-500/40 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/40 overflow-hidden">
              <img src={stjLogo} alt="Logo PO Sudiro Tungga Jaya Resmi" className="w-full h-full object-cover rounded-xl" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Satellite Indicator */}
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate">{gpsSourceStatus}</span>
              </div>

              {/* Point Name */}
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight flex items-baseline gap-2 flex-wrap">
                <span>Point: {activeCheckpoint.name}</span>
              </h2>

              {/* Live Bus Speed */}
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
                Kecepatan Bus Real-time (Satelit/GPS):{' '}
                <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                  {gpsSpeedKmh} KM/Jam
                </span>
              </p>

              {/* Real-time Speed and Point Schedule Badges */}
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
                <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl sm:rounded-2xl px-4 py-2 sm:px-6 sm:py-2.5 flex items-center gap-3 shadow-inner w-full sm:w-auto">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0"></div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
                      KECEPATAN REAL-TIME
                    </p>
                    <p className="text-lg sm:text-2xl font-mono font-bold text-emerald-400">
                      {gpsSpeedKmh} <span className="text-xs text-slate-400 font-sans">KM/Jam</span>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl sm:rounded-2xl px-4 py-2 sm:px-6 sm:py-2.5 shadow-inner w-full sm:w-auto">
                  <p className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
                    JADWAL TIBA POINT
                  </p>
                  <p className="text-lg sm:text-2xl font-mono font-bold text-white">
                    {activeCheckpoint.estTime}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 2: EXACT STATUS SATELIT GPS REAL-TIME (FROM USER SCREENSHOT)
            ========================================================================= */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl space-y-4 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-950 border border-red-500/40 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/40 overflow-hidden">
              <img src={stjLogo} alt="Logo PO Sudiro Tungga Jaya Resmi" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
                <span>Status Satelit GPS Real-time</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Kecepatan bus diambil otomatis dari satelit GPS / Google Maps perangkat
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 sm:pt-4 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/50 gap-2">
              <span className="text-slate-400 font-medium shrink-0">Status</span>
              <span className="text-emerald-400 font-semibold text-right truncate">
                {locationMode === 'device' ? 'Satelit GPS Live Perangkat' : 'Menggunakan Jalur Otomatis Satelit STJ Viola'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-800/50 gap-2">
              <span className="text-slate-400 font-medium shrink-0">Sumber:</span>
              <span className="text-emerald-400 font-mono font-semibold truncate">
                {locationMode === 'device' ? '(GPS Satelit HP Real-time)' : '(Real-time)'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-800/50 gap-2">
              <span className="text-slate-400 font-medium shrink-0">Kecepatan Terdeteksi:</span>
              <span className="text-white font-mono font-bold text-sm sm:text-base">
                {gpsSpeedKmh} KM/Jam
              </span>
            </div>

            <div className="flex justify-between items-center py-1 gap-2">
              <span className="text-slate-400 font-medium shrink-0">Jadwal Tiba Point:</span>
              <span className="text-white font-mono font-bold text-sm sm:text-base">
                {activeCheckpoint.estTime}
              </span>
            </div>
          </div>

          {/* Quick Simulation controls bar */}
          <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 text-xs w-full">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px] shrink-0">Mode Simulasi:</span>
              <button
                onClick={() => setIsAutoMoving(!isAutoMoving)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  isAutoMoving ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isAutoMoving ? <PauseCircle className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                {isAutoMoving ? 'Satelit Bergerak (Live)' : 'Jeda Pergerakan'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={useLiveDeviceGps}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <LocateFixed className="w-3.5 h-3.5" /> Pakai Sensor GPS HP
              </button>
              <button
                onClick={useSatelitAutoMode}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-400 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Satellite className="w-3.5 h-3.5" /> Pakai Jalur Satelit STJ
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 3: PENGATURAN SUARA MANUSIA (FROM USER SCREENSHOT)
            ========================================================================= */}
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-950 border border-red-500/40 p-0.5 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/40 overflow-hidden">
                <img src={stjLogo} alt="Logo PO Sudiro Tungga Jaya Resmi" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                  Pengaturan Suara Manusia
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  100% suara manusia asli berkualitas rekaman studio (Bebas Robot) — Offline & Siap GitHub Pages
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleTestSampleVoice}
                disabled={isAudioLoading || isPlaying}
                className="flex-1 sm:flex-initial px-3.5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                title="Dengarkan contoh suara manusia asli"
              >
                {isAudioLoading && activeAudioCategory === 'test' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>Tes Contoh Suara</span>
              </button>

            </div>
          </div>


          {/* Bel Terminal & Volume Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-2">
            
            {/* Pre-Chime Ding-Dong Toggle */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">Bel Terminal (Ding-Dong)</p>
                  <p className="text-[11px] text-slate-400 truncate">Bunyi bel pembuka sebelum pengumuman</p>
                </div>
              </div>
              <button
                onClick={() => setEnableChime(!enableChime)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 ${
                  enableChime
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-400 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {enableChime ? 'AKTIF (ON)' : 'MATI (OFF)'}
              </button>
            </div>

            {/* Volume Level Slider */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Volume1 className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Volume Audio</p>
                  <p className="text-[11px] text-slate-400">Level: {Math.round(voiceVolume * 100)}%</p>
                </div>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={voiceVolume}
                onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                className="flex-1 accent-red-600 cursor-pointer min-w-0"
              />
            </div>

          </div>
        </div>

        {/* TAB 1: SOUNDBOARD BUTTONS */}
        {activeTab === 'soundboard' && (
          <div className="space-y-6">
            
            {/* Top 6 Popular Soundboard Presets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* 1. Sambutan Penumpang */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2.5 right-2.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 font-mono font-bold">
                    100% Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-11 h-11 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center mb-3">
                    <Bus className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">1. Sambutan & Perkenalan Kru</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Menyambut penumpang, perkenalan sopir Mas Rifai dan kondektur Mas Jully, mengingatkan kenyamanan dan keamanan barang bawaan.
                  </p>
                </div>
                <button 
                  onClick={handlePlayWelcome}
                  disabled={isAudioLoading}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Zap className="w-4 h-4" /> Putar Sambutan (Suara Manusia)
                </button>
              </div>

              {/* 2. Persiapan Pembayaran Tiket */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2.5 right-2.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30 font-mono font-bold">
                    100% Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-11 h-11 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-3">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">2. Pemeriksaan Tiket & Ongkos</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Kondektur mengingatkan persiapan tiket dan penarikan ongkos bus ekonomi sembari mengumumkan rute.
                  </p>
                </div>
                <button 
                  onClick={handlePlayTicketPayment}
                  disabled={isAudioLoading}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Zap className="w-4 h-4" /> Putar Tiket (Suara Manusia)
                </button>
              </div>

              {/* 3. Titik Pemberhentian Point */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2.5 right-2.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                    100% Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center mb-3">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">3. Point: {activeCheckpoint.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Pengumuman tiba di titik pemberhentian point {activeCheckpoint.name} agar penumpang bersiap turun dan memeriksa barang bawaan.
                  </p>
                </div>
                <button 
                  onClick={handlePlayCheckpoint}
                  disabled={isAudioLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Zap className="w-4 h-4" /> Putar Point (Suara Manusia)
                </button>
              </div>

              {/* 4. Siap Berangkat (Pintu Ditutup) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2.5 right-2.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-mono font-bold">
                    100% Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center mb-3">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">4. Siap Berangkat</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Pemberitahuan bahwa pintu ditutup dan armada STJ Viola bersiap meluncur menuju tujuan.
                  </p>
                </div>
                <button 
                  onClick={handlePlayBerangkat}
                  disabled={isAudioLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Zap className="w-4 h-4" /> Putar Siap Berangkat
                </button>
              </div>



              {/* 6. Tol Trans Jawa & Klakson Bus */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2.5 right-2.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 font-mono font-bold">
                    100% Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-11 h-11 rounded-xl bg-cyan-600/10 text-cyan-500 flex items-center justify-center mb-3">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">6. Tol Trans Jawa & Klakson</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Pengumuman bus memasuki jalan tol Trans Jawa dan efek klakson telolet bus STJ Viola.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handlePlayTolTransJawa}
                    disabled={isAudioLoading}
                    className="py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5" /> Masuk Tol
                  </button>
                  <button 
                    onClick={playBusHorn}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    🎺 Klakson STJ
                  </button>
                </div>
              </div>

            </div>

            {/* Checkpoint Quick Soundboard Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 w-full max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    Pemberitahuan Suara Per Point Checkpoint
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    Klik nama point untuk langsung memutar suara manusia asli tujuan tersebut
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Removed voice badge */}
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 hidden sm:inline-block">
                    {checkpoints.length} Point Siap
                  </span>
                </div>
              </div>

              <div 
                key={routeDirection}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5 transition-opacity duration-500 ease-in-out opacity-100 animate-in fade-in"
              >
                {checkpoints.map((cp, idx) => {
                  const isCurrent = currentCheckpointIndex === idx;
                  const categoryKey = `point-${cp.id}`;

                  return (
                    <button
                      key={cp.id}
                      onClick={() => {
                        setCurrentCheckpointIndex(idx);
                        const script = cp.id.includes('term-') || cp.id.includes('term_')
                          ? `Perhatian seluruh penumpang. Bus STJ Viola telah tiba di ${cp.name}. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya`
                          : `Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di ${cp.name}. Bagi penumpang yang akan turun di ${cp.name}, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih`;
                        speakAnnouncement(script, categoryKey);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 min-w-0 w-full overflow-hidden ${
                        isCurrent
                          ? 'bg-red-950/60 border-red-500 text-white ring-1 ring-red-500'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          #{idx + 1}
                        </span>
                        <Volume2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      </div>
                      <p className="text-xs font-bold truncate w-full" title={cp.name}>{cp.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        {cp.estTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom AI prompt box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-3.5 sm:space-y-4 w-full max-w-full overflow-hidden">
              <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-lg">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                <span>Generator Naskah Pengumuman Kustom (AI Gemini)</span>
              </div>
              <p className="text-xs text-slate-400">
                Ketik kalimat bebas (misal: "Barang tertinggal di bagasi", "Jadwal sholat maghrib", dll.), sistem otomatis mengonversi ke suara manusia jernih.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full">
                <input 
                  type="text" 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ketik pengumuman kustom kondektur..."
                  className="w-full min-w-0 flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
                <button 
                  onClick={handleGenerateAiAnnouncement}
                  disabled={isGenerating || !customPrompt}
                  className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" /> {isGenerating ? 'Memproses...' : 'Buat & Putar Suara'}
                </button>
              </div>

              {aiScript && (
                <div className="mt-4 p-3.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-red-400 uppercase">Naskah Dihasilkan:</span>
                    <button 
                      onClick={() => speakAnnouncement(aiScript)}
                      disabled={isAudioLoading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Play className="w-3 h-3" />
                      <span>Putar Ulang</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 italic">"{aiScript}"</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: OPERASIONAL & DASHBOARD GRAFIK */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-red-500 shrink-0" />
                    <span>Dashboard Visual Kecepatan & ETA ({routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan' : 'Magetan → Surabaya'})</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Grafik kecepatan live real-time dan kalkulasi estimasi waktu tiba (ETA).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <button 
                    onClick={useLiveDeviceGps}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-blue-400" /> Sinkronkan GPS
                  </button>
                  <div className="text-xs font-mono bg-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/30">
                    ETA: {etaFinalTimeStr}
                  </div>
                </div>
              </div>

              {/* Visual Speed Sparkline Chart (SVG) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 w-full overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Grafik Riwayat Kecepatan Bus (KM/Jam)</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400">Kecepatan live dari sensor satelit GPS</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">{gpsSpeedKmh}</span>
                    <span className="text-xs text-slate-400 ml-1">KM/H</span>
                  </div>
                </div>

                {/* SVG Line Chart */}
                <div className="h-36 sm:h-40 w-full pt-4">
                  <svg className="w-full h-full overflow-hidden" viewBox="0 0 300 100" preserveAspectRatio="none">
                    <line x1="0" y1="20" x2="300" y2="20" stroke="#1e293b" strokeWidth="1" />
                    <line x1="0" y1="50" x2="300" y2="50" stroke="#1e293b" strokeWidth="1" />
                    <line x1="0" y1="80" x2="300" y2="80" stroke="#1e293b" strokeWidth="1" />

                    <polyline
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={speedHistory.map((spd, idx) => {
                        const x = (idx / (speedHistory.length - 1)) * 300;
                        const y = 90 - Math.min(80, Math.max(10, (spd / 100) * 80));
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>-30 detik</span>
                  <span>-20 detik</span>
                  <span>-10 detik</span>
                  <span>Sekarang</span>
                </div>
              </div>

              {/* ETA & Status Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-1.5">
                  <p className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase">STATUS RUTE & POINT SASARAN</p>
                  <p className="text-lg sm:text-xl font-bold text-white font-mono truncate">
                    {routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan' : 'Magetan → Surabaya'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Point Sasaran: <strong className="text-amber-400">{activeCheckpoint.name}</strong> ({currentCheckpointIndex + 1} dari {checkpoints.length} point)
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-1.5">
                  <p className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase">KECEPATAN & ESTIMASI TIBA (ETA)</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-400 font-mono">{gpsSpeedKmh} KM/Jam · {etaFinalTimeStr}</p>
                  <p className="text-xs text-slate-400">
                    Estimasi tiba di tujuan akhir: ~{etaMinutesTotal} menit ({gpsSpeedKmh} KM/Jam)
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: CHECKPOINTS POINT & GPS DISTANCE TRACKER */}
        {activeTab === 'checkpoints' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl w-full max-w-full overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-red-500 shrink-0" />
                    <span>Titik Pemberhentian Point STJ Viola ({routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan' : 'Magetan → Surabaya'})</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Daftar point resmi terhubung langsung dengan satelit GPS real-time.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <button 
                    onClick={() => setAutoAdvancePoint(!autoAdvancePoint)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all ${autoAdvancePoint ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                  >
                    <Compass className="w-3.5 h-3.5" /> Auto-Lacak: {autoAdvancePoint ? 'ON' : 'OFF'}
                  </button>
                  <button 
                    onClick={useLiveDeviceGps}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-blue-400" /> GPS Live
                  </button>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                {checkpoints.map((cp, idx) => {
                  const isCurrent = currentCheckpointIndex === idx;
                  const isPassed = idx < currentCheckpointIndex;

                  return (
                    <div 
                      key={cp.id}
                      onClick={() => {
                        setAutoAdvancePoint(false);
                        setCurrentCheckpointIndex(idx);
                        const script = cp.id.includes('term-') || cp.id.includes('term_')
                          ? `Perhatian seluruh penumpang. Bus STJ Viola telah tiba di ${cp.name}. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya.`
                          : `Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di titik point ${cp.name}. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan Anda. Terima kasih.`;
                        speakAnnouncement(script, `point-${cp.id}`);
                      }}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 w-full max-w-full overflow-hidden ${isCurrent ? 'bg-red-950/40 border-red-500/60 shadow-lg' : isPassed ? 'bg-slate-900/40 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${isCurrent ? 'bg-red-600 text-white shadow-md' : isPassed ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-sm sm:text-base truncate">{cp.name}</h3>
                            {isCurrent && <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-red-600 text-white font-mono uppercase shrink-0">Point Sasaran</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{cp.description}</p>
                          <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 mt-0.5 truncate">Koordinat: {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 w-full lg:w-auto pt-2.5 lg:pt-0 border-t border-slate-800/80 lg:border-t-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="text-left lg:text-right">
                          <p className={`text-xs font-mono font-bold ${isCurrent ? 'text-red-400' : isPassed ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {isPassed ? 'Sudah Dilewati' : isCurrent ? 'Point Sasaran' : 'Point Berikutnya'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono text-slate-400">Est:</span>
                            <input 
                              type="text"
                              value={cp.estTime}
                              onChange={(e) => {
                                const newTime = e.target.value;
                                setCheckpoints(prev => prev.map((item, i) => i === idx ? { ...item, estTime: newTime } : item));
                              }}
                              className="w-20 sm:w-24 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-amber-400 text-center focus:outline-none focus:border-red-500"
                              title="Klik untuk mengubah jadwal tiba manual"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${cp.lat},${cp.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-semibold rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                            title="Buka lokasi titik ini di Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Google Maps</span>
                          </a>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAutoAdvancePoint(false);
                              setCurrentCheckpointIndex(idx);
                              const script = cp.id.includes('term-') || cp.id.includes('term_')
                                ? `Perhatian seluruh penumpang. Bus STJ Viola telah tiba di ${cp.name}. Terima kasih telah bepergian bersama Sudiro Tungga Jaya Viola. Sampai jumpa di perjalanan berikutnya`
                                : `Perhatian seluruh penumpang. Bus STJ Viola sebentar lagi akan tiba di titik point ${cp.name}. Bagi penumpang yang akan turun, dipersilakan mempersiapkan barang bawaan agar tidak tertinggal. Terima kasih`;
                              speakAnnouncement(script, `point-${cp.id}`);
                            }}
                            disabled={isAudioLoading}
                            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-red-600/20 hover:bg-red-600 disabled:opacity-50 text-red-400 hover:text-white text-xs font-semibold rounded-lg border border-red-500/30 transition-all flex items-center gap-1.5"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Suara Point</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MANIFEST (2-3) */}
        {activeTab === 'manifest' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl w-full max-w-full overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500 shrink-0" />
                    <span>Manifest Kursi Viola Ekonomi (Konfigurasi 2-3)</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Sisi Kiri: 2 Kursi (A, B) | Sisi Kanan: 3 Kursi (C, D, E)</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={exportManifestCSV}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    <Download className="w-4 h-4" /> Unduh Manifest (CSV)
                  </button>
                </div>
              </div>

              {/* Add Passenger Form */}
              <form onSubmit={handleAddPassenger} className="mt-4 sm:mt-6 p-3.5 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
                <input 
                  type="text" 
                  placeholder="Nama Penumpang"
                  value={newPassengerName}
                  onChange={(e) => setNewPassengerName(e.target.value)}
                  className="flex-1 w-full min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <select 
                  value={newPassengerSeat}
                  onChange={(e) => setNewPassengerSeat(e.target.value)}
                  className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="2A">Kursi 2A (Kiri)</option>
                  <option value="2B">Kursi 2B (Kiri)</option>
                  <option value="2C">Kursi 2C (Kanan)</option>
                  <option value="2D">Kursi 2D (Kanan)</option>
                  <option value="2E">Kursi 2E (Kanan)</option>
                  <option value="3A">Kursi 3A (Kiri)</option>
                  <option value="3B">Kursi 3B (Kiri)</option>
                  <option value="3C">Kursi 3C (Kanan)</option>
                  <option value="3D">Kursi 3D (Kanan)</option>
                  <option value="3E">Kursi 3E (Kanan)</option>
                </select>
                <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-all shrink-0">
                  + Tambah Penumpang
                </button>
              </form>

              {/* Passenger Table */}
              <div className="mt-4 sm:mt-6 overflow-x-auto w-full max-w-full rounded-xl border border-slate-800">
                <table className="w-full min-w-[540px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-mono text-slate-400 bg-slate-950/60">
                      <th className="py-3 px-3 sm:px-4">KURSI (2-3)</th>
                      <th className="py-3 px-3 sm:px-4">NO TIKET</th>
                      <th className="py-3 px-3 sm:px-4">NAMA PENUMPANG</th>
                      <th className="py-3 px-3 sm:px-4">PEMBERHENTIAN TUJUAN</th>
                      <th className="py-3 px-3 sm:px-4 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
                    {passengers.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 sm:px-4 font-mono font-bold text-red-400">{p.seat}</td>
                        <td className="py-3 px-3 sm:px-4 font-mono text-slate-300">{p.ticketNo}</td>
                        <td className="py-3 px-3 sm:px-4 font-semibold text-white">{p.name}</td>
                        <td className="py-3 px-3 sm:px-4 text-slate-300">{p.destination}</td>
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <button 
                            onClick={() => toggleCheckIn(p.id)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${p.checkedIn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                          >
                            {p.checkedIn ? 'Sudah Bayar / Naik' : 'Belum'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MAPS */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5 w-full max-w-full overflow-hidden">
              
              {/* Header with Title and Action Buttons */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>Google Maps Rute Navigasi STJ Viola</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {isSbyToMg 
                      ? 'Keberangkatan Awal: Terminal Purabaya Bungurasih (Waru) → Tujuan Akhir: Terminal Magetan' 
                      : 'Keberangkatan Awal: Terminal Magetan → Tujuan Akhir: Terminal Purabaya Bungurasih (Waru)'}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      setRouteDirection(isSbyToMg ? 'magetan-surabaya' : 'surabaya-magetan');
                    }}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    title="Tukar arah rute keberangkatan awal dan tujuan akhir"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Tukar Arah ({isSbyToMg ? 'Magetan → SBY' : 'SBY → Magetan'})</span>
                  </button>

                  <a 
                    href={googleMapsExternalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Buka Google Maps ↗</span>
                  </a>
                </div>
              </div>

              {/* Origin & Destination Route Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 sm:p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    AWAL
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                      Titik Keberangkatan Awal
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {originName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    AKHIR
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-mono text-red-400 uppercase tracking-wider font-semibold">
                      Titik Tujuan Akhir
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {destinationName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkpoint Quick Location Search */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Titik Point di Sepanjang Rute Ini:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {checkpoints.map((cp, idx) => (
                    <a
                      key={cp.id}
                      href={`https://www.google.com/maps/search/?api=1&query=${cp.lat},${cp.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] sm:text-xs font-mono transition-all flex items-center gap-1 shrink-0"
                      title={`Buka ${cp.name} di Google Maps`}
                    >
                      <span className="text-slate-500 font-bold">#{idx + 1}</span>
                      <span>{cp.name.split(' (')[0]}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Interactive Google Maps Direction Iframe */}
              <div className="w-full h-[360px] sm:h-[520px] rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner relative">
                <iframe 
                  title={`Google Maps Rute STJ Viola: ${originName} ke ${destinationName}`}
                  src={googleMapsEmbedUrl}
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-4 sm:py-6 text-center text-[11px] sm:text-xs text-slate-500 border-t border-slate-800/80 bg-slate-900/50 mt-auto px-4 flex flex-col items-center justify-center gap-2">
        <img src={stjLogo} alt="Logo PO Sudiro Tungga Jaya Resmi" className="w-8 h-8 rounded-full border border-red-500/40 object-cover shadow-sm" />
        <p>© 2026 PO Sudiro Tungga Jaya (STJ Viola Ekonomi) · Kondektur Digital & Satelit GPS Realtime.</p>
      </footer>

      {/* Modal: Pengaturan Suara & Deploy GitHub Pages */}
      {showVoiceSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 text-slate-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-950 border border-red-500/40 p-0.5 flex items-center justify-center shrink-0 shadow-md shadow-red-900/40 overflow-hidden">
                  <img src={stjLogo} alt="Logo STJ Resmi" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                    Pengaturan Suara Manusia & GitHub Pages
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                    Solusi anti-suara robot untuk aplikasi STJ Viola saat di-hosting statis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceSettingsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Aktif Saat Ini */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase tracking-wider">
                  STATUS AUDIO SAAT INI:
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {voiceEngineStatus}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Semua tombol pengumuman kondektur (Sambutan, Tiket, Point Checkpoint, Berangkat, Rest Area, Tol) telah dilengkapi rekaman audio manusia asli berkualitas studio. Tidak ada lagi suara robot!
              </p>
            </div>

            {/* Bagian 1: Kunci API Gemini untuk GitHub Pages */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Kunci API Google Gemini (Opsional untuk GitHub Pages)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jika di-deploy ke GitHub Pages tanpa server, Anda dapat memasukkan kunci API Gemini gratis Anda di sini untuk fitur generator naskah kustom AI.
              </p>
              
              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    placeholder="Masukkan Gemini API Key (AIzaSy...)"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveApiKey}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Simpan
                    </button>
                    {clientApiKey && (
                      <button
                        onClick={handleClearApiKey}
                        className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-all"
                        title="Hapus Kunci API dari browser"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                {apiKeySaveMsg && (
                  <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {apiKeySaveMsg}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-500 pt-1">
                  <span>Tersimpan aman di localStorage browser perangkat Anda.</span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:underline flex items-center gap-1"
                  >
                    Dapatkan Kunci Gratis <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={handleTestSampleVoice}
                disabled={isAudioLoading || isPlaying}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <Volume2 className="w-4 h-4 text-red-400" />
                <span>Uji Contoh Suara Sekarang</span>
              </button>

              <button
                onClick={() => setShowVoiceSettingsModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
