/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bus, Volume2, Mic, MapPin, Users, Clock, Navigation, Play, 
  Sparkles, ArrowRightLeft, Radio, Ticket, VolumeX, ShieldCheck, Download, Zap, Compass, Satellite, Map as MapIcon, LineChart, RotateCcw,
  Bell, BellRing, Vibrate, AlertTriangle, Locate, LocateFixed, Crosshair, Navigation2,
  Loader2, Headphones, CheckCircle2, Volume1
} from 'lucide-react';

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
  { id: 'exit-dumpil', name: 'Exit Toll Dumpil', lat: -7.5752, lng: 111.5794, distanceKm: 145, estTime: '15:30 WIB', status: 'checkpoint', description: 'Pemberhentian pertama keluar tol Dumpil Madiun.' },
  { id: 'term-madiun', name: 'Terminal Madiun', lat: -7.6046, lng: 111.5235, distanceKm: 153, estTime: '15:45 WIB', status: 'checkpoint', description: 'Pemberhentian di Terminal Purboyo Madiun.' },
  { id: 'pertigaan-totok', name: 'Pertigaan Totok', lat: -7.5954, lng: 111.4880, distanceKm: 158, estTime: '16:00 WIB', status: 'checkpoint', description: 'Penurunan penumpang area Pertigaan Totok.' },
  { id: 'garasi-stj', name: 'Garasi STJ', lat: -7.5785, lng: 111.4550, distanceKm: 164, estTime: '16:15 WIB', status: 'checkpoint', description: 'Transit / Garasi pusat Sudiro Tungga Jaya.' },
  { id: 'jalan-mbarat', name: 'Jalan Mbarat', lat: -7.5615, lng: 111.4390, distanceKm: 167, estTime: '16:22 WIB', status: 'checkpoint', description: 'Pemberhentian area Jalan Mbarat / Stasiun Barat.' },
  { id: 'term-maospati', name: 'Terminal Maospati', lat: -7.5458, lng: 111.4344, distanceKm: 171, estTime: '16:30 WIB', status: 'checkpoint', description: 'Pemberhentian Terminal Maospati.' },
  { id: 'sukomoro', name: 'Sukomoro', lat: -7.6180, lng: 111.3850, distanceKm: 178, estTime: '16:42 WIB', status: 'checkpoint', description: 'Pemberhentian area Sukomoro Magetan.' },
  { id: 'pasar-jengglong', name: 'Pasar Jengglong', lat: -7.6410, lng: 111.3480, distanceKm: 184, estTime: '16:55 WIB', status: 'checkpoint', description: 'Pemberhentian Pasar Jengglong Magetan.' },
  { id: 'term-magetan', name: 'Terminal Magetan (Tujuan Akhir)', lat: -7.6534, lng: 111.3325, distanceKm: 188, estTime: '17:10 WIB', status: 'arrival', description: 'Terminal akhir kedatangan Magetan.' }
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
  
  // Real-Time GPS from Device Geolocation
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number; heading?: number | null } | null>(null);
  const [isGpsLive, setIsGpsLive] = useState<boolean>(false);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);
  const [gpsSpeedKmh, setGpsSpeedKmh] = useState<number>(0); 
  const [gpsSourceStatus, setGpsSourceStatus] = useState<string>('Menghubungkan ke GPS Satelit...');
  const [locationMode, setLocationMode] = useState<'device' | 'simulated'>('device');
  const [autoAdvancePoint, setAutoAdvancePoint] = useState<boolean>(true);

  // 500-Meter Proximity Alert (Beep & Vibration)
  const [proximityAlertEnabled, setProximityAlertEnabled] = useState<boolean>(true);
  const [alertedCheckpoints, setAlertedCheckpoints] = useState<string[]>([]);
  const [proximityAlertActive, setProximityAlertActive] = useState<{ id: string; name: string; meters: number } | null>(null);

  // Speed History for Real-time Chart
  const [speedHistory, setSpeedHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  const prevPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Custom AI announcement generator state
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [aiScript, setAiScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [voiceVolume, setVoiceVolume] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<'Fenrir' | 'Puck' | 'Charon' | 'Kore'>('Fenrir');
  const [enableChime, setEnableChime] = useState<boolean>(true);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [activeAudioCategory, setActiveAudioCategory] = useState<string | null>(null);
  const [voiceEngineStatus, setVoiceEngineStatus] = useState<string>('Studio AI Human Voice');

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

  // Real-time Geolocation tracking wherever the app is opened
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsErrorMsg('Browser tidak mendukung sensor GPS');
      setGpsSourceStatus('GPS tidak didukung pada browser ini');
      return;
    }

    setGpsSourceStatus('Menghubungkan ke sensor GPS satelit...');

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const now = position.timestamp;

        if (locationMode === 'device') {
          setUserLocation({
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 0),
            heading: heading || null
          });
          setIsGpsLive(true);
          setGpsErrorMsg(null);
          setGpsSourceStatus(`Satelit GPS Live (Akurasi: ±${Math.round(accuracy || 0)}m)`);

          // Compute real speed from GPS hardware sensor or position delta
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
            if (timeSec >= 1 && metersMoved >= 2) {
              detectedSpeed = Math.round((metersMoved / timeSec) * 3.6);
            }
          }
          prevPositionRef.current = { lat: latitude, lng: longitude, time: now };

          const safeSpeed = Math.min(130, Math.max(0, detectedSpeed));
          setGpsSpeedKmh(safeSpeed);
          setSpeedHistory(prev => [...prev.slice(1), safeSpeed]);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        if (locationMode === 'device') {
          setGpsErrorMsg('Izin lokasi diperlukan untuk GPS real-time');
          setGpsSourceStatus('Menunggu izin lokasi GPS browser');
          setIsGpsLive(false);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
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

  // Fallback origin coordinates if GPS is not yet acquired
  const defaultOrigin = routeDirection === 'surabaya-magetan' 
    ? { lat: -7.3524, lng: 112.7265, name: 'Terminal Purabaya Surabaya' } 
    : { lat: -7.6534, lng: 111.3325, name: 'Terminal Magetan' };

  const currentLat = userLocation ? userLocation.lat : defaultOrigin.lat;
  const currentLng = userLocation ? userLocation.lng : defaultOrigin.lng;

  // Auto-advance or sync to closest upcoming checkpoint along route
  useEffect(() => {
    if (!autoAdvancePoint || checkpoints.length === 0) return;

    let closestIdx = 0;
    let minDistance = Infinity;

    checkpoints.forEach((cp, idx) => {
      const d = calculateHaversineMeters(currentLat, currentLng, cp.lat, cp.lng);
      if (d < minDistance) {
        minDistance = d;
        closestIdx = idx;
      }
    });

    if (minDistance < 60 && closestIdx < checkpoints.length - 1) {
      setCurrentCheckpointIndex(closestIdx + 1);
    } else {
      setCurrentCheckpointIndex(closestIdx);
    }
  }, [currentLat, currentLng, autoAdvancePoint, checkpoints]);

  const activeCheckpoint = checkpoints[currentCheckpointIndex] || checkpoints[0] || (
    routeDirection === 'surabaya-magetan' ? DEFAULT_CHECKPOINTS_SBY_MG[0] : DEFAULT_CHECKPOINTS_MG_SBY[0]
  );

  // Exact real-time meters and KM to active checkpoint from device location
  const activeRemainingMeters = Math.max(0, calculateHaversineMeters(currentLat, currentLng, activeCheckpoint.lat, activeCheckpoint.lng));
  const activeRemainingKm = (activeRemainingMeters / 1000);

  const distanceRemainingDisplay = activeRemainingMeters < 1000
    ? `${activeRemainingMeters} Meter`
    : `${activeRemainingKm.toFixed(1)} KM`;

  const distanceRemainingSpeech = activeRemainingMeters < 1000
    ? `${activeRemainingMeters} meter`
    : `${activeRemainingKm.toFixed(1)} kilometer`;

  // Final destination calculations
  const finalCheckpoint = checkpoints[checkpoints.length - 1] || (
    routeDirection === 'surabaya-magetan' ? DEFAULT_CHECKPOINTS_SBY_MG[8] : DEFAULT_CHECKPOINTS_MG_SBY[4]
  );
  const finalRemainingMeters = Math.max(0, calculateHaversineMeters(currentLat, currentLng, finalCheckpoint.lat, finalCheckpoint.lng));
  const finalRemainingKm = (finalRemainingMeters / 1000);
  const totalRouteKm = finalCheckpoint.distanceKm || 188;
  const distanceCoveredKm = Math.max(0, Math.min(totalRouteKm, totalRouteKm - finalRemainingKm));
  const percentCovered = Math.min(100, Math.round((distanceCoveredKm / totalRouteKm) * 100));

  // Realistic ETA based on live speed or highway average (50 km/h)
  const effectiveSpeed = gpsSpeedKmh >= 10 ? gpsSpeedKmh : 50;
  const etaMinutesTotal = Math.max(1, Math.round((finalRemainingKm / effectiveSpeed) * 60));

  const now = new Date();
  now.setMinutes(now.getMinutes() + etaMinutesTotal);
  const etaFinalTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  // Instant simulator tools for quick testing anywhere
  const simulateAtLocation = (name: string, lat: number, lng: number, speed: number = 55) => {
    setLocationMode('simulated');
    setUserLocation({ lat, lng, accuracy: 5, heading: null });
    setGpsSpeedKmh(speed);
    setGpsSourceStatus(`Simulasi Titik Rute: ${name}`);
    setIsGpsLive(true);
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

  // Play Pre-announcement Chime ("Ding-Dong" tone like luxury executive bus / terminal)
  const playPreAnnouncementChime = (): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Tone 1: F5 (698.46 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(698.46, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.25 * voiceVolume, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.35);

        // Tone 2: A5 (880 Hz) - pleasant melodic harmony
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
        gain2.gain.setValueAtTime(0.28 * voiceVolume, audioCtx.currentTime + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.65);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(audioCtx.currentTime + 0.2);
        osc2.stop(audioCtx.currentTime + 0.65);

        setTimeout(() => {
          resolve();
        }, 550);
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

  // Studio-Quality Natural Human Voice Synthesis (Gemini 3.8 Flash Lite TTS)
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

    const cacheKey = `${selectedVoice}:${text}`;
    let audioBase64 = audioCacheRef.current.get(cacheKey);

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
            audioCacheRef.current.set(cacheKey, data.audioBase64);
            setVoiceEngineStatus('Studio AI Human Voice (Gemini TTS 24kHz)');
          }
        }
      } catch (err) {
        console.warn('TTS server call failed, falling back to browser speech:', err);
      }
    }

    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
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
          console.error('Audio element playback error');
          setIsAudioLoading(false);
          setIsPlaying(false);
          setActiveAudioCategory(null);
          currentAudioRef.current = null;
        };

        await audio.play();
        return;
      } catch (playbackError) {
        console.warn('Playback error with Audio element, fallback to Web Speech:', playbackError);
      }
    }

    // Graceful browser speech synthesis fallback
    setIsAudioLoading(false);
    setVoiceEngineStatus('Browser Audio Fallback');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.volume = voiceVolume;
      utterance.rate = 0.95; 
      utterance.pitch = 0.85; 

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => 
        (v.lang.toLowerCase().includes('id') || v.lang.toLowerCase().includes('indonesia')) && 
        (v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('male'))
      ) || voices.find(v => v.lang.toLowerCase().includes('id')) || voices[0];

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

  // Play STJ Bus Horn Sound Effect
  const playBusHorn = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error(e);
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

      // Trigger mobile device physical vibration (if hardware supported)
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

    if (activeRemainingMeters <= 500 && activeRemainingMeters > 0) {
      if (!alertedCheckpoints.includes(activeCheckpoint.id)) {
        setAlertedCheckpoints(prev => [...prev, activeCheckpoint.id]);
        setProximityAlertActive({
          id: activeCheckpoint.id,
          name: activeCheckpoint.name,
          meters: activeRemainingMeters
        });
        playProximityAlertSound();
      } else {
        // Update live remaining meters on banner
        setProximityAlertActive(prev => (prev ? { ...prev, meters: activeRemainingMeters } : null));
      }
    } else if (activeRemainingMeters <= 0 || activeRemainingMeters > 700) {
      setProximityAlertActive(null);
    }
  }, [activeRemainingMeters, activeCheckpoint, proximityAlertEnabled, alertedCheckpoints]);

  // Soundboard scripts
  const handlePlayWelcome = () => {
    const routeName = routeDirection === 'surabaya-magetan' ? 'Surabaya menuju Magetan' : 'Magetan menuju Surabaya';
    const speedInfo = gpsSpeedKmh > 0 ? `dan kecepatan bus ${gpsSpeedKmh} kilometer per jam` : '';
    const script = `Perhatian, selamat datang Bapak, Ibu, dan rekan-rekan penumpang setia Sudiro Tungga Jaya armada Viola kelas Ekonomi rute ${routeName}. Posisi satelit GPS real-time saat ini menunjukkan bus kita sedang dalam perjalanan menuju titik point ${activeCheckpoint.name}, dengan sisa jarak sekitar ${distanceRemainingSpeech} lagi ${speedInfo}. Estimasi tiba di tujuan akhir diperkirakan pukul ${etaFinalTimeStr}. Silakan duduk nyaman dan selamat menikmati perjalanan bersama STJ Viola.`;
    speakAnnouncement(script, 'welcome');
  };

  const handlePlayTicketPayment = () => {
    const speedInfo = gpsSpeedKmh > 0 ? `dengan kecepatan ${gpsSpeedKmh} kilometer per jam` : '';
    const script = `Perhatian kepada seluruh penumpang bus STJ Viola. Petugas kondektur akan segera berjalan melakukan pemeriksaan tiket dan penarikan ongkos bus Kelas Ekonomi. Sambil bus kita melaju ${speedInfo} menuju point ${activeCheckpoint.name} berjarak sekitar ${distanceRemainingSpeech} lagi, silakan disiapkan tiket atau ongkos perjalanannya. Terima kasih banyak.`;
    speakAnnouncement(script, 'ticket');
  };

  const handlePlayCheckpoint = () => {
    const script = `Perhatian seluruh penumpang. Berdasarkan koordinat satelit GPS real-time, bus STJ Viola sebentar lagi akan tiba di titik pemberhentian point ${activeCheckpoint.name}, dengan sisa jarak saat ini tersisa ${distanceRemainingSpeech}. Bagi penumpang yang ingin turun di ${activeCheckpoint.name}, dipersilakan mempersiapkan barang bawaan agar tidak ada yang tertinggal. Terima kasih.`;
    speakAnnouncement(script, 'checkpoint');
  };

  // Generate AI announcement using Gemini API
  const handleGenerateAiAnnouncement = async () => {
    if (!customPrompt) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          customPrompt: `${customPrompt}. (Sertakan info GPS real-time menuju point ${activeCheckpoint.name} sisa jarak ${distanceRemainingDisplay}, kecepatan ${gpsSpeedKmh} KM/Jam, ETA tujuan ${etaFinalTimeStr})`,
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
      alert('Gagal menghubungi AI Server.');
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

  const googleMapsEmbedUrl = routeDirection === 'surabaya-magetan'
    ? "https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d253212.456!2d111.9!3d-7.4!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x2dd7fbf8381ac3f3%3A0x8085380d648074cb!2sTerminal%20Purabaya!3m2!1d-7.3698!2d112.7188!4m5!1s0x2e79bc513c3b0369%3A0x4027a76e3532720!2sMagetan!3m2!1d-7.6534!2d111.3325!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
    : "https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d253212.456!2d111.9!3d-7.4!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x2e79bc513c3b0369%3A0x4027a76e3532720!2sMagetan!3m2!1d-7.6534!2d111.3325!4m5!1s0x2dd7fbf8381ac3f3%3A0x8085380d648074cb!2sTerminal%20Purabaya!3m2!1d-7.3698!2d112.7188!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid";

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-md shadow-red-900/30">
            <Bus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              STJ VIOLA <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/30 text-red-400 border border-red-500/30 font-mono">EKONOMI 2-3</span>
            </h1>
            <p className="text-xs text-slate-400">Kalibrasi Jarak AKAP & GPS Real-time</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-300">
          <button 
            onClick={() => setActiveTab('soundboard')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'soundboard' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Soundboard Point & GPS
          </button>
          <button 
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'operations' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Dashboard Grafik & ETA
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'map' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Google Maps Live
          </button>
          <button 
            onClick={() => setActiveTab('checkpoints')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'checkpoints' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Pemberhentian
          </button>
          <button 
            onClick={() => setActiveTab('manifest')}
            className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 ${activeTab === 'manifest' ? 'bg-red-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            Manifest (2-3)
          </button>
        </nav>

        {/* Primary Action / Route Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={playProximityAlertSound}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg border border-amber-500/30 transition-all shadow-sm whitespace-nowrap"
            title="Tes Suara Beep & Getaran Notifikasi 500m"
          >
            <BellRing className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Tes Beep & Getar</span>
          </button>

          <button 
            onClick={() => setProximityAlertEnabled(!proximityAlertEnabled)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
              proximityAlertEnabled 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Aktifkan/Nonaktifkan Notifikasi Beep & Getar 500 Meter"
          >
            {proximityAlertEnabled ? <Bell className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span className="hidden md:inline">Alarm 500m: {proximityAlertEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button 
            onClick={() => {
              setRouteDirection(routeDirection === 'surabaya-magetan' ? 'magetan-surabaya' : 'surabaya-magetan');
              setAlertedCheckpoints([]);
              setProximityAlertActive(null);
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all shadow-sm whitespace-nowrap"
            title="Tukar Arah Rute"
          >
            <ArrowRightLeft className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">{routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan' : 'Magetan → Surabaya'}</span>
            <span className="sm:hidden">{routeDirection === 'surabaya-magetan' ? 'SBY - MG' : 'MG - SBY'}</span>
          </button>

          <button 
            onClick={useLiveDeviceGps}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg border border-blue-500/30 transition-all whitespace-nowrap"
            title="Sinkronkan dengan sensor GPS live perangkat"
          >
            <LocateFixed className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">GPS Live</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <div className="flex lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-2 gap-2 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('soundboard')}
          className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap ${activeTab === 'soundboard' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Soundboard
        </button>
        <button 
          onClick={() => setActiveTab('operations')}
          className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap ${activeTab === 'operations' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Dashboard ETA
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap ${activeTab === 'map' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Maps
        </button>
        <button 
          onClick={() => setActiveTab('checkpoints')}
          className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap ${activeTab === 'checkpoints' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          GPS Point
        </button>
        <button 
          onClick={() => setActiveTab('manifest')}
          className={`px-3 py-1.5 text-xs rounded-md whitespace-nowrap ${activeTab === 'manifest' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
        >
          Manifest
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Active Speech / Loading Banner */}
        {(isPlaying || isAudioLoading) && (
          <div className="bg-gradient-to-r from-red-950/95 via-slate-900 to-red-950/95 border-2 border-red-500/70 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xl shadow-red-950/50 animate-pulse">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/40">
                {isAudioLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <Volume2 className="w-6 h-6 animate-bounce text-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-red-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    {isAudioLoading ? 'MEMPROSES SUARA MANUSIA ASLI...' : 'SUARA MANUSIA ASLI AKTIF'}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-200 border border-red-500/30 font-mono font-semibold">
                    {selectedVoice === 'Fenrir' ? 'Mas Fenrir (Berwibawa & Menawan)' : selectedVoice === 'Puck' ? 'Mas Puck (Ramah & Hangat)' : selectedVoice === 'Charon' ? 'Mas Charon (Dewasa & Mantap)' : 'Mbak Kore (Merdu & Elegan)'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    · {voiceEngineStatus}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-white font-medium line-clamp-1 mt-0.5">
                  {activeSpeechText}
                </p>
              </div>
            </div>
            <button 
              onClick={stopSpeech}
              className="px-3.5 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-xl shrink-0 flex items-center gap-1.5 shadow-md transition-all border border-red-600/40"
              title="Hentikan audio pengumuman suara"
            >
              <VolumeX className="w-4 h-4" /> Stop Audio
            </button>
          </div>
        )}

        {/* 500-Meter Proximity Alert Banner (Beep & Vibration Alert for Conductor) */}
        {proximityAlertActive && (
          <div className="bg-gradient-to-r from-amber-950/95 via-red-950/90 to-amber-950/95 border-2 border-amber-500/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl shadow-amber-950/50 animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-amber-500/40">
                <BellRing className="w-7 h-7 text-slate-950 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono font-bold uppercase tracking-wider">
                    ⚠️ ALERT 500 METER
                  </span>
                  <span className="text-xs text-amber-300 font-mono flex items-center gap-1">
                    <Vibrate className="w-3.5 h-3.5" /> Beep & Getaran Aktif
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  Mendekati Point: <span className="text-amber-400 underline decoration-amber-400 decoration-2">{proximityAlertActive.name}</span>
                </h3>
                <p className="text-xs sm:text-sm text-amber-200/90">
                  Sisa jarak ke checkpoint tinggal <strong className="text-white font-mono">{proximityAlertActive.meters} meter</strong>! Kondektur harap bersiap memberi pengumuman atau aba-aba penumpang.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button 
                onClick={playProximityAlertSound}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                title="Bunyikan kembali suara beep & getaran"
              >
                <BellRing className="w-4 h-4" /> Ulangi Beep
              </button>
              <button 
                onClick={handlePlayCheckpoint}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                title="Putar pengumuman suara checkpoint STJ Viola"
              >
                <Volume2 className="w-4 h-4" /> Suara Point
              </button>
              <button 
                onClick={() => setProximityAlertActive(null)}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
                title="Tutup banner peringatan"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Real-time Device GPS Status Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isGpsLive ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'}`}>
                <LocateFixed className={`w-5 h-5 ${isGpsLive ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    Koneksi GPS Lokasi Perangkat Real-time
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${isGpsLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                    {locationMode === 'device' ? (isGpsLive ? 'Live Satelit' : 'Mencari Sinyal') : 'Simulasi Titik'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {gpsSourceStatus} · Koordinat: <span className="font-mono text-slate-300">{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={useLiveDeviceGps}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all ${locationMode === 'device' ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}
                title="Gunakan lokasi dan sensor GPS asli perangkat"
              >
                <Locate className="w-3.5 h-3.5" />
                <span>Pakai GPS Asli</span>
              </button>
            </div>
          </div>

          {/* Quick Route Point Selector for instantaneous testing anywhere */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Navigation2 className="w-3 h-3 text-red-400" />
                Uji Coba Cepat Titik Jalur Bus STJ Viola:
              </span>
              <span className="text-[11px] text-slate-500">Klik titik untuk simulasi instan</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => simulateAtLocation('Surabaya (Purabaya)', -7.3524, 112.7265, 0)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700"
              >
                Purabaya (Awal)
              </button>
              <button
                onClick={() => simulateAtLocation('Exit Toll Dumpil (< 500m)', -7.5720, 111.5810, 48)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg whitespace-nowrap border border-amber-500/40 font-bold animate-pulse"
                title="Uji coba alarm 500 meter di Exit Toll Dumpil"
              >
                ⚡ Dumpil (&lt; 500m)
              </button>
              <button
                onClick={() => simulateAtLocation('Terminal Madiun', -7.6046, 111.5235, 35)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700"
              >
                Term. Madiun
              </button>
              <button
                onClick={() => simulateAtLocation('Garasi STJ', -7.5785, 111.4550, 40)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700"
              >
                Garasi STJ
              </button>
              <button
                onClick={() => simulateAtLocation('Jalan Mbarat', -7.5615, 111.4390, 45)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700"
              >
                Jalan Mbarat
              </button>
              <button
                onClick={() => simulateAtLocation('Terminal Maospati', -7.5458, 111.4344, 40)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700"
              >
                Term. Maospati
              </button>
              <button
                onClick={() => simulateAtLocation('Terminal Magetan', -7.6534, 111.3325, 0)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg whitespace-nowrap border border-slate-700"
              >
                Magetan (Tujuan Akhir)
              </button>
            </div>
          </div>
        </div>

        {/* Live Dashboard Summary Banner with ETA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-mono text-slate-400">POINT BERIKUTNYA</p>
              <h4 className="text-base font-bold text-white">{activeCheckpoint.name}</h4>
              <p className="text-xs text-red-400 font-mono font-semibold">{distanceRemainingDisplay} lagi</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-mono text-slate-400">ESTIMASI TIBA (ETA) TUJUAN AKHIR</p>
              <h4 className="text-lg font-bold text-white font-mono">{etaFinalTimeStr}</h4>
              <p className="text-xs text-slate-400">Sisa rute: {finalRemainingKm.toFixed(1)} KM</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Satellite className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-mono text-slate-400">KECEPATAN BUS REAL-TIME</p>
              <h4 className="text-lg font-bold text-white font-mono">{gpsSpeedKmh} KM/Jam</h4>
              <p className="text-xs text-emerald-400">{gpsSourceStatus}</p>
            </div>
          </div>
        </div>

        {/* TAB 1: SOUNDBOARD */}
        {activeTab === 'soundboard' && (
          <div className="space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-red-400 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    RUTE AKAP: {routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan (Ekonomi)' : 'Magetan → Surabaya (Ekonomi)'}
                  </div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Radio className="w-6 h-6 text-red-500" />
                    Soundboard Suara Manusia Asli (STJ Viola)
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Suara penyiar dan kondektur manusia asli berkualitas studio (Gemini 3.8 Flash Lite TTS) — bebas suara robot!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Audio Manusia (WAV 24kHz)
                  </span>
                </div>
              </div>
            </div>

            {/* PENGATURAN SUARA MANUSIA ASLI (NATURAL HUMAN VOICE STUDIO) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 shadow-md shadow-red-950/50">
                    <Headphones className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      Pengaturan Karakter Suara Manusia
                    </h3>
                    <p className="text-xs text-slate-400">
                      Pilih karakter suara penyiar dan atur nada bel terminal (ding-dong) sebelum berbicara.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleTestSampleVoice}
                    disabled={isAudioLoading || isPlaying}
                    className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                    title="Dengarkan contoh suara manusia asli yang dipilih"
                  >
                    {isAudioLoading && activeAudioCategory === 'test' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>Tes Contoh Suara</span>
                  </button>
                  {isPlaying && (
                    <button
                      onClick={stopSpeech}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Character Voice Selector Grid */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                  PILIHAN KARAKTER PENYIAR & KONDEKTUR:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Voice 1: Fenrir */}
                  <div
                    onClick={() => setSelectedVoice('Fenrir')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      selectedVoice === 'Fenrir'
                        ? 'bg-red-950/50 border-red-500 shadow-md shadow-red-950/40 ring-1 ring-red-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        🎙️ Mas Fenrir
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/40 text-red-200 border border-red-500/30 font-mono font-semibold">
                        Utama (STJ)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Suara pria berwibawa, menawan, dan hangat khas penyiar resmi PO Sudiro Tungga Jaya.
                    </p>
                    <div className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                      {selectedVoice === 'Fenrir' ? '✓ Sedang Dipakai' : 'Pilih Suara Ini'}
                    </div>
                  </div>

                  {/* Voice 2: Puck */}
                  <div
                    onClick={() => setSelectedVoice('Puck')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      selectedVoice === 'Puck'
                        ? 'bg-red-950/50 border-red-500 shadow-md shadow-red-950/40 ring-1 ring-red-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        🎙️ Mas Puck
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Ramah
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Suara pria ramah, bersahabat, santai, dan akrab dengan seluruh penumpang.
                    </p>
                    <div className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                      {selectedVoice === 'Puck' ? '✓ Sedang Dipakai' : 'Pilih Suara Ini'}
                    </div>
                  </div>

                  {/* Voice 3: Charon */}
                  <div
                    onClick={() => setSelectedVoice('Charon')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      selectedVoice === 'Charon'
                        ? 'bg-red-950/50 border-red-500 shadow-md shadow-red-950/40 ring-1 ring-red-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        🎙️ Mas Charon
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Dewasa
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Suara pria dewasa dengan nada bass mantap, tenang, dan elegan.
                    </p>
                    <div className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                      {selectedVoice === 'Charon' ? '✓ Sedang Dipakai' : 'Pilih Suara Ini'}
                    </div>
                  </div>

                  {/* Voice 4: Kore */}
                  <div
                    onClick={() => setSelectedVoice('Kore')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      selectedVoice === 'Kore'
                        ? 'bg-red-950/50 border-red-500 shadow-md shadow-red-950/40 ring-1 ring-red-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white flex items-center gap-1.5">
                        🎙️ Mbak Kore
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Wanita
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Suara wanita penyiar terminal yang merdu, lembut, anggun, dan sopan.
                    </p>
                    <div className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                      {selectedVoice === 'Kore' ? '✓ Sedang Dipakai' : 'Pilih Suara Ini'}
                    </div>
                  </div>

                </div>
              </div>

              {/* Audio Chime & Volume Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* Pre-Chime Ding-Dong Toggle */}
                <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <BellRing className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Bel Terminal (Ding-Dong)</p>
                      <p className="text-[11px] text-slate-400">Bunyi bel pembuka sebelum suara pengumuman</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEnableChime(!enableChime)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      enableChime
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {enableChime ? 'AKTIF (ON)' : 'MATI (OFF)'}
                  </button>
                </div>

                {/* Volume Level Slider */}
                <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Volume1 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Volume Audio Pengeras</p>
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
                    className="flex-1 accent-red-600 cursor-pointer"
                  />
                </div>

              </div>
            </div>

            {/* Exact 3 Soundboard Categories (Powered by Natural Human Voice) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 1. Sambutan Penumpang */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 font-mono">
                    Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-red-600/10 text-red-500 flex items-center justify-center mb-4">
                    <Bus className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">1. Sambutan Penumpang</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Menyebutkan selamat datang, kecepatan bus ({gpsSpeedKmh} KM/Jam), point <span className="text-white font-semibold">{activeCheckpoint.name}</span> ({distanceRemainingDisplay}), dan ETA tujuan akhir ({etaFinalTimeStr}).
                  </p>
                </div>
                <button 
                  onClick={handlePlayWelcome}
                  disabled={isAudioLoading}
                  className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {isAudioLoading && activeAudioCategory === 'welcome' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Memproses Suara Manusia...
                    </>
                  ) : isPlaying && activeAudioCategory === 'welcome' ? (
                    <>
                      <Volume2 className="w-4 h-4 animate-bounce" /> Memutar Suara...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Putar Sambutan (Suara Manusia)
                    </>
                  )}
                </button>
              </div>

              {/* 2. Persiapan Pembayaran Tiket */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/30 font-mono">
                    Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-600/10 text-amber-500 flex items-center justify-center mb-4">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">2. Persiapan Pembayaran Tiket</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Mengingatkan pembayaran tiket sembari menginformasikan rute menuju point <span className="text-white font-semibold">{activeCheckpoint.name}</span> dengan ETA pukul {etaFinalTimeStr}.
                  </p>
                </div>
                <button 
                  onClick={handlePlayTicketPayment}
                  disabled={isAudioLoading}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {isAudioLoading && activeAudioCategory === 'ticket' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Memproses Suara Manusia...
                    </>
                  ) : isPlaying && activeAudioCategory === 'ticket' ? (
                    <>
                      <Volume2 className="w-4 h-4 animate-bounce" /> Memutar Suara...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Putar Pembayaran (Suara Manusia)
                    </>
                  )}
                </button>
              </div>

              {/* 3. Titik Pemberhentian Point STJ Viola */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between hover:border-red-500/50 transition-all relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    Suara Manusia
                  </span>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">3. Titik Pemberhentian Point</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Pengumuman kedatangan di point <span className="text-white font-semibold">{activeCheckpoint.name}</span> ({distanceRemainingDisplay}) dan ETA {etaFinalTimeStr}.
                  </p>
                </div>
                <button 
                  onClick={handlePlayCheckpoint}
                  disabled={isAudioLoading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {isAudioLoading && activeAudioCategory === 'checkpoint' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Memproses Suara Manusia...
                    </>
                  ) : isPlaying && activeAudioCategory === 'checkpoint' ? (
                    <>
                      <Volume2 className="w-4 h-4 animate-bounce" /> Memutar Suara...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> Putar Point (Suara Manusia)
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Quick Proximity 500m Status Bar for Conductor */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${proximityAlertEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Alarm Jarak Checkpoint (&lt; 500m)</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${proximityAlertEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                      {proximityAlertEnabled ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Otomatis bunyi beep & bergetar saat jarak ke <strong className="text-slate-300">{activeCheckpoint.name}</strong> tersisa &lt; 500 meter.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={playProximityAlertSound}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Tes bunyi beep 3-nada & getaran"
                >
                  <BellRing className="w-3.5 h-3.5" /> Tes Beep & Getar
                </button>
                <button
                  onClick={() => setProximityAlertEnabled(!proximityAlertEnabled)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
                >
                  {proximityAlertEnabled ? 'Matikan' : 'Aktifkan'}
                </button>
              </div>
            </div>

            {/* Custom AI prompt box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <Sparkles className="w-5 h-5 text-red-500" />
                Generator Naskah Kustom (AI Gemini)
              </div>
              <p className="text-xs text-slate-400">Ketik kalimat bebas, AI otomatis menyertakan info ETA dan posisi GPS saat ini.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ketik kalimat kustom..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                />
                <button 
                  onClick={handleGenerateAiAnnouncement}
                  disabled={isGenerating || !customPrompt}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" /> {isGenerating ? 'Membuat...' : 'Buat & Putar AI'}
                </button>
              </div>

              {aiScript && (
                <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-red-400 uppercase">Skrip AI:</span>
                    <button 
                      onClick={() => speakAnnouncement(aiScript, 'custom')}
                      disabled={isAudioLoading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      {isAudioLoading && activeAudioCategory === 'custom' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span>Putar Ulang (Suara Manusia)</span>
                    </button>
                  </div>
                  <p className="text-sm text-slate-200 italic">"{aiScript}"</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB: DASHBOARD VISUAL GRAFIK & ETA */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-red-500" />
                    Dashboard Visual Kecepatan & ETA ({routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan' : 'Magetan → Surabaya'})
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Grafik riwayat kecepatan bus dan kalkulasi waktu tiba (ETA) yang akurat.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={useLiveDeviceGps}
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/30 flex items-center gap-1.5 transition-all"
                    title="Sinkronkan dengan GPS live perangkat"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-blue-400" /> Sinkronkan GPS
                  </button>
                  <div className="text-xs font-mono bg-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/30">
                    ETA: {etaFinalTimeStr}
                  </div>
                </div>
              </div>

              {/* Visual Speed Sparkline Chart (SVG) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">Grafik Riwayat Kecepatan Bus (KM/Jam)</h3>
                    <p className="text-xs text-slate-400">Kecepatan live dari sensor satelit GPS</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-emerald-400">{gpsSpeedKmh}</span>
                    <span className="text-xs text-slate-400 ml-1">KM/H</span>
                  </div>
                </div>

                {/* SVG Line Chart */}
                <div className="h-40 w-full pt-4">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
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

              {/* ETA Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                  <p className="text-xs font-mono text-slate-400">TOTAL JARAK RUTE</p>
                  <p className="text-xl font-bold text-white font-mono">{totalRouteKm} KM</p>
                  <p className="text-xs text-slate-400">Sudah ditempuh: {distanceCoveredKm.toFixed(1)} KM ({percentCovered}%) · Sisa: {finalRemainingKm.toFixed(1)} KM</p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                  <p className="text-xs font-mono text-slate-400">ESTIMASI TIBA (ETA) DI TUJUAN AKHIR</p>
                  <p className="text-xl font-bold text-emerald-400 font-mono">{etaFinalTimeStr}</p>
                  <p className="text-xs text-slate-400">Estimasi durasi tersisa: ~{etaMinutesTotal} menit ({gpsSpeedKmh >= 10 ? `${gpsSpeedKmh} KM/J` : 'Est. rata-rata 50 KM/J'})</p>
                </div>
              </div>

              {/* Proximity 500m Alert Settings & Live Status Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeRemainingMeters <= 500 && activeRemainingMeters > 0 ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-amber-400'}`}>
                      <BellRing className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        Notifikasi Suara (Beep) & Getaran Otomatis (500 Meter)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Otomatis membunyikan beep 3 nada (880Hz-1318Hz) dan getaran ponsel saat bus berada &lt; 500m dari checkpoint agar kondektur selalu waspada.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setProximityAlertEnabled(!proximityAlertEnabled)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        proximityAlertEnabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {proximityAlertEnabled ? 'Status: AKTIF (ON)' : 'Status: NONAKTIF (OFF)'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">POINT SASARAN</span>
                    <p className="text-sm font-bold text-white">{activeCheckpoint.name}</p>
                    <p className="text-xs text-amber-400 font-mono">
                      {activeRemainingMeters > 500 
                        ? `${distanceRemainingDisplay} lagi` 
                        : `⚠️ ${activeRemainingMeters} Meter lagi!`}
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 space-y-1">
                    <span className="text-[11px] font-mono text-slate-400">STATUS DETEKSI JARAK</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${activeRemainingMeters <= 500 && activeRemainingMeters > 0 ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                      <p className="text-xs font-semibold text-white">
                        {activeRemainingMeters <= 500 && activeRemainingMeters > 0 ? 'Zona Waspada (< 500m)' : 'Perjalanan Normal'}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {alertedCheckpoints.includes(activeCheckpoint.id) ? 'Sudah berbunyi untuk point ini' : 'Alarm siap berbunyi'}
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-400">UJI & SIMULASI ALARM</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={playProximityAlertSound}
                        className="flex-1 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                        title="Putar beep 3-nada & getar pada perangkat"
                      >
                        <BellRing className="w-3.5 h-3.5" /> Tes Beep
                      </button>
                      <button
                        onClick={() => {
                          simulateAtLocation(`Dekat ${activeCheckpoint.name} (450m)`, activeCheckpoint.lat + 0.003, activeCheckpoint.lng + 0.003, 50);
                        }}
                        className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                        title="Simulasikan posisi bus berada 450 meter dari checkpoint"
                      >
                        Simulasi 450m
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB: GOOGLE MAPS LIVE ROUTE EMBED */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MapIcon className="w-5 h-5 text-blue-500" />
                    Google Maps Live Navigation ({routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan' : 'Magetan → Surabaya'})
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Peta rute resmi langsung terhubung dengan Google Maps.</p>
                </div>
                <a 
                  href={routeDirection === 'surabaya-magetan' ? "https://maps.google.com/?q=Terminal+Purabaya+to+Terminal+Magetan" : "https://maps.google.com/?q=Terminal+Magetan+to+Terminal+Purabaya"}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md whitespace-nowrap"
                >
                  Buka di Aplikasi Google Maps ↗
                </a>
              </div>

              <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                <iframe 
                  title="Google Maps Route STJ Viola"
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

        {/* TAB 2: CHECKPOINTS POINT & GPS DISTANCE TRACKER */}
        {activeTab === 'checkpoints' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-red-500" />
                    Titik Pemberhentian Point STJ Viola ({routeDirection === 'surabaya-magetan' ? 'Surabaya → Magetan' : 'Magetan → Surabaya'})
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Daftar point resmi terhubung langsung dengan sensor GPS satelit perangkat.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setAutoAdvancePoint(!autoAdvancePoint)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all ${autoAdvancePoint ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                    title="Otomatis mengikuti point terdekat"
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

              <div className="mt-6 space-y-4">
                {checkpoints.map((cp, idx) => {
                  const isCurrent = currentCheckpointIndex === idx;
                  const distM = calculateHaversineMeters(currentLat, currentLng, cp.lat, cp.lng);
                  const distKm = (distM / 1000);
                  const distDisplay = distM < 1000 ? `${distM} Meter lagi` : `${distKm.toFixed(1)} KM lagi`;
                  const speechDist = distM < 1000 ? `${distM} meter` : `${distKm.toFixed(1)} kilometer`;
                  const isPassed = idx < currentCheckpointIndex;

                  return (
                    <div 
                      key={cp.id}
                      onClick={() => {
                        setAutoAdvancePoint(false);
                        setCurrentCheckpointIndex(idx);
                        const script = `Bapak dan Ibu penumpang setia, jarak real-time GPS menuju point ${cp.name} saat ini tersisa ${speechDist} lagi.`;
                        speakAnnouncement(script, `point-${cp.id}`);
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${isCurrent ? 'bg-red-950/40 border-red-500/60 shadow-lg' : isPassed ? 'bg-slate-900/40 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isCurrent ? 'bg-red-600 text-white shadow-md' : isPassed ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-base">{cp.name}</h3>
                            {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white font-mono uppercase">Point Sasaran</span>}
                            {isCurrent && distM <= 500 && distM > 0 && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold uppercase animate-pulse flex items-center gap-1 shadow-sm">
                                <BellRing className="w-3 h-3" /> &lt; 500M (Waspada)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{cp.description}</p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">Koordinat: {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-red-400">
                            {isPassed ? 'Sudah Dilewati' : distDisplay}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">Est: {cp.estTime}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setAutoAdvancePoint(false);
                            setCurrentCheckpointIndex(idx);
                            const script = `Perhatian penumpang, jarak GPS real-time menuju point ${cp.name} tersisa ${speechDist} lagi.`;
                            speakAnnouncement(script, `point-${cp.id}`);
                          }}
                          disabled={isAudioLoading}
                          className="px-3.5 py-2 bg-red-600/20 hover:bg-red-600 disabled:opacity-50 text-red-400 hover:text-white text-xs font-semibold rounded-lg border border-red-500/30 transition-all flex items-center gap-1.5"
                        >
                          {isAudioLoading && activeAudioCategory === `point-${cp.id}` ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                          <span>Suara Point</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANIFEST & KURSI EKONOMI 2-3 */}
        {activeTab === 'manifest' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500" />
                    Manifest Kursi Viola Ekonomi (Konfigurasi 2-3)
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Sisi Kiri: 2 Kursi (A, B) | Sisi Kanan: 3 Kursi (C, D, E)</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <button 
                    onClick={exportManifestCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                  >
                    <Download className="w-4 h-4" /> Unduh Manifest (CSV)
                  </button>
                </div>
              </div>

              {/* Add Passenger Form */}
              <form onSubmit={handleAddPassenger} className="mt-6 p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Nama Penumpang"
                  value={newPassengerName}
                  onChange={(e) => setNewPassengerName(e.target.value)}
                  className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <select 
                  value={newPassengerSeat}
                  onChange={(e) => setNewPassengerSeat(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
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
                <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-all shrink-0">
                  + Tambah Penumpang
                </button>
              </form>

              {/* Passenger Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-mono text-slate-400">
                      <th className="py-3 px-4">KURSI (2-3)</th>
                      <th className="py-3 px-4">NO TIKET</th>
                      <th className="py-3 px-4">NAMA PENUMPANG</th>
                      <th className="py-3 px-4">PEMBERHENTIAN TUJUAN</th>
                      <th className="py-3 px-4 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {passengers.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-red-400">{p.seat}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{p.ticketNo}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{p.name}</td>
                        <td className="py-3.5 px-4 text-slate-300">{p.destination}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button 
                            onClick={() => toggleCheckIn(p.id)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${p.checkedIn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
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

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-800/80 bg-slate-900/50 mt-auto">
        <p>© 2026 Kondektur Digital STJ Viola Ekonomi · Rute Surabaya ⇄ Magetan.</p>
      </footer>

    </div>
  );
}
