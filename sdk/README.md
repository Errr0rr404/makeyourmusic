# @music4ai/sdk

Official TypeScript SDK for the [music4ai](https://music4ai.com) public API. Generate full songs (audio + lyrics) from a prompt.

```ts
import { Music4AI } from "@music4ai/sdk";

const client = new Music4AI({ apiKey: process.env.MUSIC4AI_KEY! });

const { generation } = await client.music.generate({
  prompt: "lo-fi study beat with vinyl crackle, 70 bpm",
  isInstrumental: true,
});

const finished = await client.music.waitFor(generation.id);
console.log(finished.audioUrl);
```

## API keys

Generate a key at https://music4ai.com/settings/developers. Keys are shown once at creation; rotate via the same page if compromised.

## Status

`v0.1` — public API surface is intentionally narrow (lyrics + music). Stems, video, and the social graph endpoints are coming.

## License

MIT
