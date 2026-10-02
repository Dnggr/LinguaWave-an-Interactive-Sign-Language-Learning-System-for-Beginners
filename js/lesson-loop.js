/**
 * js/lesson-loop.js — Sign Learning Loop engine (NEW)
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE : This is the first real code integration of
 *           "LinguaWaveV2_Learning_Psychology_Analysis.docx" (the
 *           16-screenshot reference analysis) and its chapter-level
 *           follow-up ("...Analysis_Chapters_1-2.docx") into the
 *           actual app. It turns the six-stage loop those documents
 *           recommend — Watch → Recognize → Discriminate →
 *           Contextualize → Produce → Celebrate — into working logic
 *           that runs against REAL LinguaWave mission data.
 *
 * SCOPE (this pass) : the discrimination pairs, "same sign as"
 *           duplicates, and Contextualize phrases below are hand-
 *           curated ONLY for Chapter 1 (ASL Foundations: Alphabet,
 *           Numbers) and Chapter 2 (Introduce Yourself: Greetings,
 *           People, Personal Information) — the two chapters the
 *           Chapters_1-2 analysis covers. Every function still works
 *           for all 65 live missions app-wide: uncurated signs fall
 *           back to generic-but-real logic (same-category near-
 *           neighbor guess, generic sentence template) rather than
 *           returning nothing — same "degrade, don't throw" rule
 *           js/missions.js itself follows throughout. Curating the
 *           remaining 10 chapters is tracked as the next step in the
 *           analysis doc's own §5 (Next Steps) and is NOT done here.
 *
 * ISOLATION : reads window.LWMissions only, exactly the
 *           same discipline mission-overview.js etc. already
 *           follow. Does not touch js/engine/progress.js,
 *           js/camera-practice.js, or js/quiz.js. No new localStorage key is
 *           introduced for progress — see hasSignLearnedElsewhere()
 *           below, which reads the EXISTING lw_missions_progress_v1
 *           completedItemIds list js/missions.js already writes,
 *           rather than inventing a second store.
 *
 * NODE-TESTABLE : same IIFE(global) pattern as js/missions.js, so this
 *           file can be sanity-checked in a plain Node harness
 *           (`global.window = global; require('./lesson-loop.js')`)
 *           without a browser — there is no jsdom in this project's
 *           dev environment (see every prior AI_MEMORY.md session
 *           note), so that harness-level check is the same standing
 *           verification ceiling the rest of Missions already accepts.
 * ─────────────────────────────────────────────────────────────────
 */
'use strict';
console.info('[LinguaWave] lesson-loop.js loaded: question fix 2026-10-02');

(function (global) {

  /* ── NEAR_NEIGHBORS — curated discrimination pairs ────────────────
   * signId -> array of signIds that are genuinely easy to confuse it
   * with, per the real SIGNS_V2 descriptions (see the Chapters_1-2
   * analysis doc §1.2/§1.4/§2.2/§2.3 discrimination maps for the
   * source reasoning behind every entry below — not reproduced here,
   * only the resulting pairs). Deliberately NOT exhaustive outside
   * Chapters 1–2 (see file header). Order matters slightly: the
   * first entry is used as the primary Discriminate-step distractor.
   */
  const NEAR_NEIGHBORS = {
    // Alphabet — closed-fist family
    A: ['S', 'T', 'E', 'M', 'N'], S: ['A', 'T', 'E', 'M', 'N'],
    T: ['A', 'S', 'E', 'M', 'N'], E: ['A', 'S', 'T', 'M', 'N'],
    M: ['N', 'A', 'S', 'T', 'E'], N: ['M', 'A', 'S', 'T', 'E'],
    // Alphabet — two-finger-up family
    U: ['V', 'H', '2'], V: ['U', '2'], H: ['U', 'V'],
    K: ['P'], P: ['K'], R: ['U'],
    // Alphabet — spread-finger family
    W: ['3', '6', '4'], B: ['4'], 
    // Alphabet — circle-shape family
    C: ['O'], O: ['C', '0'], F: ['9'],
    // Alphabet — hooked-index pair
    D: ['X', '1'], X: ['D'],
    // Alphabet — sideways-pointing pair
    G: ['Q'], Q: ['G'],
    // Alphabet — motion outliers (traced-shape neighbor only, not handshape)
    J: ['I'], I: ['J'],
    // Numbers — thumb-tap family + alphabet collisions
    '0': ['O'], '1': ['D'], '2': ['U', 'V'], '3': ['W'],
    '4': ['B'], '6': ['W', '7', '8', '9'], '7': ['6', '8', '9'],
    '8': ['6', '7', '9'], '9': ['F', '6', '7', '8'],
    // Greetings — identical-sign pairs (see SAME_SIGN_AS; also listed
    // here so a Recognize step can still deliberately offer the
    // "wrong register" word as a distractor even before that step is
    // downgraded to a register question by SAME_SIGN_AS below).
    HELLO: ['HI'], HI: ['HELLO'], GOODBYE: ['BYE'], BYE: ['GOODBYE'],
    EVENING: ['NIGHT'], NIGHT: ['EVENING'],
    // People — location/orientation-only pairs
    ME: ['YOU', 'MY'], YOU: ['ME', 'YOUR'], MY: ['YOUR', 'ME'], YOUR: ['MY', 'YOU'],
    MAN: ['WOMAN'], WOMAN: ['MAN'], TEACHER: ['STUDENT'], STUDENT: ['TEACHER'],
    // Personal Information — tap-count pair
    NAME: [], AGE: [],
  };

  /* ── SAME_SIGN_AS — true identical-sign pairs ──────────────────────
   * signId -> the canonical signId it is physically identical to.
   * These are NOT discrimination pairs (there is nothing to tell
   * apart visually) — per the Chapters_1-2 analysis §2.2, they need a
   * lighter loop: skip Watch/Recognize/Discriminate, go straight to a
   * register/timing Contextualize question. Restricted to pairs the
   * sign data itself states are identical, not just similar.
   */
  const SAME_SIGN_AS = {
    HI: 'HELLO',
    BYE: 'GOODBYE',
    NIGHT: 'EVENING',
  };

  /* ── REGISTER_NOTES — the short explanation shown after a SAME_SIGN_AS
   * question (and on the "already in your hands" teach screen).
   *
   * REWORKED: this used to be a "which fits best?" question whose two
   * options (e.g. BYE / GOODBYE) were the SAME sign, so neither answer
   * was wrong and "best" was a matter of opinion. The question is now
   * built by registerPromptFor() below as a real one-right-answer
   * question: "This sign means BYE. Which other word uses the exact
   * same sign?" -> GOODBYE (distractors are other words from the
   * chapter). These notes carry the casual-vs-formal nuance. */
  const REGISTER_NOTES = {
    HI: 'Same sign as HELLO. HI is just quicker and more casual.',
    BYE: 'Same sign as GOODBYE. BYE is just quicker and more casual.',
    NIGHT: 'Physically the same sign as EVENING. In ASL, context or a following word tells them apart, not the handshape.',
  };

  /* ── CONTEXT_PROMPTS — "Try it" instructions ──────────────────────
   * signId -> one plain-language instruction. REWORKED: these used to
   * be fill-in-the-blank fragments ("Sign: ___", "MY ___ [fingerspell
   * your name]") with only a Continue button, so it was unclear what
   * the learner was supposed to do. They are now complete instructions
   * for a self-check (nothing here is graded, and lesson.js labels the
   * step "Try it yourself" accordingly). Uncurated signs use the
   * generic sentence in contextPromptFor().
   */
  const CONTEXT_PROMPTS = {
    HELLO: 'Imagine you meet someone for the first time today. Sign HELLO to them.',
    HI: 'Imagine a friend walks past you. Sign HI to them.',
    MORNING: 'Imagine you arrive at work at 8am. Sign GOOD MORNING to your coworker.',
    AFTERNOON: 'Imagine you meet a friend after lunch. Sign GOOD AFTERNOON to them.',
    EVENING: 'Imagine you arrive at a dinner party. Sign GOOD EVENING to the host.',
    NIGHT: 'Imagine you are heading to bed. Sign GOOD NIGHT to your family.',
    GOODBYE: 'Imagine class just ended. Sign GOODBYE to your classmates.',
    BYE: 'Imagine you are ending a video call. Sign BYE to your friend.',
    WELCOME: 'Imagine a guest arrives at your door. Sign WELCOME to them.',
    ME: 'Introduce yourself: sign ME, then NAME, then fingerspell your name.',
    YOU: 'Ask a new friend for their name: sign YOUR NAME, then point to them (YOU).',
    MY: 'Point to a friend\u2019s belongings and sign MY FRIEND.',
    YOUR: 'Ask someone for their name: sign YOUR NAME?',
    FRIEND: 'Introduce someone next to you: sign THIS MY FRIEND.',
    NAME: 'Sign MY NAME, then fingerspell your name.',
    AGE: 'Sign your age: ME, then AGE, then the number.',
    FROM: 'Sign where you are from: ME FROM, then fingerspell your hometown.',
    LIVE: 'Sign where you live: ME LIVE, then fingerspell the place.',
    FAMILY: 'Sign that you have a big family: ME HAVE BIG FAMILY.',
    BIRTHDAY: 'Sign the month of your birthday: MY BIRTHDAY, then the month.',
  };

  /* ── SCENARIOS — one short situation for EVERY other sign ──────────
   * signId -> a "you are ..." situation that contextPromptFor() turns
   * into "Imagine <situation>. Sign <WORD>." so the Try-it-yourself step
   * is a clear, doable instruction for all missions (alphabet and
   * numbers are built from a template, see contextPromptFor()).
   * CONTEXT_PROMPTS above takes priority where a sign needs a multi-sign
   * phrase (e.g. GOOD MORNING).
   */
  const SCENARIOS = {
    'PLEASE': 'you are asking a friend to pass the salt',
    'EXCUSE': 'you need to squeeze past someone in a crowded hallway',
    'THANK YOU': 'a stranger holds the door open for you',
    'SORRY': 'you accidentally bump into someone',
    'MAN': 'you are pointing out a man waiting in line',
    'WOMAN': 'you are pointing out a woman waiting in line',
    'PERSON': 'you are asking who the person at the door is',
    'CHILD': 'you see a child playing at the park',
    'TEACHER': 'your teacher walks into the room',
    'STUDENT': 'you are introducing yourself as a new student',
    'HAPPY': 'you just got great news',
    'ANGRY': 'someone broke your favorite toy',
    'SAD': 'your friend is moving away',
    'LIKE': 'a friend shows you a song and you enjoy it',
    'LOVE': 'you are talking about your family',
    'SCARED': 'you hear a loud noise in the dark',
    'EXCITED': 'tomorrow is the first day of your vacation',
    'TIRED': 'you just finished a long day of work',
    'SLEEPY': 'it is past your bedtime',
    'THIRSTY': 'you just finished running',
    'SICK': 'you have a fever and stay home',
    'FINE': 'someone asks how you are and you are doing okay',
    'BORED': 'there is nothing to do on a rainy afternoon',
    'WORRIED': 'a friend has not replied all day',
    'NERVOUS': 'you are about to give a speech',
    'OKAY': 'someone asks if the plan works for you',
    'HELP': 'you cannot lift a heavy box alone',
    'BATHROOM': 'you need to ask where the restroom is',
    'FOOD': 'you are asking the waiter to bring something to eat',
    'WATER': 'you want a glass of water',
    'HUNGRY': 'your stomach is growling before dinner',
    'MORE': 'you want a second helping of rice',
    'GO': 'you tell your friends it is time to leave',
    'COME': 'you wave a friend over to your table',
    'STOP': 'a child is about to run into the street',
    'WAIT': 'you ask a friend to hold on a moment',
    'SIT': 'you offer someone a seat',
    'STAND': 'the teacher asks everyone to get up',
    'WALK': 'you invite a friend for a walk after dinner',
    'RUN': 'you are late and rushing to the bus',
    'JUMP': 'you are playing hopscotch',
    'EAT': 'you invite a friend to have lunch',
    'DRINK': 'you are offering a friend something to drink',
    'SLEEP': 'you tell your family you are going to bed',
    'WAKE': 'your alarm rings in the morning',
    'PLAY': 'you ask a classmate to join your game',
    'LOOK': 'you point out something interesting in the sky',
    'SEE': 'you spot a friend across the street',
    'LISTEN': 'you ask a noisy class to pay attention',
    'TALK': 'you want to chat with a friend after class',
    'READ': 'you are reading a story at bedtime',
    'WRITE': 'you are writing a note to a friend',
    'DRAW': 'you are sketching a picture of your pet',
    'SING': 'you are singing along to a favorite song',
    'DANCE': 'you are at a party and the music starts',
    'COOK': 'you are making dinner for your family',
    'CLEAN': 'you are tidying your room before guests arrive',
    'THINK': 'you are working out a hard puzzle',
    'CRY': 'a character in a sad movie is in tears',
    'LAUGH': 'a friend tells a really funny joke',
    'RIDE': 'you are getting on a horse for the first time',
    'BATH': 'you are running the water for a bath',
    'GIVE': 'you hand a birthday present to a friend',
    'TAKE': 'you accept a gift someone hands you',
    'PUT': 'you place your keys on the table',
    'GET': 'you ask a friend to fetch you a pen',
    'BRING': 'you ask a friend to bring snacks to the party',
    'CARRY': 'you are helping with heavy grocery bags',
    'PUSH': 'you are pushing a stuck door open',
    'PULL': 'you are pulling a door that will not open',
    'THROW': 'you are tossing a ball to a friend',
    'CATCH': 'a friend tosses you a ball',
    'PICK': 'you pick a toy up off the floor',
    'ASK': 'you want to ask the teacher a question',
    'ANSWER': 'the teacher calls on you for the answer',
    'TELL': 'you are sharing a secret with a friend',
    'SHOW': 'you want to show a friend your new phone',
    'SHARE': 'you are splitting your snack with a classmate',
    'TEACH': 'you are showing a friend how to sign',
    'SIGN': 'you are asking someone if they know sign language',
    'BODY': 'the doctor asks you to point to your whole body',
    'HEAD': 'you have a headache',
    'HAIR': 'you just got a haircut',
    'FACE': 'you are washing your face in the morning',
    'EYE': 'something got in your eye',
    'EAR': 'you are plugging your ear because it is loud',
    'NOSE': 'you have a runny nose',
    'MOUTH': 'you open your mouth for the dentist',
    'TEETH': 'you are brushing before bed',
    'HAND': 'you are holding out your hand to shake',
    'FINGER': 'you pinched your finger in the door',
    'ARM': 'you broke your arm and it is in a cast',
    'LEG': 'your leg is sore after a long hike',
    'FOOT': 'you stepped on a sharp pebble with your foot',
    'STOMACH': 'your stomach hurts after a big meal',
    'BACK': 'your back aches from lifting boxes',
    'BOY': 'you are pointing out a boy in the photo',
    'GIRL': 'you are pointing out a girl in the photo',
    'SCHOOL': 'you are telling a friend you are heading to school',
    'HOME': 'you are heading back to your house after work',
    'BLUE': 'you are picking a blue crayon',
    'GREEN': 'you are describing the color of grass',
    'YELLOW': 'you are describing the color of a banana',
    'RED': 'you are describing a stop sign',
    'BROWN': 'you are describing a chocolate bar',
    'ORANGE': 'you are choosing an orange shirt',
    'PURPLE': 'you are painting with purple',
    'WHITE': 'you are describing fresh snow',
    'BLACK': 'you are describing the night sky',
    'GRAY': 'you are describing a cloudy sky',
    'PINK': 'you are picking a pink balloon',
    'CIRCLE': 'you are drawing a circle on paper',
    'SQUARE': 'you are pointing to a square window',
    'TRIANGLE': 'you are pointing to a triangle sign',
    'RECTANGLE': 'you are pointing to a rectangle door',
    'OVAL': 'you are describing an egg shape',
    'STAR': 'you are drawing a star on a card',
    'HEART': 'you are drawing a heart on a card',
    'DIAMOND': 'you are pointing to a diamond on a playing card',
    'BIG': 'you are describing a huge dog',
    'SMALL': 'you are describing a tiny kitten',
    'TALL': 'you are describing a very tall tree',
    'SHORT': 'you are describing a short fence',
    'LONG': 'you are describing a long road',
    'WIDE': 'you are describing a wide river',
    'THIN': 'you are describing a thin book',
    'HEAVY': 'you are lifting a heavy suitcase',
    'LIGHT': 'you are lifting a feather-light bag',
    'BEAUTIFUL': 'you are admiring a sunset',
    'PRETTY': 'you are complimenting a friend\'s dress',
    'UGLY': 'you are describing a very ugly old chair',
    'CUTE': 'you see a puppy',
    'DIRTY': 'your shoes are covered in mud',
    'NEAT': 'your desk is perfectly organized',
    'MESSY': 'your room is a mess',
    'OLD': 'you are describing a very old building',
    'NEW': 'you just bought new shoes',
    'BROKEN': 'your phone screen is cracked',
    'DARK': 'the room goes dark when the power cuts out',
    'BRIGHT': 'the sun is shining brightly in your eyes',
    'HOT': 'you touch a hot pan',
    'COLD': 'you step outside on a freezing morning',
    'SWEET': 'you taste a very sweet candy',
    'SOUR': 'you bite into a lemon',
    'SALTY': 'the soup is too salty',
    'BITTER': 'you taste bitter coffee',
    'SPICY': 'you eat a very spicy pepper',
    'DELICIOUS': 'you finish a great meal',
    'FRESH': 'you are holding fresh bread from the oven',
    'LOUD': 'the music is too loud',
    'QUIET': 'the library is quiet',
    'NOISY': 'the cafeteria is noisy',
    'SILENT': 'the room is completely silent',
    'HIGH': 'you are looking at a high shelf',
    'LOW': 'you are pointing to a low shelf',
    'FAST': 'you are watching a fast car go by',
    'SLOW': 'you are watching a slow turtle',
    'STRONG': 'you are describing a strong weightlifter',
    'WEAK': 'you feel weak after being sick',
    'GOOD': 'you are rating a good movie',
    'BAD': 'you are rating a bad movie',
    'FULL': 'your glass is full',
    'EMPTY': 'the fridge is empty',
    'OPEN': 'you are opening a window',
    'CLOSED': 'the store is closed for the night',
    'MOM': 'you are calling for your mom',
    'DAD': 'you are calling for your dad',
    'BROTHER': 'you are introducing your brother',
    'MARRIAGE': 'you are talking about a friend\'s wedding',
    'SISTER': 'you are introducing your sister',
    'GRANDMA': 'you are visiting your grandma',
    'GRANDPA': 'you are visiting your grandpa',
    'AUNT': 'you are talking about your aunt',
    'UNCLE': 'you are talking about your uncle',
    'BABY': 'you see a baby smiling',
    'SINGLE': 'someone asks if you are single',
    'DIVORCED': 'you are explaining that two people are no longer married',
    'HOUSE': 'you are pointing to a big house on the corner',
    'BEDROOM': 'you tell someone you are going to your bedroom',
    'KITCHEN': 'you are heading to the kitchen to make breakfast',
    'LIVING': 'you are relaxing in the living room',
    'DINING': 'you are setting the table in the dining room',
    'GARAGE': 'you are parking in the garage',
    'GARDEN': 'you are watering plants in the garden',
    'YARD': 'kids are playing in the yard',
    'BED': 'you are making your bed',
    'PILLOW': 'you are fluffing your pillow',
    'BLANKET': 'you are cold and ask for a blanket',
    'CHAIR': 'you are pulling out a chair',
    'TABLE': 'you are setting something on the table',
    'SOFA': 'you are lounging on the sofa',
    'DESK': 'you are sitting down at your desk',
    'SHELF': 'you are putting a book on the shelf',
    'CABINET': 'you are looking in the kitchen cabinet',
    'CLOSET': 'you are picking clothes from your closet',
    'LAMP': 'you are turning on a lamp',
    'DOOR': 'someone is knocking at the door',
    'WINDOW': 'you are looking out the window',
    'WALL': 'you are hanging a picture on the wall',
    'FLOOR': 'you dropped something on the floor',
    'ROOF': 'there is a leak in the roof',
    'CLOCK': 'you check the clock on the wall',
    'MIRROR': 'you check yourself in the mirror',
    'FAN': 'it is warm and you switch on the fan',
    'TV': 'you are turning on the TV',
    'REMOTE': 'you are looking for the remote',
    'PHONE': 'your phone is ringing',
    'COMPUTER': 'you are turning on your computer',
    'BOOK': 'you are picking out a book at the library',
    'KEY': 'you cannot find your key',
    'TOILET': 'you are asking where the toilet is',
    'SHOWER': 'you are about to take a shower',
    'BATHTUB': 'you are filling the bathtub',
    'SOAP': 'you are washing your hands with soap',
    'SHAMPOO': 'you are running out of shampoo',
    'TOWEL': 'you ask for a towel after swimming',
    'TOOTHBRUSH': 'you forgot your toothbrush',
    'TOOTHPASTE': 'you are out of toothpaste',
    'REFRIGERATOR': 'you are opening the refrigerator',
    'PLATE': 'you are putting food on a plate',
    'BOWL': 'you are filling a bowl with cereal',
    'CUP': 'you are pouring tea into a cup',
    'GLASS': 'you are pouring water into a glass',
    'SPOON': 'you are eating soup with a spoon',
    'FORK': 'you are eating pasta with a fork',
    'KNIFE': 'you are cutting bread with a knife',
    'PRINCIPAL': 'you are asking where the principal\'s office is',
    'PAPER': 'you need a sheet of paper',
    'PENCIL': 'you need to borrow a pencil',
    'SCISSORS': 'you are cutting paper with scissors',
    'RULER': 'you are measuring a line with a ruler',
    'BACKPACK': 'you are packing your backpack',
    'CRAYON': 'you are coloring with a crayon',
    'TRASH': 'you are throwing something in the trash',
    'COLOR': 'you are coloring a picture',
    'MATH': 'you are going to math class',
    'SCIENCE': 'you are doing a science experiment',
    'MUSIC': 'you are going to music class',
    'HISTORY': 'you are reading your history book',
    'APPLE': 'you are biting into an apple',
    'BANANA': 'you are peeling a banana',
    'GRAPES': 'you are snacking on grapes',
    'WATERMELON': 'you are eating watermelon on a hot day',
    'PINEAPPLE': 'you are cutting a pineapple',
    'STRAWBERRY': 'you are picking a strawberry',
    'PEAR': 'you are holding a juicy pear',
    'MELON': 'you are slicing a melon',
    'CARROT': 'you are chopping a carrot',
    'POTATO': 'you are peeling a potato',
    'TOMATO': 'you are slicing a tomato for a sandwich',
    'ONION': 'you are chopping an onion and your eyes water',
    'GARLIC': 'you are adding garlic to the pan',
    'CORN': 'you are eating corn on the cob',
    'PEA': 'you are picking peas out of your soup',
    'BEAN': 'you are cooking a pot of beans',
    'CABBAGE': 'you are shredding cabbage for a salad',
    'LETTUCE': 'you are washing lettuce',
    'PUMPKIN': 'you are carving a pumpkin',
    'BROCCOLI': 'you are eating broccoli at dinner',
    'COOKIE': 'you are baking cookies',
    'CAKE': 'you are cutting a birthday cake',
    'CANDY': 'you are unwrapping a piece of candy',
    'CHOCOLATE': 'you are breaking off a piece of chocolate',
    'DONUT': 'you are picking a donut at the bakery',
    'PIE': 'you are serving a slice of pie',
    'POPCORN': 'you are making popcorn for a movie',
    'CHIPS': 'you are opening a bag of chips',
    'CUPCAKE': 'you are frosting a cupcake',
    'ICECREAM': 'you are buying an ice cream cone',
    'MILK': 'you are pouring milk on cereal',
    'JUICE': 'you are pouring orange juice',
    'SODA': 'you are opening a can of soda',
    'TEA': 'you are making a cup of tea',
    'COFFEE': 'you are ordering a coffee in the morning',
    'CAT': 'your cat jumps on the couch',
    'DOG': 'your dog is begging for a walk',
    'BIRD': 'you see a bird on a branch',
    'HORSE': 'you are watching a horse gallop',
    'COW': 'you are visiting a cow on a farm',
    'SHEEP': 'you are watching sheep in a field',
    'PIG': 'you are feeding a pig at a farm',
    'BUG': 'you spot a bug on the wall',
    'CHICKEN': 'you are feeding a chicken',
    'DUCK': 'you are feeding a duck at the pond',
    'FISH': 'you are looking at fish in a tank',
    'RABBIT': 'you are petting a rabbit',
    'GOAT': 'you are watching a goat at the farm',
    'LION': 'you are watching a lion at the zoo',
    'TIGER': 'you are watching a tiger at the zoo',
    'ELEPHANT': 'you are watching an elephant at the zoo',
    'MONKEY': 'you are watching a monkey swing',
    'GIRAFFE': 'you are looking up at a tall giraffe',
    'BEAR': 'you are watching a bear at the zoo',
    'ZEBRA': 'you are spotting a zebra\'s stripes',
    'SNAKE': 'you are startled by a snake',
    'FROG': 'you hear a frog by the pond',
    'TURTLE': 'you are watching a turtle crawl',
    'ANT': 'you spot an ant on the counter',
    'BUTTERFLY': 'a butterfly lands on a flower',
    'BEE': 'a bee buzzes near your picnic',
    'SPIDER': 'you see a spider in the corner',
    'SHIRT': 'you are picking out a shirt for school',
    'PANTS': 'you are putting on your pants',
    'SOCKS': 'you cannot find a matching sock',
    'SHOES': 'you are tying your shoes',
    'COAT': 'you grab your coat before going out in the cold',
    'UNDERWEAR': 'you are packing underwear for a trip',
    'SHORTS': 'you are putting on shorts for a hot day',
    'DRESS': 'you are choosing a dress for a party',
    'SKIRT': 'you are trying on a skirt',
    'HAT': 'you are putting on a hat in the sun',
    'CAP': 'you are wearing a baseball cap',
    'JACKET': 'you zip up your jacket',
    'BELT': 'you buckle your belt',
    'WEAR': 'you are deciding what to wear tomorrow',
    'CHANGE': 'you are changing into pajamas',
    'WASH': 'you are washing the dishes',
    'FOLD': 'you are folding laundry',
    'HURT': 'you scraped your knee and it hurts',
    'BRUSH TEETH': 'you are brushing your teeth before bed',
    'WALLET': 'you cannot find your wallet',
    'WATCH': 'you check your watch for the time',
    'GLASSES': 'you are cleaning your glasses',
    'UMBRELLA': 'you open an umbrella in the rain',
    'BOTTLE': 'you are filling a water bottle',
    'DOLLARS': 'a shirt costs ten dollars',
    'CENTS': 'a gumball costs fifty cents',
    'COST': 'you are asking how much something costs',
    'SUN': 'you are squinting at the sun',
    'MOON': 'you are looking at the full moon',
    'CLOUD': 'you spot a fluffy cloud',
    'RAIN': 'raindrops start to fall',
    'WIND': 'the wind blows your hat off',
    'TREE': 'you are sitting under a tree',
    'FLOWER': 'you are smelling a flower',
    'GRASS': 'you are lying on the grass',
    'LEAF': 'a leaf falls on your shoulder',
    'ROCK': 'you pick up a smooth rock',
    'SAND': 'sand gets between your toes',
    'MOUNTAIN': 'you are looking at a snowy mountain',
    'RIVER': 'you are crossing a river',
    'OCEAN': 'you are looking out at the ocean',
    'BEACH': 'you are planning a day at the beach',
    'ISLAND': 'you are describing a small island',
    'PLANT': 'you are watering a plant',
    'BRANCH': 'a bird sits on a branch',
    'GROW': 'you are watching seeds grow',
    'SUNNY': 'it is a sunny day',
    'RAINY': 'it is a rainy day',
    'CLOUDY': 'it is a cloudy afternoon',
    'WINDY': 'it is too windy for a kite',
    'STORMY': 'a stormy night keeps everyone inside',
    'WARM': 'the weather is nice and warm',
    'COOL': 'a cool breeze blows in the evening',
    'THUNDER': 'you hear thunder rumble',
    'LIGHTNING': 'you see lightning flash',
    'SNOW': 'it starts to snow',
    'SPRING': 'flowers bloom in spring',
    'SUMMER': 'school is out for the summer',
    'FALL': 'leaves change color in the fall',
    'WINTER': 'it is freezing in the winter',
    'WORK': 'you are telling a friend you are going to work',
    'STORE': 'you are going to the store for milk',
    'CHURCH': 'you are heading to church on Sunday',
    'CAR': 'you are getting into your car',
    'IN': 'you put your keys in your bag',
    'OUT': 'you take your keys out of your bag',
    'WITH': 'you are going to the movies with a friend',
    'BUS': 'you are catching the bus',
    'TRUCK': 'a truck passes by',
    'VAN': 'you are riding in a van',
    'TAXI': 'you wave down a taxi',
    'TRAIN': 'you are boarding a train',
    'BIKE': 'you are riding your bike',
    'MOTORCYCLE': 'you hear a motorcycle roar by',
    'AIRPLANE': 'you are watching an airplane take off',
    'BOAT': 'you are sailing in a boat',
    'SHIP': 'you see a big ship in the harbor',
    'DRIVE': 'you are driving to work',
    'FLY': 'you are flying to visit family',
    'DOCTOR': 'you are visiting the doctor',
    'NURSE': 'a nurse takes your temperature',
    'POLICE': 'you are asking a police officer for directions',
    'FIREFIGHTER': 'a firefighter visits your school',
    'FARMER': 'you are meeting a farmer at the market',
    'DRIVER': 'you are thanking the bus driver',
    'DENTIST': 'you have an appointment with the dentist',
    'MECHANIC': 'a mechanic is fixing your car',
    'CARPENTER': 'a carpenter is building a table',
    'LAWYER': 'you are talking to a lawyer',
    'SOLDIER': 'you are talking about a soldier in your family',
    'WAITER': 'you are calling the waiter over',
    'ARTIST': 'you are talking about an artist painting a mural',
    'WORKER': 'you are describing a construction worker',
    'OWNER': 'you are asking for the owner of the shop',
    'HOSPITAL': 'someone needs to go to the hospital',
    'FIRE': 'you see a fire and need to warn people',
    'LIBRARY': 'you are walking to the library',
    'BANK': 'you are going to the bank',
    'RESTAURANT': 'you are picking a restaurant for dinner',
    'PARK': 'you are meeting friends at the park',
    'DAY': 'you are saying you had a great day',
    'WEEK': 'you are planning something for next week',
    'MONTH': 'you are saying something happens once a month',
    'YEAR': 'you are telling someone your sister is turning ten this year',
    'BEFORE': 'you wash your hands before eating',
    'NOW': 'you are saying you need to go right now',
    'TODAY': 'you are saying you have a test today',
    'FINISH': 'you are finishing your homework',
    'WILL': 'you are saying you will call tomorrow',
    'MONDAY': 'you are saying your class is on Monday',
    'TUESDAY': 'you are saying your appointment is on Tuesday',
    'WEDNESDAY': 'you are saying you have soccer on Wednesday',
    'THURSDAY': 'you are saying the party is on Thursday',
    'FRIDAY': 'you are saying you are excited for Friday',
    'SATURDAY': 'you are saying you sleep in on Saturday',
    'SUNDAY': 'you are saying you visit family on Sunday',
    'JANUARY': 'you are saying your birthday is in January',
    'FEBRUARY': 'you are saying the trip is in February',
    'MARCH': 'you are saying school starts in March',
    'APRIL': 'you are saying it rains a lot in April',
    'MAY': 'you are saying the wedding is in May',
    'JUNE': 'you are saying school ends in June',
    'JULY': 'you are saying the festival is in July',
    'AUGUST': 'you are saying vacation is in August',
    'SEPTEMBER': 'you are saying classes start in September',
    'OCTOBER': 'you are saying the party is in October',
    'NOVEMBER': 'you are saying the holiday is in November',
    'DECEMBER': 'you are saying the holiday is in December',
    'FIRST': 'you are saying you came in first',
    'SECOND': 'you are saying you came in second',
    'THIRD': 'you are saying you came in third',
    'NEXT': 'you are asking who is next in line',
    'THEN': 'you are explaining a recipe: first mix, then bake',
    'BEGINNING': 'you are describing the beginning of a movie',
    'MIDDLE': 'you are standing in the middle of the room',
    'END': 'you are describing the end of a story',
    'FINALLY': 'your long wait is finally over',
    'FINISHED': 'you are saying you are all done with your homework',
    'ALWAYS': 'you are saying you always eat breakfast',
    'OFTEN': 'you are saying you often visit your grandma',
    'SOMETIMES': 'you are saying you sometimes walk to school',
    'RARELY': 'you are saying you rarely eat candy',
    'NEVER': 'you are saying you never skip class',
    'DAILY': 'you are saying you practice daily',
    'WEEKLY': 'you are saying you meet your friend weekly',
    'MONTHLY': 'you are saying the bill comes monthly',
    'INSIDE': 'you tell the kids to come inside',
    'OUTSIDE': 'you tell the kids to play outside',
    'FRONT': 'you are sitting in the front row',
    'NEAR': 'you are saying the store is near your house',
    'FAR': 'you are saying the airport is far away',
    'HERE': 'you are telling a friend to sit here',
    'THERE': 'you are pointing at something over there',
    'CLOSE': 'you are saying the park is close',
    'AWAY': 'you are saying your friend is away on a trip',
    'LEFT': 'you are telling a driver to turn left',
    'RIGHT': 'you are telling a driver to turn right',
    'UP': 'you are pointing up at a bird',
    'DOWN': 'you are pointing down at the floor',
    'FORWARD': 'you are asking a line to move forward',
    'TURN': 'you are telling a driver to make a turn',
    'CLASSMATE': 'you are introducing a classmate',
    'NEIGHBOR': 'you are talking about your neighbor',
    'MEET': 'you are meeting someone new',
    'VISIT': 'you are visiting a friend this weekend',
    'TOGETHER': 'you are saying you and your friend go everywhere together',
    'AGAIN': 'you are asking someone to repeat that again',
    'YES': 'someone asks if you want a snack',
    'NO': 'someone offers you something you do not want',
    'SURE': 'a friend asks if you can help and you agree',
    'MAYBE': 'you are not sure if you can come to the party',
    'REALLY': 'a friend tells you surprising news',
    'UNDERSTAND': 'you finally get what the teacher explained',
    'WHO': 'you are asking who is at the door',
    'WHAT': 'you are asking what is in the bag',
    'WHEN': 'you are asking when the movie starts',
    'WHERE': 'you are asking where the library is',
    'WHY': 'you are asking why the bus is late',
    'HOW': 'you are asking how to make a cake',
    'NICE': 'you are saying it is nice to meet someone',
    'LATER': 'you are telling a friend you will talk later',
    'HAVE': 'you are saying you have a new puppy',
    'CAN': 'you are asking if you can borrow a pencil',
    'THIS': 'you are pointing at this book',
    'THAT': 'you are pointing at that bird',
    'KNOW': 'you are saying you know the answer',
    'DON\'T': 'you are saying you do not know where it is',
  };

  /* ── helpers ───────────────────────────────────────────────────── */

  function uniq(arr) { return Array.from(new Set(arr)); }

  function liveSign(level, signId) {
    return (global.LWMissions && typeof global.LWMissions.getSign === 'function')
      ? global.LWMissions.getSign(level, signId)
      : null;
  }

  function signTitle(level, signId) {
    const s = liveSign(level, signId);
    return (s && s.title) || signId;
  }

  /**
   * Returns the neighbor signIds for a sign, filtered down to ones
   * that actually resolve to a real SIGNS_V2 entry at this level (a
   * curated pair can reference a signId from a different category —
   * e.g. numbers referencing an alphabet letter — this just confirms
   * the referenced sign genuinely exists before it's offered as a
   * distractor). Never throws; returns [] if none resolve.
   */
  function getNearNeighbors(level, signId) {
    const curated = NEAR_NEIGHBORS[signId] || [];
    return curated.filter((id) => !!liveSign(level, id));
  }

  /**
   * Picks up to `count` Recognize-step distractor signIds for
   * `signId`. Prefers curated near-neighbors first (the hardest, most
   * diagnostic distractors — Ref. Analysis §7), then fills any
   * remaining slots from the sign's own category (excluding itself
   * and anything already picked), then — only if still short —
   * from any other live sign in the same level. Always returns
   * whatever it can find rather than throwing on a small category.
   */
  function buildRecognizeOptions(level, signId, categorySignIds, count, randomize) {
    count = count || 4;
    const correct = signId;
    if (randomize) return buildRandomRecognizeOptions(level, signId, categorySignIds, count);
    const pool = [];
    getNearNeighbors(level, signId).forEach((id) => { if (!areSameSign(id, correct, level)) pool.push(id); });
    (categorySignIds || []).forEach((id) => { if (!areSameSign(id, correct, level) && pool.indexOf(id) === -1) pool.push(id); });
    if (pool.length < count - 1 && global.LWMissions && global.LWMissions.content) {
      global.LWMissions.content.SIGNS.forEach((s) => {
        if (s.level === level && !areSameSign(s.signId, correct, level) && pool.indexOf(s.signId) === -1) pool.push(s.signId);
      });
    }
    const distractors = pool.slice(0, Math.max(0, count - 1));
    const options = shuffleDeterministic([correct].concat(distractors), signId);
    return { correct, options };
  }

  /** True when two signIds are the same physical sign: either a
   * documented pair (HELLO/HI, GOODBYE/BYE, EVENING/NIGHT — see
   * SAME_SIGN_AS) or, when `level` is given, any two signs that point
   * at the SAME video file or share the same title (e.g. BATHROOM/
   * TOILET). Such a pair must never appear together as "correct
   * answer" vs "distractor": both are right, so picking the "wrong"
   * one would be graded unfairly. */
  function areSameSign(a, b, level) {
    if (a === b) return true;
    if (SAME_SIGN_AS[a] === b || SAME_SIGN_AS[b] === a) return true;
    if (!level) return false;
    const sa = liveSign(level, a), sb = liveSign(level, b);
    if (!sa || !sb) return false;
    if (sa.videoUrl && sa.videoUrl === sb.videoUrl) return true;
    return !!sa.title && String(sa.title).toLowerCase() === String(sb.title || '').toLowerCase();
  }

  /** Real random (Math.random, Fisher-Yates) shuffle — returns a new
   * array. Used only where a learner-facing question must vary every
   * time; the seeded shuffleDeterministic() below stays for callers
   * that need a stable order (admin preview, tests). */
  function shuffleRandom(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /**
   * Randomized Recognize options. The distractors are a random sample
   * of the OTHER signs in the mission's own chapter/topic (so they stay
   * on-topic), never a physical duplicate of the correct sign, and the
   * final order (including the correct answer's position) is random.
   * Only if the chapter is too small to supply enough distractors does
   * it top up — curated near-neighbors first, then any other sign at
   * the same level — so a tiny chapter still gets a full option set.
   */
  function buildRandomRecognizeOptions(level, signId, categorySignIds, count) {
    const correct = signId;
    const wanted = Math.max(0, count - 1);
    const eligible = (id) => id !== correct && !areSameSign(id, correct, level);

    const chapterPool = shuffleRandom(
      (categorySignIds || []).filter((id, i, a) => eligible(id) && a.indexOf(id) === i)
    );
    const distractors = chapterPool.slice(0, wanted);

    if (distractors.length < wanted) {
      const topUp = [];
      getNearNeighbors(level, correct).forEach((id) => { if (eligible(id)) topUp.push(id); });
      if (global.LWMissions && global.LWMissions.content) {
        shuffleRandom(global.LWMissions.content.SIGNS).forEach((sg) => {
          if (sg.level === level && eligible(sg.signId)) topUp.push(sg.signId);
        });
      }
      topUp.forEach((id) => {
        if (distractors.length < wanted && distractors.indexOf(id) === -1) distractors.push(id);
      });
    }
    return { correct, options: shuffleRandom([correct].concat(distractors)) };
  }

  /**
   * Builds a Discriminate-step pair: { targetSignId, neighborSignId }
   * or null if no usable neighbor exists at all (a small, real
   * category can legitimately have none — the caller should skip the
   * Discriminate stage for that item rather than fake one, same
   * "don't fabricate" rule the rest of this codebase follows).
   */
  function buildDiscriminatePair(level, signId, categorySignIds, randomize) {
    if (randomize) {
      // Random on-topic partner from the mission's own chapter, never a
      // physical duplicate of the target. Falls through to the curated/
      // generic logic below only if the chapter has nothing else.
      const pool = (categorySignIds || []).filter((id) => id !== signId && !areSameSign(id, signId, level));
      if (pool.length) {
        return { targetSignId: signId, neighborSignId: pool[Math.floor(Math.random() * pool.length)] };
      }
    }
    const neighbors = getNearNeighbors(level, signId).filter((id) => !areSameSign(id, signId, level));
    let neighborSignId = neighbors[0] || null;
    if (!neighborSignId) {
      // Generic fallback: another sign from the same category, so an
      // uncurated chapter still gets a real (if less diagnostic)
      // discrimination question instead of none at all.
      const alt = (categorySignIds || []).find((id) => !areSameSign(id, signId, level));
      neighborSignId = alt || null;
    }
    return neighborSignId ? { targetSignId: signId, neighborSignId } : null;
  }

  /** Deterministic (not Math.random) shuffle, seeded by a string —
   * keeps option order stable across re-renders of the same item
   * within a session, same "reproducible, not real-random" rule
   * js/missions.js's own genericBonusEligible()/bonusSignIds already
   * follow for the same reason (see that file's §3.3 comment). */
  function shuffleDeterministic(arr, seedStr) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const j = seed % (i + 1);
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /** True if `signId` is a documented physical duplicate of another
   * signId (HI/HELLO, BYE/GOODBYE, NIGHT/EVENING). */
  function sameSignAs(signId) {
    return SAME_SIGN_AS[signId] || null;
  }

  /**
   * Builds the "same sign" question for a SAME_SIGN_AS sign, e.g. for
   * BYE: "This sign means Bye. Which other word uses the exact same
   * sign?" -> answer "Goodbye", with 2 distractors from the chapter
   * (never a word that shares the sign). Exactly ONE option is right.
   * Returns { prompt, options, answer, note } (options/answer are
   * display titles) or null when signId has no documented twin. Safe
   * to call with just a signId (no level/chapter): then the options
   * are just [answer] and the caller should treat it as a teach note.
   */
  function registerPromptFor(signId, level, categorySignIds) {
    const twinId = SAME_SIGN_AS[signId];
    if (!twinId) return null;
    const own = level ? signTitle(level, signId) : signId;
    const answer = level ? signTitle(level, twinId) : twinId;
    const distractorIds = shuffleRandom(
      (categorySignIds || []).filter((id, i, a) => a.indexOf(id) === i && !areSameSign(id, signId, level) && !areSameSign(id, twinId, level))
    ).slice(0, 2);
    const options = shuffleRandom([answer].concat(distractorIds.map((id) => signTitle(level, id))));
    return {
      prompt: `This sign means \u201c${own}\u201d. Which other word uses the exact same sign?`,
      options,
      answer,
      note: REGISTER_NOTES[signId] || `Same sign as ${answer}.`,
    };
  }

  /**
   * Reads the EXISTING lw_missions_progress_v1 store (via the same
   * localStorage key js/missions.js already owns — no new key) and
   * checks whether `signId`'s LESSON step has already been completed
   * in ANY mission other than `excludeMissionId`. This is what lets
   * e.g. Personal Information's 9 duplicate signs (BOY, GIRL, CHILD,
   * PERSON, FRIEND, STUDENT, TEACHER, HOME, SCHOOL — all literally
   * the same SIGNS_V2 entries as Family/People/Places, per that
   * category's own file-header comment) skip a redundant re-teach if
   * the learner already has them from an earlier mission. General-
   * purpose: works for any future chapter's duplicate signs too, not
   * just Chapter 2 — nothing here is hardcoded to a specific mission.
   * Degrades to false (never throws) if localStorage is unavailable.
   */
  function hasSignLearnedElsewhere(signId, excludeMissionId) {
    try {
      const raw = global.localStorage.getItem('lw_missions_progress_v1');
      if (!raw) return false;
      const state = JSON.parse(raw);
      const ids = state.completedItemIds || [];
      const suffix = `_LESSON_${signId}`;
      return ids.some((id) => id.endsWith(suffix) && !id.startsWith(`${excludeMissionId}_`));
    } catch {
      return false;
    }
  }

  /** "Try it yourself" instruction for any sign — never leaves the
   * stage empty. Order: hand-written multi-sign phrase -> per-sign
   * SCENARIOS situation -> alphabet/numbers template -> generic. */
  function contextPromptFor(level, signId) {
    if (CONTEXT_PROMPTS[signId]) return CONTEXT_PROMPTS[signId];
    const title = signTitle(level, signId);
    if (SCENARIOS[signId]) return `Imagine ${SCENARIOS[signId]}. Sign ${String(title).toUpperCase()}.`;
    if (level === 'basic' && /^[A-Z]$/.test(signId)) return `Imagine you are fingerspelling a name that includes this letter. Sign the letter ${signId}.`;
    if (level === 'basic' && /^\d+$/.test(signId)) return `Imagine you are telling a friend a number. Sign the number ${signId}.`;
    return `Now sign "${title}" yourself, the way you would in a real conversation, then continue.`;
  }

  /**
   * The main integration point: given a mission (from
   * window.LWMissions.getMissionForCategory()) and one of its existing
   * items (unchanged shape — LESSON/BOOSTER/PRACTICE/QUIZ), returns a
   * plan describing exactly how lesson.js should render that item
   * per the six-stage loop, without mutating mission.items itself or
   * inventing a parallel progress model. This is the piece that
   * actually connects the psychology-analysis documents' recommended
   * loop to this mission's real, already-existing item schema.
   */
  function planForItem(mission, index, item) {
    const level = mission.level;
    const categorySignIds = (global.LWMissions && item.signId)
      ? global.LWMissions.getCategorySigns(level, mission.category)
      : [];

    if (item.kind === 'QUIZ') {
      return { loopStage: 'Produce/Celebrate (mission)', render: 'quiz-handoff' };
    }

    const duplicateOf = item.signId ? sameSignAs(item.signId) : null;
    const learnedElsewhere = item.signId ? hasSignLearnedElsewhere(item.signId, mission.id) : false;
    const lighter = !!duplicateOf || learnedElsewhere;

    if (item.kind === 'LESSON') {
      if (lighter) {
        return {
          loopStage: 'Contextualize (lighter: sign already known)',
          render: 'lesson-lighter',
          reason: duplicateOf ? `Same sign as ${duplicateOf}` : 'Already taught in an earlier mission',
          duplicateOf,   // NEW: lesson.js shows THIS sign's video on the "already in your hands" screen
          registerPrompt: duplicateOf ? registerPromptFor(item.signId, level, categorySignIds) : null,
          contextPrompt: contextPromptFor(level, item.signId),
        };
      }
      return { loopStage: 'Watch', render: 'lesson-watch' };
    }

    if (item.kind === 'BOOSTER') {
      const regPrompt = lighter ? registerPromptFor(item.signId, level, categorySignIds) : null;
      if (regPrompt) {
        return { loopStage: 'Recognize (same-sign twin)', render: 'booster-register',
                 registerPrompt: regPrompt, duplicateOf };
      }
      return {
        loopStage: 'Recognize',
        render: 'booster-recognize',
        options: item.signId ? buildRecognizeOptions(level, item.signId, categorySignIds, 4, true) : null,
      };
    }

    if (item.kind === 'PRACTICE') {
      const optionCount = (item.difficultyRamp && item.difficultyRamp[0] === '2-option') ? 2 : 3;
      const pair = item.signId ? buildDiscriminatePair(level, item.signId, categorySignIds, true) : null;
      return {
        loopStage: 'Discriminate + Contextualize',
        render: 'practice-scenario',
        scenarioTitle: item.scenarioTitle,
        discriminatePair: pair,
        recognizeOptions: item.signId ? buildRecognizeOptions(level, item.signId, categorySignIds, optionCount, true) : null,
        contextPrompt: item.signId ? contextPromptFor(level, item.signId) : null,
      };
    }

    return { loopStage: 'Unknown item kind', render: 'unknown' };
  }

  global.LWMissionsLoop = {
    getNearNeighbors,
    buildRecognizeOptions,
    buildDiscriminatePair,
    sameSignAs,
    registerPromptFor,
    hasSignLearnedElsewhere,
    contextPromptFor,
    planForItem,
    signTitle,
    // exposed for the Node test harness only
    areSameSign,
    _internals: { NEAR_NEIGHBORS, SAME_SIGN_AS, REGISTER_NOTES, CONTEXT_PROMPTS, SCENARIOS },
  };

})(typeof window !== 'undefined' ? window : global);