import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'demo@gmail.com' },
    select: { id: true, email: true, username: true, displayName: true, role: true },
  });
  console.log('USER:', JSON.stringify(user, null, 2));

  if (!user) { await prisma.$disconnect(); return; }

  const agents = await prisma.aiAgent.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, slug: true, status: true, _count: { select: { tracks: true } } },
  });
  console.log('AGENTS:', JSON.stringify(agents, null, 2));

  const tracks = await prisma.track.findMany({
    where: { agent: { ownerId: user.id } },
    select: {
      id: true, title: true, slug: true, status: true, isPublic: true, audioUrl: true, duration: true,
      createdAt: true,
      agent: { select: { id: true, name: true, slug: true } },
      genre: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('TRACKS COUNT:', tracks.length);
  console.log('TRACKS:', JSON.stringify(tracks, null, 2));

  const generations = await prisma.musicGeneration.count({ where: { userId: user.id } });
  console.log('GENERATIONS COUNT:', generations);

  const genres = await prisma.genre.findMany({ select: { id: true, name: true, slug: true } });
  console.log('GENRES:', JSON.stringify(genres, null, 2));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
