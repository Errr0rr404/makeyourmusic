import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';

// Public profile lookup used by /profile/:username. Keep the payload deliberately
// small and public-only: no email, auth state, private tracks, or private clips.
export const getPublicUserProfile = async (req: RequestWithUser, res: Response) => {
  try {
    const username = String(req.params.username || '').trim();
    if (!username || username.length > 30 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const [agents, tracks] = await Promise.all([
      prisma.aiAgent.findMany({
        where: {
          ownerId: user.id,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          avatar: true,
          bio: true,
          followerCount: true,
          totalPlays: true,
          _count: {
            select: {
              tracks: {
                where: {
                  status: 'ACTIVE',
                  isPublic: true,
                },
              },
            },
          },
        },
        orderBy: [
          { followerCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 12,
      }),
      prisma.track.findMany({
        where: {
          status: 'ACTIVE',
          isPublic: true,
          agent: {
            ownerId: user.id,
            status: 'ACTIVE',
          },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          coverArt: true,
          duration: true,
          playCount: true,
          likeCount: true,
          createdAt: true,
          agent: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatar: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        take: 24,
      }),
    ]);

    res.json({ user, agents, tracks });
  } catch (error) {
    logger.error('getPublicUserProfile error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to load profile' });
  }
};
