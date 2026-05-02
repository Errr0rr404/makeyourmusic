// Custom-trained agents.
//
// We don't actually fine-tune a music model (no provider exposes that for
// music yet). Instead we extract a dense ~200-400 word "style profile"
// from the training examples and lock it into AiAgent.genConfig. Every
// subsequent generation under that agent reads the profile and feeds it
// into the orchestration prompt as additional `styleContext`, so the
// agent's voice stays consistent across tracks.
//
// Training set lives on AiAgent.genConfig:
//   {
//     ...persona fields...
//     trainingExamples: [{ audioUrl, description, addedAt }],
//     styleProfile: string,       // derived
//     styleProfileVersion: number, // bumped when re-derived
//   }

import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { minimaxChat } from '../utils/minimax';

const MAX_EXAMPLES = 10;
const MAX_DESCRIPTION_LEN = 500;

// Per-user-per-day cap on derive calls. A derive runs one chat completion;
// 20/day is generous (an agent owner re-deriving on every example tweak).
const DAILY_DERIVE_CAP = 20;
const deriveCounts = new Map<string, { day: string; count: number }>();
function bumpDerive(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const existing = deriveCounts.get(userId);
  if (!existing || existing.day !== day) {
    deriveCounts.set(userId, { day, count: 1 });
    return true;
  }
  if (existing.count >= DAILY_DERIVE_CAP) return false;
  existing.count += 1;
  return true;
}

interface TrainingExample {
  audioUrl: string;
  description?: string;
  addedAt: string;
}

interface TrainingState {
  examples: TrainingExample[];
  styleProfile?: string;
  styleProfileVersion: number;
}

function readTrainingState(genConfig: unknown): TrainingState {
  const cfg = (genConfig && typeof genConfig === 'object' ? (genConfig as Record<string, unknown>) : {}) as Record<string, unknown>;
  const examples = Array.isArray(cfg.trainingExamples)
    ? (cfg.trainingExamples as unknown[]).filter((e) => e && typeof e === 'object').map((e) => {
        const o = e as Record<string, unknown>;
        return {
          audioUrl: typeof o.audioUrl === 'string' ? o.audioUrl : '',
          description: typeof o.description === 'string' ? o.description : undefined,
          addedAt: typeof o.addedAt === 'string' ? o.addedAt : new Date().toISOString(),
        };
      }).filter((e) => e.audioUrl)
    : [];
  return {
    examples,
    styleProfile: typeof cfg.styleProfile === 'string' ? cfg.styleProfile : undefined,
    styleProfileVersion: typeof cfg.styleProfileVersion === 'number' ? cfg.styleProfileVersion : 0,
  };
}

function writeTrainingState(genConfig: unknown, patch: Partial<TrainingState>): Record<string, unknown> {
  const cfg = (genConfig && typeof genConfig === 'object' ? (genConfig as Record<string, unknown>) : {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...cfg };
  if (patch.examples !== undefined) next.trainingExamples = patch.examples;
  if (patch.styleProfile !== undefined) next.styleProfile = patch.styleProfile;
  if (patch.styleProfileVersion !== undefined) next.styleProfileVersion = patch.styleProfileVersion;
  return next;
}

async function loadOwnedAgent(userId: string, agentId: string) {
  const agent = await prisma.aiAgent.findUnique({
    where: { id: agentId },
    select: { id: true, ownerId: true, genConfig: true, name: true },
  });
  if (!agent) return null;
  if (agent.ownerId !== userId) return 'forbidden' as const;
  return agent;
}

// GET /api/agent-training/:agentId
export const getTrainingState = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const result = await loadOwnedAgent(req.user.userId, req.params.agentId as string);
    if (!result) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (result === 'forbidden') {
      res.status(403).json({ error: 'You do not own this agent' });
      return;
    }
    const state = readTrainingState(result.genConfig);
    res.json({
      agent: { id: result.id, name: result.name },
      examples: state.examples,
      styleProfile: state.styleProfile || null,
      styleProfileVersion: state.styleProfileVersion,
    });
  } catch (error) {
    logger.error('getTrainingState error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load training state' });
  }
};

// POST /api/agent-training/:agentId/examples — body { audioUrl, description? }
export const addTrainingExample = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { audioUrl, description } = req.body || {};
    if (typeof audioUrl !== 'string' || !/^https?:\/\//i.test(audioUrl)) {
      res.status(400).json({ error: 'audioUrl must be a public https URL' });
      return;
    }
    if (audioUrl.length > 1000) {
      res.status(400).json({ error: 'audioUrl too long' });
      return;
    }
    const result = await loadOwnedAgent(req.user.userId, req.params.agentId as string);
    if (!result) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (result === 'forbidden') {
      res.status(403).json({ error: 'You do not own this agent' });
      return;
    }

    const state = readTrainingState(result.genConfig);
    if (state.examples.length >= MAX_EXAMPLES) {
      res.status(400).json({ error: `Up to ${MAX_EXAMPLES} examples per agent` });
      return;
    }
    const example: TrainingExample = {
      audioUrl,
      description: typeof description === 'string'
        ? description.trim().slice(0, MAX_DESCRIPTION_LEN) || undefined
        : undefined,
      addedAt: new Date().toISOString(),
    };
    const nextExamples = [...state.examples, example];
    // Adding an example invalidates the prior derived profile — force re-train.
    const updated = writeTrainingState(result.genConfig, {
      examples: nextExamples,
      styleProfile: undefined,
      styleProfileVersion: state.styleProfileVersion + 1,
    });
    await prisma.aiAgent.update({
      where: { id: result.id },
      data: { genConfig: updated as Prisma.InputJsonValue },
    });
    res.status(201).json({ examples: nextExamples });
  } catch (error) {
    logger.error('addTrainingExample error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to add example' });
  }
};

// DELETE /api/agent-training/:agentId/examples/:index
export const removeTrainingExample = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const idx = parseInt(req.params.index as string, 10);
    if (!Number.isFinite(idx) || idx < 0) {
      res.status(400).json({ error: 'Invalid example index' });
      return;
    }
    const result = await loadOwnedAgent(req.user.userId, req.params.agentId as string);
    if (!result) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (result === 'forbidden') {
      res.status(403).json({ error: 'You do not own this agent' });
      return;
    }
    const state = readTrainingState(result.genConfig);
    if (idx >= state.examples.length) {
      res.status(404).json({ error: 'Example not found' });
      return;
    }
    const nextExamples = [...state.examples.slice(0, idx), ...state.examples.slice(idx + 1)];
    const updated = writeTrainingState(result.genConfig, {
      examples: nextExamples,
      styleProfile: undefined,
      styleProfileVersion: state.styleProfileVersion + 1,
    });
    await prisma.aiAgent.update({
      where: { id: result.id },
      data: { genConfig: updated as Prisma.InputJsonValue },
    });
    res.json({ examples: nextExamples });
  } catch (error) {
    logger.error('removeTrainingExample error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to remove example' });
  }
};

// POST /api/agent-training/:agentId/derive — derive the style profile.
export const deriveStyleProfile = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!bumpDerive(req.user.userId)) {
      res.status(429).json({ error: `Daily derive cap (${DAILY_DERIVE_CAP}) reached` });
      return;
    }
    const result = await loadOwnedAgent(req.user.userId, req.params.agentId as string);
    if (!result) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    if (result === 'forbidden') {
      res.status(403).json({ error: 'You do not own this agent' });
      return;
    }
    const state = readTrainingState(result.genConfig);
    if (state.examples.length === 0) {
      res.status(400).json({ error: 'Add at least one training example before deriving' });
      return;
    }

    // Build the derive prompt. We don't have the audio content itself —
    // chat-completions models can't hear audio — so we ask the model to
    // synthesize a profile from the user's descriptions plus the audio
    // URLs as opaque references. When the user neglected to write
    // descriptions, the profile is correspondingly weaker; the UI tells
    // them so.
    const exampleLines = state.examples.map((e, i) => {
      const desc = e.description?.trim() || '(no description provided)';
      return `Example ${i + 1}: ${desc}`;
    });

    const system =
      `You are a music director synthesizing a CONSISTENT artistic style profile for an AI music agent. ` +
      `You will receive descriptions of training reference tracks the user supplied. Produce a 200-400 word profile that, ` +
      `when fed as guidance to a music-generation model, will keep the agent's output sonically consistent across tracks.\n\n` +
      `THE PROFILE MUST INCLUDE:\n` +
      `- Core sonic palette (primary instruments, sound design textures, sample choices).\n` +
      `- Production aesthetic (mix style, reverb/space, saturation, stereo width, bus glue).\n` +
      `- Rhythmic / groove conventions (BPM range, time-feel, characteristic drum patterns).\n` +
      `- Vocal qualities, IF examples include vocals (timbre, processing, delivery, harmonies).\n` +
      `- Emotional / atmospheric range.\n` +
      `- 5-8 specific stylistic non-negotiables ("always uses...", "avoids...").\n\n` +
      `RULES:\n` +
      `1. NEVER mention or echo any specific artist or band names — even if the user did. Translate to descriptors.\n` +
      `2. Output prose, not bullet points. The profile is fed verbatim into another prompt.\n` +
      `3. Be concrete. "Warm tape saturation" beats "good production". Use sensory language.\n` +
      `4. Keep it tight: 200-400 words. Long-winded profiles dilute the signal in downstream prompts.`;

    const user =
      `Agent name: ${result.name}\n\n` +
      `Training references:\n${exampleLines.join('\n')}\n\n` +
      `Synthesize the style profile.`;

    const chatResult = await minimaxChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens: 800,
      temperature: 0.7,
    });

    const profile = chatResult.text.trim();
    if (!profile || profile.length < 80) {
      res.status(502).json({ error: 'Provider returned an empty / invalid profile' });
      return;
    }
    const updated = writeTrainingState(result.genConfig, {
      styleProfile: profile,
      styleProfileVersion: state.styleProfileVersion + 1,
    });
    await prisma.aiAgent.update({
      where: { id: result.id },
      data: { genConfig: updated as Prisma.InputJsonValue },
    });

    res.json({
      styleProfile: profile,
      styleProfileVersion: state.styleProfileVersion + 1,
    });
  } catch (error) {
    logger.error('deriveStyleProfile error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to derive style profile' });
  }
};
