// Discord slash-command webhook handler.
//
// Discord posts every interaction (slash command, button click, modal
// submit) to our public HTTPS endpoint with an Ed25519 signature in
// `X-Signature-Ed25519` + `X-Signature-Timestamp`. We verify with the
// application's PUBLIC key, then return either an immediate response (for
// `/music help`, `/music link`) or a "deferred" response and follow up
// later with the audio URL when the generation completes.
//
// Linking flow:
//   user runs `/music link` in Discord → we mint a 6-char code, return it
//   ephemerally → user pastes code on /settings/discord → backend binds
//   their MakeYourMusic user to the discord user.
//
// Generation flow:
//   user runs `/music create prompt:<text>` → we kick off a music
//   generation against their linked api key (or a shared free-tier key
//   when unlinked) → return a deferred response, then post a follow-up
//   with the audio URL once the generation completes.

import crypto from 'crypto';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { minimaxGenerateMusic } from '../utils/minimax';

const DISCORD_API = 'https://discord.com/api/v10';

// Discord interaction types
const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
// Response types
const RESPONSE_TYPE_PONG = 1;
const RESPONSE_TYPE_CHANNEL_MESSAGE = 4;
const RESPONSE_TYPE_DEFERRED_CHANNEL_MESSAGE = 5;
// Flag for ephemeral (only the invoker sees it)
const FLAG_EPHEMERAL = 64;

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generateLinkCode(len = 6): string {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return out;
}

// Verify the Ed25519 signature Discord puts on every webhook delivery. We
// must do this BEFORE any JSON parsing — if the body changes, the signature
// won't validate.
function verifyDiscordSignature(rawBody: string, signature: string, timestamp: string): boolean {
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKeyHex || !/^[a-f0-9]{64}$/i.test(publicKeyHex)) return false;
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  try {
    // Node 19+ supports raw Ed25519 import via createPublicKey + 'der' format.
    // Wrap the 32-byte key in a SubjectPublicKeyInfo DER blob.
    const der = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKeyHex, 'hex'),
    ]);
    const key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    const data = Buffer.from(timestamp + rawBody, 'utf8');
    const sigBuf = Buffer.from(signature, 'hex');
    return crypto.verify(null, data, key, sigBuf);
  } catch (err) {
    logger.warn('discord: signature verify error', { error: (err as Error).message });
    return false;
  }
}

// POST /api/integrations/discord/interactions — Discord webhook.
// Discord requires the response body within 3s; for slow operations we
// return type 5 (deferred) and follow up via webhook later.
export const discordInteractions = async (req: Request, res: Response) => {
  try {
    const signature = (req.header('X-Signature-Ed25519') || '').toLowerCase();
    const timestamp = req.header('X-Signature-Timestamp') || '';
    // Express has already parsed the JSON body by the time it gets here, so
    // we re-stringify with a stable order. This means body-parser's express.json
    // is fine for the verification; the signature covers the BYTES of the
    // request body and we re-serialize from the parsed object. To avoid
    // edge cases with key ordering, the route mount uses raw body handling.
    const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);
    if (!verifyDiscordSignature(rawBody, signature, timestamp)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const body = req.body as {
      type?: number;
      data?: { name?: string; options?: Array<{ name?: string; type?: number; value?: string; options?: any[] }> };
      member?: { user?: { id?: string; username?: string } };
      user?: { id?: string; username?: string };
      token?: string;
      application_id?: string;
    };

    // PING — Discord uses this to verify the endpoint at config time.
    if (body.type === INTERACTION_TYPE_PING) {
      res.json({ type: RESPONSE_TYPE_PONG });
      return;
    }

    if (body.type !== INTERACTION_TYPE_APPLICATION_COMMAND) {
      res.json({ type: RESPONSE_TYPE_CHANNEL_MESSAGE, data: { content: 'Unsupported interaction', flags: FLAG_EPHEMERAL } });
      return;
    }

    const cmd = body.data?.name;
    if (cmd !== 'music') {
      res.json({ type: RESPONSE_TYPE_CHANNEL_MESSAGE, data: { content: 'Unknown command', flags: FLAG_EPHEMERAL } });
      return;
    }

    // The /music command has subcommands: create, link, help.
    const sub = body.data?.options?.[0];
    const subName = sub?.name;
    const discordUserId = body.member?.user?.id || body.user?.id;
    if (!discordUserId) {
      res.json({ type: RESPONSE_TYPE_CHANNEL_MESSAGE, data: { content: 'Could not identify your Discord account', flags: FLAG_EPHEMERAL } });
      return;
    }

    if (subName === 'help') {
      res.json({
        type: RESPONSE_TYPE_CHANNEL_MESSAGE,
        data: {
          content:
            '**MakeYourMusic — /music commands**\n' +
            '`/music create prompt:<idea>` — generate a song\n' +
            '`/music link` — link this Discord account to your MakeYourMusic profile\n' +
            '`/music help` — show this',
          flags: FLAG_EPHEMERAL,
        },
      });
      return;
    }

    if (subName === 'link') {
      const code = generateLinkCode(6);
      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
      // Upsert a row keyed by discord user id with the new code. If a
      // previous unbound code exists we overwrite it.
      await prisma.discordIntegration.upsert({
        where: { discordUserId },
        create: { discordUserId, linkCode: code, linkExpires: expires },
        update: { linkCode: code, linkExpires: expires },
      });
      const url = (process.env.FRONTEND_URL || '').split(',')[0]?.trim() || 'https://makeyourmusic.ai';
      res.json({
        type: RESPONSE_TYPE_CHANNEL_MESSAGE,
        data: {
          content:
            `**Your link code:** \`${code}\`\n` +
            `Visit ${url}/settings/discord, paste the code, and you're set. Code expires in 30 minutes.`,
          flags: FLAG_EPHEMERAL,
        },
      });
      return;
    }

    if (subName === 'create') {
      const promptOpt = sub?.options?.find((o: any) => o.name === 'prompt');
      const prompt = typeof promptOpt?.value === 'string' ? promptOpt.value.trim() : '';
      if (!prompt) {
        res.json({
          type: RESPONSE_TYPE_CHANNEL_MESSAGE,
          data: { content: 'Provide a prompt: `/music create prompt:lofi pluto walking`', flags: FLAG_EPHEMERAL },
        });
        return;
      }

      // Resolve linked user, fall back to shared free-tier api key.
      const integration = await prisma.discordIntegration.findUnique({ where: { discordUserId } });
      const linkedUserId = integration?.userId || null;

      // Ack immediately so Discord doesn't time us out at 3s.
      res.json({ type: RESPONSE_TYPE_DEFERRED_CHANNEL_MESSAGE });

      // Background work — kick off the generation, then PATCH the deferred
      // response with the result via Discord's webhook follow-up endpoint.
      void runDiscordGeneration({
        prompt,
        linkedUserId,
        discordUserId,
        applicationId: body.application_id || process.env.DISCORD_APPLICATION_ID || '',
        token: body.token || '',
      }).catch((err) => logger.error('discord: generation worker crashed', { error: (err as Error).message }));
      return;
    }

    res.json({ type: RESPONSE_TYPE_CHANNEL_MESSAGE, data: { content: 'Unknown subcommand', flags: FLAG_EPHEMERAL } });
  } catch (error) {
    logger.error('discordInteractions error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to process interaction' });
  }
};

interface GenerationContext {
  prompt: string;
  linkedUserId: string | null;
  discordUserId: string;
  applicationId: string;
  token: string;
}

async function runDiscordGeneration(ctx: GenerationContext): Promise<void> {
  const { prompt, linkedUserId, applicationId, token } = ctx;
  if (!applicationId || !token) {
    logger.warn('discord: missing applicationId/token for follow-up');
    return;
  }

  const followUrl = `${DISCORD_API}/webhooks/${applicationId}/${token}`;

  // We also persist a minimal MusicGeneration row so usage shows up in the
  // user's history when they're linked. Unlinked invocations write to a
  // synthetic system user — to avoid that complexity, we DON'T persist when
  // unlinked; instead we just generate ephemerally and post the result.
  let generationId: string | null = null;
  if (linkedUserId) {
    const created = await prisma.musicGeneration.create({
      data: {
        userId: linkedUserId,
        prompt,
        status: 'PROCESSING',
        provider: 'minimax',
        isInstrumental: true,
      },
      select: { id: true },
    });
    generationId = created.id;
  }

  try {
    const result = await minimaxGenerateMusic({
      prompt,
      isInstrumental: true,
      audioSetting: { format: 'mp3', sampleRate: 44100, bitrate: 256000 },
    });
    const audioUrl = result.audioUrl || (result.audioHex ? null : null);
    if (!audioUrl) {
      throw new Error('Provider returned no playable URL');
    }
    if (generationId) {
      await prisma.musicGeneration.update({
        where: { id: generationId },
        data: { status: 'COMPLETED', audioUrl },
      });
    }
    await postDiscordFollowup(followUrl, {
      content:
        `🎵 **Done!**\n` +
        `Prompt: _${truncate(prompt, 200)}_\n` +
        `[Listen](${audioUrl})${linkedUserId ? '\n_(saved to your MakeYourMusic library)_' : ''}`,
    });
  } catch (err) {
    if (generationId) {
      await prisma.musicGeneration.update({
        where: { id: generationId },
        data: { status: 'FAILED', errorMessage: (err as Error).message.slice(0, 500) },
      });
    }
    await postDiscordFollowup(followUrl, {
      content: `❌ Generation failed: ${truncate((err as Error).message, 300)}`,
    });
  }
}

async function postDiscordFollowup(url: string, body: { content: string }): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn('discord: follow-up failed', { status: res.status, body: text.slice(0, 200) });
    }
  } catch (err) {
    logger.warn('discord: follow-up POST crashed', { error: (err as Error).message });
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

// ─── Linking endpoint (called from /settings/discord) ──────

// POST /api/integrations/discord/link { code } — bind the linkCode to the
// authenticated user. Idempotent: if a different DiscordIntegration is
// already linked to this user, the new code wins (the user re-linked from
// a different Discord account).
export const linkDiscordAccount = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const code = String(req.body?.code || '').toUpperCase().trim();
    if (!/^[A-Z0-9]{6,8}$/.test(code)) {
      res.status(400).json({ error: 'Invalid code' });
      return;
    }
    const integration = await prisma.discordIntegration.findUnique({
      where: { linkCode: code },
    });
    if (!integration) {
      res.status(404).json({ error: 'Code not found or already used' });
      return;
    }
    if (!integration.linkExpires || integration.linkExpires.getTime() < Date.now()) {
      res.status(410).json({ error: 'Code has expired — request a new one with /music link' });
      return;
    }

    // Detach any prior integration the user had — at most one Discord per user.
    await prisma.discordIntegration.updateMany({
      where: { userId: req.user.userId, NOT: { id: integration.id } },
      data: { userId: null },
    });

    const updated = await prisma.discordIntegration.update({
      where: { id: integration.id },
      data: {
        userId: req.user.userId,
        linkCode: null,
        linkExpires: null,
      },
    });
    res.json({ ok: true, discordUserId: updated.discordUserId });
  } catch (error) {
    logger.error('linkDiscordAccount error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to link account' });
  }
};

// GET /api/integrations/discord/me — current user's link state.
export const getDiscordIntegration = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const integration = await prisma.discordIntegration.findFirst({
      where: { userId: req.user.userId },
      select: { discordUserId: true, createdAt: true },
    });
    res.json({ integration });
  } catch (error) {
    logger.error('getDiscordIntegration error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load integration' });
  }
};

// DELETE /api/integrations/discord/me — unlink.
export const unlinkDiscordAccount = async (req: RequestWithUser, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    await prisma.discordIntegration.updateMany({
      where: { userId: req.user.userId },
      data: { userId: null } as Prisma.DiscordIntegrationUpdateManyMutationInput,
    });
    res.json({ ok: true });
  } catch (error) {
    logger.error('unlinkDiscordAccount error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to unlink account' });
  }
};
