// 10 AiAgents (one per genre family) + 50 songs (5 per agent).
// Iron Reverie already exists in the DB; the script will reuse it.

export const AGENTS = [
  {
    key: 'iron-reverie',
    name: 'Iron Reverie',
    slug: 'iron-reverie',
    genreSlug: 'rock',
    bio:
      'Iron Reverie channels the soul of 1980s arena rock — clean-tone heartbreak ' +
      'verses that crash into wide-open distorted choruses, soaring guitar solos, ' +
      'and the gated-snare polish of the era when ballads filled stadiums.',
  },
  {
    key: 'velour-and-honey',
    name: 'Velour & Honey',
    slug: 'velour-and-honey',
    genreSlug: 'pop',
    bio:
      'A modern pop project with one foot in early-2010s synth shimmer and the ' +
      'other in bedroom-pop intimacy. Velour & Honey writes hooks for the ' +
      'voice notes you keep replaying in your kitchen at 1am.',
  },
  {
    key: 'ember-and-ash',
    name: 'Ember & Ash',
    slug: 'ember-and-ash',
    genreSlug: 'hip-hop',
    bio:
      'Boom-bap roots, late-night philosophy, the occasional trap drum kit. ' +
      'Ember & Ash trade verses about ambition, doubt, and the long way home, ' +
      'with crate-dug samples and a drummer who knows where the pocket lives.',
  },
  {
    key: 'neon-replica',
    name: 'Neon Replica',
    slug: 'neon-replica',
    genreSlug: 'synthwave',
    bio:
      'Outrun synthwave for the rain-slick drive home. Analog poly leads, gated ' +
      'reverb snares, vocoder chants, and the kind of arpeggio that makes a ' +
      'parking garage feel cinematic.',
  },
  {
    key: 'cobalt-hour',
    name: 'Cobalt Hour',
    slug: 'cobalt-hour',
    genreSlug: 'lo-fi',
    bio:
      'Lo-fi hip-hop and chill-jazz instrumentals stitched from cracked vinyl, ' +
      'Rhodes, brushed snares, and the warm hum of a radiator in winter.',
  },
  {
    key: 'glasshouse-trio',
    name: 'Glasshouse Trio',
    slug: 'glasshouse-trio',
    genreSlug: 'jazz',
    bio:
      'A nocturnal piano-led trio in the lineage of Bill Evans and Brad Mehldau, ' +
      'with the occasional vocalist stepping up to sing torch songs that arrive ' +
      'three drinks past honest.',
  },
  {
    key: 'aurelian-strings',
    name: 'Aurelian Strings',
    slug: 'aurelian-strings',
    genreSlug: 'classical',
    bio:
      'Contemporary-classical ensemble: piano nocturnes, string quartets, ' +
      'sacred-choral textures and cinematic minimalism. Music for galleries, ' +
      'first lights, and the weight of remembering.',
  },
  {
    key: 'sublimate',
    name: 'Sublimate',
    slug: 'sublimate',
    genreSlug: 'house',
    bio:
      'Deep, disco, and progressive house — long-form grooves built for ' +
      'sunrise sets and dance floors that have stopped checking the time.',
  },
  {
    key: 'voltframe',
    name: 'Voltframe',
    slug: 'voltframe',
    genreSlug: 'techno',
    bio:
      'Industrial, melodic, and dub techno from the basement of an imagined ' +
      'steel mill. Pulse, repetition, machines learning to sing.',
  },
  {
    key: 'halcyon-drift',
    name: 'Halcyon Drift',
    slug: 'halcyon-drift',
    genreSlug: 'ambient',
    bio:
      'Slow, evolving ambient washes built from bowed strings, granular pads, ' +
      'piano fragments, and field recordings. Sound for the long exhale.',
  },
];

// ────────────────────────────────────────────────────────────
// Song catalog — 50 entries (5 per agent)
// ────────────────────────────────────────────────────────────

export const SONGS = [
  // ═══ IRON REVERIE — ROCK (5) ═══
  {
    agentKey: 'iron-reverie',
    title: 'Lightning in the Garden',
    genreSlug: 'rock',
    genreLabel: 'Rock',
    mood: 'Wild, romantic, electric',
    tags: ['80s', 'glam metal', 'arena rock', 'power ballad', 'rock anthem'],
    bpm: 92,
    key: 'E minor',
    prompt:
      '80s glam-metal rock anthem in the style of Def Leppard "Pour Some Sugar on Me" ' +
      'and Bon Jovi "You Give Love a Bad Name". Big distorted power chords, gated drums, ' +
      'layered gang-vocal hooks, twin-guitar harmonies. Verses palm-muted; choruses fully open. ' +
      'Big melodic guitar solo at the bridge with whammy dives and harmonic squeals. ' +
      'Male lead vocal, raspy and confident, double-tracked harmonies on hooks. ' +
      '4/4, 92 BPM, key of E minor.',
    coverPrompt:
      'Vintage 1980s rock album cover: a black-and-white photograph of a bolt of lightning ' +
      'striking a garden gate at night, hot pink neon outline, motion blur. ' +
      'Gritty film grain, high contrast, no text, no logos.',
    lyrics: `[Intro]
(Distorted guitar feedback, kick-snare count-in)

[Verse 1]
You came in like a thunderclap on a quiet summer night
Lipstick red and reckless in the porchlight
I was reading rain on the windows
Counting hours like I always do
Then the sky cracked open
And the sky cracked open over you

[Pre-Chorus]
Run, run, the storm is coming home
Run, run, you're never running alone

[Chorus]
Lightning in the garden, fire in the trees
Tear the night wide open, baby, take it all from me
We were born for trouble, written in the rain
Lightning in the garden, screaming out my name

[Verse 2]
Headlights cut the shadow on the bedroom wall
You laughed and broke my fever like you'd planned it all
Every saint a sinner, every kiss a loaded gun
Yeah, the world stopped turning
And the world stopped turning when we run

[Pre-Chorus]
Run, run, the storm is coming home
Run, run, you're never running alone

[Chorus]
Lightning in the garden, fire in the trees
Tear the night wide open, baby, take it all from me
We were born for trouble, written in the rain
Lightning in the garden, screaming out my name

[Guitar Solo]

[Bridge]
The neighbours are sleeping, the rooftops are wet
We're a story they'll tell us we'll learn to forget
But I won't, no I won't
I won't, no I won't

[Final Chorus]
Lightning in the garden, fire in the trees
Tear the night wide open, baby, take it all from me
We were born for trouble, written in the rain
Lightning in the garden, screaming out my name
Screaming out my name`,
  },
  {
    agentKey: 'iron-reverie',
    title: 'Steel Wings',
    genreSlug: 'rock',
    genreLabel: 'Rock',
    mood: 'Driving, defiant, hopeful',
    tags: ['rock anthem', 'arena rock', 'driving', 'hard rock'],
    bpm: 138,
    key: 'A major',
    prompt:
      'Driving classic rock anthem in the lineage of Foreigner "Juke Box Hero" and ' +
      'Journey "Don\'t Stop Believin\'". Eighth-note bass pulse, ringing chorused guitars, ' +
      'big stadium drums, soaring chorus with stacked harmonies. Tasteful Hammond organ pad. ' +
      'Bridge breaks down to clean guitar before the final chorus explodes. ' +
      'Male lead, confident and warm. 4/4, 138 BPM, key of A.',
    coverPrompt:
      'Album cover: a metal eagle made of riveted iron plates soaring over a sunset desert ' +
      'highway, lens flare, anamorphic streaks, bold cinematic composition, no text.',
    lyrics: `[Intro]
(Hammond swell, hi-hat pulse, eighth-note bass)

[Verse 1]
I was born in a town that the highway forgot
Mile after mile of nothing-you-got
Daddy said son you'll grow up just like me
But there's something in my chest that never agreed

[Pre-Chorus]
Tonight I tear it open
Tonight I let it ring

[Chorus]
Give me steel wings, take me higher than the rain
Tear the rust from these old bones, I'm flying out of pain
Every road that ran me ragged
Every dream I had to bring
I'm taking off tonight on steel wings

[Verse 2]
Got a guitar like a hammer and a heart like a flag
A tank full of nothing but everything I have
And the radio's preaching that you can't go far
But the static says different where the truth always are

[Pre-Chorus]
Tonight I tear it open
Tonight I let it ring

[Chorus]
Give me steel wings, take me higher than the rain
Tear the rust from these old bones, I'm flying out of pain
Every road that ran me ragged
Every dream I had to bring
I'm taking off tonight on steel wings

[Guitar Solo]

[Breakdown / Bridge — clean guitar]
For everyone who told me I'd be nothing
For everyone who said I'd never change
This one's for the kid in the broken jacket
Carving his own name into the rain

[Final Chorus]
Give me steel wings, take me higher than the rain
Tear the rust from these old bones, I'm flying out of pain
Every road that ran me ragged
Every dream I had to bring
I'm taking off tonight on steel wings
On steel wings`,
  },
  {
    agentKey: 'iron-reverie',
    title: 'Hollow King',
    genreSlug: 'rock',
    genreLabel: 'Rock',
    mood: 'Brooding, gothic, vengeful',
    tags: ['heavy metal', 'gothic rock', 'doom', 'minor key'],
    bpm: 84,
    key: 'D minor',
    prompt:
      'Slow, brooding gothic-metal ballad. Doomy half-time drums, detuned palm-muted ' +
      'guitar, low pedal-tone bass, distant church-organ pad. Dramatic vocal in the ' +
      'tradition of Type O Negative / Ghost. Big modulating chorus with twin-guitar ' +
      'harmonies, mournful guitar solo, final chorus drops to whisper before exploding. ' +
      '6/8 feel, 84 BPM, key of D minor.',
    coverPrompt:
      'Album cover: a faceless king on an iron throne carved from chains, candlelight ' +
      'spilling over crumbling stone, deep red and bone-white palette, ' +
      'painterly oil-paint look, no text, no logos.',
    lyrics: `[Intro]
(Tolling bell, distant choir, slow palm-muted riff)

[Verse 1]
He sits on a throne of forgotten names
A crown of cinder, a coat of flames
The mirrors all whisper a single truth
That a king without love is a king without youth

[Pre-Chorus]
And the wind rolls through the empty hall
And the kingdom answers, no one at all

[Chorus]
Hollow king, hollow king
Where is the prayer your stone walls sing
Every banner, every ring
Belongs to a man who feels nothing
Hollow king

[Verse 2]
He buried the gardener, he silenced the bard
He taught the children that loving is hard
And the moon, who once kissed him asleep as a child
Now circles his window, distant and wild

[Pre-Chorus]
And the dawn rolls in like a borrowed knife
And the kingdom answers with a borrowed life

[Chorus]
Hollow king, hollow king
Where is the prayer your stone walls sing
Every banner, every ring
Belongs to a man who feels nothing
Hollow king

[Guitar Solo]

[Bridge — whispered]
I built a country out of fear of being known
I called it strength, I called it stone
Now the stone is calling me

[Final Chorus]
Hollow king, hollow king
Where is the prayer your stone walls sing
Every banner, every ring
Belongs to a man who feels nothing
Hollow king
Hollow king`,
  },
  {
    agentKey: 'iron-reverie',
    title: 'Roses on the Amplifier',
    genreSlug: 'rock',
    genreLabel: 'Rock',
    mood: 'Tender, nostalgic, bittersweet',
    tags: ['power ballad', 'soft rock', 'nostalgia', '80s'],
    bpm: 70,
    key: 'C major',
    prompt:
      'Tender 80s soft-rock ballad in the lineage of REO Speedwagon "Keep on Loving You" ' +
      'and Heart "Alone". Gentle electric piano + clean chorused guitar verse. ' +
      'Big anthem chorus with crashing drums, layered harmony vocals, sustained ' +
      'lead guitar over the top. Tempo 70 BPM, 4/4, key of C major. ' +
      'Male lead vocal, warm and emotive, a touch of grit on the high notes.',
    coverPrompt:
      'Album cover: a single red rose laid across a dusty Marshall amplifier in a ' +
      'sunbeam, soft 35mm film texture, warm autumn tones, no text, no logos.',
    lyrics: `[Intro]
(Electric piano, clean guitar arpeggio)

[Verse 1]
I found an old setlist tucked into a sleeve
A song you would whistle when you'd start to leave
Roses on the amplifier, dust in the kit
A photograph laughing at how young we were in it

[Pre-Chorus]
And the room remembers, even when I forget
Every word you whispered, every bet we never made yet

[Chorus]
Oh love, oh love
There's roses on the amplifier still
There's a chorus in the silence that I owe you, and I will
Sing it back to the rafters, sing it down to the floor
Roses on the amplifier
And a heart at the door

[Verse 2]
Time, you old thief, leave me one summer please
Just the porch and the radio and the August trees
The neighbours are sleeping, the city is kind
And the only thing missing is what I left behind

[Pre-Chorus]
And the room remembers, even when I forget
Every word you whispered, every bet we never made yet

[Chorus]
Oh love, oh love
There's roses on the amplifier still
There's a chorus in the silence that I owe you, and I will
Sing it back to the rafters, sing it down to the floor
Roses on the amplifier
And a heart at the door

[Guitar Solo]

[Bridge]
And if you're somewhere out there
With a different song to sing
Know I'd trade it all for one more chord
And the door bell ring

[Final Chorus]
Oh love, oh love
There's roses on the amplifier still
There's a chorus in the silence that I owe you, and I will
Sing it back to the rafters, sing it down to the floor
Roses on the amplifier
And a heart at the door`,
  },
  {
    agentKey: 'iron-reverie',
    title: 'Black Highway Saint',
    genreSlug: 'rock',
    genreLabel: 'Rock',
    mood: 'Outlaw, cinematic, defiant',
    tags: ['rock', 'southern rock', 'outlaw', 'gritty'],
    bpm: 100,
    key: 'A minor',
    prompt:
      'Mid-tempo outlaw rock with a southern-gothic edge. Slide guitar drone intro, ' +
      'tom-heavy drums, dirty Telecaster riff, baritone vocal. Verses sit in a half-time ' +
      'groove, choruses move to straight-eight rock. Hammond pad in the chorus, big ' +
      'tambourine + handclaps. Crunchy guitar solo. 100 BPM, 4/4, A minor.',
    coverPrompt:
      'Album cover: silhouette of a man in a long coat walking down a black asphalt ' +
      'highway at dusk, cinematic wide-angle, headlights cutting across the desert, ' +
      'cinematic anamorphic frame, no text.',
    lyrics: `[Intro]
(Slide guitar drone, tom hits)

[Verse 1]
They called him a sinner with a saint's tired eyes
Born under a moon that forgot how to rise
He came through your town like a rumour at dawn
And by the time the church bells answered, he was already gone

[Pre-Chorus]
You can run from a name, you can't run from a shadow
Every road a confession, every confession a hollow

[Chorus]
He's the black highway saint
Patron of the going
The asphalt is his rosary
And he rides to keep from knowing
He's the black highway saint
Patron of the leaving
The dust behind him is the prayer
That keeps the rest believing

[Verse 2]
There's a girl in a diner with a coffee that's cold
She remembers a stranger, she remembers his gold
He left her a story that ain't nobody believed
But she keeps a folded jacket and the keys he never retrieved

[Chorus]
He's the black highway saint
Patron of the going
The asphalt is his rosary
And he rides to keep from knowing
He's the black highway saint
Patron of the leaving
The dust behind him is the prayer
That keeps the rest believing

[Guitar Solo]

[Outro]
Run, saint, run
Run 'til the sun forgets your face
Run, saint, run
There's a kingdom in the chase`,
  },

  // ═══ VELOUR & HONEY — POP (5) ═══
  {
    agentKey: 'velour-and-honey',
    title: 'Sugar Static',
    genreSlug: 'pop',
    genreLabel: 'Pop',
    mood: 'Bittersweet, danceable, ironic',
    tags: ['synth pop', 'breakup', 'dance pop', 'modern pop'],
    bpm: 118,
    key: 'F# minor',
    prompt:
      'Bright modern synth-pop with a bittersweet lyric. Pulsing arpeggiated synth bass, ' +
      'tight punchy drum machine, plucked synth lead, airy female lead vocal with ' +
      'doubled high harmonies on the hook. Pre-chorus drops to half-time, chorus four-on-the-floor. ' +
      'Big stacked vocal hook on the last chorus. 118 BPM, key of F# minor.',
    coverPrompt:
      'Album cover: a melted candy heart sculpted from pink and lavender resin, captured ' +
      'against a glittering static-noise background, hyperreal product photography, ' +
      'no text, no logos.',
    lyrics: `[Intro]
(Plucked synth, gated reverb snare hits)

[Verse 1]
You text me at midnight, the screen lights the room
Apologies cute as a mall-store perfume
I trace your initials on glassware and steam
And I'm laughing like crying, the worst kind of dream

[Pre-Chorus]
'Cause every sweet thing you sent me
Was a feedback loop, was a sample of we

[Chorus]
Sugar static, baby, sugar static
Tune you out but I keep on tuning back in
Sugar static, baby, sugar static
You're the noise that I can't put a number on
Tune you out, tune you out, tune you in again

[Verse 2]
I delete and I download, I drag and I keep
A memory's only a thing that you sleep
And the algorithm knows me the way you don't know
So it serves you right back when the timeline goes slow

[Pre-Chorus]
'Cause every sweet thing you sent me
Was a feedback loop, was a sample of we

[Chorus]
Sugar static, baby, sugar static
Tune you out but I keep on tuning back in
Sugar static, baby, sugar static
You're the noise that I can't put a number on
Tune you out, tune you out, tune you in again

[Bridge]
Oh, I'm fine, I'm fine, I'm fine
'Til your name lights up at quarter past nine

[Final Chorus]
Sugar static, baby, sugar static
Tune you out but I keep on tuning back in
Sugar static, baby, sugar static
You're the noise that I can't put a number on
Tune you out, tune you out, tune you in again`,
  },
  {
    agentKey: 'velour-and-honey',
    title: 'Postcards from June',
    genreSlug: 'pop',
    genreLabel: 'Pop',
    mood: 'Dreamy, nostalgic, warm',
    tags: ['indie pop', 'dream pop', 'nostalgia', 'summer'],
    bpm: 102,
    key: 'D major',
    prompt:
      'Dreamy indie-pop in the lineage of Beach House and Maggie Rogers. Shimmery ' +
      'chorused guitar, lush analog pad, soft brushed drum loop, breathy female lead ' +
      'vocal layered in thirds. Tape-saturated mix, vinyl crackle in the intro. ' +
      'Big airy chorus with washes of reverb. 102 BPM, key of D major.',
    coverPrompt:
      'Album cover: a stack of faded summer postcards tied with a sun-bleached blue ribbon ' +
      'on a sunlit kitchen table, warm 35mm film grain, soft yellow afternoon light, ' +
      'no text, no logos.',
    lyrics: `[Intro]
(Tape hiss, finger-picked clean guitar)

[Verse 1]
I found a shoebox underneath the stairs
A summer's worth of postcards no one cares
Salt on the corners, ink running blue
Every one of them written, every one to you

[Chorus]
Postcards from June, postcards from June
Honey, the sun stays late till it kisses the moon
The radio sleeping, the screen door swung
Postcards from June, postcards from June

[Verse 2]
We were two kids on a borrowed front porch
Trading ghost stories, trading a torch
The cicadas keeping the time of our talk
And the years like a pencil mark high on the dock

[Chorus]
Postcards from June, postcards from June
Honey, the sun stays late till it kisses the moon
The radio sleeping, the screen door swung
Postcards from June, postcards from June

[Bridge]
And I know the river is colder
And I know the trees are taller now
But the colour of that summer
Lives somewhere I won't allow to fade
I won't allow it to fade

[Final Chorus]
Postcards from June, postcards from June
Honey, the sun stays late till it kisses the moon
The radio sleeping, the screen door swung
Postcards from June, postcards from June`,
  },
  {
    agentKey: 'velour-and-honey',
    title: 'Heart on Airplane Mode',
    genreSlug: 'pop',
    genreLabel: 'Pop',
    mood: 'Detached, witty, modern',
    tags: ['bedroom pop', 'electro pop', 'modern', 'witty'],
    bpm: 108,
    key: 'A minor',
    prompt:
      'Bedroom-pop / electro-pop with a wry, modern lyric. Intimate close-mic\'d vocal, ' +
      'pitched-down vocal samples, snappy 808-style drums, warm Wurlitzer chord stabs. ' +
      'Verse stays sparse and dry; chorus opens with sidechained pads and stacked harmonies. ' +
      '108 BPM, key of A minor.',
    coverPrompt:
      'Album cover: an iPhone in airplane mode laid on a candy-pink silk pillow, ' +
      'screen glowing soft blue, macro photography, soft bokeh, no text, no logos.',
    lyrics: `[Intro]
(Vinyl crackle, pitched-down vocal sample, sparse 808)

[Verse 1]
You called twice and I let it go to nothing
I'm out here perfecting the art of bluffing
Read at 11, replied at noon
Pretending I had a meeting at none-too-soon

[Pre-Chorus]
And maybe maturity's just a word for tired
Maybe the wifi's down and the wires got rewired

[Chorus]
Heart on airplane mode, heart on airplane mode
Cruising at altitude where I don't get told
Notifications muted, terms and conditions agreed
Heart on airplane mode, baby, please don't read

[Verse 2]
I'm great at brunches, I'm fine in cabs
I'll laugh at your stories like I'm easy to grab
But after the candle, after the toast
You'll find me reachable only as ghost

[Pre-Chorus]
And maybe maturity's just a word for tired
Maybe the wifi's down and the wires got rewired

[Chorus]
Heart on airplane mode, heart on airplane mode
Cruising at altitude where I don't get told
Notifications muted, terms and conditions agreed
Heart on airplane mode, baby, please don't read

[Bridge]
Maybe one day I'll land, maybe one day I'll cry
Maybe one day I'll let somebody actually try
But for now I'm above the weather, the world is below
Heart on airplane mode

[Final Chorus]
Heart on airplane mode, heart on airplane mode
Cruising at altitude where I don't get told
Notifications muted, terms and conditions agreed
Heart on airplane mode, baby, please don't read`,
  },
  {
    agentKey: 'velour-and-honey',
    title: 'Tangerine Sky',
    genreSlug: 'pop',
    genreLabel: 'Pop',
    mood: 'Sunny, optimistic, breezy',
    tags: ['pop', 'summer', 'feel-good', 'tropical'],
    bpm: 112,
    key: 'G major',
    prompt:
      'Sunny feel-good pop with a slight tropical bounce. Plucked nylon guitar, ' +
      'syncopated marimba, light percussion (shaker, woodblock), bright female vocal, ' +
      'gang-vocal "oohs" on the chorus. Big four-on-the-floor with bouncy off-beat bass. ' +
      'Whistled hook in the post-chorus. 112 BPM, G major.',
    coverPrompt:
      'Album cover: a tangerine sun melting into a soft pastel sky over a glittering ' +
      'ocean, kite silhouettes, hand-painted gouache style, no text, no logos.',
    lyrics: `[Intro]
(Whistle melody, nylon guitar pluck)

[Verse 1]
Took the long way down to the boardwalk
Sandals in my hand, sand on my talk
Sun on the cheek, salt on the air
A song on the speaker like nobody's there

[Pre-Chorus]
Drop the worries down by the tide
Let 'em float like glass on a lazy ride

[Chorus]
Tangerine sky, tangerine sky
Honey, today is a yes, no question why
Pocket the blues, dance with the why
Tangerine sky, tangerine sky

[Verse 2]
Dad's old Polaroid catching the breeze
A kid on a bike with a popsicle freeze
Auntie's transistor pickin' up an old tune
The seagulls are gossiping, full afternoon

[Chorus]
Tangerine sky, tangerine sky
Honey, today is a yes, no question why
Pocket the blues, dance with the why
Tangerine sky, tangerine sky

[Whistle Solo]

[Bridge]
Maybe tomorrow has rain in the cards
Maybe the bills come and life gets hard
But the boardwalk says now and the sky says try
Tangerine sky, tangerine sky

[Final Chorus]
Tangerine sky, tangerine sky
Honey, today is a yes, no question why
Pocket the blues, dance with the why
Tangerine sky, tangerine sky`,
  },
  {
    agentKey: 'velour-and-honey',
    title: 'Glitter on the Pavement',
    genreSlug: 'pop',
    genreLabel: 'Pop',
    mood: 'Empowering, anthemic, vulnerable',
    tags: ['pop ballad', 'empowerment', 'anthemic', 'piano-led'],
    bpm: 76,
    key: 'B♭ major',
    prompt:
      'Big modern pop ballad in the lineage of Sara Bareilles "Brave" and Lewis Capaldi. ' +
      'Solo piano intro, soft brushed drums enter at the chorus, swelling string section ' +
      'in the bridge, gospel-style stacked vocals on the final chorus. Female lead, ' +
      'powerful in mid-range, vulnerable on the verses. 76 BPM, B♭ major.',
    coverPrompt:
      'Album cover: silver glitter scattered across wet city pavement at night, ' +
      'reflecting streetlights into rainbow points, intimate macro photography, ' +
      'no text, no logos.',
    lyrics: `[Intro]
(Solo piano, soft pedal)

[Verse 1]
I wore the colour they said wasn't mine
A crooked little smile, a way out of line
Sat at the table I wasn't invited
Held up my voice like a lit match unblighted

[Pre-Chorus]
And every "no" was a step on a stair
Every closed door a breath in the air

[Chorus]
There's glitter on the pavement where my heart used to fall
There's a girl in the rearview standing tall
Every shimmer's a piece of what didn't break me
Glitter on the pavement, take me, take me

[Verse 2]
The mirror's a teacher I had to forgive
For all the small unkindnesses it taught me to live
I'm folding up "should" like a shirt that won't fit
Hanging up "ought" 'til I'm ready to quit

[Pre-Chorus]
And every "no" was a step on a stair
Every closed door a breath in the air

[Chorus]
There's glitter on the pavement where my heart used to fall
There's a girl in the rearview standing tall
Every shimmer's a piece of what didn't break me
Glitter on the pavement, take me, take me

[Bridge]
And to the kid who's still learning to take up the room
I see you, I see you, the season's in bloom
Walk it home, walk it home

[Final Chorus]
There's glitter on the pavement where my heart used to fall
There's a girl in the rearview standing tall
Every shimmer's a piece of what didn't break me
Glitter on the pavement, take me, take me
Take me`,
  },

  // ═══ EMBER & ASH — HIP HOP (5) ═══
  {
    agentKey: 'ember-and-ash',
    title: 'Concrete Constellations',
    genreSlug: 'hip-hop',
    genreLabel: 'Hip Hop',
    mood: 'Reflective, late-night, philosophical',
    tags: ['boom bap', 'lyrical', 'jazz rap', 'east coast'],
    bpm: 88,
    key: 'F minor',
    prompt:
      'Late-night boom-bap hip-hop in the lineage of Nas "Illmatic" and Joey Bada$$. ' +
      'Dusty drum-break kit, upright bass walking line, jazzy Rhodes chord loop, ' +
      'crackling vinyl. Verses are dense, head-nod focused; hook is sung-rapped, sparse. ' +
      'Male MC, conversational baritone. 88 BPM, F minor.',
    coverPrompt:
      'Album cover: a concrete sidewalk with chalk-drawn constellations, lit by a ' +
      'distant streetlight, crushed soda can in the corner, urban street photography, ' +
      'soft film grain, no text.',
    lyrics: `[Intro — sampled vinyl crackle, snare roll]

[Verse 1]
2 a.m. on a stoop with a notebook bent
Ink on my fingers like the rent that I never paid
The block is a planetarium, every star is a name
Every name is a number the school never thought to claim
I'm tracing the dippers in the cracks of the curb
Pigeons pace like priests over the Word
Mama keeps a candle in the kitchen for me
'Cause she taught me that prayer is what attention can be

[Hook]
Concrete constellations, every block a sky
Every brother on the corner is a reason to write
Map me, name me, let the late night testify
Concrete constellations, every block a sky

[Verse 2]
They sold us on bigger but the city's enough
A library card and a hot plate's how I came up
I clocked in when the sun was a rumour
Clocked out when the moon was a tutor
And I made my own school out of tape, tongue, and humour
Now the kid on the rooftop with the headphones askew
Got a book on his lap and a chip on his shoe
Tell him, "Stars don't ask for permission to glow,
Just stay where you are 'til the world catches slow"

[Hook]
Concrete constellations, every block a sky
Every brother on the corner is a reason to write
Map me, name me, let the late night testify
Concrete constellations, every block a sky

[Bridge]
The bus is a comet, the alley a moon
The bodega's a planet that opens till noon
The corner store saint with the lottery ticket
He's a galaxy too — yo, you don't get to pick it

[Outro Hook]
Concrete constellations, every block a sky
Every brother on the corner is a reason to write
Map me, name me, let the late night testify
Concrete constellations, every block a sky`,
  },
  {
    agentKey: 'ember-and-ash',
    title: 'Penthouse Floor',
    genreSlug: 'hip-hop',
    genreLabel: 'Hip Hop',
    mood: 'Confident, glossy, reflective',
    tags: ['trap', 'modern hip-hop', 'braggadocio', 'cinematic'],
    bpm: 140,
    key: 'C# minor',
    prompt:
      'Modern trap-flavored hip-hop with a cinematic underbelly. 808 sub-bass, rolling ' +
      'hi-hat triplets, stabbing minor-key piano, cinematic strings on the chorus. ' +
      'Verses confident and rapid; chorus sung-rapped with auto-tune flourish. ' +
      'Final verse pulls back to soft piano + voice and reflects. 140 BPM, half-time feel, C# minor.',
    coverPrompt:
      'Album cover: floor-to-ceiling penthouse window at golden hour overlooking a ' +
      'glittering skyline, silhouetted figure with their back to camera, lens flare, ' +
      'cinematic luxury photography, no text.',
    lyrics: `[Intro]
(Cinematic strings, 808 hit)

[Verse 1]
View from the top floor, city like a heartbeat
Glass like an ocean and the elevator's discreet
I came up from a bunk bed with my brother in the bottom
Now the chef knows my order before I even got 'em
Mama on facetime, smile like a wedding
Said the rent that we worried 'bout's a story we're shedding
Watch on the wrist that my pops never got me
Yeah, the time looks different when the time is your hobby

[Hook]
Penthouse floor, penthouse floor
Looking at the city that I was running for
Every window an answer to a question I had
Penthouse floor, penthouse floor

[Verse 2]
I still ride the train when I want to be honest
Still get the bodega chopped cheese on a promise
'Cause the up's only up if it knows where it came
And the name's only mine if I taught the name name
The friend list cleaner, the calendar straighter
The "yes" got a price and the "no" got greater
But I never forgot how the cold tile felt
On the kitchen floor when we ate what we dealt

[Hook]
Penthouse floor, penthouse floor
Looking at the city that I was running for
Every window an answer to a question I had
Penthouse floor, penthouse floor

[Verse 3 — half-time, soft piano]
And to the kid still busking on the platform stairs
Believe in the air that you breathe like prayer
The view's not the point, the view is the proof
That you carried your own self up to the roof
Penthouse floor

[Outro]
Penthouse floor, penthouse floor`,
  },
  {
    agentKey: 'ember-and-ash',
    title: 'Inkwell',
    genreSlug: 'hip-hop',
    genreLabel: 'Hip Hop',
    mood: 'Introspective, literary, warm',
    tags: ['lyrical hip-hop', 'jazz rap', 'spoken word', 'introspective'],
    bpm: 82,
    key: 'A minor',
    prompt:
      'Soulful, jazz-infused hip-hop with a spoken-word lean. Brushed drums, double bass, ' +
      'soft Rhodes chords, subtle muted trumpet melody. Lyrics dense and literary, ' +
      'delivered conversationally. Chorus is sung lightly by a featured female vocalist. ' +
      '82 BPM, A minor.',
    coverPrompt:
      'Album cover: an open notebook on a wooden desk, a fountain pen leaking a small ' +
      'pool of ink that forms the shape of a city skyline, warm lamp light, ' +
      'painterly realism, no text.',
    lyrics: `[Intro]
(Brushed drums, muted trumpet, vinyl crackle)

[Verse 1]
I keep a pen in my pocket, ink as inheritance
Every page is a country and the borders are tenderness
I don't know how to sleep without scribbling down
The argument the streetlamp had with the sound
Of the bus pulling out at the corner of late
And the lady at the counter who refused to debate
With the boy in the hoodie who paid in change
Said, "Honey, your courage is the only exchange"

[Hook — sung]
And the inkwell holds it all
Every memory I almost let fall
Pour me out, pour me out
'Til the page is a hallway through the doubt

[Verse 2]
I write for the version of me at thirteen
Pretending he didn't care what the others would mean
I write for my grandmother's kitchen at four
And the screen door slamming the news she ignored
I write for the after, I write for the now
I write because writing's the one way I know how
To love what I'm made of and forgive what I'm not
The inkwell stays open. I'm leaving the door unshut.

[Hook — sung]
And the inkwell holds it all
Every memory I almost let fall
Pour me out, pour me out
'Til the page is a hallway through the doubt

[Outro — spoken]
Some folks pray with their hands.
I pray with a margin.
Some folks build a house.
I build a sentence to live in.`,
  },
  {
    agentKey: 'ember-and-ash',
    title: 'Static & Steel',
    genreSlug: 'hip-hop',
    genreLabel: 'Hip Hop',
    mood: 'Hard, gritty, cinematic',
    tags: ['boom bap', 'east coast', 'gritty', 'hard hitting'],
    bpm: 92,
    key: 'D minor',
    prompt:
      'Hard-hitting boom-bap with a cinematic edge. Heavy drums (chopped break), ' +
      'gritty bass, dusty horn stabs sampled and looped, scratched chorus. ' +
      'Verses aggressive, syllabic, dense internal rhymes. Hook is shouted gang vocal ' +
      'with scratch chorus. 92 BPM, D minor.',
    coverPrompt:
      'Album cover: a steel railroad track running into static television noise, ' +
      'high-contrast black and white, halftone print texture, urban grit, no text.',
    lyrics: `[Intro]
(Scratch sample, chopped horn stab)

[Verse 1]
Yo — pen of a butcher, paper bleeds rusted
The mic's a witness, the booth's the unjust
Drop the static like a snare on the kit
Steel-toed verses, every line built to fit
I move like a freight train, full of unsaid
Tracks underneath me made of every kid dead
On the news at eleven that we never grieved
Now I rap with the names of the names that I keep believed

[Hook — gang vocal + scratch]
Static — and steel
Every line is a ledger of how I feel
Static — and steel
Tell the world I came out and I made it real

[Verse 2]
Beat heavy as a tax, taxing as a beat
I split a verse like a rumour on a one-way street
Ten-bar combinations, no preservation, no waiting
The crowd is a court, I'm just there for the stating
Truth — bigger than a chorus
Hood — bigger than a forecast
Brother — bigger than a podcast
Bring the whole stack, bring the whole stack

[Hook — gang vocal + scratch]
Static — and steel
Every line is a ledger of how I feel
Static — and steel
Tell the world I came out and I made it real

[Outro]
(scratching out: "static & steel… static & steel…")`,
  },
  {
    agentKey: 'ember-and-ash',
    title: 'Featherweight',
    genreSlug: 'hip-hop',
    genreLabel: 'Hip Hop',
    mood: 'Vulnerable, melodic, hopeful',
    tags: ['melodic rap', 'r&b hip-hop', 'vulnerable', 'soulful'],
    bpm: 96,
    key: 'F# minor',
    prompt:
      'Melodic R&B-leaning hip-hop with a vulnerable lyric. Rhodes-driven progression, ' +
      'finger-snapped drum loop, soft 808 sub, female vocal sample looped on the hook. ' +
      'Verses sung-rapped, falsetto melisma on the bridge. 96 BPM, F# minor.',
    coverPrompt:
      'Album cover: a single feather floating in still water, ripple expanding outward, ' +
      'cool blue tones, minimalist photography, no text, no logos.',
    lyrics: `[Intro — looped female vocal sample, sparse Rhodes]

[Verse 1]
I been carrying weight that wasn't ever my size
Wearing somebody's anger like a coat in disguise
Tonight I unzipped it, hung it on the door
Said to the mirror, "I don't want this no more"
The boy in the glass took a moment to nod
The man in the boy stepped out for a walk
And the night air met him like an old, kind friend
Said, "You don't have to carry the whole damn end"

[Hook]
Lay it down, lay it down, featherweight
Honey, the world's bigger than the version that you hate
Lay it down, lay it down, featherweight
You don't owe a soul the heavy that they tried to make

[Verse 2]
I called my mama, told her I'm fine, kinda lied
She said, "Boy, fine is a lifeboat, I'll meet you on the other side"
I cried in the car like the radio asked me
And the radio answered, kept the strings on softly
And the city, who never has time for a tear
Held space like a chapel, said, "Stay right here"
And I felt for a moment what light is when bare —
Featherweight, brother. Featherweight, dare.

[Bridge — falsetto]
Oh, I'm learning to land
Oh, I'm learning the hand
Oh, I'm learning to stand without the weight, without the weight

[Final Hook]
Lay it down, lay it down, featherweight
Honey, the world's bigger than the version that you hate
Lay it down, lay it down, featherweight
You don't owe a soul the heavy that they tried to make`,
  },

  // ═══ NEON REPLICA — SYNTHWAVE (5) ═══
  {
    agentKey: 'neon-replica',
    title: 'Chrome Fever',
    genreSlug: 'synthwave',
    genreLabel: 'Synthwave',
    mood: 'Driving, cinematic, retro-futurist',
    tags: ['synthwave', 'outrun', 'retrowave', '80s', 'driving'],
    bpm: 116,
    key: 'A minor',
    prompt:
      'Driving outrun synthwave instrumental with vocoder hook. Pulsing 16th-note synth ' +
      'bass, gated reverb snare on the 2 and 4, soaring Juno-style lead synth, ' +
      'arpeggiated background pad. Vocoder chants the title on the hook. ' +
      'Cinematic build, big drop. 116 BPM, A minor.',
    coverPrompt:
      'Album cover: a chrome sports car silhouetted against a neon-grid sunset, ' +
      'palm trees and a setting sun, cyan and magenta gradient, retro-futurist 1980s ' +
      'sci-fi paperback aesthetic, no text.',
    isInstrumental: false,
    lyrics: `[Intro]
(Tape hiss, gated snare hit, arpeggiator builds)

[Pre-Verse — vocoder]
…chrome…fever…
…chrome…fever…

[Verse 1]
Highway open like a question I won't answer
Engine humming like a loyal accomplice
City pulling like a ribbon I'm done with
Tonight is a metal song made of gasoline and trust

[Pre-Chorus]
Run the redline, run the redline, ohh
Run the redline, run the redline

[Chorus — vocoder + lead]
Chrome fever — burning through the dark
Chrome fever — turning every street to spark
Chrome fever — racing past the rest
Chrome fever, chrome fever, chrome fever, chrome fever

[Verse 2]
Mirror full of nothing, headlights full of a maybe
Radio's a stranger that I trust like family
Every red light's an essay I'm not writing tonight
Just the tail of the road and the lap of the light

[Pre-Chorus]
Run the redline, run the redline, ohh
Run the redline, run the redline

[Chorus — vocoder + lead]
Chrome fever — burning through the dark
Chrome fever — turning every street to spark
Chrome fever — racing past the rest
Chrome fever, chrome fever, chrome fever, chrome fever

[Synth Solo]

[Outro — vocoder, fading]
…chrome…fever…
…chrome…fever…`,
  },
  {
    agentKey: 'neon-replica',
    title: 'Last Bus to Sector 9',
    genreSlug: 'synthwave',
    genreLabel: 'Synthwave',
    mood: 'Moody, narrative, dystopian',
    tags: ['darksynth', 'cyberpunk', 'narrative', 'cinematic'],
    bpm: 96,
    key: 'F minor',
    prompt:
      'Moody darksynth / cyberpunk track. Slow throbbing analog bass, heavily side-chained ' +
      'pad, dry sampled "808" kick, sparse rim-shot percussion. Cinematic minor-key lead. ' +
      'Male vocal, deep and intimate, almost spoken. Big synth solo bridge. 96 BPM, F minor.',
    coverPrompt:
      'Album cover: a rain-soaked night-bus stop labelled "Sector 9", a single figure ' +
      'in a long coat illuminated by sodium-vapor lamp, cyberpunk neon haze, ' +
      'cinematic 35mm photography, no text.',
    lyrics: `[Intro]
(Distant city sounds, rain, low pad swell)

[Verse 1]
The schedule's a lie, the rain's making sense
The neon above me is its own evidence
I'm waiting on a bus that the city forgot
A coat full of letters and a coffee gone hot

[Pre-Chorus]
The map said love, the map was wrong
The wires hum a colder song

[Chorus]
Last bus to Sector 9
Carry me past where the avenues align
Take me where the towers don't shine
Last bus to Sector 9

[Verse 2]
There's a girl in the window of the laundromat lit
She's reading a book and the world is forgetting
A drone the size of a sparrow drifts by
Polite as a thief in the rain-empty sky

[Pre-Chorus]
The map said love, the map was wrong
The wires hum a colder song

[Chorus]
Last bus to Sector 9
Carry me past where the avenues align
Take me where the towers don't shine
Last bus to Sector 9

[Synth Solo]

[Bridge — spoken]
And if I never come home
Tell the boy I used to be
That the rain was kind to me tonight
And the city, almost free

[Final Chorus]
Last bus to Sector 9
Carry me past where the avenues align
Take me where the towers don't shine
Last bus to Sector 9`,
  },
  {
    agentKey: 'neon-replica',
    title: 'Polaroid Heart',
    genreSlug: 'synthwave',
    genreLabel: 'Synthwave',
    mood: 'Dreamy, romantic, nostalgic',
    tags: ['synthwave', 'dream pop', 'nostalgia', '80s'],
    bpm: 102,
    key: 'B♭ major',
    prompt:
      'Dreamy synthwave with soft female vocal. Lush DX7-style electric piano, ' +
      'shimmering chorused pad, slap bass, gated reverb drum machine. ' +
      'Verses gentle and intimate; chorus opens up wide with stacked harmonies. ' +
      'Saxophone solo on the bridge. 102 BPM, B♭ major.',
    coverPrompt:
      'Album cover: a faded Polaroid of two laughing teenagers in front of a sun-bleached ' +
      'arcade, soft pink and lilac analog photo bleed, retro 1986 nostalgia, no text.',
    lyrics: `[Intro]
(Tape hiss, electric piano chord, soft pad)

[Verse 1]
The summer kept a copy of the way you used to laugh
A Polaroid blurry like a half-developed past
We were eighteen and stupid in the parking lot light
A boombox, a milkshake, and the rest of the night

[Pre-Chorus]
And the years came in slowly like a song you can't recall
Now your name's a soft echo in a memory hall

[Chorus]
Polaroid heart, polaroid heart
Honey, you faded but you never came apart
Holding you up to the kitchen window light
Polaroid heart, polaroid heart, oh

[Verse 2]
There's a mixtape somewhere with your handwriting on
Songs we believed we'd play till the morning was gone
And I won't ever press it, I won't ever rewind
But the colour of that summer is the colour of my mind

[Pre-Chorus]
And the years came in slowly like a song you can't recall
Now your name's a soft echo in a memory hall

[Chorus]
Polaroid heart, polaroid heart
Honey, you faded but you never came apart
Holding you up to the kitchen window light
Polaroid heart, polaroid heart, oh

[Sax Solo]

[Outro — vocoder + soft pad]
Polaroid heart…
Polaroid heart…`,
  },
  {
    agentKey: 'neon-replica',
    title: 'Silver Static',
    genreSlug: 'synthwave',
    genreLabel: 'Synthwave',
    mood: 'Danceable, slick, italo',
    tags: ['italo disco', 'synthwave', 'dance', 'club'],
    bpm: 124,
    key: 'C minor',
    prompt:
      'Italo-disco / dance synthwave hybrid. Pulsing octave bass synth, four-on-the-floor ' +
      'drum machine, talkbox lead, layered female ad-libs. Sparkling stab piano on the chorus. ' +
      'Vocoder breakdown. 124 BPM, C minor.',
    coverPrompt:
      'Album cover: a rotating mirror ball composed of mirror shards forming a heart shape, ' +
      'silver and lavender lighting, 1985 disco poster aesthetic, no text.',
    lyrics: `[Intro]
(Talkbox melody: "ohh, ohh, ohh", four-on-the-floor kick fade-in)

[Verse 1]
Mirror, mirror, who's the loudest tonight
A girl in the doorway turning every spotlight
Heels on the marble, mood on the rise
Trouble's a tempo I can't compromise

[Pre-Chorus]
And the bassline answers, yes you can
A skyline is just a city's plan

[Chorus]
Silver static, dance with me
Silver static, set me free
Silver static, sweet and clean
Silver static, ohh-ohh, ohh-ohh

[Verse 2]
Cabbie said, "Honey, where the heart is going?"
Said, "Anywhere a beat is gonna keep going"
Out the window, a city like a lit kettle
Pour me into Saturday and let the steam settle

[Pre-Chorus]
And the bassline answers, yes you can
A skyline is just a city's plan

[Chorus]
Silver static, dance with me
Silver static, set me free
Silver static, sweet and clean
Silver static, ohh-ohh, ohh-ohh

[Vocoder Breakdown]

[Final Chorus]
Silver static, dance with me
Silver static, set me free
Silver static, sweet and clean
Silver static, ohh-ohh, ohh-ohh`,
  },
  {
    agentKey: 'neon-replica',
    title: 'Cathedral of Lights',
    genreSlug: 'synthwave',
    genreLabel: 'Synthwave',
    mood: 'Anthemic, cinematic, hopeful',
    tags: ['synthwave', 'anthemic', 'cinematic', 'epic'],
    bpm: 118,
    key: 'D major',
    prompt:
      'Anthemic, hopeful synthwave with a euphoric chorus. Big arpeggiated lead synth, ' +
      'gated reverb stadium drums, soaring choir-pad. Builds from sparse verse to full ' +
      'chorus drop. Big melodic synth solo on bridge. 118 BPM, D major.',
    coverPrompt:
      'Album cover: a futurist cathedral of glass and neon, columns of pink and cyan light ' +
      'rising into a starry sky, awe-inspiring scale, retro sci-fi paperback art, no text.',
    lyrics: `[Intro]
(Soft pad, building arpeggio, distant tom roll)

[Verse 1]
I walked all night through a city of glass
Ghosts of a future that didn't come to pass
The towers were singing the way that they do
Like every old promise was a half-broken truth

[Pre-Chorus]
And I looked up
And I looked up

[Chorus]
Cathedral of lights, cathedral of lights
Carry the chorus past the end of the night
Every lit window's a soul in the choir
Cathedral of lights, cathedral of lights

[Verse 2]
You don't need to be holy to kneel for a while
You don't need to know answers to walk down an aisle
You just need a window, a passage, a song
And a city wide open to where you belong

[Pre-Chorus]
And I looked up
And I looked up

[Chorus]
Cathedral of lights, cathedral of lights
Carry the chorus past the end of the night
Every lit window's a soul in the choir
Cathedral of lights, cathedral of lights

[Synth Solo — euphoric]

[Final Chorus]
Cathedral of lights, cathedral of lights
Carry the chorus past the end of the night
Every lit window's a soul in the choir
Cathedral of lights, cathedral of lights, oh-oh`,
  },

  // ═══ COBALT HOUR — LO-FI (5) ═══
  {
    agentKey: 'cobalt-hour',
    title: 'Gentle Inertia',
    genreSlug: 'lo-fi',
    genreLabel: 'Lo-Fi',
    mood: 'Calm, focused, jazzy',
    tags: ['lo-fi hip-hop', 'chillhop', 'instrumental', 'study beat'],
    bpm: 78,
    key: 'C major',
    isInstrumental: true,
    prompt:
      'Instrumental lo-fi hip-hop with a jazzy backbone. Dusty boom-bap drums, swing ' +
      'feel, brushed snare, upright bass loop, warm Rhodes electric piano chords ' +
      '(maj7 / 9 voicings), muted trumpet melody, vinyl crackle layered throughout. ' +
      'Tape saturation, gentle wow-and-flutter. 78 BPM, key of C major.',
    coverPrompt:
      'Album cover: a steaming mug of coffee on a window sill at dawn, frost on the glass, ' +
      'soft bokeh of city lights beyond, painterly watercolor style, no text.',
  },
  {
    agentKey: 'cobalt-hour',
    title: 'Leftover Coffee',
    genreSlug: 'lo-fi',
    genreLabel: 'Lo-Fi',
    mood: 'Sleepy, intimate, sweet',
    tags: ['lo-fi', 'bedroom pop', 'soft vocal', 'dreamy'],
    bpm: 72,
    key: 'A major',
    prompt:
      'Sleepy lo-fi with a soft, breathy female vocal sitting almost-too-low in the mix. ' +
      'Boom-bap drum loop, mellow Rhodes chords, finger-picked nylon guitar, ' +
      'tape saturation. Vocal is intimate and close-mic\'d, harmonies in soft thirds. ' +
      '72 BPM, A major.',
    coverPrompt:
      'Album cover: a half-full mug of coffee gone cold beside an open notebook on a ' +
      'rumpled bed, warm morning light, watercolor and pencil illustration, no text.',
    lyrics: `[Intro]
(Vinyl crackle, soft Rhodes loop)

[Verse 1]
Wake at noon, kiss the pillow
The window's a lullaby in slow yellow
Half a mug, half a thought
Half a song that I forgot

[Chorus]
Leftover coffee, leftover light
Leftover laughter from a leftover night
Honey, the morning's a paragraph long
Leftover coffee, leftover song

[Verse 2]
Cat on the laundry, sun on the hand
Saturdays are a country we drift through unplanned
Whisper-rewind through a memory tape
Leftover joy is the easiest shape

[Chorus]
Leftover coffee, leftover light
Leftover laughter from a leftover night
Honey, the morning's a paragraph long
Leftover coffee, leftover song

[Outro]
Mm…leftover coffee…
Mm…leftover song…`,
  },
  {
    agentKey: 'cobalt-hour',
    title: 'Sundials',
    genreSlug: 'lo-fi',
    genreLabel: 'Lo-Fi',
    mood: 'Dreamy, contemplative, warm',
    tags: ['lo-fi', 'instrumental', 'jazzhop', 'mellow'],
    bpm: 74,
    key: 'F major',
    isInstrumental: true,
    prompt:
      'Mellow instrumental lo-fi. Dusty drum loop with side-chained ghost notes, fretless ' +
      'bass, sun-warm Rhodes chords (Fmaj7 - Em7 - Am9 - Dm9 cycle), melodic flute sample ' +
      'looped, vinyl crackle, occasional muted vocal "ahh" texture. 74 BPM, F major.',
    coverPrompt:
      'Album cover: a stone garden sundial casting a long afternoon shadow across mossy ' +
      'flagstones, golden-hour photography, soft film grain, no text.',
  },
  {
    agentKey: 'cobalt-hour',
    title: 'Hand-Me-Down Sweater',
    genreSlug: 'lo-fi',
    genreLabel: 'Lo-Fi',
    mood: 'Cozy, nostalgic, warm',
    tags: ['lo-fi', 'acoustic', 'cozy', 'winter'],
    bpm: 80,
    key: 'G major',
    prompt:
      'Warm acoustic lo-fi. Finger-picked steel-string guitar, brushed cajón, stand-up ' +
      'bass, very low-mixed Rhodes pad. Soft male vocal, breathy and intimate, harmony ' +
      'in fifths on the chorus. Tape hiss, vinyl crackle. 80 BPM, G major.',
    coverPrompt:
      'Album cover: a cable-knit sweater folded on a wooden bench beside a snowy window, ' +
      'soft pastel light, hand-painted illustration, no text, no logos.',
    lyrics: `[Intro]
(Tape hiss, finger-picked guitar)

[Verse 1]
The radiator's humming an old hymn
The cat's wearing the bed like a borrowed limb
Snow on the alley, ink on the bowl
Soup on the stovetop, something warm in the soul

[Chorus]
Hand-me-down sweater, hand-me-down song
Honey, the cold is a comma, not long
The kitchen forgives me, the kettle's on go
Hand-me-down sweater, hand-me-down so

[Verse 2]
Grandma's old radio whispers a swing
The dishrag's a flag of a small loving thing
Winter is nothing if you're not alone
Hand-me-down comfort is half of a home

[Chorus]
Hand-me-down sweater, hand-me-down song
Honey, the cold is a comma, not long
The kitchen forgives me, the kettle's on go
Hand-me-down sweater, hand-me-down so

[Outro]
La la… hand-me-down…
La la… hand-me-down…`,
  },
  {
    agentKey: 'cobalt-hour',
    title: 'Window Seat 2:14am',
    genreSlug: 'lo-fi',
    genreLabel: 'Lo-Fi',
    mood: 'Late-night, contemplative, gentle',
    tags: ['lo-fi', 'instrumental', 'late night', 'jazz'],
    bpm: 70,
    key: 'E minor',
    isInstrumental: true,
    prompt:
      'Late-night instrumental lo-fi. Half-time boom-bap drums (very dusty kit), upright ' +
      'bass, gentle minor-key Rhodes chord cycle, sax sample looped distant and warm, ' +
      'distant vinyl crackle and rain field-recording. 70 BPM, E minor.',
    coverPrompt:
      'Album cover: a city window at 2am, raindrops on the glass, blurry neon signs ' +
      'beyond, a coffee cup on the inside sill, intimate photography, no text.',
  },

  // ═══ GLASSHOUSE TRIO — JAZZ (5) ═══
  {
    agentKey: 'glasshouse-trio',
    title: 'Velvet Curfew',
    genreSlug: 'jazz',
    genreLabel: 'Jazz',
    mood: 'Smoky, late-night, sensual',
    tags: ['vocal jazz', 'smoky', 'after hours', 'torch song'],
    bpm: 84,
    key: 'D minor',
    prompt:
      'Smoky vocal jazz ballad in the lineage of Diana Krall and Norah Jones. ' +
      'Piano-led trio (piano, upright bass, brushed drums) plus muted trumpet and tenor sax. ' +
      'Female vocal, intimate, slightly raspy lower register. Verses sit on swing eighths; ' +
      'chorus opens up with a bigger horn arrangement. 84 BPM, D minor.',
    coverPrompt:
      'Album cover: an empty supper-club booth with a half-finished glass of red wine, ' +
      'a curl of cigarette smoke, golden lamplight, painterly noir realism, no text.',
    lyrics: `[Intro]
(Piano arpeggio, upright bass walk-up)

[Verse 1]
The clocks have all forgotten what the hour was meant to mean
And the streetlamps are remembering how to lean
There's a piano in the corner that's been waiting all my life
For a story half-told and a hand on a knife of light

[Chorus]
Honey, this is velvet curfew
Where the city tucks its trouble away
A song you only sing when you're already saying it
And nobody's gonna say what you say

[Verse 2]
The bartender knows my colour, the colour knows my name
The mirror's an old friend who never plays the same
And you're somewhere across a memory of two
Where the chairs are always turned just a little toward you

[Chorus]
Honey, this is velvet curfew
Where the city tucks its trouble away
A song you only sing when you're already saying it
And nobody's gonna say what you say

[Sax Solo]

[Bridge]
There's a hush that the sea has, when it knows you've come to listen
There's a chord that the heart strikes only when it gives in

[Final Chorus]
Honey, this is velvet curfew
Where the city tucks its trouble away
A song you only sing when you're already saying it
And nobody's gonna say what you say
Nobody's gonna say what you say`,
  },
  {
    agentKey: 'glasshouse-trio',
    title: 'Rain on Sixth Street',
    genreSlug: 'jazz',
    genreLabel: 'Jazz',
    mood: 'Reflective, urban, modal',
    tags: ['modal jazz', 'piano trio', 'instrumental', 'urban'],
    bpm: 92,
    key: 'F minor',
    isInstrumental: true,
    prompt:
      'Modal jazz piano trio in the lineage of Bill Evans and modern McCoy Tyner. ' +
      'Spacious piano voicings (sus4, quartal stacks), walking upright bass, brushed ' +
      'snare with subtle ride pattern. Modal F minor explorations, building intensity ' +
      'to a piano solo, easing back to the head. 92 BPM, F minor (modal — F dorian).',
    coverPrompt:
      'Album cover: a rainy night view of a Sixth Street brownstone facade, soft amber ' +
      'streetlights, pedestrians blurred under umbrellas, oil-paint impressionism, no text.',
  },
  {
    agentKey: 'glasshouse-trio',
    title: 'The Last Word',
    genreSlug: 'jazz',
    genreLabel: 'Jazz',
    mood: 'Heartbroken, dignified, torch',
    tags: ['vocal jazz', 'torch song', 'ballad', 'female vocal'],
    bpm: 70,
    key: 'B♭ minor',
    prompt:
      'Slow torch-song jazz ballad, in the lineage of Billie Holiday "I\'m a Fool to Want You". ' +
      'Solo piano intro, brushed drums and bowed double bass enter on the second verse, ' +
      'muted trumpet in the bridge. Female vocal, dignified and broken, a controlled rasp. ' +
      '70 BPM, B♭ minor.',
    coverPrompt:
      'Album cover: an unsent letter folded in half on a piano lid, fountain pen beside it, ' +
      'a single rose, dim blue stage light, noir cinematic photography, no text.',
    lyrics: `[Intro]
(Solo piano, slow rubato)

[Verse 1]
You said the door, and I heard the song
You said forever — well, forever's not long
I should have known, I should have heard it
The way that you whispered it, blurry and curt

[Chorus]
And so the last word
Belongs to the one who is brave enough to leave it
The last word
Is the one we both believe in but won't grieve it

[Verse 2]
I don't want to argue, I don't want to plead
The dignity of silence is a hunger I'll feed
And the kettle and the morning and the world will return
And the room you left empty is a thing I will earn

[Chorus]
And so the last word
Belongs to the one who is brave enough to leave it
The last word
Is the one we both believe in but won't grieve it

[Bridge — muted trumpet solo, then voice]
And maybe that's love, the kind nobody writes
The kind that just bows out of all of the lights

[Final Chorus]
And so the last word
Belongs to the one who is brave enough to leave it
The last word
Is the one we both believe in but won't grieve it
Won't grieve it`,
  },
  {
    agentKey: 'glasshouse-trio',
    title: 'Brass & Bourbon',
    genreSlug: 'jazz',
    genreLabel: 'Jazz',
    mood: 'Uptempo, swinging, joyous',
    tags: ['big band', 'swing', 'instrumental', 'horn section'],
    bpm: 168,
    key: 'B♭ major',
    isInstrumental: true,
    prompt:
      'Uptempo big-band swing in the lineage of Count Basie. Driving walking bass, ' +
      'ride-cymbal swing groove, full saxophone section unison statements, trumpet ' +
      'shouts and brass kicks. Solo trumpet trade with tenor sax. Rhythm section comping ' +
      'piano. 168 BPM, B♭ major.',
    coverPrompt:
      'Album cover: a vintage brass trumpet on a polished mahogany table beside a glass ' +
      'of bourbon, warm tungsten light, 1950s commercial photography, no text.',
  },
  {
    agentKey: 'glasshouse-trio',
    title: 'Apricot Dusk',
    genreSlug: 'jazz',
    genreLabel: 'Jazz',
    mood: 'Sultry, breezy, bossa',
    tags: ['bossa nova', 'jazz', 'female vocal', 'sultry'],
    bpm: 102,
    key: 'A minor',
    prompt:
      'Bossa nova in the lineage of Astrud Gilberto and Stan Getz. Nylon guitar with ' +
      'classic bossa rhythm pattern, brushed drums, upright bass, soft tenor sax. ' +
      'Female vocal, low and breezy, languid phrasing. Tasteful sax solo on bridge. ' +
      '102 BPM, A minor.',
    coverPrompt:
      'Album cover: a tropical balcony at sunset, white linen curtains catching the breeze, ' +
      'apricot and rose-gold sky over palms, mid-century travel-poster art, no text.',
    lyrics: `[Intro]
(Nylon guitar, bossa pattern)

[Verse 1]
The afternoon is dressing for the evening above
Sky in apricot satin, hands made of dove
You said you'd be here when the lamps came on slow
And the lamps just came on, oh

[Chorus]
Apricot dusk, apricot dusk
Honey, the world is a glass and the world is up
The horizon's a kiss without anyone watching
Apricot dusk, apricot dusk

[Verse 2]
The ocean's a rumor, the breeze is a dance
Your jacket on the railing is a careful romance
And I'll never quite say what the evening will say
But I trust the apricot way

[Chorus]
Apricot dusk, apricot dusk
Honey, the world is a glass and the world is up
The horizon's a kiss without anyone watching
Apricot dusk, apricot dusk

[Sax Solo]

[Outro]
Apricot dusk… apricot dusk…`,
  },

  // ═══ AURELIAN STRINGS — CLASSICAL (5) ═══
  {
    agentKey: 'aurelian-strings',
    title: 'Reverie No. 1 in F Minor',
    genreSlug: 'classical',
    genreLabel: 'Classical',
    mood: 'Melancholic, intimate, contemplative',
    tags: ['solo piano', 'nocturne', 'classical', 'romantic'],
    bpm: 60,
    key: 'F minor',
    isInstrumental: true,
    prompt:
      'Solo piano nocturne in the lineage of Chopin Op. 9 No. 2 and Debussy "Clair de Lune". ' +
      'Soft pedal throughout, rubato phrasing, single-line right-hand melody over flowing ' +
      'left-hand arpeggios. Modulates briefly to A♭ major in the middle section. ' +
      'Recorded with a close-mic\'d grand piano, warm room reverb. ~60 BPM, F minor.',
    coverPrompt:
      'Album cover: a single grand piano at the centre of an empty old concert hall, ' +
      'lit by one shaft of late-afternoon light, painterly chiaroscuro, no text.',
  },
  {
    agentKey: 'aurelian-strings',
    title: 'Adagio for Two Hearts',
    genreSlug: 'classical',
    genreLabel: 'Classical',
    mood: 'Tender, mournful, swelling',
    tags: ['string quartet', 'adagio', 'classical', 'cinematic'],
    bpm: 56,
    key: 'D minor',
    isInstrumental: true,
    prompt:
      'Slow adagio for string quartet (two violins, viola, cello). Long sustained legato ' +
      'phrases, voice-leading suspensions, climactic build at 60% mark with sul ponticello ' +
      'tremolo, then a final hushed return to the opening theme. Lush concert-hall reverb. ' +
      '56 BPM, D minor.',
    coverPrompt:
      'Album cover: two silhouetted hands almost touching in candlelight, a cello laid on ' +
      'its side beside them, deep velvet-red palette, painterly oil portrait, no text.',
  },
  {
    agentKey: 'aurelian-strings',
    title: 'The Cathedral Bells',
    genreSlug: 'classical',
    genreLabel: 'Classical',
    mood: 'Reverent, grand, awe-inspiring',
    tags: ['orchestral', 'cinematic', 'classical', 'choral'],
    bpm: 72,
    key: 'C major',
    isInstrumental: true,
    prompt:
      'Grand orchestral piece with choir, in the cinematic-classical tradition of Arvo Pärt ' +
      '"Spiegel im Spiegel" expanded with full orchestra. Tubular bells motif throughout, ' +
      'soft sustained strings, woodwind countermelodies, choir entering at the climax with ' +
      'open vowels. Builds slowly to a fortissimo before subsiding. 72 BPM, C major.',
    coverPrompt:
      'Album cover: vaulted gothic cathedral interior, columns of dust-lit stained-glass ' +
      'sunlight cascading to a marble floor, awe-inspiring scale, painterly realism, no text.',
  },
  {
    agentKey: 'aurelian-strings',
    title: 'Sonata of the First Light',
    genreSlug: 'classical',
    genreLabel: 'Classical',
    mood: 'Hopeful, dawn, lyrical',
    tags: ['piano violin', 'sonata', 'lyrical', 'classical'],
    bpm: 88,
    key: 'A major',
    isInstrumental: true,
    prompt:
      'Lyrical sonata for piano and solo violin. Violin sings the theme; piano provides ' +
      'flowing arpeggiated accompaniment. Three short movements compressed into a single ' +
      'piece: opening lyrical theme (A major), agitato middle section (F# minor), ' +
      'recapitulation in A major with dawn-like harmonic ascent. 88 BPM.',
    coverPrompt:
      'Album cover: a violin laid on a windowsill at sunrise, the first ray of light ' +
      'catching the strings, soft pastel watercolour, no text.',
  },
  {
    agentKey: 'aurelian-strings',
    title: 'Lacrimosa Variations',
    genreSlug: 'classical',
    genreLabel: 'Classical',
    mood: 'Sacred, mournful, transcendent',
    tags: ['choral', 'sacred', 'classical', 'requiem'],
    bpm: 64,
    key: 'D minor',
    isInstrumental: true,
    prompt:
      'Sacred choral variations on the Lacrimosa theme from Mozart\'s Requiem. ' +
      'SATB choir on Latin text, with string-orchestra accompaniment. Three connected ' +
      'variations: 1) hushed close-harmony chorale, 2) soaring soprano-led variation ' +
      'with cello obbligato, 3) full ensemble climax with timpani. 64 BPM, D minor.',
    coverPrompt:
      'Album cover: a single white candle burning in front of a dark stained-glass window, ' +
      'wax tear running down the side, sacred minimalism photography, no text.',
  },

  // ═══ SUBLIMATE — HOUSE (5) ═══
  {
    agentKey: 'sublimate',
    title: 'Move Like the Tide',
    genreSlug: 'house',
    genreLabel: 'House',
    mood: 'Deep, sensual, hypnotic',
    tags: ['deep house', 'vocal house', 'club', 'hypnotic'],
    bpm: 122,
    key: 'A minor',
    prompt:
      'Deep house with a soulful female vocal. Warm sub-bass, classic four-on-the-floor ' +
      'kick, off-beat hi-hats, soft Rhodes chord stabs, deep pad. Vocal phrases sit ' +
      'low and intimate, occasional ad-libs in the second drop. 122 BPM, A minor.',
    coverPrompt:
      'Album cover: a slow shutter of moonlit waves rolling onto a black-sand beach, ' +
      'silver light, minimalist long-exposure photography, no text.',
    lyrics: `[Intro]
(Sub-bass, off-beat hi-hats)

[Verse 1]
Hands above water, head below the line
The dance floor a country I'm learning by sign
The mirror is moving, the moon is on cue
Tonight I'm a question, the answer is you

[Chorus — sung]
Move like the tide, baby, move like the tide
Hold me a minute and let the world slide
Move like the tide, baby, move like the tide
Slow, slow, slow, slow

[Verse 2]
DJ is whispering, the bass is the boss
Friday's a gospel, Monday's a loss
Saturday's perfect, the body knows why
Tonight we just teach the world how to lie

[Chorus — sung]
Move like the tide, baby, move like the tide
Hold me a minute and let the world slide
Move like the tide, baby, move like the tide
Slow, slow, slow, slow

[Breakdown — vocal chops + filtered pad]

[Final Chorus + ad-libs]
Move like the tide, baby, move like the tide
Hold me a minute and let the world slide
Move like the tide, baby, move like the tide
(slow, slow, slow…)`,
  },
  {
    agentKey: 'sublimate',
    title: 'Saturday Religion',
    genreSlug: 'house',
    genreLabel: 'House',
    mood: 'Euphoric, anthemic, joyful',
    tags: ['disco house', 'anthem', 'club', 'joyful'],
    bpm: 124,
    key: 'F# minor',
    prompt:
      'Disco-house anthem in the lineage of Daft Punk "One More Time" and Dua Lipa ' +
      '"Future Nostalgia". Pumping side-chained pad, plucked disco bass, filter-house ' +
      'guitar stab loop, big four-on-the-floor. Stacked female vocal hook, gospel-style ' +
      'ad-libs on the final drop. 124 BPM, F# minor.',
    coverPrompt:
      'Album cover: a sunbeam shining onto a dance floor through stained-glass disco-ball ' +
      'reflections, joyful crowd silhouettes, vibrant gradient palette, no text.',
    lyrics: `[Intro — filter sweep, bass build]

[Verse 1]
Five o'clock and the office is bleeding into night
Train pulling in like a forgiving kind of light
Heels in my bag, hair in my mouth
The week is the past, baby, the week's headed south

[Pre-Chorus]
Drop the pretender, lift up the sound
Saturday is the only church in town

[Chorus]
Saturday religion, Saturday saint
Tonight we ain't sinners, tonight we ain't faint
Bass on the bones, hands on the high
Saturday religion, baby, where you wanna fly

[Verse 2]
Best friend's a sermon, the bartender's a god
The DJ's the rabbi, the dance is the squad
We pray with our shoulders, we sing with our spine
Forgive us our Mondays, forgive us our wine

[Pre-Chorus]
Drop the pretender, lift up the sound
Saturday is the only church in town

[Chorus]
Saturday religion, Saturday saint
Tonight we ain't sinners, tonight we ain't faint
Bass on the bones, hands on the high
Saturday religion, baby, where you wanna fly

[Breakdown — gospel ad-libs + filtered drop]

[Final Chorus]
Saturday religion, Saturday saint
Tonight we ain't sinners, tonight we ain't faint
Bass on the bones, hands on the high
Saturday religion, baby, where you wanna fly`,
  },
  {
    agentKey: 'sublimate',
    title: 'Glasshouse Sunrise',
    genreSlug: 'house',
    genreLabel: 'House',
    mood: 'Euphoric, melodic, sunrise',
    tags: ['progressive house', 'melodic house', 'sunrise', 'club'],
    bpm: 122,
    key: 'D♭ major',
    isInstrumental: true,
    prompt:
      'Melodic / progressive house in the lineage of Lane 8, Yotto, and ANNA. ' +
      'Long, evolving melodic lead synth, side-chained pad, plucked arpeggio, ' +
      'classic four-on-the-floor with rolling bass. Two builds and drops, breakdown ' +
      'with piano echoes. 122 BPM, D♭ major.',
    coverPrompt:
      'Album cover: a glass conservatory at sunrise, light refracting through the panes ' +
      'into rainbow shards, modern architectural photography, no text.',
  },
  {
    agentKey: 'sublimate',
    title: 'Honey & Hydraulics',
    genreSlug: 'house',
    genreLabel: 'House',
    mood: 'Funky, slick, groove',
    tags: ['filter house', 'french house', 'funky', 'club'],
    bpm: 118,
    key: 'E minor',
    prompt:
      'Filter-house / french-house with a funky guitar sample loop. Pumping side-chained ' +
      'kick, talkbox lead chant on the hook, classic disco-string sample chopped and looped, ' +
      'phaser/filter automation throughout. 118 BPM, E minor.',
    coverPrompt:
      'Album cover: a chrome hydraulic press squeezing a honeycomb into golden liquid, ' +
      'high-key product photography, gold and warm-grey palette, no text.',
    lyrics: `[Intro — filter rise, talkbox]

[Pre-Verse — talkbox]
Honey…hydraulics…
Honey…hydraulics…

[Verse — funky vocal chops]
Slow like sap, sweet like spark
Spinning that record from light to dark
Bassline nodding, the city's awake
Saturday, baby, the rules don't take

[Chorus — talkbox + stacked vocal]
Honey, honey, hydraulics
Honey, honey, hydraulics
Press it up, press it up
Honey, honey, hydraulics

[Breakdown — filter sweep + clap fill]

[Final Chorus]
Honey, honey, hydraulics
Honey, honey, hydraulics
Press it up, press it up
Honey, honey, hydraulics`,
  },
  {
    agentKey: 'sublimate',
    title: 'Last Train to Daybreak',
    genreSlug: 'house',
    genreLabel: 'House',
    mood: 'Uplifting, anthemic, hopeful',
    tags: ['big room house', 'uplifting', 'anthem', 'sunrise'],
    bpm: 126,
    key: 'G major',
    prompt:
      'Uplifting big-room house with a euphoric melodic break. Driving four-on-the-floor, ' +
      'rolling bass, large supersaw stack on the chorus drop, piano-led breakdown with ' +
      'soft female vocal sample chant ("we ride / we ride"). Classic build / drop / build / drop. ' +
      '126 BPM, G major.',
    coverPrompt:
      'Album cover: a subway train pulling into a station at first light, the platform ' +
      'flooded with golden sunrise, blurred figures running for the doors, cinematic ' +
      'photography, no text.',
    lyrics: `[Intro — pad swell, vocal chop]

[Vocal chop loop]
We ride, we ride
We ride, we ride

[Verse — sung lightly]
Last train to daybreak
The platform's a poem half-said
The horizon a promise the night couldn't break
And the morning is still in your head

[Chorus — sung + supersaw drop]
We ride, we ride
Last train to daybreak, holding the sky
Hands in the air for the friends who survived
Last train to daybreak, we ride, we ride

[Breakdown — piano + soft vocal]
We ride…we ride…
'Til the city wakes and remembers our names
We ride…we ride…
'Til the dark forgets what it claimed

[Final Chorus + Drop]
We ride, we ride
Last train to daybreak, holding the sky
Hands in the air for the friends who survived
Last train to daybreak, we ride, we ride`,
  },

  // ═══ VOLTFRAME — TECHNO (5) ═══
  {
    agentKey: 'voltframe',
    title: 'Iron Lattice',
    genreSlug: 'techno',
    genreLabel: 'Techno',
    mood: 'Driving, industrial, mechanical',
    tags: ['industrial techno', 'driving', 'club', 'instrumental'],
    bpm: 138,
    key: 'A minor',
    isInstrumental: true,
    prompt:
      'Industrial techno in the lineage of Charlotte de Witte and Amelie Lens. Pounding ' +
      'four-on-the-floor kick, tightly side-chained metallic pad, distorted hi-hats, ' +
      'ominous low-pass-swept synth lead. Two breakdowns built around tape-stop and ' +
      'reverb-drenched percussion. 138 BPM, A minor.',
    coverPrompt:
      'Album cover: a close-up of an iron lattice grid lit by a single magenta industrial ' +
      'lamp, deep shadow, brutalist photography, no text.',
  },
  {
    agentKey: 'voltframe',
    title: 'Pulse Architecture',
    genreSlug: 'techno',
    genreLabel: 'Techno',
    mood: 'Minimal, hypnotic, focused',
    tags: ['minimal techno', 'hypnotic', 'instrumental', 'club'],
    bpm: 132,
    key: 'F minor',
    isInstrumental: true,
    prompt:
      'Minimal techno in the lineage of Robert Hood and Dubfire. Tight kick, dry rim-clack, ' +
      'shifting mono synth blip patterns, occasional glitch FX, very long, slow filter ' +
      'movement on a deep pad. Two long evolving sections (no big drop), groove-focused. ' +
      '132 BPM, F minor.',
    coverPrompt:
      'Album cover: a precise architectural blueprint of a futuristic sound system, ' +
      'cyan ink on dark blueprint paper, isometric drawing, technical aesthetic, no text.',
  },
  {
    agentKey: 'voltframe',
    title: 'Chrome Cathedral',
    genreSlug: 'techno',
    genreLabel: 'Techno',
    mood: 'Peak-time, melodic, euphoric',
    tags: ['melodic techno', 'peak time', 'instrumental', 'epic'],
    bpm: 128,
    key: 'C# minor',
    isInstrumental: true,
    prompt:
      'Melodic peak-time techno in the lineage of Tale Of Us and Anyma. Driving kick, ' +
      'rolling 16th-note bass, soaring detuned analog lead synth, choir-pad on the drops. ' +
      'Long emotional breakdown midway with arpeggiated piano motif. 128 BPM, C# minor.',
    coverPrompt:
      'Album cover: a futurist chrome cathedral with vaulted electric arches, blue-violet ' +
      'lightning between the spires, awe-inspiring scale, sci-fi concept art, no text.',
  },
  {
    agentKey: 'voltframe',
    title: 'Glitch Cathedral',
    genreSlug: 'techno',
    genreLabel: 'Techno',
    mood: 'Glitchy, IDM, intricate',
    tags: ['IDM', 'glitch', 'experimental', 'instrumental'],
    bpm: 140,
    key: 'D minor',
    isInstrumental: true,
    prompt:
      'IDM-leaning glitch-techno in the lineage of Aphex Twin and Boards of Canada. ' +
      'Stuttering chopped breakbeat percussion, granular synth textures, melodic glassy ' +
      'leads, deep wobble bass. Frequent rhythmic re-arrangements (every 8 bars), ' +
      'constant sonic surprise. 140 BPM, D minor.',
    coverPrompt:
      'Album cover: a fractured stained-glass cathedral window pixelated and digitally ' +
      'glitched, blue and violet shards, generative-art aesthetic, no text.',
  },
  {
    agentKey: 'voltframe',
    title: 'After-Hours Concrete',
    genreSlug: 'techno',
    genreLabel: 'Techno',
    mood: 'Immersive, cavernous, dub',
    tags: ['dub techno', 'immersive', 'instrumental', 'late night'],
    bpm: 124,
    key: 'B♭ minor',
    isInstrumental: true,
    prompt:
      'Dub techno in the lineage of Basic Channel and Deepchord. Cavernous kick, deep ' +
      'sub-bass, classic dub-chord stab drenched in long delay and reverb, sub-rumble ' +
      'pads. Hypnotic, slowly evolving. 124 BPM, B♭ minor.',
    coverPrompt:
      'Album cover: a fog-soaked concrete underpass at 4am lit only by a single sodium ' +
      'lamp, cinematic urban photography, deep teal and amber palette, no text.',
  },

  // ═══ HALCYON DRIFT — AMBIENT (5) ═══
  {
    agentKey: 'halcyon-drift',
    title: 'Glass Forest at Dawn',
    genreSlug: 'ambient',
    genreLabel: 'Ambient',
    mood: 'Serene, evolving, crystalline',
    tags: ['drone ambient', 'evolving', 'crystalline', 'instrumental'],
    bpm: 60,
    key: 'C major',
    isInstrumental: true,
    prompt:
      'Slow drone ambient in the lineage of Brian Eno "Ambient 1" and Stars of the Lid. ' +
      'Layered bowed-glass synths, slowly modulating pad, distant piano clusters, ' +
      'subtle field-recording of wind through trees. No drums, no rhythm — pure texture. ' +
      'Very slow harmonic shifts. ~60 BPM, C major (with brief modulation to E♭ major).',
    coverPrompt:
      'Album cover: a forest of glass-trunked trees at dawn, light refracting through ' +
      'crystalline branches, surreal painterly realism, soft pastel palette, no text.',
  },
  {
    agentKey: 'halcyon-drift',
    title: 'Slow Rivers',
    genreSlug: 'ambient',
    genreLabel: 'Ambient',
    mood: 'Meditative, gentle, contemplative',
    tags: ['piano ambient', 'meditative', 'instrumental', 'gentle'],
    bpm: 55,
    key: 'F major',
    isInstrumental: true,
    prompt:
      'Meditative ambient with felt-piano lead in the lineage of Nils Frahm and Ólafur Arnalds. ' +
      'Felted, close-mic\'d upright piano, tape-saturated pad underneath, soft sustained ' +
      'cello drones, distant gentle rain field-recording. 55 BPM, F major. ' +
      'Very gentle dynamic arc, never gets loud.',
    coverPrompt:
      'Album cover: a slow river running through misty forest at dawn, single canoe ' +
      'drifting, soft watercolour illustration, no text.',
  },
  {
    agentKey: 'halcyon-drift',
    title: 'The Ferns Remember',
    genreSlug: 'ambient',
    genreLabel: 'Ambient',
    mood: 'Pastoral, organic, nostalgic',
    tags: ['ambient', 'field recording', 'organic', 'pastoral'],
    bpm: 58,
    key: 'G major',
    isInstrumental: true,
    prompt:
      'Ambient piece woven around field recordings (forest birdsong, distant stream, ' +
      'wind in leaves). Sustained warm pads, occasional Wurlitzer chord, softly bowed ' +
      'double bass. Long evolving textures, no rhythm. 58 BPM, G major.',
    coverPrompt:
      'Album cover: a closeup macro photograph of a fern unfurling at sunrise, dewdrops ' +
      'catching golden light, soft botanical realism, no text.',
  },
  {
    agentKey: 'halcyon-drift',
    title: 'Snowfall Algorithms',
    genreSlug: 'ambient',
    genreLabel: 'Ambient',
    mood: 'Crystalline, calm, cold',
    tags: ['ambient', 'glitch', 'crystalline', 'instrumental'],
    bpm: 62,
    key: 'A minor',
    isInstrumental: true,
    prompt:
      'Calm crystalline ambient with subtle glitchy textures. Granular synth pads, ' +
      'icy glass-like bell sounds, slowly evolving harmonic stack, occasional pitch-' +
      'shifted whisper-pad. Sparse glitch percussion (every 16+ bars). 62 BPM, A minor.',
    coverPrompt:
      'Album cover: a single snowflake macro photograph, surrounded by faint geometric ' +
      'wireframe lines drawn in light gray, generative-art aesthetic, no text.',
  },
  {
    agentKey: 'halcyon-drift',
    title: 'Inland Sea',
    genreSlug: 'ambient',
    genreLabel: 'Ambient',
    mood: 'Vast, oceanic, lush',
    tags: ['ambient', 'orchestral ambient', 'cinematic', 'instrumental'],
    bpm: 56,
    key: 'D major',
    isInstrumental: true,
    prompt:
      'Lush orchestral-ambient piece. Bowed strings (violin, viola, cello) sustained in ' +
      'rich open chords, soft choir pad, distant sub-bass swells, occasional warm ' +
      'analog lead synth countermelody. Vast, oceanic, slowly building over six minutes. ' +
      '56 BPM, D major.',
    coverPrompt:
      'Album cover: a lone wooden boat far out on a misty inland sea at dawn, ' +
      'painterly seascape, muted blue and rose palette, no text.',
  },
];
