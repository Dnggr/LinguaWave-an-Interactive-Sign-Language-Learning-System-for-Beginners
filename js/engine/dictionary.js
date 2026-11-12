
export const SIGN_DICTIONARY = {


  'A': {
    description:  'Fist, thumb resting BESIDE index knuckle (not tucked under)',
    category: 'alphabet', imageFile: 'A.png',
  },
  'E': {
    description:  'All fingers curl in toward palm, tips touching thumb which is tucked under',
    category: 'alphabet', imageFile: 'E.png',
  },
  'M': {
    description:  'Index, middle, ring fold over tucked thumb (3 fingers over thumb)',
    category: 'alphabet', imageFile: 'M.png',
  },
  'N': {
    description:  'Index and middle fold over tucked thumb (2 fingers over thumb)',
    category: 'alphabet', imageFile: 'N.png',
  },
  'S': {
    description:  'Fist, thumb wraps ACROSS front of all curled fingers',
    category: 'alphabet', imageFile: 'S.png',
  },
  'T': {
    description:  'Fist, thumb inserted BETWEEN index and middle fingers',
    category: 'alphabet', imageFile: 'T.png',
  },


  'B': {
    description:  'Four fingers straight up, thumb tucked flat across palm',
    category: 'alphabet', imageFile: 'B.png',
  },


  'C': {
    description:  'All fingers curved into C arc — not touching, not fully open',
    category: 'alphabet', imageFile: 'C.png',
  },
  'O': {
    description:  'All finger tips and thumb curve to TOUCH, forming a closed O',
    category: 'alphabet', imageFile: 'O.png',
  },


  'D': {
    description:  'Index points straight UP, other fingers and thumb form a circle',
    category: 'alphabet', imageFile: 'D.png',
  },
  'X': {
    description:  'Index extended but HOOKED/bent at first joint like a hook',
    category: 'alphabet', imageFile: 'X.png',
  },

  'J': {
    description:  'Pinky up, draw J in the air — MOTION sign',
    category: 'alphabet', imageFile: 'J.png', detectionType: 'motion',
  },
  'Z': {
    description:  'Index extended, draw Z in air — MOTION sign',
    category: 'alphabet', imageFile: 'Z.png', detectionType: 'motion',
  },


  'F': {
    description:  'Index touches thumb forming circle; middle, ring, pinky up',
    category: 'alphabet', imageFile: 'F.png',
  },
  'K': {
    description:  'Index and middle point up/out, thumb between them, ring/pinky curled',
    category: 'alphabet', imageFile: 'K.png',
  },
  'P': {
    description:  'Like K but pointed downward',
    category: 'alphabet', imageFile: 'P.png',
  },


  'G': {
    description:  'Index and thumb point sideways (like a gun pointing left)',
    category: 'alphabet', imageFile: 'G.png',
  },
  'H': {
    description:  'Index and middle extended horizontally side by side',
    category: 'alphabet', imageFile: 'H.png',
  },
  'I': {
    description:  'Pinky finger extended straight up, others curled',
    category: 'alphabet', imageFile: 'I.png',
  },
  'L': {
    description:  'Index points up, thumb points out — L-shape',
    category: 'alphabet', imageFile: 'L.png',
  },
  'Q': {
    description:  'Index and thumb point downward',
    category: 'alphabet', imageFile: 'Q.png',
  },
  'R': {
    description:  'Index and middle crossed (index over middle)',
    category: 'alphabet', imageFile: 'R.png',
  },
  'U': {
    description:  'Index and middle extended straight up together, not spread',
    category: 'alphabet', imageFile: 'U.png',
  },
  'V': {
    description:  'Index and middle spread in a V/peace sign',
    category: 'alphabet', imageFile: 'V.png',
  },
  'W': {
    description:  'Index, middle, ring extended and spread in a W',
    category: 'alphabet', imageFile: 'W.png',
  },
  'Y': {
    description:  'Thumb and pinky extended (hang-loose / shaka)',
    category: 'alphabet', imageFile: 'Y.png',
  },
  'ILY': {
    description:  'I love you — thumb, index, and pinky extended',
    category: 'alphabet', imageFile: 'ILY.png',
  },


  '0': {
    description:  'Closed circle — fingertips and thumb touch, same handshape as letter O',
    category: 'numbers', imageFile: '0.png',
  },
  '1': {
    description:  'Index finger extended up, thumb resting across curled fingers (no circle, unlike D)',
    category: 'numbers', imageFile: '1.png',
  },
  '2': {
    description:  'Index and middle fingers extended up together, not spread (unlike V)',
    category: 'numbers', imageFile: '2.png',
  },
  '3': {
    description:  'Thumb, index, and middle fingers extended; ring and pinky curled',
    category: 'numbers', imageFile: '3.png',
  },
  '4': {
    description:  'Four fingers extended up and spread, thumb folded across palm',
    category: 'numbers', imageFile: '4.png',
  },
  '5': {
    description:  'All five fingers extended and spread, open hand',
    category: 'numbers', imageFile: '5.png',
  },
  '6': {
    description:  'Thumb touches pinky tip; index, middle, ring extended up. Tap-disambiguated from the letter W in real ASL — routed to the motion model, not the static one (see block comment above).',
    category: 'numbers', imageFile: '6.png',
    detectionType: 'motion',
  },
  '7': {
    description:  'Thumb touches ring finger tip; index, middle, pinky extended up',
    category: 'numbers', imageFile: '7.png',
  },
  '8': {
    description:  'Thumb touches middle finger tip; index, ring, pinky extended up',
    category: 'numbers', imageFile: '8.png',
  },
  '9': {
    description:  'Thumb touches index finger tip forming a small circle; middle, ring, pinky extended up. Tap-disambiguated from the letter F in real ASL — routed to the motion model, not the static one (see block comment above).',
    category: 'numbers', imageFile: '9.png',
    detectionType: 'motion',
  },
  '10': {
    description:  'Closed fist, thumb extended up, twisted side-to-side at the wrist — a genuine motion sign, never a held pose.',
    category: 'numbers', imageFile: '10.png', detectionType: 'motion',
  },


  'MOM': {
    description:  'Open "5" hand, thumb tip taps the CHIN',
    category: 'family', imageFile: 'mom.gif', detectionType: 'motion',
  },
  'DAD': {
    description:  'Open "5" hand, thumb tip taps the FOREHEAD',
    category: 'family', imageFile: 'dad.gif', detectionType: 'motion',
  },
  'BOY': {
    description:  'Flat hand near the forehead, closes into a small grasping motion (like tipping a cap)',
    category: 'family', imageFile: 'boy.gif', detectionType: 'motion',
  },
  'GIRL': {
    description:  'Thumb of an "A" hand brushes down along the jaw/cheek',
    category: 'family', imageFile: 'girl.gif', detectionType: 'motion',
  },
  'BROTHER': {
    description:  'L-hand at forehead morphs to "1" as it lands on a stationary "1"-hand base',
    category: 'family', imageFile: 'brother.gif', detectionType: 'motion',
  },
  'MARRIAGE': {
    description:  'Hands clasp together and interlock in front of the chest',
    category: 'family', imageFile: 'marriage.gif', detectionType: 'motion',
  },
  'SISTER': {
    description:  'L-hand at jaw morphs to "1" as it lands on a stationary "1"-hand base',
    category: 'family', imageFile: 'sister.gif', detectionType: 'motion',
  },
  'GRANDMA': {
    description:  'Open "5" hand taps the chin (like MOM), then hops forward and taps again',
    category: 'family', imageFile: 'grandma.gif', detectionType: 'motion',
  },
  'GRANDPA': {
    description:  'Open "5" hand taps the forehead (like DAD), then hops forward and taps again',
    category: 'family', imageFile: 'grandpa.gif', detectionType: 'motion',
  },
  'AUNT': {
    description:  '"A" handshape shaken near the cheek',
    category: 'family', imageFile: 'aunt.gif', detectionType: 'motion',
  },
  'UNCLE': {
    description:  '"U" handshape shaken near the temple',
    category: 'family', imageFile: 'uncle.gif', detectionType: 'motion',
  },
  'BABY': {
    description:  'Both forearms cross and rock gently, like cradling an infant',
    category: 'family', imageFile: 'baby.gif', detectionType: 'motion',
  },
  'SINGLE': {
    description:  '"I" handshape traced along the ring finger of the other hand',
    category: 'family', imageFile: 'single.gif', detectionType: 'motion',
  },
  'DIVORCED': {
    description:  'Two flat hands touch, then twist and pull apart',
    category: 'family', imageFile: 'divorced.gif', detectionType: 'motion',
  },
  'SCHOOL': {
    description:  'Flat hand claps down twice onto the palm of the other flat hand',
    category: 'places', imageFile: 'school.gif', detectionType: 'motion',
  },


  'HOME': {
    description:  'Flattened-O hand touches mouth corner, then cheek/ear',
    category: 'places', imageFile: 'home.gif', detectionType: 'motion',
  },
  'WORK': {
    description:  'Two S-fists, dominant wrist taps non-dominant fist twice',
    category: 'places', imageFile: 'work.gif', detectionType: 'motion',
  },
  'STORE': {
    description:  'Two flat-O hands near chest, wrists rotate forward twice',
    category: 'places', imageFile: 'store.gif', detectionType: 'motion',
  },
  'CHURCH': {
    description:  'C-hand taps twice on the back of an S-fist base hand',
    category: 'places', imageFile: 'church.gif', detectionType: 'motion',
  },
  'WITH': {
    description:  'Two A-fists brought together, knuckles touching',
    category: 'places', imageFile: 'with.gif', detectionType: 'motion',
  },
  'CAR': {
    description:  'Both hands grip an imaginary steering wheel, small alternating turns',
    category: 'places', imageFile: 'car.gif', detectionType: 'motion',
  },
  'IN': {
    description:  'Bunched fingertips dip down into a curved "container" base hand',
    category: 'places', imageFile: 'in.gif', detectionType: 'motion',
  },
  'OUT': {
    description:  'Bunched fingers pull up and out of the base hand, opening as they exit',
    category: 'places', imageFile: 'out.gif', detectionType: 'motion',
  },

  'DAY': {
    description:  'Index finger up, elbow rests on the other arm, sweeps down like the sun crossing the sky',
    category: 'time', imageFile: 'day.gif', detectionType: 'motion',
  },
  'NIGHT': {
    description:  'Bent hand (fingers pointing down) settles wrist-first onto the back of the other hand, like the sun dipping down',
    category: 'time', imageFile: 'night.gif', detectionType: 'motion',
  },
  'WEEK': {
    description:  '"1" hand slides across the upturned palm of the base hand and off the fingertips',
    category: 'time', imageFile: 'week.gif', detectionType: 'motion',
  },
  'MONTH': {
    description:  'Dominant "1" finger traces down the length of the vertical non-dominant "1" finger',
    category: 'time', imageFile: 'month.gif', detectionType: 'motion',
  },
  'YEAR': {
    description:  'Two "S" fists — dominant fist circles all the way around the stationary one and lands back on top',
    category: 'time', imageFile: 'year.gif', detectionType: 'motion',
  },
  'TODAY': {
    description:  'Both hands, palms up, drop down twice in place — the repeated version of NOW',
    category: 'time', imageFile: 'today.gif', detectionType: 'motion',
  },
  'FINISH': {
    description:  'Both open "5" hands near the shoulders twist quickly from palms-in to palms-out',
    category: 'time', imageFile: 'finish.gif', detectionType: 'motion',
  },


  'HELLO':    { category:'word', imageFile:'hello.gif',    detectionType:'motion' },
  'THANK YOU':{ category:'word', imageFile:'thank-you.gif',detectionType:'motion' },

  'HOT':  { category:'temperature', imageFile:'hot.gif',  detectionType:'motion', disabled:true },
  'COLD': { category:'temperature', imageFile:'cold.gif', detectionType:'motion', disabled:true },
  'YES':      { category:'word', imageFile:'yes.gif',      detectionType:'motion' },
  'NO':       { category:'word', imageFile:'no.gif',       detectionType:'motion' },
  'PLEASE':   { category:'word', imageFile:'please.gif',   detectionType:'motion' },
  'SORRY':    { category:'word', imageFile:'sorry.gif',    detectionType:'motion' },
  'HELP':     { category:'word', imageFile:'help.gif',     detectionType:'motion' },
  'WATER':    { category:'word', imageFile:'water.gif',    detectionType:'motion' },
  'FOOD':     { category:'word', imageFile:'food.gif',     detectionType:'motion' },
  'GOOD':     { category:'word', imageFile:'good.gif',     detectionType:'motion' },
  'BAD':      { category:'word', imageFile:'bad.gif',      detectionType:'motion', disabled:true },
  'GO':       { category:'word', imageFile:'go.gif',       detectionType:'motion' },
  'COME':     { category:'word', imageFile:'come.gif',     detectionType:'motion' },
  'WHERE':    { category:'word', imageFile:'where.gif',    detectionType:'motion' },
  'WHY':      { category:'word', imageFile:'why.gif',      detectionType:'motion' },
  'WHAT':     { category:'word', imageFile:'what.gif',     detectionType:'motion' },
  'BATHROOM': { category:'word', imageFile:'bathroom.gif', detectionType:'motion' },
  'HUNGRY':   { category:'word', imageFile:'hungry.gif',   detectionType:'motion' },

  'EXCUSE': { category:'word', imageFile:'excuse.gif', detectionType:'motion' },
  'WHO':    { category:'word', imageFile:'who.gif',    detectionType:'motion' },
  'WHEN':   { category:'word', imageFile:'when.gif',   detectionType:'motion' },
  'HOW':    { category:'word', imageFile:'how.gif',    detectionType:'motion' },
  'STOP':   { category:'word', imageFile:'stop.gif',   detectionType:'motion' },

  'WAIT':   { category:'word', imageFile:'wait.gif',   detectionType:'motion' },
  'SIT':    { category:'word', imageFile:'sit.gif',    detectionType:'motion' },
  'STAND':  { category:'word', imageFile:'stand.gif',  detectionType:'motion' },
  'WALK':   { category:'word', imageFile:'walk.gif',   detectionType:'motion' },
  'RUN':    { category:'word', imageFile:'run.gif',    detectionType:'motion' },
  'JUMP':   { category:'word', imageFile:'jump.gif',   detectionType:'motion' },
  'EAT':    { category:'word', imageFile:'eat.gif',    detectionType:'motion', disabled:true },
  'DRINK':  { category:'word', imageFile:'drink.gif',  detectionType:'motion' },
  'SLEEP':  { category:'word', imageFile:'sleep.gif',  detectionType:'motion' },
  'WAKE':   { category:'word', imageFile:'wake.gif',   detectionType:'motion' },
  'PLAY':   { category:'word', imageFile:'play.gif',   detectionType:'motion' },
  'LOOK':   { category:'word', imageFile:'look.gif',   detectionType:'motion' },
  'SEE':    { category:'word', imageFile:'see.gif',    detectionType:'motion', disabled:true },
  'LISTEN': { category:'word', imageFile:'listen.gif', detectionType:'motion' },
  'TALK':   { category:'word', imageFile:'talk.gif',   detectionType:'motion' },
  'READ':   { category:'word', imageFile:'read.gif',   detectionType:'motion' },
  'WRITE':  { category:'word', imageFile:'write.gif',  detectionType:'motion' },
  'DRAW':   { category:'word', imageFile:'draw.gif',   detectionType:'motion' },
  'SING':   { category:'word', imageFile:'sing.gif',   detectionType:'motion' },
  'DANCE':  { category:'word', imageFile:'dance.gif',  detectionType:'motion' },
  'COOK':   { category:'word', imageFile:'cook.gif',   detectionType:'motion' },
  'CLEAN':  { category:'word', imageFile:'clean.gif',  detectionType:'motion' },
  'THINK':  { category:'word', imageFile:'think.gif',  detectionType:'motion' },
  'CRY':    { category:'word', imageFile:'cry.gif',    detectionType:'motion' },
  'LAUGH':  { category:'word', imageFile:'laugh.gif',  detectionType:'motion' },
  'RIDE':   { category:'word', imageFile:'ride.gif',   detectionType:'motion' },
  'BATH':   { category:'word', imageFile:'bath.gif',   detectionType:'motion' },
  'GIVE':   { category:'word', imageFile:'give.gif',   detectionType:'motion' },
  'TAKE':   { category:'word', imageFile:'take.gif',   detectionType:'motion' },
  'PUT':    { category:'word', imageFile:'put.gif',    detectionType:'motion' },
  'GET':    { category:'word', imageFile:'get.gif',    detectionType:'motion' },
  'BRING':  { category:'word', imageFile:'bring.gif',  detectionType:'motion' },
  'CARRY':  { category:'word', imageFile:'carry.gif',  detectionType:'motion', disabled:true },
  'PUSH':   { category:'word', imageFile:'push.gif',   detectionType:'motion', disabled:true },
  'PULL':   { category:'word', imageFile:'pull.gif',   detectionType:'motion' },
  'THROW':  { category:'word', imageFile:'throw.gif',  detectionType:'motion' },
  'CATCH':  { category:'word', imageFile:'catch.gif',  detectionType:'motion' },
  'PICK':   { category:'word', imageFile:'pick.gif',   detectionType:'motion' },
  'ASK':    { category:'word', imageFile:'ask.gif',    detectionType:'motion' },
  'ANSWER': { category:'word', imageFile:'answer.gif', detectionType:'motion' },
  'TELL':   { category:'word', imageFile:'tell.gif',   detectionType:'motion' },
  'SHOW':   { category:'word', imageFile:'show.gif',   detectionType:'motion' },
  'SHARE':  { category:'word', imageFile:'share.gif',  detectionType:'motion' },
  'TEACH':  { category:'word', imageFile:'teach.gif',  detectionType:'motion' },
  'SIGN':   { category:'word', imageFile:'sign.gif',   detectionType:'motion' },

  'BODY':    { category:'word', imageFile:'body.gif',    detectionType:'motion' },
  'HEAD':    { category:'word', imageFile:'head.gif',    detectionType:'motion' },
  'HAIR':    { category:'word', imageFile:'hair.gif',    detectionType:'motion' },
  'FACE':    { category:'word', imageFile:'face.gif',    detectionType:'motion' },
  'EYE':     { category:'word', imageFile:'eye.gif',     detectionType:'motion' },
  'EAR':     { category:'word', imageFile:'ear.gif',     detectionType:'motion' },
  'NOSE':    { category:'word', imageFile:'nose.gif',    detectionType:'motion' },
  'MOUTH':   { category:'word', imageFile:'mouth.gif',   detectionType:'motion' },
  'TEETH':   { category:'word', imageFile:'teeth.gif',   detectionType:'motion' },
  'HAND':    { category:'word', imageFile:'hand.gif',    detectionType:'motion' },
  'FINGER':  { category:'word', imageFile:'finger.gif',  detectionType:'motion' },
  'ARM':     { category:'word', imageFile:'arm.gif',     detectionType:'motion' },
  'LEG':     { category:'word', imageFile:'leg.gif',     detectionType:'motion' },
  'FOOT':    { category:'word', imageFile:'foot.gif',    detectionType:'motion' },
  'STOMACH': { category:'word', imageFile:'stomach.gif', detectionType:'motion' },
  'BACK':    { category:'word', imageFile:'back.gif',    detectionType:'motion' },

  'NAME':     { category:'word', imageFile:'name.gif',     detectionType:'motion' },
  'AGE':      { category:'word', imageFile:'age.gif',      detectionType:'motion' },
  'FAMILY':   { category:'word', imageFile:'family.gif',   detectionType:'motion' },
  'BIRTHDAY': { category:'word', imageFile:'birthday.gif', detectionType:'motion', disabled:true },
  'LIVE':     { category:'word', imageFile:'live.gif',     detectionType:'motion' },
  'FROM':     { category:'word', imageFile:'from.gif',     detectionType:'motion' },

  'NICE TO MEET YOU':  { category:'phrase', imageFile:'nice-to-meet-you.gif',  detectionType:'motion', disabled:true },
  'HOW ARE YOU':       { category:'phrase', imageFile:'how-are-you.gif',       detectionType:'motion', disabled:true },
  'WHERE IS':          { category:'phrase', imageFile:'where-is.gif',          detectionType:'motion', disabled:true },
  'I AM LEARNING':     { category:'phrase', imageFile:'i-am-learning.gif',     detectionType:'motion', disabled:true },
  'WHAT IS YOUR NAME': { category:'phrase', imageFile:'what-is-your-name.gif', detectionType:'motion', disabled:true },

  'THANKS':   { category:'word', imageFile:'thank-you.gif', detectionType:'motion' },

  'BIRD':          { category:'animals', imageFile:'bird.png', detectionType:'motion' },
  'CAT':           { category:'animals', imageFile:'cat.png', detectionType:'motion' },
  'COW':           { category:'animals', imageFile:'cow.png', detectionType:'motion' },
  'DOG':           { category:'animals', imageFile:'dog.png', detectionType:'motion' },
  'DUCK':          { category:'animals', imageFile:'duck.png', detectionType:'motion' },
  'FISH':          { category:'animals', imageFile:'fish.png', detectionType:'motion' },
  'GOAT':          { category:'animals', imageFile:'goat.png', detectionType:'motion' },
  'HORSE':         { category:'animals', imageFile:'horse.png', detectionType:'motion' },
  'PIG':           { category:'animals', imageFile:'pig.png', detectionType:'motion' },
  'RABBIT':        { category:'animals', imageFile:'rabbit.png', detectionType:'motion' },
  'SHEEP':         { category:'animals', imageFile:'sheep.png', detectionType:'motion' },

  'KNOW':          { category:'answers', imageFile:'know.png', detectionType:'motion' },

  'DOWN':          { category:'directions', imageFile:'down.png', detectionType:'motion' },
  'FORWARD':       { category:'directions', imageFile:'forward.png', detectionType:'motion' },
  'LEFT':          { category:'directions', imageFile:'left.png', detectionType:'motion' },
  'RIGHT':         { category:'directions', imageFile:'right.png', detectionType:'motion' },
  'UP':            { category:'directions', imageFile:'up.png', detectionType:'motion' },

  'AWAY':          { category:'distance', imageFile:'away.png', detectionType:'motion' },
  'FAR':           { category:'distance', imageFile:'far.png', detectionType:'motion' },
  'HERE':          { category:'distance', imageFile:'here.png', detectionType:'motion' },
  'NEAR':          { category:'distance', imageFile:'near.png', detectionType:'motion' },
  'THERE':         { category:'distance', imageFile:'there.png', detectionType:'motion' },

  'COFFEE':        { category:'drinks', imageFile:'coffee.png', detectionType:'motion' },
  'JUICE':         { category:'drinks', imageFile:'juice.png', detectionType:'motion' },
  'MILK':          { category:'drinks', imageFile:'milk.png', detectionType:'motion' },
  'SODA':          { category:'drinks', imageFile:'soda.png', detectionType:'motion' },
  'TEA':           { category:'drinks', imageFile:'tea.png', detectionType:'motion' },

  'AFTERNOON':     { category:'essentials_greetings', imageFile:'afternoon.png', detectionType:'motion' },
  'GOODBYE':       { category:'essentials_greetings', imageFile:'goodbye.png', detectionType:'motion' },
  'MORNING':       { category:'essentials_greetings', imageFile:'morning.png', detectionType:'motion' },
  'WELCOME':       { category:'essentials_greetings', imageFile:'welcome.png', detectionType:'motion' },

  'ANGRY':         { category:'feelings', imageFile:'angry.png', detectionType:'motion' },
  'BORED':         { category:'feelings', imageFile:'bored.png', detectionType:'motion' },
  'EXCITED':       { category:'feelings', imageFile:'excited.png', detectionType:'motion' },
  'FINE':          { category:'feelings', imageFile:'fine.png', detectionType:'motion' },
  'HAPPY':         { category:'feelings', imageFile:'happy.png', detectionType:'motion' },
  'LIKE':          { category:'feelings', imageFile:'like.png', detectionType:'motion' },
  'LOVE':          { category:'feelings', imageFile:'love.png', detectionType:'motion' },
  'NERVOUS':       { category:'feelings', imageFile:'nervous.png', detectionType:'motion' },
  'OKAY':          { category:'feelings', imageFile:'okay.png', detectionType:'motion' },
  'SAD':           { category:'feelings', imageFile:'sad.png', detectionType:'motion' },
  'SCARED':        { category:'feelings', imageFile:'scared.png', detectionType:'motion' },
  'SICK':          { category:'feelings', imageFile:'sick.png', detectionType:'motion' },
  'THIRSTY':       { category:'feelings', imageFile:'thirsty.png', detectionType:'motion' },
  'TIRED':         { category:'feelings', imageFile:'tired.png', detectionType:'motion' },
  'WORRIED':       { category:'feelings', imageFile:'worried.png', detectionType:'motion' },

  'ALWAYS':        { category:'frequency', imageFile:'always.png', detectionType:'motion' },
  'DAILY':         { category:'frequency', imageFile:'daily.png', detectionType:'motion' },
  'MONTHLY':       { category:'frequency', imageFile:'monthly.png', detectionType:'motion' },
  'NEVER':         { category:'frequency', imageFile:'never.png', detectionType:'motion' },
  'OFTEN':         { category:'frequency', imageFile:'often.png', detectionType:'motion' },
  'RARELY':        { category:'frequency', imageFile:'rarely.png', detectionType:'motion' },
  'SOMETIMES':     { category:'frequency', imageFile:'sometimes.png', detectionType:'motion' },
  'WEEKLY':        { category:'frequency', imageFile:'weekly.png', detectionType:'motion' },

  'FRONT':         { category:'location', imageFile:'front.png', detectionType:'motion' },

  'CAN':           { category:'making_requests', imageFile:'can.png', detectionType:'motion' },
  'HAVE':          { category:'making_requests', imageFile:'have.png', detectionType:'motion' },
  'THAT':          { category:'making_requests', imageFile:'that.png', detectionType:'motion' },
  'THIS':          { category:'making_requests', imageFile:'this.png', detectionType:'motion' },

  'CHILD':         { category:'people', imageFile:'child.png', detectionType:'motion' },
  'FRIEND':        { category:'people', imageFile:'friend.png', detectionType:'motion' },
  'MAN':           { category:'people', imageFile:'man.png', detectionType:'motion' },
  'ME':            { category:'people', imageFile:'me.png', detectionType:'motion' },
  'MY':            { category:'people', imageFile:'my.png', detectionType:'motion' },
  'PERSON':        { category:'people', imageFile:'person.png', detectionType:'motion' },
  'STUDENT':       { category:'people', imageFile:'student.png', detectionType:'motion' },
  'TEACHER':       { category:'people', imageFile:'teacher.png', detectionType:'motion' },
  'WOMAN':         { category:'people', imageFile:'woman.png', detectionType:'motion' },
  'YOU':           { category:'people', imageFile:'you.png', detectionType:'motion' },
  'YOUR':          { category:'people', imageFile:'your.png', detectionType:'motion' },

  'MORE':          { category:'requests', imageFile:'more.png', detectionType:'motion' },

  'MAYBE':         { category:'responses', imageFile:'maybe.png', detectionType:'motion' },
  'SURE':          { category:'responses', imageFile:'sure.png', detectionType:'motion' },
  'UNDERSTAND':    { category:'responses', imageFile:'understand.png', detectionType:'motion' },

  'BEGINNING':     { category:'sequence', imageFile:'beginning.png', detectionType:'motion' },
  'END':           { category:'sequence', imageFile:'end.png', detectionType:'motion' },
  'FINALLY':       { category:'sequence', imageFile:'finally.png', detectionType:'motion' },
  'FIRST':         { category:'sequence', imageFile:'first.png', detectionType:'motion' },
  'MIDDLE':        { category:'sequence', imageFile:'middle.png', detectionType:'motion' },
  'NEXT':          { category:'sequence', imageFile:'next.png', detectionType:'motion' },
  'SECOND':        { category:'sequence', imageFile:'second.png', detectionType:'motion' },
  'THEN':          { category:'sequence', imageFile:'then.png', detectionType:'motion' },
  'THIRD':         { category:'sequence', imageFile:'third.png', detectionType:'motion' },

  'CAKE':          { category:'snacks', imageFile:'cake.png', detectionType:'motion' },
  'CANDY':         { category:'snacks', imageFile:'candy.png', detectionType:'motion' },
  'CHOCOLATE':     { category:'snacks', imageFile:'chocolate.png', detectionType:'motion' },
  'COOKIE':        { category:'snacks', imageFile:'cookie.png', detectionType:'motion' },
  'DONUT':         { category:'snacks', imageFile:'donut.png', detectionType:'motion' },
  'ICECREAM':      { category:'snacks', imageFile:'icecream.png', detectionType:'motion' },
  'PIE':           { category:'snacks', imageFile:'pie.png', detectionType:'motion' },
  'POPCORN':       { category:'snacks', imageFile:'popcorn.png', detectionType:'motion' },

  'CLASSMATE':     { category:'social', imageFile:'classmate.png', detectionType:'motion' },
  'MEET':          { category:'social', imageFile:'meet.png', detectionType:'motion' },
  'NEIGHBOR':      { category:'social', imageFile:'neighbor.png', detectionType:'motion' },
  'TOGETHER':      { category:'social', imageFile:'together.png', detectionType:'motion' },
  'VISIT':         { category:'social', imageFile:'visit.png', detectionType:'motion' },

  'FINISHED':      { category:'turn_taking', imageFile:'finished.png', detectionType:'motion' },
  'TURN':          { category:'turn_taking', imageFile:'turn.png', detectionType:'motion' },

  'BEAN':          { category:'vegetables', imageFile:'bean.png', detectionType:'motion' },
  'BROCCOLI':      { category:'vegetables', imageFile:'broccoli.png', detectionType:'motion' },
  'CABBAGE':       { category:'vegetables', imageFile:'cabbage.png', detectionType:'motion' },
  'CARROT':        { category:'vegetables', imageFile:'carrot.png', detectionType:'motion' },
  'CORN':          { category:'vegetables', imageFile:'corn.png', detectionType:'motion' },
  'GARLIC':        { category:'vegetables', imageFile:'garlic.png', detectionType:'motion' },
  'ONION':         { category:'vegetables', imageFile:'onion.png', detectionType:'motion' },
  'PEA':           { category:'vegetables', imageFile:'pea.png', detectionType:'motion' },
  'POTATO':        { category:'vegetables', imageFile:'potato.png', detectionType:'motion' },
  'TOMATO':        { category:'vegetables', imageFile:'tomato.png', detectionType:'motion' },

  'LION':          { category:'wild_animals', imageFile:'lion.png', detectionType:'motion' },
  'TIGER':         { category:'wild_animals', imageFile:'tiger.png', detectionType:'motion' },

  "DON'T":        { category:'answers', imageFile:'dont.png', detectionType:'motion' },
  'LESS':         { category:'requests', imageFile:'less.png', detectionType:'motion' },
  'MANY':         { category:'essentials_basic_responses', imageFile:'many.png', detectionType:'motion' },
  'MUCH':         { category:'essentials_basic_responses', imageFile:'much.png', detectionType:'motion' },
  'NEED':         { category:'requests', imageFile:'need.png', detectionType:'motion' },
  'WANT':         { category:'requests', imageFile:'want.png', detectionType:'motion' },
  'WHICH':        { category:'essentials_basic_responses', imageFile:'which.png', detectionType:'motion' },

};


export function getSignsByCategory(category) {
  return Object.entries(SIGN_DICTIONARY)
    .filter(([, d]) => d.category === category && !d.disabled)
    .map(([label]) => label);
}
export function getActiveSigns()   { return Object.keys(SIGN_DICTIONARY).filter(k => !SIGN_DICTIONARY[k].disabled); }
export function getSignData(label) { return SIGN_DICTIONARY[label] ?? null; }
export function getAllSigns()       { return Object.keys(SIGN_DICTIONARY); }

export function getDetectionType(label) {
  return SIGN_DICTIONARY[label]?.detectionType ?? 'static';
}
