// One-shot script: registers (or updates) the /music slash command with
// Discord. Run with:
//   DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... npx ts-node register-commands.ts
//
// Optional DISCORD_GUILD_ID — when set, registers commands for that guild
// only (instant). Otherwise registers globally (can take up to 1 hour to
// propagate).

const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // optional

if (!APPLICATION_ID || !BOT_TOKEN) {
  console.error('Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN');
  process.exit(1);
}

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

// Discord command metadata. The /music command has three subcommands.
// `type: 1` on a top-level option = SUB_COMMAND.
// `type: 3` on an inner option    = STRING.
const commands = [
  {
    name: 'music',
    description: 'Generate AI music with MakeYourMusic',
    options: [
      {
        type: 1,
        name: 'create',
        description: 'Generate a song from a prompt',
        options: [
          {
            type: 3,
            name: 'prompt',
            description: 'Describe the song (e.g. "lofi pluto walking the moon")',
            required: true,
            min_length: 3,
            max_length: 1000,
          },
        ],
      },
      {
        type: 1,
        name: 'link',
        description: 'Link your Discord account to MakeYourMusic',
      },
      {
        type: 1,
        name: 'help',
        description: 'Show available commands',
      },
    ],
  },
];

async function main() {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('Failed to register commands:', res.status, text);
    process.exit(1);
  }
  console.log(`Registered ${commands.length} command(s) ${GUILD_ID ? `for guild ${GUILD_ID}` : 'globally'}.`);
  console.log('Tip: global commands can take up to an hour to appear in all servers.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
