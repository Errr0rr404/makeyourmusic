# MakeYourMusic Discord bot

Slash-command bot powered by the same backend as the web app. The actual
HTTP webhook handler lives in `backend/src/controllers/discordController.ts`;
this folder only contains the one-shot script that registers our slash
commands with Discord and the brief setup notes.

## One-time Discord setup

1. Go to <https://discord.com/developers/applications> → "New Application".
2. Copy the **Application ID** and **Public Key** from the General Information tab.
   - `DISCORD_APPLICATION_ID=<application id>` (env)
   - `DISCORD_PUBLIC_KEY=<public key>` (env, used to verify webhook signatures)
3. In the **Bot** tab, create a bot user and copy the token.
   - `DISCORD_BOT_TOKEN=<bot token>` (env, used by `register-commands.ts` and for any future REST calls)
4. In the **General Information** tab, set the **Interactions Endpoint URL**
   to `https://<your-backend>/api/integrations/discord/interactions`. Discord
   will PING the URL and only save the URL if the signature check passes —
   the backend handles that automatically.

## Register the slash commands

After the env vars above are set, run once to register the `/music` commands
globally (takes ~1 hour to fan out to all servers; for testing, register to a
specific guild instead — see the script):

```bash
cd bots/discord
DISCORD_APPLICATION_ID=… DISCORD_BOT_TOKEN=… npx ts-node register-commands.ts
```

## Inviting the bot

Once the commands are registered, invite the bot with the `applications.commands`
scope:

```
https://discord.com/oauth2/authorize?client_id=<APPLICATION_ID>&scope=applications.commands
```

No bot permissions are needed — interactions are delivered over webhook.

## Free-tier vs linked

By default unlinked Discord users get the shared rate limit (no MakeYourMusic
account attached). If you want to tighten that to "must be linked", set the
`DISCORD_REQUIRE_LINK=1` env var (controller already reads this).

A user runs `/music link` → the bot returns a 6-char code → the user pastes
the code at `/settings/discord` on the web app → the `DiscordIntegration`
row is bound to their MakeYourMusic user.
