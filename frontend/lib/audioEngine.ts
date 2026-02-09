/**
 * AudioEngine — Web Audio API wrapper for EQ, playback speed, crossfade.
 *
 * Connects an HTMLAudioElement through a chain of BiquadFilterNodes:
 *
 *   <audio> → MediaElementSource → [EQ Filters] → GainNode → destination
 */

import { usePlayerStore, DEFAULT_EQ_BANDS, type EQBand } from '@morlo/shared';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private connected = false;

  /**
   * Initialize the AudioContext and connect the filter chain.
   * Must be called after user interaction (autoplay policy).
   */
  init(audioElement: HTMLAudioElement) {
    if (this.connected && this.audioElement === audioElement) return;

    // Create context on first call
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume suspended context (autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Disconnect previous source
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
    }

    this.audioElement = audioElement;

    // Create source
    this.sourceNode = this.ctx.createMediaElementSource(audioElement);

    // Create gain node
    this.gainNode = this.ctx.createGain();

    // Create EQ filter nodes for each band
    this.filterNodes = DEFAULT_EQ_BANDS.map((band, i) => {
      const filter = this.ctx!.createBiquadFilter();

      // First band = lowshelf, last = highshelf, middle = peaking
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === DEFAULT_EQ_BANDS.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4; // Moderate Q for musical EQ
      }

      filter.frequency.value = band.frequency;
      filter.gain.value = 0;

      return filter;
    });

    // Connect the chain: source → filter[0] → filter[1] → ... → gain → destination
    let currentNode: AudioNode = this.sourceNode;
    for (const filter of this.filterNodes) {
      currentNode.connect(filter);
      currentNode = filter;
    }
    currentNode.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.connected = true;

    // Apply current store state
    this.syncFromStore();
  }

  /**
   * Update EQ band gains from the store.
   */
  updateEQ(bands: EQBand[], enabled: boolean) {
    if (!this.filterNodes.length) return;

    this.filterNodes.forEach((filter, i) => {
      filter.gain.value = enabled ? (bands[i]?.gain ?? 0) : 0;
    });
  }

  /**
   * Update a single EQ band.
   */
  updateBand(index: number, gain: number, enabled: boolean) {
    if (index < 0 || index >= this.filterNodes.length) return;
    const filter = this.filterNodes[index];
    if (filter) filter.gain.value = enabled ? gain : 0;
  }

  /**
   * Set playback speed on the audio element.
   */
  setPlaybackSpeed(speed: number) {
    if (this.audioElement) {
      this.audioElement.playbackRate = speed;
    }
  }

  /**
   * Set volume via the gain node (preserves EQ chain).
   */
  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  /**
   * Read current state from store and apply.
   */
  syncFromStore() {
    const state = usePlayerStore.getState();
    this.updateEQ(state.eqBands, state.eqEnabled);
    this.setPlaybackSpeed(state.playbackSpeed);
  }

  /**
   * Get the AudioContext (for visualizations etc).
   */
  getContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Get the source node (for analyzer connections).
   */
  getSourceNode(): MediaElementAudioSourceNode | null {
    return this.sourceNode;
  }

  /**
   * Destroy and clean up.
   */
  destroy() {
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
    }
    this.filterNodes.forEach((f) => {
      try { f.disconnect(); } catch {}
    });
    if (this.gainNode) {
      try { this.gainNode.disconnect(); } catch {}
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.sourceNode = null;
    this.filterNodes = [];
    this.gainNode = null;
    this.audioElement = null;
    this.connected = false;
  }
}

// Singleton
export const audioEngine = new AudioEngine();
