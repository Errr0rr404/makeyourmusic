import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const prisma = new PrismaClient();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadAudio(buffer, filename) {
  return new Promise((resolve, reject) => {
    const s = cloudinary.uploader.upload_stream(
      { folder: 'makeyourmusic/audio', resource_type: 'video', public_id: filename, overwrite: false },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    const r = new Readable();
    r.push(buffer);
    r.push(null);
    r.pipe(s);
  });
}

const t = await prisma.track.findUnique({ where: { slug: 'broken-heart' } });
if (!t) throw new Error('not found');
console.log('current url:', t.audioUrl.slice(0, 80) + '...');

if (t.audioUrl.includes('cloudinary.com')) {
  console.log('already on cloudinary; nothing to do');
  await prisma.$disconnect();
  process.exit(0);
}

console.log('downloading existing audio...');
const r = await fetch(t.audioUrl);
if (!r.ok) throw new Error(`download failed (${r.status})`);
const buf = Buffer.from(await r.arrayBuffer());
console.log(`downloaded ${buf.length} bytes`);

const up = await uploadAudio(buf, `metal-broken-heart-${Date.now()}`);
console.log('uploaded:', up.secure_url);

await prisma.track.update({ where: { id: t.id }, data: { audioUrl: up.secure_url } });
console.log('track updated.');
await prisma.$disconnect();
