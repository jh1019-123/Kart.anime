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

  playBGM(mapId: string = 'neon_sky_way') {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.bgmIsPlaying) return;
    this.bgmIsPlaying = true;
    this.bgmStep = 0;

    let stepDuration = 0.103; // ~145 BPM sixteenth notes
    let waveType: 'sine' | 'triangle' | 'sawtooth' | 'square' = 'sawtooth';
    let filterFreq = 1600;
    
    // Default Map Track: Neon Sky Way (High energy Electronic/Trance style)
    let mNotes = [
      329.63, 329.63, 392.00, 329.63, 440.00, 0, 440.00, 493.88,
      523.25, 523.25, 587.33, 523.25, 493.88, 440.00, 392.00, 0,
      329.63, 0, 392.00, 0, 440.00, 440.00, 523.25, 440.00,
      587.33, 587.33, 659.25, 587.33, 523.25, 493.88, 392.00, 0,
      329.63, 329.63, 392.00, 329.63, 440.00, 0, 440.00, 493.88,
      523.25, 523.25, 587.33, 880.00, 783.99, 698.46, 587.33, 0,
      659.25, 659.25, 698.46, 783.99, 880.00, 0, 880.00, 987.77,
      1046.50, 987.77, 880.00, 783.99, 659.25, 587.33, 493.88, 0
    ];

    let bNotes = [
      82.41, 82.41, 110.00, 110.00,
      98.00, 98.00, 87.31, 87.31,
      82.41, 82.41, 98.00, 98.00,
      110.00, 110.00, 123.47, 123.47
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
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.04, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.14);
      } catch (e) {}
    };

    const playMelodyNote = (freq: number, time: number) => {
      if (!this.ctx || freq <= 0) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, time);
        
        gain.gain.setValueAtTime(0, time);
        // Slightly lower melody gain to prevent distortion-related clipping
        gain.gain.linearRampToValueAtTime(0.015, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.25);
      } catch (e) {}
    };

    const playKick = (time: number) => {
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(36, time + 0.08);
        
        // Remove click: start at 0 gain, ramp to peak in 3ms, fade smoothly
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.12, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(time);
        osc.stop(time + 0.12);
      } catch (e) {}
    };

    const playSnare = (time: number) => {
      if (!this.ctx || !noiseBuffer) return;
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 900;
        
        const gain = this.ctx.createGain();
        // Remove click: start at 0, ramp to peak in 3ms, fade smoothly
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.026, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(time);
        source.stop(time + 0.15);
      } catch (e) {}
    };

    const playHihat = (time: number) => {
      if (!this.ctx || !noiseBuffer) return;
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 10000; // Even higher frequency for a sleek, clean, non-intrusive sound
        
        const gain = this.ctx.createGain();
        // Eliminate the ticking artifact: make hi-hat extremely soft, start at 0, ramp to peak over 3ms, then decay
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.0025, time + 0.003); // Very soft whisper, completely non-annoying
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
      
      const stepInBeat = currentStep % 4;
      if (stepInBeat === 0) {
        playKick(scheduleTime);
      } else if (stepInBeat === 2) {
        playSnare(scheduleTime);
      } else {
        playHihat(scheduleTime);
      }
      
      if (currentStep % 2 === 0) {
        const bassFreq = bNotes[barIdx * 4 + Math.floor((currentStep % 8) / 2)] || 110;
        playBassNote(bassFreq, scheduleTime);
      }
      
      const melodyFreq = mNotes[currentStep];
      if (melodyFreq && melodyFreq > 0) {
        playMelodyNote(melodyFreq, scheduleTime);
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
  isSuperNitro = false;
  aiBoosterActive = false;
  aiBoosterTimer = 0;
  playerAuraId = 'none';

  speed = 0;
  maxSpeed = 1.15;
  accel = 0.02;
  decel = 0.006;
  friction = 0.985;
  angle = 0;
  turnSpeed = 0.03;

  isDrifting = false;
  driftDirection = 0;
  driftAngle = 0;
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
  aiShieldActive = false;
  aiShieldTimer = 0;
  aiHasItem = false;
  aiHeldItem: string | null = null;
  aiItemDecisionTimer = 0;
  aiAutoItemTimer = 400; // Fallback timer to auto-grant items to AI to keep the race extremely engaging
  onComicPopup?: (text: string, color: string) => void;
  onHUDNotification?: (title: string, body: string) => void;
  onCoinCollected?: () => void;

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
    playerAuraIdParam?: string
  ) {
    this.container = container;
    this.gameMode = gameModeParam || 'speed';
    this.maxSpeed = stats.speed;
    this.accel = stats.accel;
    // stats.drift affects gauge multiplier
    this.turnSpeed = stats.handling;
    this.ghostConfig = ghostConfig;
    this.playerAuraId = playerAuraIdParam || 'none';

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
    this.playerKart = this.createKart(playerKartColor, playerFlameColor, true, this.playerAuraId);
    this.aiKart = this.createKart(aiKartColor, 0xfacc15, false);

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
    const vectors = pointsArray.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    this.trackSpline = new THREE.CatmullRomCurve3(vectors, true);
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

    // Light Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(50, 200, 50);
    this.scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x22d3ee, 2.0, 400);
    cyanLight.position.set(0, 40, -50);
    this.scene.add(cyanLight);

    const pinkLight = new THREE.PointLight(0xf43f5e, 2.0, 400);
    pinkLight.position.set(120, 30, -100);
    this.scene.add(pinkLight);

    this.scene.add(this.decorativeGroup);
    this.scene.add(this.itemsGroup);
  }

  buildTrack() {
    const trackGeometry = new THREE.TubeGeometry(this.trackSpline, 200, 14, 8, true);
    const trackMaterial = new THREE.MeshBasicMaterial({
      color: 0x27272a, // asphalt gray for superb contrast
      side: THREE.DoubleSide
    });
    this.roadMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    this.roadMesh.scale.set(1, 0.01, 1);
    this.scene.add(this.roadMesh);

    // Bright glowing neon-cyan centerline for perfect course alignment and outstanding visibility
    const guideGeometry = new THREE.TubeGeometry(this.trackSpline, 300, 0.65, 8, true);
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
        dash.position.copy(pt).add(new THREE.Vector3(0, 0.05, 0));
        dash.lookAt(pt.clone().add(tangent));
        this.scene.add(dash);
      }

      // Border dots
      const leftPos = pt.clone().add(binormal.clone().multiplyScalar(-13.8));
      const leftRing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 5), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      leftRing.position.copy(leftPos).add(new THREE.Vector3(0, 0.1, 0));
      this.scene.add(leftRing);

      const rightPos = pt.clone().add(binormal.clone().multiplyScalar(13.8));
      const rightRing = new THREE.Mesh(new THREE.SphereGeometry(0.4, 5, 5), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
      rightRing.position.copy(rightPos).add(new THREE.Vector3(0, 0.1, 0));
      this.scene.add(rightRing);

      // Trees
      if (i % 6 === 0) {
        const treePos = pt.clone().add(binormal.clone().multiplyScalar(21));
        const h = 7 + Math.random() * 8;
        const tree = new THREE.Mesh(
          new THREE.ConeGeometry(3.5, h, 4),
          new THREE.MeshStandardMaterial({
            color: Math.random() > 0.5 ? 0x22d3ee : 0xec4899,
            roughness: 0.1,
            metalness: 0.5,
            emissive: Math.random() > 0.5 ? 0x06b6d4 : 0xdb2777,
            emissiveIntensity: 0.45
          })
        );
        tree.position.copy(treePos);
        tree.position.y += h / 2;
        this.decorativeGroup.add(tree);
      }
    }

    // Finish Gate
    const gateGroup = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 16, 6), new THREE.MeshBasicMaterial({ color: 0x334155 }));
    p1.position.set(-15, 8, 0);
    const p2 = p1.clone();
    p2.position.set(15, 8, 0);

    const cross = new THREE.Mesh(new THREE.BoxGeometry(32, 2, 3), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    cross.position.set(0, 16, 0);

    const banner = new THREE.Mesh(new THREE.BoxGeometry(14, 2.0, 3.2), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    banner.position.set(0, 16, 0);

    gateGroup.add(p1, p2, cross, banner);
    const tg = this.trackSpline.getTangentAt(0).normalize();
    gateGroup.lookAt(tg);
    gateGroup.position.copy(this.trackSpline.getPointAt(0));
    this.scene.add(gateGroup);
  }

  createKart(colorHex: number, nozzleColorHex: number, isPlayer: boolean = false, auraId?: string) {
    const kartGroup = new THREE.Group();

    // Chassis body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.9,
      roughness: 0.15
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 4.2), bodyMat);
    body.position.y = 0.5;
    kartGroup.add(body);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 1.4), bodyMat);
    nose.position.set(0, 0.4, 2.3);
    kartGroup.add(nose);

    const wingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 1.0), wingMat);
    wing.position.set(0, 1.7, -2.2);

    const supLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.3, 0.25), wingMat);
    supLeft.position.set(-1.1, 1.0, -2.1);
    const supRight = supLeft.clone();
    supRight.position.x = 1.1;
    kartGroup.add(wing, supLeft, supRight);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.6, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    wheelGeo.rotateZ(Math.PI / 2);

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

      // Spawn two boxes side-by-side at each milestone
      const divisions = [-2.8, 2.8];
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
        boxMesh.position.copy(spawnPos);
        boxMesh.position.y += 2.0;

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

      const positions = [-3.0, 3.0];
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
        coinMesh.position.copy(spawnPos);
        coinMesh.position.y += 1.4;

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
    this.aiProgress = 0;

    this.obstacles.forEach(obs => this.scene.remove(obs.mesh));
    this.obstacles = [];

    const startPoint = this.trackSpline.getPointAt(0);
    const startDir = this.trackSpline.getTangentAt(0).normalize();

    this.playerKart.mesh.position.copy(startPoint);
    const sideOffset = startDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-3);
    this.playerKart.mesh.position.add(sideOffset);

    this.angle = Math.atan2(startDir.x, startDir.z);
    this.playerKart.mesh.rotation.y = this.angle;

    this.aiKart.mesh.position.copy(startPoint);
    const aiSideOffset = startDir.clone().cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(3);
    this.aiKart.mesh.position.add(aiSideOffset);
    this.aiKart.mesh.rotation.y = this.angle;

    this.spawnItemBoxes();
    this.spawnCoins();
  }

  activateEngine() {
    this.active = true;
    this.spawnItemBoxes();
    this.spawnCoins();
  }

  useBooster() {
    this.boosterActive = true;
    this.boosterTimer = 180;
    AudioEngine.playBoost();
  }

  activateBooster() {
    this.useBooster();
  }

  shootMissile() {
    const missile = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    missile.geometry.rotateX(Math.PI / 2);
    missile.position.copy(this.playerKart.mesh.position);
    this.scene.add(missile);

    let progress = 0;
    const launchInterval = setInterval(() => {
      progress += 0.06;
      missile.position.lerp(this.aiKart.mesh.position, progress);
      this.createSmokeParticle(missile.position, 0xf43f5e, 0.4);

      if (progress >= 1.0) {
        clearInterval(launchInterval);
        this.scene.remove(missile);
        this.triggerAICrash();
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
  }

  update(keys: Record<string, any>, driftStatsWeight = 1.8) {
    if (!this.active) return;

    this.timer += 16.67;

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
    const forward = keys.ArrowUp || keys.w;
    const backward = keys.ArrowDown || keys.s;
    const left = keys.ArrowLeft || keys.a;
    const right = keys.ArrowRight || keys.d;
    const driftKey = keys.Shift;

    if (forward) {
      this.speed += this.accel;
      if (this.speed > currentLimit) this.speed = currentLimit;
    } else if (backward) {
      this.speed -= this.accel;
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

    // Drift Logic
    if (driftKey && Math.abs(angleDiff) > 0 && this.speed > 0.3) {
      if (!this.isDrifting) {
        this.isDrifting = true;
        this.driftDirection = angleDiff > 0 ? 1 : -1;
        AudioEngine.playDrift();
      }
      AudioEngine.setDriftActive(true);

      // Boost drifting carve efficiency with a sharper 1.75x steering rate for intense cornering feel
      angleDiff *= 1.75;
      this.driftAngle = -this.driftDirection * 0.58;

      const leftTyreOffset = new THREE.Vector3(-1.3, 0.1, -1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
      const rightTyreOffset = new THREE.Vector3(1.3, 0.1, -1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle);
      
      const leftTirePos = this.playerKart.mesh.position.clone().add(leftTyreOffset);
      const rightTirePos = this.playerKart.mesh.position.clone().add(rightTyreOffset);
      
      // Dual wheel drift smoke: hot pink on the left, glowing cyan on the right
      this.createSmokeParticle(leftTirePos, 0xff007f, 0.48);
      this.createSmokeParticle(rightTirePos, 0x06b6d4, 0.48);

      // Wind speed line particles for premium drift feel
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

      // Charge Gauge (boost active multiplier)
      this.boosterGauge += ((this.isSuperNitro ? 6.5 : 1.25) * driftStatsWeight); // enhanced gauge charge rate for epic carves
      if (this.boosterGauge >= 100) {
        this.boosterGauge = 0;
        this.boosterStock++;
        this.onBoosterCountChange(this.boosterStock);
      }
      this.onBoosterGaugeChange(this.boosterGauge);
    } else {
      if (this.isDrifting) {
        this.isDrifting = false;
        AudioEngine.setDriftActive(false);
      }
      this.driftAngle *= 0.78; // Snappier recovery out of drift
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

    // Outer wall check
    const nearestT = this.getNearestTrackSplinePoint(this.playerKart.mesh.position);
    const centerPt = this.trackSpline.getPointAt(nearestT);
    this.playerKart.mesh.position.y = 0;

    const dist = this.playerKart.mesh.position.distanceTo(centerPt);
    const maxRoadRadius = 13.5;

    if (dist > maxRoadRadius) {
      const pushDir = new THREE.Vector3().subVectors(this.playerKart.mesh.position, centerPt);
      pushDir.y = 0;
      pushDir.normalize();

      this.playerKart.mesh.position.copy(centerPt).add(pushDir.multiplyScalar(maxRoadRadius));

      if (this.speed > 0.15) {
        // Wall scrap slide physics with gradual velocity decay as requested instead of abrupt backward bounce
        this.speed *= 0.92;
        
        // Throttled notification and audio play to prevent UI stutter logs
        if (!this.lastCrashTime || Date.now() - this.lastCrashTime > 1200) {
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

    // Speed callback
    this.onSpeedChange(Math.floor((Math.abs(this.speed) / this.maxSpeed) * 210));

    this.updateAIRacer();
    this.checkCollisions();
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

      this.aiKart.mesh.position.lerp(targetPos, 0.25);
      this.aiKart.mesh.position.y = 0.22; // float slightly above ground like a hover phantom!

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
    if (this.aiProgress > 1.0) this.aiProgress -= 1.0;

    const currentPos = this.aiKart.mesh.position.clone();
    const targetPos = this.trackSpline.getPointAt(this.aiProgress);

    // Smoothly interpolate positions
    this.aiKart.mesh.position.lerp(targetPos, 0.22);
    this.aiKart.mesh.position.y = 0;

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
        kart = this.createKart(pKartInfo.color, pKartInfo.flameColor, false);
        
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
    if (nearestT > 0.45 && nearestT < 0.55) {
      this.lapCheckpoints[0] = true;
    }
    if (nearestT > 0.8 && nearestT < 0.9) {
      this.lapCheckpoints[1] = true;
    }

    // Start-Fin line
    if (nearestT > 0.96 && this.lapCheckpoints[0] && this.lapCheckpoints[1]) {
      this.lapCheckpoints = [false, false];
      this.lap++;

      if (this.lap > this.maxLaps) {
        const playerWon = nearestT >= this.aiProgress;
        this.onGameFinished(playerWon, this.timer);
      } else {
        this.onLapChange(this.lap);
      }
    }
  }

  getNearestTrackSplinePoint(pos: THREE.Vector3) {
    let closestT = 0;
    let minDist = Infinity;
    const samples = 120;
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
