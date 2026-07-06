import * as THREE from 'three';
import { MapInfo } from '../types';
import { KARTS } from '../data';

// Audio Synthesizer Engine
export const AudioEngine = {
  ctx: null as AudioContext | null,
  engineSnd: null as { osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null,
  driftSnd: null as { osc: OscillatorNode; noise: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null,
  bgmInterval: null as any,
  bgmStep: 0,
  bgmIsPlaying: false,

  init() {
    try {
      if (this.ctx) return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("AudioContext failed to initialize (restricted environment/iframe):", e);
    }
  },

  playEngine(rpmRatio: number) {
    if (!this.ctx) return null;
    try {
      if (this.engineSnd) {
        this.engineSnd.osc.frequency.setValueAtTime(50 + (rpmRatio * 180), this.ctx.currentTime);
        return this.engineSnd;
      }
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50 + (rpmRatio * 180), this.ctx.currentTime);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180 + (rpmRatio * 320), this.ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.03 + (rpmRatio * 0.03), this.ctx.currentTime);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start();
      this.engineSnd = { osc, gain: gainNode, filter };
      return this.engineSnd;
    } catch (e) {
      return null;
    }
  },

  stopEngine() {
    this.setDriftActive(false);
    if (this.engineSnd) {
      try {
        this.engineSnd.osc.stop();
      } catch (e) {}
      this.engineSnd = null;
    }
  },

  setDriftActive(active: boolean) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    if (active) {
      if (this.driftSnd) return;
      try {
        const now = this.ctx.currentTime;
        
        // 1. Physical asphalt grinding friction noise
        const bufferSize = this.ctx.sampleRate * 2.5;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        // Bandpass Filter at 1450Hz with High Resonance (Q = 3.5) isolates authentic gravelly pavement scrapings
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1450, now);
        noiseFilter.Q.setValueAtTime(3.5, now);

        // 2. Resonant tonal squeeze rubber oscillators (High tire screech feedback)
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1180, now);
        osc.frequency.linearRampToValueAtTime(820, now + 1.8);

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, now);
        osc2.frequency.linearRampToValueAtTime(835, now + 1.8);

        // Resonant squeal bandpass filter mimicking pressurized rubber scream
        const squealFilter = this.ctx.createBiquadFilter();
        squealFilter.type = 'bandpass';
        squealFilter.frequency.setValueAtTime(1380, now);
        squealFilter.frequency.linearRampToValueAtTime(1120, now + 1.8);
        squealFilter.Q.setValueAtTime(6.5, now); // Extremely high-Q rings like a real tire screech

        // 3. Stick-slip vibrato LFO (asphalt tread micro-shuddering)
        // Authentic 24Hz chatter represents tires rapidly losing/regaining road grip
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(24, now); 
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(130, now); 
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfoGain.connect(osc2.frequency);
        lfoGain.connect(squealFilter.frequency);

        // Modulate physical gain flutter on friction noise to simulate road bumps
        const noiseGainLFO = this.ctx.createGain();
        noiseGainLFO.gain.setValueAtTime(0.5, now);
        const lfoToGain = this.ctx.createGain();
        lfoToGain.gain.setValueAtTime(0.18, now);
        lfo.connect(lfoToGain);
        lfoToGain.connect(noiseGainLFO.gain);

        // Routing noise
        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGainLFO);

        // Routing tonal screeches
        osc.connect(squealFilter);
        osc2.connect(squealFilter);

        // Master gain with smooth clickless envelope
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.045, now + 0.05); // Snap climb

        noiseGainLFO.connect(gainNode);
        squealFilter.connect(gainNode);

        gainNode.connect(this.ctx.destination);

        // Fire physical engines
        lfo.start(now);
        noiseNode.start(now);
        osc.start(now);
        osc2.start(now);

        this.driftSnd = {
          osc,
          noise: noiseNode,
          filter: noiseFilter,
          gain: gainNode
        };
        (this.driftSnd as any).osc2 = osc2;
        (this.driftSnd as any).lfo = lfo;
      } catch (e) {
        console.warn("Continuous drift sound playback failed:", e);
      }
    } else {
      if (!this.driftSnd) return;
      try {
        const now = this.ctx.currentTime;
        const snd = this.driftSnd as any;
        snd.gain.gain.setValueAtTime(snd.gain.gain.value, now);
        snd.gain.gain.linearRampToValueAtTime(0, now + 0.05); // Smooth release
        
        snd.osc.stop(now + 0.07);
        if (snd.osc2) {
          snd.osc2.stop(now + 0.07);
        }
        if (snd.lfo) {
          snd.lfo.stop(now + 0.07);
        }
        snd.noise.stop(now + 0.07);
      } catch (e) {}
      this.driftSnd = null;
    }
  },

  playClick() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.18;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(5800, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.16);
      filter.Q.setValueAtTime(3.4, now);
      
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.24, now + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      noiseNode.start(now);
    } catch (e) {
      console.warn("playClick sound failed:", e);
    }
  },

  playBoost() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      
      // 1. Heavy low-frequency saw flame rumble (the deep rocket power)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const lowFilter = this.ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 1.4);
      
      lowFilter.type = 'lowpass';
      lowFilter.frequency.setValueAtTime(130, now);
      
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      
      osc.connect(lowFilter);
      lowFilter.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      
      // 2. High-gain sweeping fire noise ("화르르륵" ignition)
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      // Flame sweeping dynamic: fast frequency sweep mimics fire gas burst ignition
      noiseFilter.frequency.setValueAtTime(150, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(2500, now + 0.18);
      noiseFilter.frequency.exponentialRampToValueAtTime(320, now + 1.3);
      noiseFilter.Q.setValueAtTime(2.2, now);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.24, now + 0.06); // Quick combustion burst!
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      
      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      
      osc.start(now);
      noiseNode.start(now);
      
      osc.stop(now + 1.4);
      noiseNode.stop(now + 1.4);
    } catch (e) {}
  },

  playDrift() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      
      // 1. Quick noise burst for asphalt slip friction
      const bufferSize = this.ctx.sampleRate * 0.25; 
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1400, now);
      noiseFilter.Q.setValueAtTime(4.0, now);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.08, now + 0.015);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      
      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      
      // 2. High squealing pitch oscillator slide
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.22);
      
      const squealFilter = this.ctx.createBiquadFilter();
      squealFilter.type = 'bandpass';
      squealFilter.frequency.setValueAtTime(1350, now);
      squealFilter.Q.setValueAtTime(5.5, now);
      
      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.045, now + 0.015);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      
      osc.connect(squealFilter);
      squealFilter.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      
      noiseNode.start(now);
      osc.start(now);
      
      noiseNode.stop(now + 0.25);
      osc.stop(now + 0.25);
    } catch (e) {}
  },

  playItemPickup() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [392.00, 493.88, 587.33, 783.99]; // G4, B4, D5, G5 - Warm major chord
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.03, now + idx * 0.04 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.28);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.32);
      });
    } catch (e) {}
  },

  playShuffleTick() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now); // low sweet organic click
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.04);
      
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(now + 0.05);
    } catch (e) {}
  },

  playCrash() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.6);
    } catch (e) {}
  },

  playCoin() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [987.77, 1318.51];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.04, now + idx * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
      });
    } catch (e) {}
  },

  playBGM(mapId: string = 'neon_sky_way') {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.bgmIsPlaying) return;
    this.bgmIsPlaying = true;
    this.bgmStep = 0;

    let stepDuration = 0.110; // ~136 BPM bouncy sixteenth notes
    let waveType: 'sine' | 'triangle' | 'sawtooth' | 'square' = 'sawtooth';
    let filterFreq = 1500;
    
    // Addictive, Heroic, and exciting Brawl Stars-inspired G-Dorian syncopated theme
    let mNotes = [
      // Bar 1
      329.63, 0, 329.63, 493.88, 0, 440.00, 0, 392.00,
      369.99, 0, 392.00, 440.00, 493.88, 0, 329.63, 0,
      // Bar 2
      293.66, 0, 293.66, 440.00, 0, 392.00, 0, 369.99,
      329.63, 0, 369.99, 392.00, 440.00, 493.88, 587.33, 0,
      // Bar 3
      659.25, 0, 659.25, 493.88, 0, 440.00, 0, 493.88,
      587.33, 0, 493.88, 0, 440.00, 392.00, 329.63, 0,
      // Bar 4
      493.88, 0, 493.88, 587.33, 0, 554.37, 0, 493.88,
      440.00, 392.00, 369.99, 329.63, 293.66, 369.99, 329.63, 0,
      // Bar 5 (Rise and Intensify)
      392.00, 392.00, 493.88, 0, 440.00, 440.00, 554.37, 0,
      493.88, 0, 587.33, 0, 659.25, 0, 493.88, 0,
      // Bar 6
      783.99, 783.99, 739.99, 659.25, 0, 587.33, 0, 493.88,
      440.00, 0, 493.88, 587.33, 659.25, 0, 783.99, 0,
      // Bar 7 (Heroic Fanfare)
      880.00, 880.00, 783.99, 739.99, 0, 659.25, 0, 587.33,
      493.88, 0, 587.33, 659.25, 783.99, 0, 880.00, 0,
      // Bar 8 (Epic Descent Fill)
      987.77, 0, 880.00, 783.99, 739.99, 659.25, 587.33, 493.88,
      440.00, 392.00, 369.99, 329.63, 493.88, 369.99, 329.63, 0
    ];

    let bNotes = [
      82.41, 164.81, 82.41, 82.41,   // E minor
      73.42, 146.83, 73.42, 73.42,   // D major
      65.41, 130.81, 65.41, 65.41,   // C major
      61.74, 123.47, 61.74, 61.74,   // B major
      98.00, 196.00, 98.00, 98.00,   // G major
      110.00, 220.00, 110.00, 110.00, // A major
      61.74, 123.47, 61.74, 61.74,   // B minor
      82.41, 164.81, 82.41, 123.47   // E minor
    ];

    if (mapId === 'cyberspace_tunnel') {
      // Fast, frantic tech-trance theme (BPM 160)
      stepDuration = 0.093;
      waveType = 'square'; // Aggressive digital pulse wave 
      filterFreq = 1800;
      mNotes = [
        261.63, 261.63, 523.25, 311.13, 261.63, 523.25, 311.13, 261.63,
        293.66, 293.66, 587.33, 349.23, 293.66, 587.33, 349.23, 293.66,
        311.13, 311.13, 622.25, 392.00, 311.13, 622.25, 392.00, 311.13,
        349.23, 349.23, 698.46, 415.30, 349.23, 698.46, 523.25, 415.30,
        261.63, 523.25, 466.16, 392.00, 311.13, 392.00, 466.16, 523.25,
        293.66, 587.33, 523.25, 440.00, 349.23, 440.00, 523.25, 587.33,
        311.13, 622.25, 587.33, 493.88, 392.00, 493.88, 587.33, 622.25,
        349.23, 698.46, 622.25, 523.25, 415.30, 523.25, 622.25, 698.46
      ];
      bNotes = [
        65.41, 65.41, 65.41, 65.41,
        73.42, 73.42, 73.42, 73.42,
        78.41, 78.41, 78.41, 78.41,
        87.31, 87.31, 87.31, 87.31
      ];
    } else if (mapId === 'cosmic_highway') {
      // High-speed progressive cosmic trance (BPM 140)
      stepDuration = 0.107;
      waveType = 'sawtooth';
      filterFreq = 1400;
      mNotes = [
        440.00, 440.00, 880.00, 0, 493.88, 493.88, 987.77, 0,
        523.25, 523.25, 1046.50, 0, 587.33, 587.33, 1174.66, 0,
        659.25, 659.25, 1318.51, 0, 587.33, 587.33, 1174.66, 0,
        523.25, 523.25, 1046.50, 0, 493.88, 493.88, 987.77, 0,
        440.00, 0, 523.25, 0, 659.25, 0, 880.00, 0,
        493.88, 0, 587.33, 0, 739.99, 0, 987.77, 0,
        523.25, 0, 659.25, 0, 783.99, 0, 1046.50, 0,
        587.33, 0, 698.46, 0, 880.00, 0, 1174.66, 0
      ];
      bNotes = [
        55.00, 55.00, 61.74, 61.74,
        65.41, 65.41, 73.42, 73.42,
        55.00, 55.00, 61.74, 61.74,
        65.41, 65.41, 73.42, 73.42
      ];
    } else if (mapId === 'lava_crevice') {
      // Aggressive Industrial Dark Hard-bass drive (BPM 150)
      stepDuration = 0.100;
      waveType = 'sawtooth';
      filterFreq = 800; // Deep thudding filter 
      mNotes = [
        110.00, 0, 110.00, 110.00, 123.47, 0, 123.47, 123.47,
        130.81, 0, 130.81, 130.81, 146.83, 146.83, 164.81, 164.81,
        110.00, 110.00, 146.83, 110.00, 164.81, 110.00, 196.00, 110.00,
        220.00, 0, 293.66, 0, 329.63, 0, 220.00, 0,
        110.00, 0, 110.00, 110.00, 123.47, 0, 123.47, 123.47,
        130.81, 0, 130.81, 130.81, 146.83, 146.83, 220.00, 0,
        220.00, 220.00, 293.66, 220.00, 329.63, 220.00, 392.00, 220.00,
        440.00, 440.00, 493.88, 493.88, 523.25, 523.25, 587.33, 0
      ];
      bNotes = [
        55.00, 55.00, 55.00, 55.00,
        61.74, 61.74, 61.74, 61.74,
        41.20, 41.20, 41.20, 41.20,
        55.00, 55.00, 55.00, 55.00
      ];
    } else if (mapId === 'frozen_glacier') {
      // Metallic Sharp Neo-Synthwave / Chiptune (BPM 145)
      stepDuration = 0.103;
      waveType = 'square';
      filterFreq = 2200;
      mNotes = [
        493.88, 587.33, 739.99, 987.77, 880.00, 0, 880.00, 0,
        783.99, 0, 739.99, 0, 587.33, 0, 493.88, 0,
        440.00, 523.25, 659.25, 880.00, 783.99, 0, 783.99, 0,
        698.46, 0, 659.25, 0, 523.25, 0, 440.00, 0,
        493.88, 739.99, 987.77, 1174.66, 1479.98, 0, 1479.98, 0,
        1318.51, 1318.51, 1174.66, 1174.66, 987.77, 987.77, 739.99, 739.99,
        880.00, 1046.50, 1318.51, 1760.00, 1567.98, 0, 1567.98, 0,
        1396.91, 1396.91, 1318.51, 1318.51, 1046.50, 1046.50, 880.00, 880.00
      ];
      bNotes = [
        61.74, 61.74, 73.42, 73.42,
        55.00, 55.00, 65.41, 65.41,
        61.74, 61.74, 73.42, 73.42,
        87.31, 87.31, 98.00, 98.00
      ];
    } else if (mapId === 'lobby') {
      // Sleek Retro Electro Lobby (118 BPM)
      stepDuration = 0.127;
      waveType = 'sine';
      filterFreq = 1100;
      mNotes = [
        392.00, 0, 440.00, 523.25, 587.33, 0, 523.25, 0,
        349.23, 0, 392.00, 440.00, 493.88, 0, 440.00, 0,
        329.63, 0, 392.00, 440.00, 523.25, 0, 392.00, 0,
        440.00, 523.25, 587.33, 659.25, 783.99, 0, 0, 0,
        392.00, 0, 440.00, 523.25, 587.33, 0, 523.25, 0,
        349.23, 0, 392.00, 440.00, 493.88, 0, 440.00, 0,
        329.63, 0, 392.00, 440.00, 523.25, 0, 392.00, 0,
        440.00, 523.25, 587.33, 783.99, 880.00, 0, 0, 0
      ];
      bNotes = [
        87.31, 87.31, 87.31, 87.31,
        98.00, 98.00, 98.00, 98.00,
        82.41, 82.41, 82.41, 82.41,
        110.00, 110.00, 110.00, 110.00
      ];
    }

    let noiseBuffer: AudioBuffer | null = null;
    try {
      const bufferSize = this.ctx.sampleRate * 0.3;
      noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {}

    const playBassNote = (freq: number, time: number) => {
      if (!this.ctx) return;
      try {
        const cycleStep = this.bgmStep % 1024;
        const cycleBar = Math.floor(cycleStep / 16);
        const isBridge = (cycleBar >= 24 && cycleBar <= 31);
        const isClimax = (cycleBar >= 36 && cycleBar <= 55);
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // Climax drops get a heavy sawtooth bass for incredible drive
        osc.type = isClimax ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        let targetBassVol = isClimax ? 0.065 : 0.04;
        if (isBridge) {
          targetBassVol = 0.02; // soft bass during the filtered bridge
        }
        
        // Dynamic Sidechain Compression Effect: duck the bass volume on the major kick beat
        const isKickStep = (cycleStep % 4 === 0);
        if (isClimax && isKickStep) {
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.001, time + 0.012); // crush instantly
          gain.gain.linearRampToValueAtTime(targetBassVol, time + 0.10); // swell up dynamically
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
        } else {
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(targetBassVol, time + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
        }
        
        if (isClimax) {
          // Warm low-pass filter routing for the climax bass to prevent high frequency noise distortion
          const bassFilter = this.ctx.createBiquadFilter();
          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(280, time);
          osc.connect(bassFilter);
          bassFilter.connect(gain);
        } else {
          osc.connect(gain);
        }
        
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.14);
      } catch (e) {}
    };

    const playMelodyNote = (freq: number, time: number) => {
      if (!this.ctx || freq <= 0) return;
      try {
        const cycleStep = this.bgmStep % 1024;
        const cycleBar = Math.floor(cycleStep / 16);
        const isBridge = (cycleBar >= 24 && cycleBar <= 31);
        const isBuild = (cycleBar >= 32 && cycleBar <= 35);
        const isClimax = (cycleBar >= 36 && cycleBar <= 55);

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        let activeWaveType = waveType;
        if (isClimax) {
          activeWaveType = 'sawtooth'; // Force electric saws for incredible energy on drop!
        }
        
        osc1.type = activeWaveType;
        osc1.frequency.setValueAtTime(freq, time);
        
        osc2.type = activeWaveType;
        // Detune by 14 cents for a beautiful chorused fat synth lead (brassy arcade vibe)
        osc2.frequency.setValueAtTime(freq * Math.pow(2, 14 / 1200), time);
        
        filter.type = 'lowpass';
        
        // Calculate dynamic low-pass sweep
        let activeFilterFreq = filterFreq;
        if (isBridge) {
          // Sweep filter down to 320Hz to create a gorgeous "underwater" bridge
          const progress = (cycleStep - 384) / 128;
          activeFilterFreq = filterFreq * (1.0 - progress * 0.75);
        } else if (isBuild) {
          // Sweep open the filter like a laser rise!
          const progress = (cycleStep - 512) / 64;
          activeFilterFreq = 400 + progress * (filterFreq * 1.6 - 400);
        } else if (isClimax) {
          activeFilterFreq = filterFreq * 1.8; // Open wide for bright, crispy solos!
        }
        
        filter.frequency.setValueAtTime(activeFilterFreq, time);
        
        let startVol = 0.012;
        if (isBridge) {
          startVol = 0.007; // softer melody
        } else if (isClimax) {
          startVol = 0.024; // louder climax lead
        }
        
        // Pumping sidechain on the lead synth matching key beats
        const isKickStep = (cycleStep % 4 === 0);
        if (isClimax && isKickStep) {
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(0.001, time + 0.012);
          gain.gain.linearRampToValueAtTime(startVol, time + 0.11);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
        } else {
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(startVol, time + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
        }
        
        osc1.connect(filter);
        osc2.connect(filter);
        
        // Climax Supersaw layered stack
        let osc3: OscillatorNode | null = null;
        let subOsc: OscillatorNode | null = null;
        if (isClimax) {
          osc3 = this.ctx.createOscillator();
          osc3.type = 'sawtooth';
          osc3.frequency.setValueAtTime(freq * Math.pow(2, -28 / 1200), time); // Detuned wide oppositely
          osc3.connect(filter);
          
          subOsc = this.ctx.createOscillator();
          subOsc.type = 'sine';
          subOsc.frequency.setValueAtTime(freq * 0.5, time); // Huge 1-octave low support
          subOsc.connect(filter);
        }
        
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start(time);
        osc2.start(time);
        if (osc3) osc3.start(time);
        if (subOsc) subOsc.start(time);
        
        osc1.stop(time + 0.25);
        osc2.stop(time + 0.25);
        if (osc3) osc3.stop(time + 0.25);
        if (subOsc) subOsc.stop(time + 0.25);
      } catch (e) {}
    };

    const playKick = (time: number, isClimax: boolean = false) => {
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        // High-definition click transient layer for that extremely satisfying mechanical "kick" punch
        const transientOsc = this.ctx.createOscillator();
        const transientGain = this.ctx.createGain();
        
        osc.type = 'triangle';
        const startFreq = isClimax ? 180 : 130;
        const endFreq = isClimax ? 30 : 38;
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + 0.09);
        
        gain.gain.setValueAtTime(0, time);
        const peakVol = isClimax ? 0.45 : 0.26;
        gain.gain.linearRampToValueAtTime(peakVol, time + 0.003);
        const decayLen = isClimax ? 0.15 : 0.12;
        gain.gain.exponentialRampToValueAtTime(0.0001, time + decayLen);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        // Transient Click layer
        transientOsc.type = 'sine';
        transientOsc.frequency.setValueAtTime(400, time);
        transientOsc.frequency.exponentialRampToValueAtTime(100, time + 0.015);
        
        transientGain.gain.setValueAtTime(0, time);
        transientGain.gain.linearRampToValueAtTime(isClimax ? 0.18 : 0.11, time + 0.001);
        transientGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);
        
        transientOsc.connect(transientGain);
        transientGain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + decayLen + 0.02);
        
        transientOsc.start(time);
        transientOsc.stop(time + 0.03);
      } catch (e) {}
    };

    const playSnare = (time: number, volMultiplier: number = 1.0) => {
      if (!this.ctx || !noiseBuffer) return;
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.026 * volMultiplier, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(time);
        source.stop(time + 0.15);
      } catch (e) {}
    };

    const playHihat = (time: number, volMultiplier: number = 1.0) => {
      if (!this.ctx || !noiseBuffer) return;
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 10000;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.0025 * volMultiplier, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(time);
        source.stop(time + 0.05);
      } catch (e) {}
    };

    const runScheduler = () => {
      if (!this.bgmIsPlaying || !this.ctx) return;
      
      const lookAhead = 0.05;
      const scheduleTime = this.ctx.currentTime + lookAhead;
      
      const sequenceLength = mNotes.length;
      const currentStep = this.bgmStep % sequenceLength;
      const barIdx = Math.floor((this.bgmStep % 32) / 8);
      
      const isCustomElectronic = ['cyberspace_tunnel', 'cosmic_highway', 'lava_crevice', 'frozen_glacier', 'lobby'].includes(mapId);
      
      // Master song structure (64 Bars cycle)
      const cycleStep = this.bgmStep % 1024;
      const cycleBar = Math.floor(cycleStep / 16);
      
      const isBridge = (cycleBar >= 24 && cycleBar <= 31);
      const isBuild = (cycleBar >= 32 && cycleBar <= 35);
      const isClimax = (cycleBar >= 36 && cycleBar <= 55);

      // --- DYNAMIC DRUM SCHEDULER ---
      let triggerK = false;
      let triggerS = false;
      let triggerH = false;
      
      if (isBridge) {
        // Soft click hi-hat syncopated pattern on bridge, removing heavy kicks and snares
        if (cycleStep % 4 === 2) triggerH = true;
        if (cycleStep % 8 === 4) triggerS = true; // woodblock-like tick
      } else if (isBuild) {
        // Accelerated snare drum rolls building tension
        if (cycleBar === 32 || cycleBar === 33) {
          if (cycleStep % 4 === 0) triggerK = true;
          if (cycleStep % 4 === 2) triggerS = true;
        } else if (cycleBar === 34) {
          if (cycleStep % 2 === 0) {
            triggerK = true;
            if (cycleStep % 4 === 2) triggerS = true;
          }
        } else if (cycleBar === 35) {
          // Intense 16th roll (every step triggers drums!)
          triggerK = true;
          triggerS = true;
          triggerH = true;
        }
      } else if (isClimax) {
        // High-octane climax drop with big 4-on-the-floor kick plus syncopations
        const stepInBeat = cycleStep % 4;
        if (stepInBeat === 0) {
          triggerK = true;
        } else if (stepInBeat === 2) {
          triggerS = true;
        } else {
          triggerH = true;
        }
        // Extra fast kick-double on drop bars
        if (cycleStep % 16 === 10 || cycleStep % 16 === 14) {
          triggerK = true;
        }
      } else {
        // Standard normal track beats
        if (isCustomElectronic) {
          const stepInBeat = currentStep % 4;
          if (stepInBeat === 0) {
            triggerK = true;
          } else if (stepInBeat === 2) {
            triggerS = true;
          } else {
            triggerH = true;
          }
        } else {
          const drumStep = currentStep % 16;
          if (drumStep === 0 || drumStep === 8 || drumStep === 10 || drumStep === 14) {
            triggerK = true;
          }
          if (drumStep === 4 || drumStep === 12) {
            triggerS = true;
          }
          if (drumStep === 2 || drumStep === 6 || drumStep === 11 || drumStep === 15) {
            triggerH = true;
          }
        }
      }

      // Fire drums
      if (triggerK) playKick(scheduleTime, isClimax);
      if (triggerS) {
        let vol = 1.0;
        if (isBridge) vol = 0.4;
        if (isClimax) vol = 1.35;
        playSnare(scheduleTime, vol);
      }
      if (triggerH) {
        let vol = isClimax ? 1.5 : 1.0;
        playHihat(scheduleTime, vol);
      }
      
      // --- BASS SEQUENCER ---
      if (currentStep % 2 === 0) {
        let bassFreq = 110;
        if (isCustomElectronic) {
          bassFreq = bNotes[barIdx * 4 + Math.floor((currentStep % 8) / 2)] || 110;
        } else {
          const bassStep = Math.floor(currentStep / 2) % bNotes.length;
          bassFreq = bNotes[bassStep] || 110;
        }
        
        let finalBassFreq = bassFreq;
        if (isBridge) {
          // Play beautiful minor shift progression chords in the bridge
          const stage = Math.floor((cycleStep - 384) / 32) % 4;
          const multi = [0.75, 0.85, 1.0, 0.9];
          finalBassFreq = bassFreq * multi[stage];
        } else if (isClimax) {
          // Drop octave for deep speaker rattling subs
          if (cycleStep % 4 === 2) {
            finalBassFreq = bassFreq * 0.5;
          }
        }
        playBassNote(finalBassFreq, scheduleTime);
      }
      
      // --- MELODY SEQUENCER ---
      let melodyFreq = mNotes[currentStep];
      let finalMelodyFreq = melodyFreq;
      
      if (isBridge) {
        // Match minor chords transposition
        const stage = Math.floor((cycleStep - 384) / 32) % 4;
        const multi = [0.75, 0.85, 1.0, 0.9];
        if (melodyFreq && melodyFreq > 0) {
          finalMelodyFreq = melodyFreq * multi[stage];
        }
      } else if (isBuild) {
        // High rapid cyber-arpeggio climbing to heaven!
        const chordRoots = [261.63, 293.66, 329.63, 392.00]; // C - D - E - G
        const root = chordRoots[Math.floor((cycleStep - 512) / 16) % 4];
        const arpPattern = [1.0, 1.2, 1.25, 1.5, 1.0, 1.2, 1.5, 1.875];
        finalMelodyFreq = root * arpPattern[cycleStep % 8];
        
        // Pitch rise
        const climb = 1.0 + (cycleStep - 512) / 64; 
        finalMelodyFreq *= climb;
      } else if (isClimax) {
        // Peak energetic double octave transposition (+12 semitones!)
        if (melodyFreq && melodyFreq > 0) {
          finalMelodyFreq = melodyFreq * 2.0;
        }
      }
      
      if (finalMelodyFreq && finalMelodyFreq > 0) {
        playMelodyNote(finalMelodyFreq, scheduleTime);
      }
      
      this.bgmStep++;
    };

    this.bgmInterval = setInterval(runScheduler, stepDuration * 1000);
  },

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.bgmIsPlaying = false;
  }
};

export class GameEngine {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  container: HTMLDivElement;

  // Track & Nodes
  trackSpline!: THREE.CatmullRomCurve3;
  roadMesh!: THREE.Mesh;
  decorativeGroup = new THREE.Group();
  itemsGroup = new THREE.Group();

  // Racers
  playerKart!: { mesh: THREE.Group; wheels: THREE.Mesh[]; nozzle: THREE.Mesh };
  aiKart!: { mesh: THREE.Group; wheels: THREE.Mesh[]; nozzle: THREE.Mesh };

  // Game Attributes
  active = false;
  timer = 0;
  lap = 1;
  maxLaps = 3;
  lapCheckpoints = [false, false];
  aiLap = 1;
  aiLapCheckpoints = [false, false];
  isSuperNitro = false;
  aiBoosterActive = false;
  aiBoosterTimer = 0;
  playerAuraId = 'none';
  playerKartId = 'pink_thunder';
  aiKartId = 'blue_lightning';
  myParticipantIndex = 0;

  isActiveRunner(): boolean {
    if (this.gameMode !== 'relay_race') return true;
    const currentLap = this.lap;
    if (currentLap === 1 || currentLap === 3) {
      return this.myParticipantIndex === 0 || this.myParticipantIndex === 2;
    } else {
      return this.myParticipantIndex === 1 || this.myParticipantIndex === 3;
    }
  }

  speed = 0;
  maxSpeed = 1.15;
  accel = 0.02;
  decel = 0.006;
  friction = 0.985;
  angle = 0;
  turnSpeed = 0.03;

  isDrifting = false;
  driftCount = 0;
  boostersUsed = 0;
  maxSpeedReached = 0;
  itemBoxesCollected = 0;
  driftDirection = 0;
  driftAngle = 0;
  lastDriftKey = false;
  boosterGauge = 0;
  boosterStock = 0;
  boosterActive = false;
  boosterTimer = 0;

  shieldActive = false;
  shieldTimer = 0;
  aiProgress = 0;
  lastCrashTime = 0;

  // AI item management
  gameMode: string = 'speed';
  mapInfo!: MapInfo;
  aiPaintTarget: THREE.Vector3 | null = null;
  aiShieldActive = false;
  aiShieldTimer = 0;
  aiHasItem = false;
  aiHeldItem: string | null = null;
  aiItemDecisionTimer = 0;
  aiAutoItemTimer = 400; // Fallback timer to auto-grant items to AI to keep the race extremely engaging
  onComicPopup?: (text: string, color: string) => void;
  onHUDNotification?: (title: string, body: string) => void;
  onCoinCollected?: () => void;
  onPaintTurfRatio?: (playerRatio: number) => void;
  onFlagScoreChange?: (playerScore: number, aiScore: number) => void;
  aiFinishedTimeRemaining: number | null = null;
  aiFinishedTime: number | null = null;

  paints: Array<{ mesh: THREE.Mesh; owner: 'player' | 'ai' }> = [];
  paintTimer = 0;

  // 3D vertical offsets for elevations & jump mechanics
  verticalVelocity = 0;
  verticalOffset = 0;
  aiVerticalVelocity = 0;
  aiVerticalOffset = 0;
  // Track features groups
  boosterPadsGroup = new THREE.Group();
  jumpRampsGroup = new THREE.Group();
  shortcutsGroup = new THREE.Group();

  playerFlagScore = 0;
  aiFlagScore = 0;
  currentFlagPos: THREE.Vector3 | null = null;
  flagMesh: THREE.Group | null = null;

  itemBoxes: Array<{ mesh: THREE.Mesh; basePos: THREE.Vector3; active: boolean; respawnTimer: number }> = [];
  coins: Array<{ mesh: THREE.Mesh; basePos: THREE.Vector3; active: boolean; respawnTimer: number }> = [];
  obstacles: Array<{ mesh: THREE.Mesh; position: THREE.Vector3 }> = [];
  particleGroup: THREE.Mesh[] = [];

  smokeGeometry!: THREE.DodecahedronGeometry;
  boosterGeometry!: THREE.ConeGeometry;

  cameraView: 'isometric' | 'chase' | 'first' = 'isometric';
  multiplayerKarts = new Map<string, { mesh: THREE.Group; wheels: THREE.Mesh[]; nozzle: THREE.Mesh }>();
  ghostConfig?: { isGhost: boolean; targetTimeMs: number; ghostColorHex: number };

  // React Callbacks
  onLapChange: (lap: number) => void;
  onSpeedChange: (speed: number) => void;
  onBoosterGaugeChange: (gauge: number) => void;
  onBoosterCountChange: (count: number) => void;
  onItemPickup: () => void;
  onGameFinished: (playerWon: boolean, finalTime: number) => void;
  onAiCrashNotification: () => void;
  onPlayerCrashNotification: () => void;
  onShootMissile?: (targetPeerId: string) => void;
  onDropBanana?: (pos: { x: number; y: number; z: number }) => void;

  constructor(
    container: HTMLDivElement,
    mapInfo: MapInfo,
    playerKartColor: number,
    playerFlameColor: number,
    aiKartColor: number,
    stats: { speed: number; accel: number; drift: number; handling: number },
    onLapChange: (lap: number) => void,
    onSpeedChange: (speed: number) => void,
    onBoosterGaugeChange: (gauge: number) => void,
    onBoosterCountChange: (count: number) => void,
    onItemPickup: () => void,
    onGameFinished: (playerWon: boolean, finalTime: number) => void,
    onAiCrashNotification: () => void,
    onPlayerCrashNotification: () => void,
    ghostConfig?: { isGhost: boolean; targetTimeMs: number; ghostColorHex: number },
    gameModeParam?: string,
    playerAuraIdParam?: string,
    playerKartIdParam?: string,
    aiKartIdParam?: string
  ) {
    this.container = container;
    this.gameMode = gameModeParam || 'speed';
    this.mapInfo = mapInfo;
    this.maxSpeed = stats.speed;
    this.accel = stats.accel;
    // stats.drift affects gauge multiplier
    this.turnSpeed = stats.handling;
    this.ghostConfig = ghostConfig;
    this.playerAuraId = playerAuraIdParam || 'none';
    this.playerKartId = playerKartIdParam || 'pink_thunder';
    this.aiKartId = aiKartIdParam || 'blue_lightning';

    if (this.gameMode === 'time_attack') {
      this.maxLaps = 1;
    } else if (this.gameMode === 'ten_laps') {
      this.maxLaps = 10;
    } else if (this.gameMode === 'obstacle_dash') {
      this.maxLaps = 1;
    } else if (this.gameMode === 'relay_race') {
      this.maxLaps = 4;
    } else {
      this.maxLaps = 3;
    }

    this.onLapChange = onLapChange;
    this.onSpeedChange = onSpeedChange;
    this.onBoosterGaugeChange = onBoosterGaugeChange;
    this.onBoosterCountChange = onBoosterCountChange;
    this.onItemPickup = onItemPickup;
    this.onGameFinished = onGameFinished;
    this.onAiCrashNotification = onAiCrashNotification;
    this.onPlayerCrashNotification = onPlayerCrashNotification;

    this.initTrack(mapInfo.points);
    this.init3D(mapInfo.skyColor);
    this.buildTrack();
    this.playerKart = this.createKart(playerKartColor, playerFlameColor, true, this.playerAuraId, this.playerKartId);
    this.aiKart = this.createKart(aiKartColor, 0xfacc15, false, undefined, this.aiKartId);

    // If ghost mode is active, make the AI kart translucent and colorized
    if (this.ghostConfig && this.ghostConfig.isGhost) {
      const gColor = this.ghostConfig.ghostColorHex;
      this.aiKart.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.42;
            if (child.material.color) {
              child.material.color.setHex(gColor);
            }
            if (child.material.emissive) {
              child.material.emissive.setHex(gColor);
              child.material.emissiveIntensity = 0.8;
            }
          }
        }
      });
      // Remove overhead indicator marker since it is a phantom ghost
      const marker = this.aiKart.mesh.getObjectByName("overhead_marker");
      if (marker) {
        this.aiKart.mesh.remove(marker);
      }
    }

    this.resetRace();
  }

  initTrack(pointsArray: [number, number, number][]) {
    const scaleFactor = 1.75;
    const scaledPoints = pointsArray.map(p => new THREE.Vector3(p[0] * scaleFactor, p[1] * scaleFactor, p[2] * scaleFactor));

    if (this.mapInfo && this.mapInfo.id === 'empty_arena') {
      // Keep it a closed circle
      this.trackSpline = new THREE.CatmullRomCurve3(scaledPoints, true);
    } else if (this.mapInfo && this.mapInfo.id === 'straight_dash') {
      // Straight dash is open
      this.trackSpline = new THREE.CatmullRomCurve3(scaledPoints, false);
    } else {
      // Milder rolling average filter to preserve sharp, thrilling high-speed curves
      const smoothed: THREE.Vector3[] = [];
      const len = scaledPoints.length;
      for (let i = 0; i < len; i++) {
        const prev = scaledPoints[(i - 1 + len) % len];
        const curr = scaledPoints[i];
        const next = scaledPoints[(i + 1) % len];
        
        if (i === 0 || i === len - 1) {
          smoothed.push(curr.clone());
        } else {
          // Milder: 85% current point, 7.5% previous, 7.5% next
          const avg = new THREE.Vector3()
            .addScaledVector(curr, 0.85)
            .addScaledVector(prev, 0.075)
            .addScaledVector(next, 0.075);
          smoothed.push(avg);
        }
      }
      this.trackSpline = new THREE.CatmullRomCurve3(smoothed, true);
    }
  }

  init3D(skyColor: number) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.0035);

    this.camera = new THREE.PerspectiveCamera(65, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = false;

    this.container.appendChild(this.renderer.domElement);

    // Instantiate optimized shared geometries once to prevent garbage collection stutters
    this.smokeGeometry = new THREE.DodecahedronGeometry(1.0, 1);
    this.boosterGeometry = new THREE.ConeGeometry(1.0, 1.0, 4);
    this.boosterGeometry.rotateX(-Math.PI / 2);

    // Light Setup - Brightened significantly as requested to illuminate the overall map
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.3);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(50, 200, 50);
    this.scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x22d3ee, 3.5, 500);
    cyanLight.position.set(0, 40, -50);
    this.scene.add(cyanLight);

    const pinkLight = new THREE.PointLight(0xf43f5e, 3.5, 500);
    pinkLight.position.set(120, 30, -100);
    this.scene.add(pinkLight);

    this.scene.add(this.decorativeGroup);
    this.scene.add(this.itemsGroup);
    this.scene.add(this.boosterPadsGroup);
    this.scene.add(this.jumpRampsGroup);
    this.scene.add(this.shortcutsGroup);
  }

  buildTrack() {
    this.decorativeGroup.clear();
    this.boosterPadsGroup.clear();
    this.jumpRampsGroup.clear();
    this.shortcutsGroup.clear();

    if (this.mapInfo && this.mapInfo.id === 'empty_arena') {
      // Render completely flat solid circular arena platform
      const radius = 150;
      const arenaGeo = new THREE.CylinderGeometry(radius, radius, 0.4, 64);
      const arenaMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Deep slate blue black
        roughness: 0.5,
        metalness: 0.3
      });
      this.roadMesh = new THREE.Mesh(arenaGeo, arenaMat);
      this.roadMesh.position.set(0, -0.2, 0);
      this.scene.add(this.roadMesh);

      // Glowing emerald outer boundary ring
      const borderRingGeo = new THREE.RingGeometry(radius - 2.5, radius, 64);
      const borderRingMat = new THREE.MeshBasicMaterial({
        color: 0x10b981, // Emerald green
        side: THREE.DoubleSide
      });
      const borderRing = new THREE.Mesh(borderRingGeo, borderRingMat);
      borderRing.rotateX(-Math.PI / 2);
      borderRing.position.y = 0.04;
      this.scene.add(borderRing);

      // Cyber grid patterns covering the entire arena ground
      const grid = new THREE.GridHelper(radius * 2, 48, 0x10b981, 0x1e293b);
      grid.position.y = 0.02;
      this.scene.add(grid);

      // Add 12 tall glowing futuristic colosseum columns around the perimeter
      const columnHeight = 45;
      const columnRadius = 2.4;
      const columnCount = 12;
      for (let i = 0; i < columnCount; i++) {
        const theta = (i / columnCount) * Math.PI * 2;
        const colX = Math.cos(theta) * (radius - 5.0);
        const colZ = Math.sin(theta) * (radius - 5.0);

        // Column Mesh
        const colGeo = new THREE.CylinderGeometry(columnRadius, columnRadius, columnHeight, 12);
        const colMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.4,
          metalness: 0.8
        });
        const column = new THREE.Mesh(colGeo, colMat);
        column.position.set(colX, columnHeight / 2, colZ);
        this.scene.add(column);

        // Add 2 rings of neon lights around each column
        for (let rIdx = 0; rIdx < 2; rIdx++) {
          const neonRingGeo = new THREE.CylinderGeometry(columnRadius + 0.15, columnRadius + 0.15, 0.4, 12);
          const neonColor = (i % 2 === 0) ? 0x10b981 : 0x22d3ee; // Alternate Emerald Green vs Cyan
          const neonMat = new THREE.MeshBasicMaterial({
            color: neonColor,
            side: THREE.DoubleSide
          });
          const neonRing = new THREE.Mesh(neonRingGeo, neonMat);
          neonRing.position.set(colX, (rIdx + 1) * 14.0, colZ);
          this.scene.add(neonRing);
        }
      }

      // Add a huge floating glowing neon ring in the sky as a major visual beacon
      const centerRingGeo = new THREE.RingGeometry(35, 41, 64);
      const centerRingMat = new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide
      });
      const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
      centerRing.rotateX(-Math.PI / 2);
      centerRing.position.set(0, 32, 0);
      this.scene.add(centerRing);

      return;
    }

    const trackGeometry = new THREE.TubeGeometry(this.trackSpline, 200, 22, 8, this.mapInfo ? this.mapInfo.id !== 'straight_dash' : true);
    const trackMaterial = new THREE.MeshBasicMaterial({
      color: 0x27272a, // asphalt gray for superb contrast
      side: THREE.DoubleSide
    });
    this.roadMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    this.roadMesh.scale.set(1, 0.01, 1);
    this.scene.add(this.roadMesh);

    // Bright glowing neon-cyan centerline for perfect course alignment and outstanding visibility
    const guideGeometry = new THREE.TubeGeometry(this.trackSpline, 300, 0.65, 8, this.mapInfo ? this.mapInfo.id !== 'straight_dash' : true);
    const guideMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee, // Glowing Neon Cyan
      side: THREE.DoubleSide
    });
    const guideMesh = new THREE.Mesh(guideGeometry, guideMaterial);
    guideMesh.scale.set(1, 0.01, 1);
    guideMesh.position.y = 0.06; // Raised slightly above the asphalt to avoid clipping z-fighting
    this.scene.add(guideMesh);

    const pointsCount = 140;
    const splinePoints = this.trackSpline.getSpacedPoints(pointsCount);

    for (let i = 0; i < pointsCount; i++) {
       const pt = splinePoints[i];
       const tangent = this.trackSpline.getTangentAt(i / pointsCount).normalize();
       const normal = new THREE.Vector3(0, 1, 0);
       const binormal = tangent.clone().cross(normal).normalize();

       // Warning center dashes
       if (i % 2 === 0) {
         const centerDashGeo = new THREE.BoxGeometry(0.3, 0.05, 2.5);
         const centerDashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
         const dash = new THREE.Mesh(centerDashGeo, centerDashMat);
         dash.position.set(pt.x, pt.y * 0.01 + 0.05, pt.z);
         dash.lookAt(new THREE.Vector3(pt.x, pt.y * 0.01, pt.z).add(tangent));
         this.scene.add(dash);
       }

       // Border dots placed exactly near the 21.8 units edge (slightly inside the 22.0 wide tube)
       const leftPos = pt.clone().add(binormal.clone().multiplyScalar(-21.6));
       const leftRing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 5), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
       leftRing.position.set(leftPos.x, leftPos.y * 0.01 + 0.1, leftPos.z);
       this.scene.add(leftRing);

       const rightPos = pt.clone().add(binormal.clone().multiplyScalar(21.6));
       const rightRing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 5), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
       rightRing.position.set(rightPos.x, rightPos.y * 0.01 + 0.1, rightPos.z);
       this.scene.add(rightRing);

       // Trees shifted further outward to 30.0 units offset and styled seasonally
       if (i % 6 === 0) {
         const treePos = pt.clone().add(binormal.clone().multiplyScalar(30));
         const h = 7 + Math.random() * 8;

         let treeColor = 0x22d3ee;
         let treeEmissive = 0x06b6d4;

         if (this.mapInfo) {
           if (this.mapInfo.id === 'spring_cherry_road') {
             // Spring: beautiful pink and light cherry blossom colors
             treeColor = Math.random() > 0.5 ? 0xfba5c9 : 0xfff0f6;
             treeEmissive = 0xf472b6;
           } else if (this.mapInfo.id === 'summer_coconut_coast') {
             // Summer: emerald greens & coconut sands
             treeColor = Math.random() > 0.5 ? 0x10b981 : 0x0ea5e9;
             treeEmissive = 0x059669;
           } else if (this.mapInfo.id === 'autumn_maple_valley') {
             // Autumn: gorgeous copper gold, warm oranges, and deep crimson maple
             treeColor = Math.random() > 0.5 ? 0xeab308 : 0xe11d48;
             treeEmissive = 0xea580c;
           } else if (this.mapInfo.id === 'winter_snowhead_glacier' || this.mapInfo.id === 'frozen_glacier') {
             // Winter: deep crystal ice white and cyber blues
             treeColor = Math.random() > 0.5 ? 0xffffff : 0x93c5fd;
             treeEmissive = 0x38bdf8;
           } else {
             // Default neon cyan / pink trees
             treeColor = Math.random() > 0.5 ? 0x22d3ee : 0xec4899;
             treeEmissive = Math.random() > 0.5 ? 0x06b6d4 : 0xdb2777;
           }
         }

         const tree = new THREE.Mesh(
           new THREE.ConeGeometry(3.5, h, 4),
           new THREE.MeshStandardMaterial({
             color: treeColor,
             roughness: 0.1,
             metalness: 0.5,
             emissive: treeEmissive,
             emissiveIntensity: 0.45
           })
         );
         tree.position.set(treePos.x, treePos.y * 0.01, treePos.z);
         tree.position.y += h / 2;
         this.decorativeGroup.add(tree);
        }

        // Decorate long courses uniquely: Floating glowing octahedron crystals & beacon bases!
        const isLongCourse = ['spring_cherry_road', 'summer_coconut_coast', 'autumn_maple_valley', 'winter_snowhead_glacier'].includes(this.mapInfo?.id || '');
        if (isLongCourse && i % 8 === 0 && this.mapInfo) {
          const sideFactor = (i % 16 === 0) ? -1 : 1;
          const decoPos = pt.clone().add(binormal.clone().multiplyScalar(sideFactor * 26));

          let gemColor = 0xff0055;
          let gemEmissive = 0xff0055;

          if (this.mapInfo.id === 'spring_cherry_road') {
            gemColor = 0xfbcfe8; // Cherry blush pink
            gemEmissive = 0xdb2777;
          } else if (this.mapInfo.id === 'summer_coconut_coast') {
            gemColor = 0x34d399; // Sea emerald green
            gemEmissive = 0x059669;
          } else if (this.mapInfo.id === 'autumn_maple_valley') {
            gemColor = 0xfb923c; // Warm maple orange
            gemEmissive = 0xea580c;
          } else if (this.mapInfo.id === 'winter_snowhead_glacier') {
            gemColor = 0x38bdf8; // Ice glacier blue
            gemEmissive = 0x0284c7;
          }

          // Rotating Double-cone crystal
          const gemGeo = new THREE.OctahedronGeometry(2.5, 0);
          const gemMat = new THREE.MeshStandardMaterial({
            color: gemColor,
            roughness: 0.1,
            metalness: 0.9,
            emissive: gemEmissive,
            emissiveIntensity: 0.9
          });
          const gemMesh = new THREE.Mesh(gemGeo, gemMat);
          gemMesh.position.set(decoPos.x, decoPos.y * 0.01 + 4.5 + Math.sin(i) * 1.5, decoPos.z);
          this.decorativeGroup.add(gemMesh);

          // Glowing light beam base
          const beaconGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 8);
          const beaconMat = new THREE.MeshBasicMaterial({ color: gemEmissive, transparent: true, opacity: 0.65 });
          const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
          beaconMesh.position.set(decoPos.x, decoPos.y * 0.01 + 0.1, decoPos.z);
          this.decorativeGroup.add(beaconMesh);
       }
    }

    // Finish Gate scaled to match 22 units lane radius and height aligned
    const gateGroup = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 16, 6), new THREE.MeshBasicMaterial({ color: 0x334155 }));
    p1.position.set(-23, 8, 0);
    const p2 = p1.clone();
    p2.position.set(23, 8, 0);

    const cross = new THREE.Mesh(new THREE.BoxGeometry(48, 2, 3), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    cross.position.set(0, 16, 0);

    const banner = new THREE.Mesh(new THREE.BoxGeometry(20, 2.0, 3.2), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    banner.position.set(0, 16, 0);

    gateGroup.add(p1, p2, cross, banner);
    const tg = this.trackSpline.getTangentAt(0).normalize();
    gateGroup.lookAt(tg);
    const startPt = this.trackSpline.getPointAt(0);
    gateGroup.position.set(startPt.x, startPt.y * 0.01, startPt.z);
    this.scene.add(gateGroup);

    // Spawn Custom Seasonal map elements (Booster Pads and Jump Ramps removed per user request: "부스트 패달이나 점핑트랩을 없애줘.")
    if (this.mapInfo) {
      if (this.mapInfo.shortcuts) {
        this.mapInfo.shortcuts.forEach(sc => {
          const scPos = new THREE.Vector3(sc[0] * 1.75, sc[1] * 1.75 * 0.01, sc[2] * 1.75);
          const ringGeo = new THREE.TorusGeometry(8.5, 0.65, 8, 24);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xf97316, // Orange neon entry ring
            transparent: true,
            opacity: 0.95
          });
          const arch = new THREE.Mesh(ringGeo, ringMat);
          arch.position.copy(scPos).add(new THREE.Vector3(0, 4.0, 0));

          const t = this.getNearestTrackSplinePoint(scPos);
          const tangent = this.trackSpline.getTangentAt(t).normalize();
          arch.lookAt(arch.position.clone().add(tangent));

          this.shortcutsGroup.add(arch);
        });
      }
    }
  }

  createKart(colorHex: number, nozzleColorHex: number, isPlayer: boolean = false, auraId?: string, kartId?: string) {
    const kartGroup = new THREE.Group();

    // Chassis body - High gloss, polished metallic look
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.96,
      roughness: 0.08
    });
    
    // Sleek chamfer-like bevels on the core chassis using layered geometry
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 4.2), bodyMat);
    body.position.y = 0.48;
    kartGroup.add(body);

    // Beveled hood-scoop accent on top of body
    const scoopMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.92, roughness: 0.12 });
    const hoodScoop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 1.6), scoopMat);
    hoodScoop.position.set(0, 0.85, 0.5);
    kartGroup.add(hoodScoop);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 1.4), bodyMat);
    nose.position.set(0, 0.36, 2.3);
    kartGroup.add(nose);

    // Front spoiler/splitter - sharp, high-performance racing lip
    const splitterMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.95, roughness: 0.05 });
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.65), splitterMat);
    splitter.position.set(0, 0.20, 2.9);
    kartGroup.add(splitter);

    // Dynamic racing stripe lines along the chassis flanks (Adds sleek metallic detail)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.98, roughness: 0.04 });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 3.6), stripeMat);
    stripeL.position.set(-1.31, 0.48, 0.1);
    const stripeR = stripeL.clone();
    stripeR.position.x = 1.31;
    kartGroup.add(stripeL, stripeR);

    // Thinner, sharper rear wing spoiler foil
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.15 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 1.0), wingMat);
    wing.position.set(0, 1.7, -2.2);

    const supLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.2), wingMat);
    supLeft.position.set(-1.1, 1.0, -2.1);
    const supRight = supLeft.clone();
    supRight.position.x = 1.1;
    
    // Sharp metal endplates on wingtips for an aerodynamic silhouette
    const endMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.96, roughness: 0.06 });
    const endL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 1.0), endMat);
    endL.position.set(-1.61, 1.7, -2.2);
    const endR = endL.clone();
    endR.position.x = 1.61;
    
    kartGroup.add(wing, supLeft, supRight, endL, endR);

    // Custom parts based on Kart ID to give them highly stylish, distinctive properties
    if (kartId === 'pink_thunder') {
      // Primary common kart: Dual mini booster outer exhaust cylinders & high-glowing baby-blue rear spoiler plate
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0xff007f, metalness: 0.8, roughness: 0.2 });
      const tubeL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 8), tubeMat);
      tubeL.rotateX(Math.PI / 2);
      tubeL.position.set(-0.6, 0.55, -2.1);
      const tubeR = tubeL.clone();
      tubeR.position.x = 0.6;
      kartGroup.add(tubeL, tubeR);

      // Sweet circular light-cyan wing emblem
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 10), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      badge.rotateX(Math.PI / 2);
      badge.position.set(0, 2.0, -2.2);
      kartGroup.add(badge);
    } 
    else if (kartId === 'blue_lightning') {
      // Sky Brightening sci-fi: Dual power capacitor side canisters & central dynamic scanner array
      const cyanGlowMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      const thrusterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
      
      const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.3, 12), thrusterMat);
      capL.rotateX(Math.PI / 2);
      capL.position.set(-1.35, 0.58, -0.6);
      
      const glowRingL = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 12), cyanGlowMat);
      glowRingL.position.set(0, 0, 0.55);
      capL.add(glowRingL);

      const capR = capL.clone();
      capR.position.x = 1.35;
      kartGroup.add(capL, capR);

      // Dynamic central radar scanner pylon
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 6), thrusterMat);
      ant.position.set(0, 1.4, 0.35);
      const antGlow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), cyanGlowMat);
      antGlow.position.y = 0.65;
      ant.add(antGlow);
      kartGroup.add(ant);
    } 
    else if (kartId === 'golden_hero') {
      // Brave Caliber: Knightly front-angled bumper shields, pegasus winglets, & golden sword-fin deck
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.95, roughness: 0.05 });
      const shieldL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.25), goldMat);
      shieldL.rotation.y = Math.PI / 4;
      shieldL.position.set(-0.6, 0.5, 2.6);
      
      const shieldR = shieldL.clone();
      shieldR.rotation.y = -Math.PI / 4;
      shieldR.position.x = 0.6;
      kartGroup.add(shieldL, shieldR);

      // Knight sword crest fin on the nose
      const crestFin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.85), goldMat);
      crestFin.position.set(0, 0.8, 2.1);
      kartGroup.add(crestFin);

      // High-swept pegasus wing-spikes on spoiler tips
      const wingLetL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.25, 0.8), goldMat);
      wingLetL.rotation.z = Math.PI / 6;
      wingLetL.position.set(-1.8, 1.85, -2.2);
      const wingLetR = wingLetL.clone();
      wingLetR.rotation.z = -Math.PI / 6;
      wingLetR.position.x = 1.8;
      kartGroup.add(wingLetL, wingLetR);

      // Brave luminous crown gem center headlight
      const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      headlight.position.set(0, 0.45, 2.85);
      kartGroup.add(headlight);
    } 
    else if (kartId === 'shadow_knight') {
      // Shadow crawler: Wide ground drag skirts, angular side stabilizer boards, & violet dual exhausts
      const stealthMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.5 });
      const dragSkirtL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 3.2), stealthMat);
      dragSkirtL.position.set(-1.3, 0.35, 0);
      const dragSkirtR = dragSkirtL.clone();
      dragSkirtR.position.x = 1.3;
      kartGroup.add(dragSkirtL, dragSkirtR);

      // High angular stabilizer panels
      const stabL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 1.1), stealthMat);
      stabL.rotation.z = Math.PI / 8;
      stabL.position.set(-1.5, 0.8, -1.3);
      const stabR = stabL.clone();
      stabR.rotation.z = -Math.PI / 8;
      stabR.position.x = 1.5;
      kartGroup.add(stabL, stabR);

      // Deep purple exhaust rods with hot-glow cores
      const purpleGlow = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
      const exhaustPipeL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.7, 8), stealthMat);
      exhaustPipeL.position.set(-0.35, 0.6, -2.1);
      exhaustPipeL.rotateX(Math.PI / 3);
      const glowTipL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 8), purpleGlow);
      glowTipL.position.y = 0.36;
      exhaustPipeL.add(glowTipL);

      const exhaustPipeR = exhaustPipeL.clone();
      exhaustPipeR.position.x = 0.35;
      kartGroup.add(exhaustPipeL, exhaustPipeR);
    } 
    else if (kartId === 'neon_dragon') {
      // Dragon dynamic Ferrari: High-profile neon green intake vents, scaled ridge cones, & glowing terminal tips
      const purpleMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.9, roughness: 0.12 });
      const greenGlow = new THREE.MeshBasicMaterial({ color: 0x22c55e });

      // Left & right aggressive air intake pods
      const scoopL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.3), purpleMat);
      scoopL.position.set(-1.3, 0.6, 0.2);
      scoopL.rotation.y = 0.1;
      const glowStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 1.1), greenGlow);
      glowStripeL.position.set(-0.21, 0, 0);
      scoopL.add(glowStripeL);

      const scoopR = scoopL.clone();
      scoopR.position.x = 1.3;
      scoopR.rotation.y = -0.1;
      scoopR.children[0].position.x = 0.21;
      kartGroup.add(scoopL, scoopR);

      // Dragon spine scale fin on top of body (2 scaled cones)
      const spineCone1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), purpleMat);
      spineCone1.position.set(0, 1.1, 0.3);
      spineCone1.rotation.y = Math.PI / 4;
      const spineCone2 = spineCone1.clone();
      spineCone2.position.set(0, 1.1, -0.6);
      kartGroup.add(spineCone1, spineCone2);

      // Huge spoiler green tips edge borders
      const spoilerEndL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.1), greenGlow);
      spoilerEndL.position.set(-1.6, 1.85, -2.2);
      const spoilerEndR = spoilerEndL.clone();
      spoilerEndR.position.x = 1.6;
      kartGroup.add(spoilerEndL, spoilerEndR);
    } 
    else if (kartId === 'crimson_vortex') {
      // Titan heavy vortex jet: Large round engine pods, wide wings, and triple booster nozzle assembly
      const fuchsiaMat = new THREE.MeshStandardMaterial({ color: 0xd946ef, metalness: 0.9, roughness: 0.1 });
      const redGlow = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const titanSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

      // Left & right colossal turbines on sides of seat
      const turbineL = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.6, 12), titanSteel);
      turbineL.rotateX(Math.PI / 2);
      turbineL.position.set(-1.3, 0.8, -0.7);
      
      const fireRingL = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 8, 12), redGlow);
      fireRingL.position.set(0, 0, 0.8);
      turbineL.add(fireRingL);

      const turbineR = turbineL.clone();
      turbineR.position.x = 1.3;
      kartGroup.add(turbineL, turbineR);

      // Splinter aerodynamic teeth on sides
      const edgeSplitterL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 1.25), fuchsiaMat);
      edgeSplitterL.position.set(-1.4, 0.38, 1.8);
      edgeSplitterL.rotation.y = 0.2;
      const edgeSplitterR = edgeSplitterL.clone();
      edgeSplitterR.position.x = 1.4;
      edgeSplitterR.rotation.y = -0.2;
      kartGroup.add(edgeSplitterL, edgeSplitterR);

      // Dual extreme sub-nozzles flanking main engine core
      const ex1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.6, 8), titanSteel);
      ex1.rotateX(Math.PI / 2);
      ex1.position.set(-0.45, 0.55, -2.2);
      const exGlow1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8), redGlow);
      exGlow1.position.y = 0.32;
      ex1.add(exGlow1);

      const ex2 = ex1.clone();
      ex2.position.x = 0.45;
      kartGroup.add(ex1, ex2);
    } 
    else if (kartId === 'obsidian_shadow') {
      // Obsidian legendary: Poly crystal armor plating, golden forward energy rod pylons, & reactor energy core
      const obsidianMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.1 });
      const goldGlowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      // Diamond-cut crystalline center nose canopy
      const crystalDeck = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), obsidianMat);
      crystalDeck.scale.set(1.4, 0.5, 1.8);
      crystalDeck.position.set(0, 0.8, 1.1);
      kartGroup.add(crystalDeck);

      // Gold energy conductor rods on front boundaries
      const rodsL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 8), obsidianMat);
      rodsL.rotateX(Math.PI / 2);
      rodsL.position.set(-1.25, 0.48, 1.1);
      const brightTipL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), goldGlowMat);
      brightTipL.position.y = 0.95;
      rodsL.add(brightTipL);

      const rodsR = rodsL.clone();
      rodsR.position.x = 1.25;
      kartGroup.add(rodsL, rodsR);

      // Back Ring nuclear fusion reactor gate
      const centerCoreGate = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 16), goldGlowMat);
      centerCoreGate.position.set(0, 1.0, -1.9);
      kartGroup.add(centerCoreGate);
    } 
    else if (kartId === 'emperor_absolute') {
      // Emperor legendary space cruiser: Blade forks, cyan quantum reactor core, and double-decker hyper-spoiler
      const emperorGold = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.95, roughness: 0.05 });
      const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      const slateBody = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });

      // Star-blades on bumper
      const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 1.6), emperorGold);
      forkL.rotation.y = 0.3;
      forkL.position.set(-1.3, 0.35, 2.5);
      const forkR = forkL.clone();
      forkR.rotation.y = -0.3;
      forkR.position.x = 1.3;
      kartGroup.add(forkL, forkR);

      // Quantum reactor core back globe
      const coreSphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 12), cyanGlow);
      coreSphere.position.set(0, 0.95, -1.3);
      
      const coreSatRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.06, 6, 16), emperorGold);
      coreSatRing.rotation.x = Math.PI / 4;
      coreSphere.add(coreSatRing);
      kartGroup.add(coreSphere);

      // Sovereign Double-Deck Spoiler setup
      const starWingUpper = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 1.15), emperorGold);
      starWingUpper.position.set(0, 2.4, -2.3);
      const starSupL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), slateBody);
      starSupL.position.set(-1.2, 2.05, -2.25);
      const starSupR = starSupL.clone();
      starSupR.position.x = 1.2;
      kartGroup.add(starWingUpper, starSupL, starSupR);
    }
    else if (kartId === 'outrage_supreme_dev') {
      // Creator-level Outrage Supreme Developer Ride: Red hot metal accents, hyper matrix cyber-spoilers, and mint-green plasma cores
      const rubyMat = new THREE.MeshStandardMaterial({ color: 0xff0055, metalness: 0.98, roughness: 0.05 });
      const mintGlow = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
      const darkPlate = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.92, roughness: 0.08 });

      // Ultra-sharp front splitter wings
      const sharpWingL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 1.4), rubyMat);
      sharpWingL.rotation.set(0.1, 0.4, 0.05);
      sharpWingL.position.set(-1.4, 0.3, 2.7);
      const sharpWingR = sharpWingL.clone();
      sharpWingR.rotation.y = -0.4;
      sharpWingR.position.x = 1.4;
      kartGroup.add(sharpWingL, sharpWingR);

      // Dual thrust nozzles back glowing in Mint Green
      const nozzleL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.9, 12), darkPlate);
      nozzleL.rotation.x = Math.PI / 2;
      nozzleL.position.set(-0.55, 0.6, -2.15);
      const nozzleGlowL = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 8), mintGlow);
      nozzleGlowL.rotation.x = Math.PI / 2;
      nozzleGlowL.position.set(-0.55, 0.6, -2.62);

      const nozzleR = nozzleL.clone();
      nozzleR.position.x = 0.55;
      const nozzleGlowR = nozzleGlowL.clone();
      nozzleGlowR.position.x = 0.55;

      kartGroup.add(nozzleL, nozzleGlowL, nozzleR, nozzleGlowR);

      // Huge holographic Matrix Wing
      const holographicWing = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.18, 1.25), rubyMat);
      holographicWing.position.set(0, 2.6, -2.4);
      const holographicSill = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.06, 1.0), mintGlow);
      holographicSill.position.set(0, 2.69, -2.4);
      
      const wingStalkL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.0, 0.35), darkPlate);
      wingStalkL.rotation.x = -0.2;
      wingStalkL.position.set(-1.3, 2.1, -2.35);
      const wingStalkR = wingStalkL.clone();
      wingStalkR.position.x = 1.3;

      kartGroup.add(holographicWing, holographicSill, wingStalkL, wingStalkR);
    }

    // Wheels - Polished tires with chrome metallic alloy rims
    const wheelGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.6, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    wheelGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.62, 8);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.08 });

    const wheels: THREE.Mesh[] = [];
    const wheelPositions = [
      [-1.4, 0.5, 1.4],
      [1.4, 0.5, 1.4],
      [-1.4, 0.5, -1.4],
      [1.4, 0.5, -1.4]
    ];
    wheelPositions.forEach(pos => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(pos[0], pos[1], pos[2]);
      
      // Dynamic alloy rim insert
      const rim = new THREE.Mesh(rimGeo, rimMat);
      w.add(rim);
      
      kartGroup.add(w);
      wheels.push(w);
    });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.3), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    seat.position.set(0, 1.0, -0.4);
    kartGroup.add(seat);

    const nozzleGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.8, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, new THREE.MeshBasicMaterial({ color: nozzleColorHex }));
    nozzle.position.set(0, 0.55, -2.2);
    kartGroup.add(nozzle);

    // Dynamic distinct overhead 3D indicator pointing to the kart
    const markerGeo = new THREE.ConeGeometry(isPlayer ? 0.65 : 0.45, isPlayer ? 1.5 : 1.1, 4);
    markerGeo.rotateX(Math.PI); // point downwards
    const markerMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? 0x22d3ee : 0xf43f5e, // Cyan for player, Red for AI
      transparent: true,
      opacity: 0.95
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 5.2, 0); 
    marker.name = "overhead_marker";
    kartGroup.add(marker);

    // Create under-kart decorative aura mesh if player has it equipped
    if (isPlayer && auraId && auraId !== 'none') {
      const auraGroup = new THREE.Group();
      auraGroup.name = "aura_group";
      auraGroup.position.set(0, 0.22, 0); // Raised above track surface (to avoid road mesh clipping and guide line interference)

      let primaryColor = 0x00ffff;
      let secondaryColor = 0xff00ff;
      let segments = 32;
      let geomType = 4; // square by default

      if (auraId === 'neon_cyan') {
        primaryColor = 0x06b6d4;
        secondaryColor = 0x22d3ee;
        geomType = 6; // Hexagon
      } else if (auraId === 'magma_ember') {
        primaryColor = 0xef4444;
        secondaryColor = 0xf97316;
        geomType = 3; // Triangle
      } else if (auraId === 'cosmic_nebula') {
        primaryColor = 0xa855f7;
        secondaryColor = 0xec4899;
        geomType = 4; // Square
      } else if (auraId === 'golden_champion') {
        primaryColor = 0xeab308;
        secondaryColor = 0xfef08a;
        segments = 8; // Octagon
        geomType = 3; // Triangle
      }

      // Outer Ring - Made significantly larger to extend far beyond the kart body (approx 3.6 - 3.9 units radius)
      const ringGeo1 = new THREE.RingGeometry(3.6, 3.9, segments);
      const ringMat1 = new THREE.MeshBasicMaterial({
        color: primaryColor,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      ring1.rotation.x = Math.PI / 2;
      ring1.name = "ring1";
      auraGroup.add(ring1);

      // Inner Ring - Expanded for proportional balance (approx 2.5 - 2.8 units radius)
      const ringGeo2 = new THREE.RingGeometry(2.5, 2.75, segments);
      const ringMat2 = new THREE.MeshBasicMaterial({
        color: secondaryColor,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
      ring2.rotation.x = Math.PI / 2;
      ring2.name = "ring2";
      auraGroup.add(ring2);

      // Mystical Geometric Star/Rune Inner Polygon - Expanded (approx 2.85 - 3.55 units radius)
      const starGeo = new THREE.RingGeometry(2.8, 3.5, geomType);
      const starMat = new THREE.MeshBasicMaterial({
        color: primaryColor,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const star = new THREE.Mesh(starGeo, starMat);
      star.rotation.x = Math.PI / 2;
      star.name = "star1";
      auraGroup.add(star);

      // If golden champion, add a second interlaced triangle to create a hexagram/shining star emblem
      if (auraId === 'golden_champion') {
        const star2 = new THREE.Mesh(starGeo, starMat);
        star2.rotation.x = Math.PI / 2;
        star2.rotation.z = Math.PI / 3; // Rotated offset
        star2.name = "star2";
        auraGroup.add(star2);
      }

      auraGroup.renderOrder = 5;
      kartGroup.add(auraGroup);
    }

    this.scene.add(kartGroup);
    return { mesh: kartGroup, wheels, nozzle };
  }

  spawnItemBoxes() {
    this.itemBoxes.forEach(box => this.scene.remove(box.mesh));
    this.itemBoxes = [];

    if (this.gameMode !== 'item') return;

    const totalBoxes = 6;
    for (let i = 0; i < totalBoxes; i++) {
      const t = (i + 0.5) / totalBoxes;
      const point = this.trackSpline.getPointAt(t);
      const tangent = this.trackSpline.getTangentAt(t).normalize();
      const lateralDir = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

      // Spawn two boxes side-by-side at each milestone, spaced wider for 22 units track
      const divisions = [-6.5, 6.5];
      divisions.forEach(offset => {
        const boxMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          transparent: true,
          opacity: 0.9,
          metalness: 0.9,
          roughness: 0.1,
          emissive: 0xfacc15,
          emissiveIntensity: 0.6
        });

        const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), boxMat);
        const spawnPos = point.clone().addScaledVector(lateralDir, offset);
        boxMesh.position.set(spawnPos.x, spawnPos.y * 0.01 + 2.0, spawnPos.z);

        this.scene.add(boxMesh);
        this.itemBoxes.push({
          mesh: boxMesh,
          basePos: boxMesh.position.clone(),
          active: true,
          respawnTimer: 0
        });
      });
    }
  }

  spawnCoins() {
    this.coins.forEach(coin => this.scene.remove(coin.mesh));
    this.coins = [];

    if (this.gameMode !== 'coin_rush') return;

    const totalSectors = 18;
    for (let i = 0; i < totalSectors; i++) {
      const t = (i + 0.3) / totalSectors;
      const point = this.trackSpline.getPointAt(t);
      const tangent = this.trackSpline.getTangentAt(t).normalize();
      const lateralDir = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

      const positions = [-7.0, 7.0];
      positions.forEach(offset => {
        const coinMat = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          transparent: true,
          opacity: 0.95,
          metalness: 0.9,
          roughness: 0.05,
          emissive: 0xffa500,
          emissiveIntensity: 0.55
        });

        const coinMesh = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 8, 16), coinMat);
        const spawnPos = point.clone().addScaledVector(lateralDir, offset);
        coinMesh.position.set(spawnPos.x, spawnPos.y * 0.01 + 1.4, spawnPos.z);

        this.scene.add(coinMesh);
        this.coins.push({
          mesh: coinMesh,
          basePos: coinMesh.position.clone(),
          active: true,
          respawnTimer: 0
        });
      });
    }
  }

  createSmokeParticle(position: THREE.Vector3, colorHex = 0xffffff, size = 0.6) {
    // Avoid spawning too many particles to maintain 60 FPS
    if (this.particleGroup.length > 80) {
      const oldest = this.particleGroup.shift();
      if (oldest) {
        this.scene.remove(oldest);
        if (oldest.material) {
          (oldest.material as THREE.Material).dispose();
        }
      }
    }

    const pMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95
    });
    const p = new THREE.Mesh(this.smokeGeometry, pMat);
    p.position.copy(position);
    p.scale.setScalar(size);

    p.userData = {
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() * 0.12) + 0.08,
        (Math.random() - 0.5) * 0.15
      ),
      initialSize: size,
      life: 1.0,
      decay: 0.04
    };

    this.scene.add(p);
    this.particleGroup.push(p);
  }

  createBoosterFlame(position: THREE.Vector3, speedHeading: THREE.Vector3, isPlayer = true) {
    if (!position || !speedHeading || isNaN(position.x) || isNaN(speedHeading.x)) return;

    if (this.particleGroup.length > 80) {
      const oldest = this.particleGroup.shift();
      if (oldest) {
        this.scene.remove(oldest);
        if (oldest.material) {
          (oldest.material as THREE.Material).dispose();
        }
      }
    }

    const pMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? (Math.random() > 0.4 ? 0xff007f : 0x22d3ee) : (Math.random() > 0.4 ? 0xf43f5e : 0xfacc15),
      transparent: true,
      opacity: 0.95
    });
    
    const p = new THREE.Mesh(this.boosterGeometry, pMat);
    p.position.copy(position);
    p.scale.set(0.35, 1.5, 0.35);
    
    // Guard against looking at identical position to prevent lookAt NaN/Matrix issues
    const targetLookAt = p.position.clone().add(speedHeading);
    if (p.position.distanceToSquared(targetLookAt) > 0.0001) {
      p.lookAt(targetLookAt);
    }

    p.userData = {
      vel: speedHeading.clone().multiplyScalar(-1.5).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15,
        (Math.random() - 0.5) * 0.15
      )),
      initialScale: new THREE.Vector3(0.35, 1.5, 0.35),
      life: 1.0,
      decay: 0.1
    };
    
    this.scene.add(p);
    this.particleGroup.push(p);
  }

  createSpeedLineParticle(position: THREE.Vector3, speedHeading: THREE.Vector3, colorHex = 0xffffff) {
    if (this.particleGroup.length > 120) {
      const oldest = this.particleGroup.shift();
      if (oldest) {
        this.scene.remove(oldest);
        if (oldest.material) {
          (oldest.material as THREE.Material).dispose();
        }
      }
    }

    const pMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.8
    });
    
    const p = new THREE.Mesh(this.boosterGeometry, pMat);
    p.position.copy(position);
    p.scale.set(0.04, 3.5, 0.04);
    
    const targetLookAt = p.position.clone().add(speedHeading);
    if (p.position.distanceToSquared(targetLookAt) > 0.0001) {
      p.lookAt(targetLookAt);
    }
    
    p.userData = {
      vel: speedHeading.clone().multiplyScalar(1.2),
      initialScale: new THREE.Vector3(0.04, 3.5, 0.04),
      life: 1.0,
      decay: 0.12
    };
    
    this.scene.add(p);
    this.particleGroup.push(p);
  }

  updateParticles() {
    for (let i = this.particleGroup.length - 1; i >= 0; i--) {
      const p = this.particleGroup[i];
      p.position.add(p.userData.vel);
      p.userData.life -= p.userData.decay;

      if (p.userData.initialScale) {
        p.scale.copy(p.userData.initialScale).multiplyScalar(p.userData.life);
      } else {
        p.scale.setScalar(p.userData.life * (p.userData.initialSize || 1.0));
      }
      
      if (p.material) {
        (p.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.userData.life);
      }

      if (isNaN(p.userData.life) || p.userData.life <= 0) {
        this.scene.remove(p);
        if (p.material) {
          (p.material as THREE.Material).dispose();
        }
        this.particleGroup.splice(i, 1);
      }
    }
  }

  resetRace() {
    this.active = false;
    this.timer = 0;
    this.lap = 1;
    this.speed = 0;
    this.angle = 0;
    this.boosterGauge = 0;
    this.boosterStock = 0;
    this.boosterActive = false;
    this.lapCheckpoints = [false, false];
    this.aiLap = 1;
    this.aiLapCheckpoints = [false, false];
    this.aiProgress = 0;
    this.aiFinishedTimeRemaining = null;
    this.aiFinishedTime = null;

    // Clear Splatoon paints
    this.paints.forEach(paint => {
      try {
        this.scene.remove(paint.mesh);
        paint.mesh.geometry.dispose();
        if (Array.isArray(paint.mesh.material)) paint.mesh.material.forEach(m => m.dispose());
        else paint.mesh.material.dispose();
      } catch (e) {}
    });
    this.paints = [];
    this.paintTimer = 0;

    // Clear and reset Flag Hunt
    this.playerFlagScore = 0;
    this.aiFlagScore = 0;
    if (this.flagMesh) {
      try { this.scene.remove(this.flagMesh); } catch (e) {}
      this.flagMesh = null;
    }
    this.currentFlagPos = null;

    this.obstacles.forEach(obs => this.scene.remove(obs.mesh));
    this.obstacles = [];

    if (this.gameMode === 'flag_hunt') {
      this.spawnFlagRandomly();
    }
    if (this.gameMode === 'obstacle_dash') {
      this.spawnStraightLineObstacles();
    }

    // Reset jump/vertical parameters
    this.verticalVelocity = 0;
    this.verticalOffset = 0;
    this.aiVerticalVelocity = 0;
    this.aiVerticalOffset = 0;

    const startPoint = this.trackSpline.getPointAt(0);
    const startDir = this.trackSpline.getTangentAt(0).normalize();

    this.playerKart.mesh.position.copy(startPoint);
    const sideOffset = startDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-3);
    this.playerKart.mesh.position.add(sideOffset);
    this.playerKart.mesh.position.y = startPoint.y * 0.01;

    this.angle = Math.atan2(startDir.x, startDir.z);
    this.playerKart.mesh.rotation.y = this.angle;

    this.aiKart.mesh.position.copy(startPoint);
    const aiSideOffset = startDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(3);
    this.aiKart.mesh.position.add(aiSideOffset);
    this.aiKart.mesh.position.y = startPoint.y * 0.01;
    this.aiKart.mesh.rotation.y = this.angle;

    this.spawnItemBoxes();
    this.spawnCoins();
  }

  activateEngine() {
    this.active = true;
    this.spawnItemBoxes();
    this.spawnCoins();
    if (this.gameMode === 'obstacle_dash') {
      this.spawnStraightLineObstacles();
    }
  }

  useBooster() {
    this.boosterActive = true;
    this.boosterTimer = 180;
    this.boostersUsed++;
    AudioEngine.playBoost();
  }

  activateBooster() {
    this.useBooster();
  }

  shootMissile() {
    let targetMesh: THREE.Object3D | null = null;
    let targetPeerId: string | null = null;
    let minDist = Infinity;
    const playerPos = this.playerKart.mesh.position;

    // 1. Check AI kart
    if (this.aiKart && this.aiKart.mesh) {
      const dist = playerPos.distanceTo(this.aiKart.mesh.position);
      if (dist < minDist) {
        minDist = dist;
        targetMesh = this.aiKart.mesh;
      }
    }

    // 2. Check multiplayer opponent karts
    if (this.multiplayerKarts && this.multiplayerKarts.size > 0) {
      this.multiplayerKarts.forEach((otherKart, peerId) => {
        if (otherKart.mesh) {
          const dist = playerPos.distanceTo(otherKart.mesh.position);
          if (dist < minDist) {
            minDist = dist;
            targetMesh = otherKart.mesh;
            targetPeerId = peerId;
          }
        }
      });
    }

    if (!targetMesh && this.aiKart && this.aiKart.mesh) {
      targetMesh = this.aiKart.mesh;
    }

    if (!targetMesh) return;

    const missile = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    missile.geometry.rotateX(Math.PI / 2);
    missile.position.copy(this.playerKart.mesh.position);
    this.scene.add(missile);

    let progress = 0;
    const launchInterval = setInterval(() => {
      if (!this.active || !this.playerKart || !this.playerKart.mesh || !targetMesh) {
        clearInterval(launchInterval);
        try { this.scene.remove(missile); } catch (e) {}
        return;
      }

      progress += 0.06;
      missile.position.lerp(targetMesh.position, progress);
      this.createSmokeParticle(missile.position, 0xf43f5e, 0.4);

      if (progress >= 1.0) {
        clearInterval(launchInterval);
        this.scene.remove(missile);

        if (targetMesh === this.aiKart?.mesh) {
          this.triggerAICrash();
        } else if (targetPeerId) {
          this.onShootMissile?.(targetPeerId);
          this.onComicPopup?.('HIT SENT!', '#ec4899');
        }
      }
    }, 50);
  }

  triggerAICrash() {
    if (this.aiShieldActive) {
      this.aiShieldActive = false;
      this.onComicPopup?.('AI BLOCK!', '#3b82f6');
      this.onHUDNotification?.('AI 실드 방어!', 'AI가 일렉트로 실드로 발사된 미사일을 방어했습니다.');
      return;
    }
    AudioEngine.playCrash();
    this.aiKart.mesh.userData.spinTimer = 60;
    this.onAiCrashNotification();
  }

  triggerAIItemAcquisition() {
    if (this.aiHasItem) return;
    const itemList = ['booster', 'shield', 'banana', 'missile'];
    this.aiHeldItem = itemList[Math.floor(Math.random() * itemList.length)];
    this.aiHasItem = true;
    this.aiItemDecisionTimer = 40 + Math.floor(Math.random() * 80); // 40-120 frames (~1-2 seconds)
  }

  useAIItem() {
    if (!this.aiHasItem || !this.aiHeldItem) return;
    const item = this.aiHeldItem;
    this.aiHasItem = false;
    this.aiHeldItem = null;

    if (item === 'booster') {
      this.aiBoosterActive = true;
      this.aiBoosterTimer = 110;
      this.onComicPopup?.('AI BOOST', '#22d3ee');
    } else if (item === 'shield') {
      this.aiShieldActive = true;
      this.aiShieldTimer = 220; // ~3.5 seconds
      this.onComicPopup?.('AI SHIELD', '#3b82f6');
      this.onHUDNotification?.('AI 실드 전개!', 'AI가 일렉트로 실드를 사용해 무적 방어 장벽을 유지 중입니다!');
    } else if (item === 'banana') {
      this.dropBananaAI();
    } else if (item === 'missile') {
      this.shootMissileAI();
    }
  }

  dropBananaAI() {
    if (!this.aiKart || !this.aiKart.mesh) return;
    const aiPos = this.aiKart.mesh.position;
    const heading = new THREE.Vector3(Math.sin(this.aiKart.mesh.rotation.y), 0, Math.cos(this.aiKart.mesh.rotation.y));
    const dropPos = aiPos.clone().sub(heading.multiplyScalar(4.0));

    const banGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 8);
    const banMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.6
    });
    const banana = new THREE.Mesh(banGeo, banMat);
    banana.position.copy(dropPos);
    banana.position.y += 0.1;

    this.scene.add(banana);
    this.obstacles.push({
      mesh: banana,
      position: banana.position.clone()
    });

    this.onComicPopup?.('AI TRAP!', '#eab308');
    this.onHUDNotification?.('AI 바나나 매설!', 'AI가 바나나 트랙을 후방에 매설했습니다! 피하십시오!');
  }

  shootMissileAI() {
    if (!this.aiKart || !this.aiKart.mesh || !this.playerKart || !this.playerKart.mesh) return;
    
    this.onComicPopup?.('AI MISSILE!', '#f43f5e');
    this.onHUDNotification?.('AI 미사일 록온 배수!', 'AI가 유도 미사일을 발사했습니다! 실드로 격벽 방어하거나 피격 차선을 피하십시오!');

    const missile = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6 }) // Blue missile representing AI launch
    );
    missile.geometry.rotateX(Math.PI / 2);
    missile.position.copy(this.aiKart.mesh.position);
    this.scene.add(missile);

    let progress = 0;
    const launchInterval = setInterval(() => {
      // Guard: prevent background thread leaks if engine is torn down
      if (!this.active || !this.playerKart || !this.playerKart.mesh || !this.aiKart || !this.aiKart.mesh) {
        clearInterval(launchInterval);
        try { this.scene.remove(missile); } catch (e) {}
        return;
      }

      progress += 0.055;
      missile.position.lerp(this.playerKart.mesh.position, progress);
      this.createSmokeParticle(missile.position, 0x3b82f6, 0.4);

      if (progress >= 1.0) {
        clearInterval(launchInterval);
        this.scene.remove(missile);
        this.triggerPlayerCrashByAI();
      }
    }, 50);
  }

  triggerPlayerCrashByAI() {
    if (this.shieldActive) {
      this.shieldActive = false;
      this.onComicPopup?.('BLOCK!', '#3b82f6');
      this.onHUDNotification?.('방어 성공!', '일렉트로 실드로 AI의 유도 미사일을 요격 격침시켰습니다!');
      return;
    }

    this.playerKart.mesh.userData.spinTimer = 50;
    AudioEngine.playCrash();
    this.onPlayerCrashNotification();
    this.onComicPopup?.('CRASH!', '#ef4444');
    this.onHUDNotification?.('미사일 피격!', 'AI 미사일 공격에 정통으로 맞아 차체가 탈선했습니다.');
  }

  dropBanana() {
    const playerPos = this.playerKart.mesh.position;
    const heading = new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle));
    const dropPos = playerPos.clone().sub(heading.multiplyScalar(4));

    const banGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 8);
    const banMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.6
    });
    const banana = new THREE.Mesh(banGeo, banMat);
    banana.position.copy(dropPos);
    banana.position.y += 0.1;

    this.scene.add(banana);
    this.obstacles.push({
      mesh: banana,
      position: banana.position.clone()
    });

    // Invoke callback to sync banana coordinate across peers
    this.onDropBanana?.({ x: dropPos.x, y: banana.position.y, z: dropPos.z });
  }

  remoteDropBanana(x: number, y: number, z: number) {
    const banGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 8);
    const banMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.6
    });
    const banana = new THREE.Mesh(banGeo, banMat);
    banana.position.set(x, y, z);

    this.scene.add(banana);
    this.obstacles.push({
      mesh: banana,
      position: banana.position.clone()
    });
  }

  spawnPaintSpot(pos: THREE.Vector3, owner: 'player' | 'ai') {
    const color = owner === 'player' ? 0x22d3ee : 0xec4899; // Cyan vs Neon Rose
    const geo = new THREE.CylinderGeometry(4.2, 4.2, 0.05, 10);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.75
    });
    const spot = new THREE.Mesh(geo, mat);
    spot.position.copy(pos);
    spot.position.y = 0.05 + Math.random() * 0.04;
    
    this.scene.add(spot);
    this.paints.push({ mesh: spot, owner });

    if (this.paints.length > 180) {
      const oldest = this.paints.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        if (Array.isArray(oldest.mesh.material)) oldest.mesh.material.forEach(m => m.dispose());
        else oldest.mesh.material.dispose();
      }
    }

    const pCount = this.paints.filter(p => p.owner === 'player').length;
    const aCount = this.paints.filter(p => p.owner === 'ai').length;
    const total = pCount + aCount;
    if (total > 0) {
      this.onPaintTurfRatio?.(pCount / total);
    }
  }

  shootPaintGun(owner: 'player' | 'ai') {
    if (!this.active) return;
    const headingAngle = owner === 'player' ? (this.angle + this.driftAngle) : (this.aiKart?.mesh?.rotation?.y || 0);
    const forwardVec = new THREE.Vector3(Math.sin(headingAngle), 0, Math.cos(headingAngle)).normalize();
    const bulletColor = owner === 'player' ? 0x22d3ee : 0xec4899;

    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 8, 8),
      new THREE.MeshBasicMaterial({ color: bulletColor })
    );
    const startPos = owner === 'player' ? this.playerKart.mesh.position.clone() : this.aiKart.mesh.position.clone();
    bullet.position.copy(startPos);
    bullet.position.y += 1.0;
    this.scene.add(bullet);

    let velocity = forwardVec.clone().multiplyScalar(3.8);
    velocity.y = 0.45;
    let age = 0;

    const bulletInterval = setInterval(() => {
      if (!this.active) {
        clearInterval(bulletInterval);
        try { this.scene.remove(bullet); } catch (e) {}
        return;
      }
      bullet.position.add(velocity);
      velocity.y -= 0.04;
      this.createSmokeParticle(bullet.position, bulletColor, 0.25);

      age++;
      const isHitGround = bullet.position.y <= 0.2;
      const isExpired = age > 25;

      if (isHitGround || isExpired) {
        clearInterval(bulletInterval);
        try { this.scene.remove(bullet); } catch (e) {}

        const impactPos = bullet.position.clone();
        impactPos.y = 0.01;
        
        this.spawnPaintSpot(impactPos, owner);
        for (let i = 0; i < 3; i++) {
          const rOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 3.5,
            0,
            (Math.random() - 0.5) * 3.5
          );
          this.spawnPaintSpot(impactPos.clone().add(rOffset), owner);
        }

        const opponentKart = owner === 'player' ? this.aiKart : { mesh: this.playerKart.mesh };
        if (opponentKart && opponentKart.mesh) {
          const dist = impactPos.distanceTo(opponentKart.mesh.position);
          if (dist < 4.8) {
            this.onComicPopup?.('SPLAT!', '#eab308');
            if (owner === 'player') {
              this.triggerAICrash();
              this.onHUDNotification?.('물감 명중!', '상대에게 페인트 탄환을 명중시켰습니다!');
            } else {
              this.speed *= 0.45;
              this.onHUDNotification?.('상대 물총 피격!', '상대의 페인트 탄환을 맞아 주행 시야가 일시 방해되고 감속되었습니다!');
            }
          }
        }
      }
    }, 30);
  }

  throwPaintBomb(owner: 'player' | 'ai') {
    if (!this.active) return;
    const headingAngle = owner === 'player' ? (this.angle + this.driftAngle) : (this.aiKart?.mesh?.rotation?.y || 0);
    const forwardVec = new THREE.Vector3(Math.sin(headingAngle), 0, Math.cos(headingAngle)).normalize();
    const bulletColor = owner === 'player' ? 0x22d3ee : 0xec4899;

    const bomb = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.2, 1),
      new THREE.MeshStandardMaterial({
        color: bulletColor,
        roughness: 0.25,
        metalness: 0.3,
        emissive: bulletColor,
        emissiveIntensity: 0.2
      })
    );
    const startPos = owner === 'player' ? this.playerKart.mesh.position.clone() : this.aiKart.mesh.position.clone();
    bomb.position.copy(startPos);
    bomb.position.y += 1.4;
    this.scene.add(bomb);

    let velocity = forwardVec.clone().multiplyScalar(2.1);
    velocity.y = 0.94;
    let age = 0;

    const bombInterval = setInterval(() => {
      if (!this.active) {
        clearInterval(bombInterval);
        try { this.scene.remove(bomb); } catch (e) {}
        return;
      }
      bomb.position.add(velocity);
      velocity.y -= 0.048;
      bomb.rotation.x += 0.08;
      bomb.rotation.y += 0.04;
      this.createSmokeParticle(bomb.position, bulletColor, 0.45);

      age++;
      const isHitGround = bomb.position.y <= 0.3;
      if (isHitGround || age > 40) {
        clearInterval(bombInterval);
        try { this.scene.remove(bomb); } catch (e) {}

        const impactPos = bomb.position.clone();
        impactPos.y = 0.01;

        this.spawnPaintSpot(impactPos, owner);
        for (let i = 0; i < 9; i++) {
          const subAngle = (i / 9) * Math.PI * 2;
          const radius = 3.0 + Math.random() * 4.5;
          const rOffset = new THREE.Vector3(
            Math.cos(subAngle) * radius,
            0,
            Math.sin(subAngle) * radius
          );
          this.spawnPaintSpot(impactPos.clone().add(rOffset), owner);
        }

        const opponentKart = owner === 'player' ? this.aiKart : { mesh: this.playerKart.mesh };
        if (opponentKart && opponentKart.mesh) {
          const dist = impactPos.distanceTo(opponentKart.mesh.position);
          if (dist < 11.0) {
            this.onComicPopup?.('SPLAT SPLASH!', '#ef4444');
            if (owner === 'player') {
              this.triggerAICrash();
              this.onHUDNotification?.('물감 폭탄 클린 직격!', '대형 물감 폭탄의 대폭발에 상대를 휘말리게 했습니다!');
            } else {
              AudioEngine.playCrash();
              this.playerKart.mesh.userData.spinTimer = 60;
              this.speed *= 0.15;
              this.onHUDNotification?.('물감 대폭탄 폭발!', '상대가 던진 대량 페인트 물감폭탄이 활주로에서 작열했습니다!');
            }
          }
        }
      }
    }, 30);
  }

  spawnFlagRandomly() {
    if (this.flagMesh) {
      this.scene.remove(this.flagMesh);
      this.flagMesh = null;
    }

    const angle = Math.random() * Math.PI * 2;
    // arena is bounded normally; let's place within radius 55
    const r = 15 + Math.random() * 50;
    this.currentFlagPos = new THREE.Vector3(Math.cos(angle) * r, 0.4, Math.sin(angle) * r);

    const flagGroup = new THREE.Group();
    
    // Pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 8), poleMat);
    pole.position.y = 3.5;
    flagGroup.add(pole);

    // Banner
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xeab308, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.5, 0.1), bannerMat);
    banner.position.set(1.4, 6.0, 0);
    flagGroup.add(banner);

    // Ring glow
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.35 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 5.0, 32), ringMat);
    ring.rotateX(-Math.PI / 2);
    ring.position.y = 0.1;
    flagGroup.add(ring);

    // Point Light
    const flagLight = new THREE.PointLight(0xeab308, 3.5, 35);
    flagLight.position.set(0, 5, 0);
    flagGroup.add(flagLight);

    flagGroup.position.copy(this.currentFlagPos);
    this.scene.add(flagGroup);
    this.flagMesh = flagGroup;
  }

  collectFlag(winner: 'player' | 'ai') {
    AudioEngine.playCoin();
    if (winner === 'player') {
      this.playerFlagScore += 1;
      this.onComicPopup?.('+1 SCORE!', '#facc15');
      this.onHUDNotification?.('깃발 획득!', '콜로세움 광장에 출현한 플래그를 선점하여 1득점 했습니다!');
    } else {
      this.aiFlagScore += 1;
      this.onComicPopup?.('AI POINT!', '#ec4899');
      this.onHUDNotification?.('깃발 피탈!', 'AI 라이벌 기체가 깃발을 선점해 득점했습니다!');
    }

    this.onFlagScoreChange?.(this.playerFlagScore, this.aiFlagScore);

    if (this.playerFlagScore >= 5) {
      this.onGameFinished(true, this.timer);
    } else if (this.aiFlagScore >= 5) {
      this.onGameFinished(false, this.timer);
    } else {
      this.spawnFlagRandomly();
    }
  }

  spawnStraightLineObstacles() {
    this.obstacles.forEach(obs => this.scene.remove(obs.mesh));
    this.obstacles = [];

    const totalSectors = 64;
    for (let i = 1; i < totalSectors - 1; i++) {
      const t = i / totalSectors;
      const point = this.trackSpline.getPointAt(t);
      const tangent = this.trackSpline.getTangentAt(t).normalize();
      const lateralDir = tangent.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();

      const pattern = i % 3;
      let offsets: number[] = [];
      let meshType: 'cone' | 'block' | 'box' = 'cone';
      
      if (pattern === 0) {
        offsets = [-12.0, -3.0];
        meshType = 'cone';
      } else if (pattern === 1) {
        offsets = [3.0, 12.0];
        meshType = 'cone';
      } else {
        offsets = [-6.0, 6.0];
        meshType = 'box';
      }

      offsets.forEach(offset => {
        let obstacleMesh: THREE.Mesh;
        if (meshType === 'cone') {
          const geo = new THREE.ConeGeometry(1.2, 2.5, 6);
          const mat = new THREE.MeshStandardMaterial({
            color: 0xef4444, // neon orange-red
            roughness: 0.2,
            metalness: 0.8,
            emissive: 0x991b1b,
            emissiveIntensity: 0.4
          });
          obstacleMesh = new THREE.Mesh(geo, mat);
          const spawnPos1 = point.clone().addScaledVector(lateralDir, offset);
          obstacleMesh.position.set(spawnPos1.x, spawnPos1.y * 0.01 + 1.25, spawnPos1.z);
        } else {
          const geo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
          const mat = new THREE.MeshStandardMaterial({
            color: 0xfacc15, // hazard golden
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x854d0e,
            emissiveIntensity: 0.45
          });
          obstacleMesh = new THREE.Mesh(geo, mat);
          const spawnPos2 = point.clone().addScaledVector(lateralDir, offset);
          obstacleMesh.position.set(spawnPos2.x, spawnPos2.y * 0.01 + 1.1, spawnPos2.z);
        }

        this.scene.add(obstacleMesh);
        this.obstacles.push({
          mesh: obstacleMesh,
          position: obstacleMesh.position.clone()
        });
      });
    }
  }

  swapRelayKart() {
    const colors = [0xff007f, 0x06b6d4, 0xeab308, 0x475569, 0xa855f7, 0xd946ef, 0x1e293b];
    const flames = [0x22d3ee, 0xec4899, 0xf97316, 0x8b5cf6, 0x22c55e, 0xef4444, 0xfacc15];
    const names = ['커먼핑크 코어', '블루볼트 하이브리드', '골든마스터 프라임', '티탄 하드크롤러', '스플래시 드래곤', '진홍의 볼텍스 윙', '옵시디언 쉐도우 S'];
    
    const idx = Math.floor(Math.random() * colors.length);
    const nextColor = colors[idx];
    const nextFlameColor = flames[idx];
    const nextName = names[idx];

    if (this.playerKart && this.playerKart.mesh) {
      this.playerKart.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material && 'color' in child.material) {
            if (child.material.color.getHex() !== 0x090d16 && child.material.color.getHex() !== 0x0f172a && child.material.color.getHex() !== 0x1e293b && child.name !== 'overhead_marker') {
              child.material = new THREE.MeshStandardMaterial({
                color: nextColor,
                metalness: 0.9,
                roughness: 0.15
              });
            }
          }
        }
      });
      
      this.boosterActive = true;
      this.boosterTimer = 160;
      
      this.maxSpeed = 1.6 + Math.random() * 0.4;
      this.accel = 0.03 + Math.random() * 0.01;
      
      this.onComicPopup?.('RELAY SWAP!', '#a855f7');
      this.onHUDNotification?.('바통 터치!', `후속 기체 [${nextName}] 주자로 체인지되면서 하이퍼 부스트가 발동했습니다!`);
    }
  }

  remoteHitPlayer(itemType: string) {
    if (!this.active) return;

    if (itemType === 'missile') {
      if (this.shieldActive) {
        this.shieldActive = false;
        this.onComicPopup?.('BLOCK!', '#3b82f6');
        this.onHUDNotification?.('방어 성공!', '일렉트로 실드로 상대방의 유도 미사일을 요격했습니다!');
      } else {
        this.playerKart.mesh.userData.spinTimer = 50;
        AudioEngine.playCrash();
        this.onPlayerCrashNotification();
        this.onComicPopup?.('CRASH!', '#ef4444');
        this.onHUDNotification?.('미사일 피격!', '상대 플레이어의 유도 미사일 공격에 정통으로 맞아 스핀했습니다!');
      }
    }
  }

  update(keys: Record<string, any>, driftStatsWeight = 1.8) {
    if (!this.active) return;

    if (this.gameMode === 'relay_race' && this.aiKart && this.aiKart.mesh) {
      this.aiKart.mesh.visible = false;
    }

    this.timer += 16.67;

    if (this.aiFinishedTimeRemaining !== null) {
      const prevSec = Math.ceil(this.aiFinishedTimeRemaining);
      this.aiFinishedTimeRemaining -= 0.01667;
      const currSec = Math.ceil(this.aiFinishedTimeRemaining);
      
      if (currSec < prevSec && currSec > 0) {
        this.onComicPopup?.(`${currSec}초!`, '#f43f5e');
        this.onHUDNotification?.('⚠️ 남은 시간', `라이벌이 이미 골인했습니다! 완주까지 남은 시간: ${currSec}초`);
      }
      
      if (this.aiFinishedTimeRemaining <= 0) {
        this.aiFinishedTimeRemaining = null;
        this.onGameFinished(false, this.timer);
        return;
      }
    }

    // Rotate overhead markers for supreme 3D positioning visibility
    if (this.playerKart && this.playerKart.mesh) {
      const pMarker = this.playerKart.mesh.getObjectByName("overhead_marker");
      if (pMarker) pMarker.rotation.y += 0.05;

      // Rotate player's under-kart aura rings and mystical runes if present
      const pAura = this.playerKart.mesh.getObjectByName("aura_group");
      if (pAura) {
        const r1 = pAura.getObjectByName("ring1");
        const r2 = pAura.getObjectByName("ring2");
        const s1 = pAura.getObjectByName("star1");
        const s2 = pAura.getObjectByName("star2");
        if (r1) r1.rotation.z += 0.012;
        if (r2) r2.rotation.z -= 0.018;
        if (s1) s1.rotation.z += 0.022;
        if (s2) s2.rotation.z -= 0.028;
      }
    }
    if (this.aiKart && this.aiKart.mesh) {
      const aMarker = this.aiKart.mesh.getObjectByName("overhead_marker");
      if (aMarker) aMarker.rotation.y += 0.05;
    }

    // A. Player Limits
    let currentLimit = this.maxSpeed;
    let currentAccel = this.accel;

    if (this.gameMode === 'paint_turf' && keys.isMobile) {
      currentLimit = this.maxSpeed * 0.55;
      currentAccel = this.accel * 0.65;
    }

    if (this.boosterActive) {
      // Increased boost speed in Super Nitro for explosive sensation! Normal boost is 1.28
      currentLimit = this.maxSpeed * (this.isSuperNitro ? 1.48 : 1.28);
      this.boosterTimer--;

      const rearOffset = new THREE.Vector3(0, 0.5, -2.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
      const sprayPos = this.playerKart.mesh.position.clone().add(rearOffset);
      const headingVec = new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle));
      this.createBoosterFlame(sprayPos, headingVec, true);

      // Hyperactive booster warp streaks
      for (let s = 0; s < 2; s++) {
        const backVec = new THREE.Vector3(-Math.sin(this.angle), 0, -Math.cos(this.angle));
        const offsetAhead = new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() * 4) + 0.1,
          (Math.random() - 0.5) * 12
        ).addScaledVector(backVec, -6);
        const spawnPos = this.playerKart.mesh.position.clone().add(offsetAhead);
        this.createSpeedLineParticle(spawnPos, backVec, 0xe0f7fa);
      }

      if (this.boosterTimer <= 0) {
        this.boosterActive = false;
      }
    }

    // B. Drive Inputs
    let forward = keys.ArrowUp || keys.w || keys.W;
    let backward = keys.ArrowDown || keys.s || keys.S;
    let left = keys.ArrowLeft || keys.a || keys.A;
    let right = keys.ArrowRight || keys.d || keys.D;
    let driftKey = keys.Shift;

    if (!this.isActiveRunner()) {
      forward = false;
      backward = false;
      left = false;
      right = false;
      driftKey = false;
      this.speed = 0;
    }

    // Track shift tap state for snappy chain transitions
    const driftKeyJustPressed = driftKey && !this.lastDriftKey;
    this.lastDriftKey = !!driftKey;

    if (forward) {
      this.speed += currentAccel;
      if (this.speed > currentLimit) this.speed = currentLimit;
    } else if (backward) {
      this.speed -= currentAccel;
      if (this.speed < -0.3) this.speed = -0.3;
    } else {
      this.speed *= this.friction;
    }

    let angleDiff = 0;
    if (Math.abs(this.speed) > 0.05) {
      const turnDirection = this.speed > 0 ? 1 : -1;
      if (keys.steerRatio !== undefined) {
        const rawRatio = keys.steerRatio;
        const absRatio = Math.abs(rawRatio);
        if (absRatio > 0.04) {
          // Curved mapping: gives precise gentle steering around the center and sharper steering on full pull.
          const curvedRatio = Math.pow(absRatio, 1.4) * Math.sign(rawRatio);
          angleDiff = -curvedRatio * this.turnSpeed * turnDirection * 0.85;
        } else {
          angleDiff = 0;
        }
      } else {
        // Smoothened steering coefficient by 15% for much cleaner control per request
        if (left) angleDiff = this.turnSpeed * turnDirection * 0.85;
        if (right) angleDiff = -this.turnSpeed * turnDirection * 0.85;
      }
    }

    // Break or switch current drift for consecutive opposite/S-drift seamlessly
    if (this.isDrifting && driftKey) {
      const isSteeringLeft = left || (keys.steerRatio !== undefined && keys.steerRatio < -0.05);
      const isSteeringRight = right || (keys.steerRatio !== undefined && keys.steerRatio > 0.05);
      const isSteeringOpposite = (this.driftDirection === 1 && isSteeringRight) || (this.driftDirection === -1 && isSteeringLeft);
      if (isSteeringOpposite) {
        this.driftDirection = -this.driftDirection;
        this.driftAngle = -this.driftAngle * 0.4; // Reverse angle with slight snap reduction for weight transfer
        AudioEngine.playDrift();
        this.onComicPopup?.('S-DRIFT!', '#fc1da7');
      }
    }

    // Drift Logic
    const canStartDrift = driftKey && Math.abs(angleDiff) > 0 && this.speed > 0.3;
    const canSustainDrift = this.isDrifting && driftKey && this.speed > 0.3;

    if (canStartDrift || canSustainDrift) {
      if (!this.isDrifting) {
        this.isDrifting = true;
        this.driftCount++;
        this.driftDirection = angleDiff > 0 ? 1 : -1;
        AudioEngine.playDrift();
      }
      AudioEngine.setDriftActive(true);

      let steerInput = 0;
      if (left) steerInput = 1;
      if (right) steerInput = -1;
      if (keys.steerRatio !== undefined) {
        steerInput = -keys.steerRatio;
      }

      const targetDriftAngle = -this.driftDirection * 0.42;
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, targetDriftAngle, 0.15);

      // Automated drift physics slip vector:
      if (steerInput !== 0) {
        const steeringWithDrift = (Math.sign(steerInput) === this.driftDirection);
        if (steeringWithDrift) {
          // Steering into the drift: turn sharper but highly controlled, scaled by steering magnitude
          const magnitude = Math.abs(steerInput);
          angleDiff = this.driftDirection * this.turnSpeed * (1.0 + 0.5 * magnitude);
        } else {
          // Counter-steering: turns wide (reduces cornering sharpness but aligns the car, making it easy to recover)
          const magnitude = Math.abs(steerInput);
          angleDiff = -this.driftDirection * this.turnSpeed * 0.32 * magnitude;
        }
      } else {
        // No input: automatic gentle slide along the curvature
        angleDiff = this.driftDirection * this.turnSpeed * 0.65;
      }

      // Charge Gauge (boost active multiplier) - doubled for high reward and ease
      const chargeRate = (this.isSuperNitro ? 8.0 : 2.85) * driftStatsWeight;
      this.boosterGauge += chargeRate;
      if (this.boosterGauge >= 100) {
        this.boosterGauge = 0;
        this.boosterStock++;
        this.onBoosterCountChange(this.boosterStock);
        this.onComicPopup?.('MINI TURBO!', '#22d3ee');
      }
      this.onBoosterGaugeChange(this.boosterGauge);

      const leftTyreOffset = new THREE.Vector3(-1.3, 0.1, -1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
      const rightTyreOffset = new THREE.Vector3(1.3, 0.1, -1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
      
      const leftTirePos = this.playerKart.mesh.position.clone().add(leftTyreOffset);
      const rightTirePos = this.playerKart.mesh.position.clone().add(rightTyreOffset);
      
      this.createSmokeParticle(leftTirePos, 0xff007f, 0.48);
      this.createSmokeParticle(rightTirePos, 0x06b6d4, 0.48);

      if (Math.random() < 0.35) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() * 2) + 0.2,
          (Math.random() - 0.5) * 6
        );
        const spawnPos = this.playerKart.mesh.position.clone().add(offset);
        const backVec = new THREE.Vector3(-Math.sin(this.angle), 0, -Math.cos(this.angle));
        this.createSpeedLineParticle(spawnPos, backVec, Math.random() > 0.5 ? 0xff007f : 0x06b6d4);
      }
    } else {
      if (this.isDrifting) {
        this.isDrifting = false;
        AudioEngine.setDriftActive(false);
      }
      this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, 0, 0.22);
    }

    this.angle += angleDiff;
    this.playerKart.mesh.rotation.y = this.angle + this.driftAngle;

    // Apply lean/roll (bank angle) on Z-axis depending on the drift and steer direction for organic weight transfer!
    let targetTiltZ = 0;
    if (this.isDrifting) {
      targetTiltZ = this.driftDirection * 0.18; // Lean outwards to emphasize lateral inertia
    } else if (left) {
      targetTiltZ = 0.06;
    } else if (right) {
      targetTiltZ = -0.06;
    }
    this.playerKart.mesh.rotation.z = THREE.MathUtils.lerp(this.playerKart.mesh.rotation.z, targetTiltZ, 0.18);

    this.playerKart.wheels.forEach(w => {
      w.rotation.x += this.speed * 1.8;
    });

    if (this.playerKart.mesh.userData.spinTimer > 0) {
      this.playerKart.mesh.userData.spinTimer--;
      this.playerKart.mesh.rotation.y += 0.4;
      this.speed = 0.05;
    } else {
      const vx = Math.sin(this.angle) * this.speed;
      const vz = Math.cos(this.angle) * this.speed;

      this.playerKart.mesh.position.x += vx;
      this.playerKart.mesh.position.z += vz;
    }

    // Let's check our custom seasonal track elements!
    const playerPos = this.playerKart.mesh.position;

    // 1. Gravity and Vertical Jump mechanics
    this.verticalVelocity -= 0.16; // gravity
    this.verticalOffset += this.verticalVelocity;
    if (this.verticalOffset <= 0) {
      this.verticalOffset = 0;
      this.verticalVelocity = 0;
    }

    // Same for AI kart
    if (this.aiKart && this.aiKart.mesh) {
      this.aiVerticalVelocity -= 0.16;
      this.aiVerticalOffset += this.aiVerticalVelocity;
      if (this.aiVerticalOffset <= 0) {
        this.aiVerticalOffset = 0;
        this.aiVerticalVelocity = 0;
      }
    }

    // 2. Booster Pad collisions disabled per user request: "부스트 패달이나 점핑트랩을 없애줘."
    // 3. Jump Ramp collisions disabled per user request: "부스트 패달이나 점핑트랩을 없애줘."

    // 4. Shortcut check (to adapt road width to prevent border wall pushing back)
    let maxRoadRadius = 21.5;
    let isInShortcut = false;
    if (this.mapInfo && this.mapInfo.shortcuts) {
      this.mapInfo.shortcuts.forEach(sc => {
        const scPos = new THREE.Vector3(sc[0] * 1.75, sc[1] * 1.75 * 0.01, sc[2] * 1.75);
        if (playerPos.distanceTo(scPos) < 32.0) {
          isInShortcut = true;
        }
      });
    }
    if (isInShortcut) {
      maxRoadRadius = 45.0; // expand acceptable track width
      if (Math.random() < 0.02) {
        this.onComicPopup?.('SHORTCUT ONLINE!', '#f97316');
      }
    }

    // Outer wall check
    const nearestT = this.getNearestTrackSplinePoint(this.playerKart.mesh.position);
    let centerPt = new THREE.Vector3(0, 0, 0);
    if (this.mapInfo && this.mapInfo.id !== 'empty_arena') {
      centerPt = this.trackSpline.getPointAt(nearestT);
      this.playerKart.mesh.position.y = centerPt.y * 0.01 + this.verticalOffset;
    } else {
      this.playerKart.mesh.position.y = this.verticalOffset;
    }

    if (this.mapInfo && this.mapInfo.id === 'empty_arena') {
      const distFromCenter = this.playerKart.mesh.position.length();
      const maxArenaRadius = 144.5;
      if (distFromCenter > maxArenaRadius) {
        const pushDir = this.playerKart.mesh.position.clone().normalize();
        pushDir.y = 0;

        // Push slightly inside to prevent sticking
        this.playerKart.mesh.position.copy(pushDir).multiplyScalar(maxArenaRadius - 0.6);
        this.playerKart.mesh.position.y = this.verticalOffset;

        if (Math.abs(this.speed) > 0.15) {
          this.speed *= 0.88; // Custom slide friction instead of abrupt rotating
          if (!this.lastCrashTime || Date.now() - this.lastCrashTime > 1000) {
            AudioEngine.playCrash();
            this.onPlayerCrashNotification();
            this.lastCrashTime = Date.now();
            for (let i = 0; i < 4; i++) {
              this.createSmokeParticle(this.playerKart.mesh.position, 0x10b981, 0.5);
            }
          }
        } else {
          this.speed *= 0.95;
        }
      }
    } else {
      // 2D distance to center of road
      const dist = new THREE.Vector2(playerPos.x, playerPos.z).distanceTo(new THREE.Vector2(centerPt.x, centerPt.z));

      if (dist > maxRoadRadius) {
        const pushDir = new THREE.Vector3().subVectors(this.playerKart.mesh.position, centerPt);
        pushDir.y = 0;
        pushDir.normalize();

        // Push slightly inside the road boundary to prevent sticking
        this.playerKart.mesh.position.copy(centerPt).add(pushDir.multiplyScalar(maxRoadRadius - 0.6));
        this.playerKart.mesh.position.y = centerPt.y * 0.01 + this.verticalOffset;

        if (Math.abs(this.speed) > 0.15) {
          this.speed *= 0.88; // Custom slide friction instead of abrupt rotating
          if (!this.lastCrashTime || Date.now() - this.lastCrashTime > 1000) {
            AudioEngine.playCrash();
            this.onPlayerCrashNotification();
            this.lastCrashTime = Date.now();
            for (let i = 0; i < 4; i++) {
              this.createSmokeParticle(this.playerKart.mesh.position, 0xfacc15, 0.5);
            }
          }
        } else {
          this.speed *= 0.95;
        }
      }
    }

    // Speed callback
    const currentSpeedVal = Math.floor((Math.abs(this.speed) / this.maxSpeed) * 210);
    this.maxSpeedReached = Math.max(this.maxSpeedReached || 0, currentSpeedVal);
    this.onSpeedChange(currentSpeedVal);

    this.updateAIRacer();
    this.checkCollisions();

    // Splatoon Paint Turf Mode Trail Spawns
    if (this.gameMode === 'paint_turf' && this.active) {
      this.paintTimer++;
      if (this.paintTimer % 6 === 0) {
        this.spawnPaintSpot(this.playerKart.mesh.position, 'player');
        if (this.aiKart && this.aiKart.mesh) {
          this.spawnPaintSpot(this.aiKart.mesh.position, 'ai');
        }
      }

      // AI shooting automated mechanism to make it highly dynamic & fun
      if (this.aiKart && this.aiKart.mesh) {
        const distToPlayer = this.aiKart.mesh.position.distanceTo(this.playerKart.mesh.position);
        if (distToPlayer < 50.0) {
          // AI fires paint bullets every 1.8 seconds (108 ticks) if close
          if (this.paintTimer % 108 === 0) {
            this.shootPaintGun('ai');
          }
          // AI throws a massive paint bomb every 7.5 seconds (450 ticks)
          if (this.paintTimer % 450 === 0) {
            this.throwPaintBomb('ai');
          }
        }
      }
    }

    // Flag Hunt Mode Flag Collection Checking
    if (this.gameMode === 'flag_hunt' && this.currentFlagPos) {
      const pDist = this.playerKart.mesh.position.distanceTo(this.currentFlagPos);
      if (pDist < 6.5) {
        this.collectFlag('player');
      } else if (this.aiKart && this.aiKart.mesh) {
        const aiDist = this.aiKart.mesh.position.distanceTo(this.currentFlagPos);
        if (aiDist < 6.5) {
          this.collectFlag('ai');
        }
      }
    }

    this.checkLapMilestones(nearestT);

    if (this.shieldActive) {
      this.shieldTimer--;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
      }
    }

    this.updateParticles();
    this.updateCamera();
  }

  updateAIRacer() {
    if (!this.aiKart || !this.aiKart.mesh) return;

    if (this.multiplayerKarts.size > 0) {
      this.aiKart.mesh.visible = false;
      return;
    } else {
      this.aiKart.mesh.visible = true;
    }

    // Ghost bypass movement logic
    if (this.ghostConfig && this.ghostConfig.isGhost) {
      const seconds = this.ghostConfig.targetTimeMs / 1000;
      const totalFrames = seconds * 60;
      const ghostSpeed = this.maxLaps / totalFrames;

      this.aiProgress += ghostSpeed;
      if (this.aiProgress > this.maxLaps) {
        this.aiProgress = this.maxLaps;
      }

      const splineProgress = this.aiProgress % 1.0;
      const currentPos = this.aiKart.mesh.position.clone();
      const targetPos = this.trackSpline.getPointAt(splineProgress);

      this.aiKart.mesh.position.lerp(new THREE.Vector3(targetPos.x, targetPos.y * 0.01 + 0.22, targetPos.z), 0.25);

      const lookAngle = Math.atan2(targetPos.x - currentPos.x, targetPos.z - currentPos.z);
      let angleDiff = lookAngle - this.aiKart.mesh.rotation.y;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      this.aiKart.mesh.rotation.y += angleDiff * 0.28;

      this.aiKart.wheels.forEach(w => {
        w.rotation.x += 1.2;
      });

      if (Math.random() < 0.3) {
        this.createSmokeParticle(this.aiKart.mesh.position.clone(), this.ghostConfig.ghostColorHex, 0.38);
      }
      return;
    }

    // Decay AI shield timer and emit visual aura particles
    if (this.aiShieldActive) {
      this.aiShieldTimer--;
      if (this.aiShieldTimer <= 0) {
        this.aiShieldActive = false;
      }
      if (this.aiShieldTimer % 3 === 0) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          (Math.random() * 0.9),
          (Math.random() - 0.5) * 1.6
        );
        const shieldSparkPos = this.aiKart.mesh.position.clone().add(offset);
        this.createSmokeParticle(shieldSparkPos, 0x3b82f6, 0.38); // Glowing cyan-blue spark tracking shield status
      }
    }

    if (this.gameMode === 'item') {
      // 1. If AI is holding an item, count down and decide when to activate or launch it!
      if (this.aiHasItem) {
        this.aiItemDecisionTimer--;
        if (this.aiItemDecisionTimer <= 0) {
          this.useAIItem();
        }
      } else {
        // 2. Continuous fallback timer so AI automatically gets items every ~7 seconds
        // This keeps the race incredibly active and engaging even if the bot is lagging behind
        this.aiAutoItemTimer--;
        if (this.aiAutoItemTimer <= 0) {
          this.triggerAIItemAcquisition();
          this.aiAutoItemTimer = 420; // reset to 7 seconds
        }
      }
    }

    if (this.aiKart.mesh.userData.spinTimer > 0) {
      this.aiKart.mesh.userData.spinTimer--;
      this.aiKart.mesh.rotation.y += 0.44; // Robust spinning
      if (this.aiKart.mesh.userData.spinTimer % 2 === 0) {
        this.createSmokeParticle(this.aiKart.mesh.position.clone(), 0xff5555, 0.4);
      }
      return;
    }

    // 1. Base engine speed with map adaptations
    let baseSpeed = 0.00115; // Raised speed for challenging AI (prev: 0.0009)

    // 2. Dynamic Boosting for AI
    if (this.aiBoosterActive) {
      baseSpeed *= 1.62;
      this.aiBoosterTimer--;
      
      const rearOffset = new THREE.Vector3(0, 0.4, -1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.aiKart.mesh.rotation.y);
      const flamePos = this.aiKart.mesh.position.clone().add(rearOffset);
      const heading = new THREE.Vector3(Math.sin(this.aiKart.mesh.rotation.y), 0, Math.cos(this.aiKart.mesh.rotation.y));
      this.createBoosterFlame(flamePos, heading, false);

      if (this.aiBoosterTimer <= 0) {
        this.aiBoosterActive = false;
      }
    } else {
      // Periodic automatic boost (Super Nitro mode fuels significantly more frequent boosts)
      const boostThrottle = this.isSuperNitro ? 0.015 : 0.0018;
      if (Math.random() < boostThrottle) {
        this.aiBoosterActive = true;
        this.aiBoosterTimer = this.isSuperNitro ? 140 : 120;
      }
    }

    // 3. Intelligent Rubber-Banding
    const pPos = this.playerKart.mesh.position;
    const aiPos = this.aiKart.mesh.position;
    const distanceToPlayer = aiPos.distanceTo(pPos);

    const pT = this.getNearestTrackSplinePoint(pPos);
    const aiT = this.aiProgress;
    
    let diff = pT - aiT;
    if (diff < -0.5) diff += 1.0;
    if (diff > 0.5) diff -= 1.0;

    if (diff > 0.025 && distanceToPlayer > 12) {
      // Player is leading! AI gains rubber-band speed boost to stay highly competitive
      const catchupFactor = Math.min(1.45, 1.0 + (distanceToPlayer * 0.016));
      baseSpeed *= catchupFactor;
      
      if (!this.aiBoosterActive && Math.random() < 0.01) {
        this.aiBoosterActive = true;
        this.aiBoosterTimer = 100;
      }
    } else if (diff < -0.06 && distanceToPlayer > 22) {
      // AI is excessively leading. Slow down softly to preserve fun/fair play balance
      baseSpeed *= 0.82;
    }

    // 4. Dodge Obstacles Intelligence
    for (const obs of this.obstacles) {
      const dist = aiPos.distanceTo(obs.position);
      if (dist < 8.0) {
        // Soft obstacle lateral evasion
        const lateralDir = new THREE.Vector3(-Math.cos(this.aiKart.mesh.rotation.y), 0, Math.sin(this.aiKart.mesh.rotation.y));
        const lateralMove = lateralDir.multiplyScalar(0.24);
        aiPos.add(lateralMove);
      }
    }

    // Update progress along track spline
    this.aiProgress += baseSpeed;
    if (this.gameMode === 'obstacle_dash') {
      if (this.aiProgress > 0.982) {
        this.aiProgress = 0.982;
        if (this.active) {
          // AI crossed the finish line first
          this.onGameFinished(false, this.timer);
        }
      }
    } else {
      if (this.aiProgress > 1.0) this.aiProgress -= 1.0;
    }

    const currentPos = this.aiKart.mesh.position.clone();
    let targetPos = this.trackSpline.getPointAt(this.aiProgress);

    if (this.gameMode === 'flag_hunt' && this.currentFlagPos) {
      const dir = this.currentFlagPos.clone().sub(aiPos).normalize();
      const stepDist = baseSpeed * 900;
      targetPos = aiPos.clone().add(dir.multiplyScalar(stepDist));
    } else if (this.gameMode === 'paint_turf') {
      // AI paints by wandering around the circular arena!
      if (!this.aiPaintTarget || aiPos.distanceTo(this.aiPaintTarget) < 14.0) {
        const theta = Math.random() * Math.PI * 2;
        const radius = Math.random() * 130; // Stay within radius of 130
        this.aiPaintTarget = new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius);
      }
      const dir = this.aiPaintTarget.clone().sub(aiPos).normalize();
      const stepDist = baseSpeed * 1050;
      targetPos = aiPos.clone().add(dir.multiplyScalar(stepDist));
    }

    // Smoothly interpolate positions
    this.aiKart.mesh.position.lerp(targetPos, 0.22);
    if (this.mapInfo && this.mapInfo.id === 'empty_arena') {
      this.aiKart.mesh.position.y = this.aiVerticalOffset;
    } else {
      const nearestAIT = this.getNearestTrackSplinePoint(this.aiKart.mesh.position);
      const roadSplinePt = this.trackSpline.getPointAt(nearestAIT);
      this.aiKart.mesh.position.y = roadSplinePt.y * 0.01 + this.aiVerticalOffset;
    }

    // Smooth pointing rotation angles (no robotic sudden snapping)
    const lookAngle = Math.atan2(targetPos.x - currentPos.x, targetPos.z - currentPos.z);
    let angleDiff = lookAngle - this.aiKart.mesh.rotation.y;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    this.aiKart.mesh.rotation.y += angleDiff * 0.28;

    this.aiKart.wheels.forEach(w => {
      w.rotation.x += this.aiBoosterActive ? 1.5 : 0.8;
    });
  }

  updateMultiplayerPositions(participants: any[], myPeerId: string, isMultiplayerActive: boolean) {
    if (!isMultiplayerActive) {
      if (this.multiplayerKarts.size > 0) {
        this.multiplayerKarts.forEach(kart => {
          this.scene.remove(kart.mesh);
        });
        this.multiplayerKarts.clear();
      }
      return;
    }

    const activePeerIds = new Set<string>();

    participants.forEach(p => {
      if (p.peerId === myPeerId) return;
      activePeerIds.add(p.peerId);

      let kart = this.multiplayerKarts.get(p.peerId);
      if (!kart) {
        // Create new mesh representing this participant!
        const pKartInfo = KARTS.find(k => k.id === p.kartId) || KARTS[0];
        kart = this.createKart(pKartInfo.color, pKartInfo.flameColor, false, undefined, p.kartId);
        
        // Give a distinct cyan/blue indicator marker above friends/allies
        const overheadMarker = kart.mesh.getObjectByName("overhead_marker") as THREE.Mesh;
        if (overheadMarker && overheadMarker.material) {
          (overheadMarker.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
        }
        
        this.multiplayerKarts.set(p.peerId, kart);
      }

      // Smoothly interpolate position & rotation from telemetry
      if (p.x !== undefined && p.y !== undefined && p.z !== undefined) {
        const targetPos = new THREE.Vector3(p.x, p.y, p.z);
        
        // If they are brand new or far away (e.g. initial spawn), snap to position, otherwise lerp
        if (kart.mesh.position.lengthSq() === 0 || kart.mesh.position.distanceTo(targetPos) > 40) {
          kart.mesh.position.copy(targetPos);
        } else {
          kart.mesh.position.lerp(targetPos, 0.28);
        }
      }

      if (p.rotY !== undefined) {
        // Handle rotation wrapping smoothly
        let targetRot = p.rotY;
        let currentRot = kart.mesh.rotation.y;
        let diff = targetRot - currentRot;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        kart.mesh.rotation.y += diff * 0.28;
      }

      // Turn wheels if speed exists
      const speed = p.currentSpeed || 0;
      kart.wheels.forEach(w => {
        w.rotation.x += speed > 0 ? 0.8 : 0;
      });

      // Show smoke/booster effects if drifting
      if (p.isDrifting && Math.random() < 0.45) {
        const rearOffset = new THREE.Vector3(0, 0.4, -1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), kart.mesh.rotation.y);
        const driftTirePos = kart.mesh.position.clone().add(rearOffset);
        this.createSmokeParticle(driftTirePos, 0xff007f, 0.4);
      }
    });

    // Clean up karts for players who left the room
    this.multiplayerKarts.forEach((kart, pId) => {
      if (!activePeerIds.has(pId)) {
        this.scene.remove(kart.mesh);
        this.multiplayerKarts.delete(pId);
      }
    });
  }

  checkCollisions() {
    const pPos = this.playerKart.mesh.position;

    // Item Box collisions
    this.itemBoxes.forEach(box => {
      if (box.active && pPos.distanceTo(box.mesh.position) < 3.2) {
        box.active = false;
        box.mesh.visible = false;
        box.respawnTimer = 300;
        this.itemBoxesCollected++;
        this.onItemPickup();
      }

      // AI item box acquisition (only in item mode)
      if (this.gameMode === 'item' && box.active && this.aiKart && this.aiKart.mesh) {
        if (this.aiKart.mesh.position.distanceTo(box.mesh.position) < 3.2) {
          box.active = false;
          box.mesh.visible = false;
          box.respawnTimer = 300;
          this.triggerAIItemAcquisition();
        }
      }

      if (box.active) {
        box.mesh.rotation.y += 0.03;
        box.mesh.rotation.x += 0.015;
        box.mesh.position.y = box.basePos.y + Math.sin(Date.now() * 0.0035) * 0.3;
      } else {
        box.respawnTimer--;
        if (box.respawnTimer <= 0) {
          box.active = true;
          box.mesh.visible = true;
        }
      }
    });

    // Coin collisions inside Coin Rush mode
    if (this.gameMode === 'coin_rush') {
      this.coins.forEach(coin => {
        if (coin.active && pPos.distanceTo(coin.mesh.position) < 3.2) {
          coin.active = false;
          coin.mesh.visible = false;
          coin.respawnTimer = 220; // respawn in ~3.6s
          
          // emit spark fragments
          for (let i = 0; i < 5; i++) {
            const sparkleOffset = new THREE.Vector3(
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 1.5
            );
            this.createSmokeParticle(coin.mesh.position.clone().add(sparkleOffset), 0xffd700, 0.35);
          }
          
          if (this.onCoinCollected) {
            this.onCoinCollected();
          }
        }

        if (coin.active) {
          coin.mesh.rotation.y += 0.055;
          coin.mesh.rotation.z += 0.015;
          coin.mesh.position.y = coin.basePos.y + Math.sin(Date.now() * 0.005 + coin.basePos.x) * 0.25;
        } else {
          coin.respawnTimer--;
          if (coin.respawnTimer <= 0) {
            coin.active = true;
            coin.mesh.visible = true;
          }
        }
      });
    }

    // Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (pPos.distanceTo(obs.position) < 2.2) {
        if (this.shieldActive) {
          this.shieldActive = false;
        } else {
          this.playerKart.mesh.userData.spinTimer = 50;
          AudioEngine.playCrash();
          this.onPlayerCrashNotification();
        }
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // AI collides with obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      if (this.aiKart.mesh.position.distanceTo(obs.position) < 2.2) {
        this.aiKart.mesh.userData.spinTimer = 50;
        AudioEngine.playCrash();
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  checkLapMilestones(nearestT: number) {
    if (this.gameMode === 'flag_hunt') {
      return;
    }

    if (this.gameMode === 'obstacle_dash') {
      if (nearestT > 0.99 && this.active) {
        const playerWon = (this.aiKart && this.aiKart.mesh) 
          ? (this.playerKart.mesh.position.z < this.aiKart.mesh.position.z) 
          : true;
        this.onGameFinished(playerWon, this.timer);
      }
      return;
    }

    // AI Checkpoints and Lap Tracking
    const aiT = this.aiProgress;
    if (aiT > 0.45 && aiT < 0.55) {
      this.aiLapCheckpoints[0] = true;
    }
    if (aiT > 0.8 && aiT < 0.9) {
      this.aiLapCheckpoints[1] = true;
    }
    if (aiT > 0.99 && this.aiLapCheckpoints[0] && this.aiLapCheckpoints[1]) {
      this.aiLapCheckpoints = [false, false];
      this.aiLap++;

      if (this.aiLap > this.maxLaps && this.active) {
        // AI crossed finish line first! Trigger 10 second countdown grace period
        if (this.aiFinishedTimeRemaining === null) {
          this.aiFinishedTimeRemaining = 10.0;
          this.aiFinishedTime = this.timer;
          this.onHUDNotification?.('⚠️ 라이벌 완주!', '상대 카트가 먼저 피니시 라인을 통과했습니다! 10초 내에 완주를 마쳐야 주행이 인정됩니다!');
          this.onComicPopup?.('RIVAL FINISHED!', '#ef4444');
        }
        return;
      }
    }

    if (nearestT > 0.45 && nearestT < 0.55) {
      this.lapCheckpoints[0] = true;
    }
    if (nearestT > 0.8 && nearestT < 0.9) {
      this.lapCheckpoints[1] = true;
    }

    // Start-Fin line
    if (nearestT > 0.99 && this.lapCheckpoints[0] && this.lapCheckpoints[1]) {
      this.lapCheckpoints = [false, false];
      this.lap++;

      if (this.lap > this.maxLaps) {
        const playerWon = (this.aiLap <= this.maxLaps && this.aiFinishedTimeRemaining === null);
        this.onGameFinished(playerWon, this.timer);
      } else {
        this.onLapChange(this.lap);
        if (this.gameMode === 'relay_race') {
          this.swapRelayKart();
        }
      }
    }
  }

  getNearestTrackSplinePoint(pos: THREE.Vector3) {
    let closestT = 0;
    let minDist = Infinity;
    const samples = 240;
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const pathPt = this.trackSpline.getPointAt(t);
      const d = pos.distanceTo(pathPt);
      if (d < minDist) {
        minDist = d;
        closestT = t;
      }
    }
    return closestT;
  }

  drawMinimap(canvasElement: HTMLCanvasElement) {
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.beginPath();

    const samples = 60;
    const centerOffset = new THREE.Vector2(canvasElement.width / 2, canvasElement.height / 2);
    const scale = canvasElement.width * 0.0022; // proportional scale

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const pt = this.trackSpline.getPointAt(t);
      const x = centerOffset.x + pt.x * scale;
      const y = centerOffset.y + pt.z * scale;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Player Marker
    const pPos = this.playerKart.mesh.position;
    const px = centerOffset.x + pPos.x * scale;
    const py = centerOffset.y + pPos.z * scale;

    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // AI Marker
    const aiPos = this.aiKart.mesh.position;
    const ax = centerOffset.x + aiPos.x * scale;
    const ay = centerOffset.y + aiPos.z * scale;

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(ax, ay, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  updateCamera() {
    const kartPos = this.playerKart.mesh.position;
    const angle = this.angle + this.driftAngle;

    const backX = Math.sin(angle);
    const backZ = Math.cos(angle);

    const speedRatio = this.maxSpeed > 0 ? (Math.abs(this.speed) / this.maxSpeed) : 0;
    const targetFov = 65 + (isNaN(speedRatio) ? 0 : speedRatio) * 20;
    const safeTargetFov = isNaN(targetFov) || !isFinite(targetFov) ? 65 : Math.max(30, Math.min(125, targetFov));
    const currentFov = isNaN(this.camera.fov) || !isFinite(this.camera.fov) ? 65 : this.camera.fov;
    
    this.camera.fov = THREE.MathUtils.lerp(currentFov, safeTargetFov, 0.1);
    this.camera.updateProjectionMatrix();

    let shake = 0;
    if (this.boosterActive) {
      shake = 0.16;
    } else if (this.speed > 0.8) {
      shake = 0.05;
    }

    const shakeOffset = new THREE.Vector3(
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake
    );

    if (this.cameraView === 'isometric') {
      const targetCamPos = new THREE.Vector3(
        kartPos.x - backX * 12 + 8,
        10.5,
        kartPos.z - backZ * 12 + 8
      );
      this.camera.position.lerp(targetCamPos, 0.08).add(shakeOffset);
      this.camera.lookAt(kartPos);
    } else if (this.cameraView === 'chase') {
      const targetCamPos = new THREE.Vector3(
        kartPos.x - backX * 8.5,
        4.2,
        kartPos.z - backZ * 8.5
      );
      this.camera.position.lerp(targetCamPos, 0.12).add(shakeOffset);
      this.camera.lookAt(kartPos.clone().add(new THREE.Vector3(0, 1.0, 0)));
    } else if (this.cameraView === 'first') {
      const frontX = Math.sin(angle);
      const frontZ = Math.cos(angle);

      const targetCamPos = new THREE.Vector3(
        kartPos.x + frontX * 0.3,
        1.1,
        kartPos.z + frontZ * 0.3
      );
      this.camera.position.copy(targetCamPos).add(shakeOffset);

      const lookTarget = kartPos.clone().add(new THREE.Vector3(frontX * 10, 0.7, frontZ * 10));
      this.camera.lookAt(lookTarget);
    }
  }

  resize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  cleanup() {
    AudioEngine.stopEngine();
    if (this.coins) {
      this.coins.forEach(coin => {
        try {
          this.scene.remove(coin.mesh);
        } catch (e) {}
      });
      this.coins = [];
    }
    if (this.multiplayerKarts) {
      this.multiplayerKarts.forEach(kart => {
        try {
          this.scene.remove(kart.mesh);
        } catch (e) {}
      });
      this.multiplayerKarts.clear();
    }
    if (this.smokeGeometry) {
      this.smokeGeometry.dispose();
    }
    if (this.boosterGeometry) {
      this.boosterGeometry.dispose();
    }
    if (this.renderer) {
      try {
        this.container.removeChild(this.renderer.domElement);
      } catch (e) {}
      this.renderer.dispose();
    }
  }
}
