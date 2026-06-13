// ─── Audio Manager ────────────────────────────────────────────────────────────
// Centralized audio system using Web Audio API.
// Singleton — one instance per game session.

import { createLogger } from '@/core/Logger';

interface AudioSource {
  readonly buffer: AudioBuffer;
  readonly volume: number;
}

const log = createLogger('AudioManager');

class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sources: Map<string, AudioSource> = new Map();
  private currentMusic: AudioBufferSourceNode | null = null;
  private degraded = false;

  /** Create AudioContext, master gain, music gain. Connect musicGain -> masterGain -> destination. */
  async init(): Promise<void> {
    if (this.context) return;

    try {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.masterGain);

      log.info('Audio initialized');
    } catch (err) {
      log.warn('Failed to create AudioContext, audio will be degraded', err);
      this.degraded = true;
    }
  }

  /** Fetch an audio file, decode it, and store in the sources map. */
  async loadSound(name: string, url: string, volume = 1.0): Promise<void> {
    if (this.degraded || !this.context) {
      log.warn(`Cannot load sound "${name}" — AudioContext unavailable`);
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        log.warn(`Failed to load sound "${name}" from ${url}: ${response.status}`);
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.context.decodeAudioData(arrayBuffer);
      this.sources.set(name, { buffer, volume });
      log.debug(`Loaded sound: ${name}`);
    } catch (err) {
      log.warn(`Failed to load sound "${name}":`, err);
    }
  }

  /** Play a loaded sound. Creates a BufferSource connected through a per-source gain -> masterGain. */
  playSound(name: string, loop = false): void {
    if (this.degraded || !this.context || !this.masterGain) return;

    const source = this.sources.get(name);
    if (!source) {
      log.warn(`Sound "${name}" not loaded`);
      return;
    }

    try {
      const bufferSource = this.context.createBufferSource();
      bufferSource.buffer = source.buffer;
      bufferSource.loop = loop;

      const gainNode = this.context.createGain();
      gainNode.gain.value = source.volume;

      bufferSource.connect(gainNode);
      gainNode.connect(this.masterGain);
      bufferSource.start(0);
    } catch (err) {
      log.warn(`Failed to play sound "${name}":`, err);
    }
  }

  /** Play background music through musicGain for separate volume control. */
  playMusic(name: string): void {
    if (this.degraded || !this.context || !this.musicGain) return;

    const source = this.sources.get(name);
    if (!source) {
      log.warn(`Music "${name}" not loaded`);
      return;
    }

    try {
      // Stop any currently playing music
      this.stopMusic();

      const bufferSource = this.context.createBufferSource();
      bufferSource.buffer = source.buffer;
      bufferSource.loop = true;

      bufferSource.connect(this.musicGain);
      bufferSource.start(0);
      this.currentMusic = bufferSource;
    } catch (err) {
      log.warn(`Failed to play music "${name}":`, err);
    }
  }

  /** Stop currently playing background music. */
  stopMusic(): void {
    if (!this.currentMusic) return;

    try {
      this.currentMusic.stop();
    } catch {
      // Source may have already stopped — ignore
    }
    this.currentMusic = null;
  }

  /** Set master volume (0–1). */
  setMasterVolume(v: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  /** Set music volume (0–1). */
  setMusicVolume(v: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  /** Resume AudioContext if suspended (needed for browser autoplay policy). */
  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      try {
        await this.context.resume();
        log.info('AudioContext resumed');
      } catch (err) {
        log.warn('Failed to resume AudioContext:', err);
      }
    }
  }
}

export const audioManager = new AudioManager();
