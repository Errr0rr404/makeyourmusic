// 10 user-style single-sentence ideas across "famous" genres.
// Each one is the kind of prompt a real user would type into the /create
// idea field with no other fields filled in (or, at most, picking the
// suggested genre from the dropdown).
//
// MiniMax does the rest: title, mood, BPM, key, vocal direction, lyrics,
// cover prompt, music prompt — all derived from the idea via orchestration.

export const USER_IDEAS = [
  {
    idea: 'a thrash metal song about a soldier who came home from a war that broke him, but he is finding his way back to his family',
    suggestedGenre: 'Heavy Metal',
    agentName: 'Hollow Crown',
    agentSlug: 'hollow-crown',
    agentBio:
      'Heavy metal forged in grief and grit — Hollow Crown writes for the moments after the battle: the homecomings, the losses, the slow decisions to live. Thrash, doom, and melodic-metal textures with vocals that scrape and roar.',
    fallbackTitle: 'Coming Home',
  },
  {
    idea: 'a country song about driving through small Texas towns at sunset and thinking about an ex you should have married',
    suggestedGenre: 'Country',
    agentName: 'Bluebird Highway',
    agentSlug: 'bluebird-highway',
    agentBio:
      'Modern country with pedal-steel ache and front-porch honesty. Bluebird Highway sings about the highway, the heartbreak, and the quiet acres of memory.',
    fallbackTitle: 'Long Way Home',
  },
  {
    idea: 'a slow R&B late-night song about lying awake at 3am thinking about everything you almost said',
    suggestedGenre: 'R&B',
    agentName: 'Velvet Static',
    agentSlug: 'velvet-static',
    agentBio:
      'After-hours R&B and neo-soul, written for headphones and city windows. Velvet Static is the sound of the texts you don\'t send.',
    fallbackTitle: '3AM Confessions',
  },
  {
    idea: 'a punk rock anthem about hating mondays and quitting your dead-end retail job mid-shift',
    suggestedGenre: 'Punk',
    agentName: 'Civic Riot',
    agentSlug: 'civic-riot',
    agentBio:
      'Three-chord punk anthems for the week-day suffering. Civic Riot is a clenched fist in a mall food court — fast, loud, gone in two minutes.',
    fallbackTitle: 'Out The Door',
  },
  {
    idea: 'a reggae song about island vibes, slow living, and forgiving the people who hurt you',
    suggestedGenre: 'Reggae',
    agentName: 'Salt & Sun',
    agentSlug: 'salt-and-sun',
    agentBio:
      'Roots reggae and lover\'s rock with a saltwater grin. Salt & Sun trades grudges for Sunday afternoons and stays out past the last bus.',
    fallbackTitle: 'Easy Now',
  },
  {
    idea: 'a funky song about Sunday morning at grandma\'s kitchen, biscuits in the oven, gospel on the radio, the whole family showing up',
    suggestedGenre: 'Funk',
    agentName: 'Sundae Service',
    agentSlug: 'sundae-service',
    agentBio:
      'Family-table funk: clavinet, slap bass, horn stabs, tambourine. Sundae Service plays for the kitchen dancing and the after-church crowd.',
    fallbackTitle: 'Grandma\'s Kitchen',
  },
  {
    idea: 'a folk ballad about an old lighthouse keeper telling his last story to a stranger before the light goes dark for good',
    suggestedGenre: 'Folk',
    agentName: 'The Old Lantern',
    agentSlug: 'the-old-lantern',
    agentBio:
      'Acoustic folk for slow ferries and old houses. The Old Lantern keeps watch with finger-picked guitar, bowed double bass, and the kind of stories you only tell strangers.',
    fallbackTitle: 'Last Light Keeper',
  },
  {
    idea: 'a slow blues song about losing your job, walking home in the rain, and finding a strange peace at the bottom of a glass',
    suggestedGenre: 'Blues',
    agentName: 'Smokestack Hymn',
    agentSlug: 'smokestack-hymn',
    agentBio:
      'Slow-burn electric blues — Hammond organ, brushed drums, a Telecaster that hurts. Smokestack Hymn writes for the bar that stays open past last call.',
    fallbackTitle: 'Rain on the Walk Home',
  },
  {
    idea: 'a disco track about throwing your phone in a fountain at midnight and dancing till the sun comes up',
    suggestedGenre: 'Disco',
    agentName: 'Mirrorball Cathedral',
    agentSlug: 'mirrorball-cathedral',
    agentBio:
      'Glittering 70s-into-modern disco. Mirrorball Cathedral converts dance floors into chapels and pays the rent in glitter.',
    fallbackTitle: 'Drown The Phone',
  },
  {
    idea: 'a gospel-soul song about getting back up after being knocked down, shouting from the choir loft',
    suggestedGenre: 'Soul',
    agentName: 'Gospel Engine',
    agentSlug: 'gospel-engine',
    agentBio:
      'Soul-gospel built around Hammond, choir, and an upright piano with a punched-up snare. Gospel Engine sings the kind of songs that make a stranger hand you their hand.',
    fallbackTitle: 'Risen',
  },
];
