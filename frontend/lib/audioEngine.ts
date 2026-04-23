/**
 * AudioEngine — Web Audio API wrapper for EQ + crossfade.
 *
 * Two audio elements feed into the same EQ + master gain chain so crossfade
 * can animate each source's gain independently:
 *
 *   <audio A> → sourceA → gainA ─┐
 *                                 ├→ EQ filters → masterGain → destination
 *   <audio B> → sourceB → gainB ─┘
 *
 * When EQ is disabled or audio is cross-origin (no CORS headers), the engine
 * is bypassed and the player falls back to direct element.volume control.
 */

import { usePlayerStore, DEFAULT_EQ_BANDS, type EQBand } from '@morlo/shared';

export type SourceSlot = 'a' | 'b';

interface SlotNodes {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  element: HTMLAudioElement;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private slots: { a?: SlotNodes; b?: SlotNodes } = {};
  private filterNodes: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private connected = false;

  /**
   * Initialize the AudioContext and connect both audio elements through the
   * EQ chain. Safe to call repeatedly with the same elements.
   */
  init(audioA: HTMLAudioElement, audioB: HTMLAudioElement) {
    if (
      this.connected &&
      this.slots.a?.element === audioA &&
      this.slots.b?.element === audioB
    ) {
      return;
    }

    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Tear down any existing wiring
    this.disconnectAll();

    // EQ chain
    this.filterNodes = DEFAULT_EQ_BANDS.map((band, i) => {
      const filter = this.ctx!.createBiquadFilter();
      if (i === 0) filter.type = 'lowshelf';
      else if (i === DEFAULT_EQ_BANDS.length - 1) filter.type = 'highshelf';
      else { filter.type = 'peaking'; filter.Q.value = 1.4; }
      filter.frequency.value = band.frequency;
      filter.gain.value = 0;
      return filter;
    });

    // Master gain (= user volume)
    this.masterGain = this.ctx.createGain();

    // Wire EQ → masterGain → destination
    let head: AudioNode | null = null;
    let tail: AudioNode | null = null;
    for (const filter of this.filterNodes) {
      if (!head) { head = filter; tail = filter; }
      else { tail!.connect(filter); tail = filter; }
    }
    if (tail) tail.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Build per-slot source + gain, both feeding into EQ head
    const buildSlot = (el: HTMLAudioElement, slot: SourceSlot): SlotNodes => {
      const source = this.ctx!.createMediaElementSource(el);
      const gain = this.ctx!.createGain();
      // Slot A starts active (gain=1), slot B silent (gain=0)
      gain.gain.value = slot === 'a' ? 1 : 0;
      source.connect(gain);
      gain.connect(head ?? this.masterGain!);
      return { source, gain, element: el };
    };

    this.slots = {
      a: buildSlot(audioA, 'a'),
      b: buildSlot(audioB, 'b'),
    };

    this.connected = true;
    this.syncFromStore();
  }

  isConnected() { return this.connected; }

  /** Set a slot's gain directly (0..1). For crossfade ramps. */
  setSlotGain(slot: SourceSlot, value: number) {
    const node = this.slots[slot];
    if (node) node.gain.gain.value = Math.max(0, Math.min(1, value));
  }

  /**
   * Schedule a linear ramp on a slot's gain over `seconds`. Cancels any
   * previously-scheduled values on that gain.
   */
  rampSlotGain(slot: SourceSlot, target: number, seconds: number) {
    const node = this.slots[slot];
    if (!node || !this.ctx) return;
    const now = this.ctx.currentTime;
    const g = node.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(Math.max(0, Math.min(1, target)), now + Math.max(0.01, seconds));
  }

  /** Update EQ band gains. */
  updateEQ(bands: EQBand[], enabled: boolean) {
    if (!this.filterNodes.length) return;
    this.filterNodes.forEach((filter, i) => {
      filter.gain.value = enabled ? (bands[i]?.gain ?? 0) : 0;
    });
  }

  /** Set playback speed on both elements (so a queued track inherits the rate). */
  setPlaybackSpeed(speed: number) {
    if (this.slots.a) this.slots.a.element.playbackRate = speed;
    if (this.slots.b) this.slots.b.element.playbackRate = speed;
  }

  /** Set the master volume (user-controlled). */
  setVolume(volume: number) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /** Apply current store state to the engine. */
  syncFromStore() {
    const state = usePlayerStore.getState();
    this.updateEQ(state.eqBands, state.eqEnabled);
    this.setPlaybackSpeed(state.playbackSpeed);
    this.setVolume(state.volume);
  }

  getContext(): AudioContext | null { return this.ctx; }

  private disconnectAll() {
    for (const slot of Object.values(this.slots)) {
      if (!slot) continue;
      try { slot.source.disconnect(); } catch {}
      try { slot.gain.disconnect(); } catch {}
    }
    this.slots = {};
    this.filterNodes.forEach((f) => { try { f.disconnect(); } catch {} });
    this.filterNodes = [];
    if (this.masterGain) { try { this.masterGain.disconnect(); } catch {} }
    this.masterGain = null;
  }

  destroy() {
    this.disconnectAll();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.connected = false;
  }
}

export const audioEngine = new AudioEngine();
