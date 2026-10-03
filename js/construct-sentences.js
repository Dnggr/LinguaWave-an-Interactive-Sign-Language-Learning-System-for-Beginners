// Sentence bank for Construct a Sentence.
//   text  : the English sentence shown to the player
//   words : the signs in the order they must be placed (ASL sign order, not always English order)
// Rules (every sentence below was checked against js/missions.js and the files in assets/videos):
//   - Each word must be a signId in the curriculum with a plain .mp4 demo that exists on disk.
//     Sentences with an unknown/unplayable word are skipped at runtime (console warns which word).
//   - "I" is NOT used: the signId 'I' is the fingerspelled letter I. The pronoun is the ME sign
//     (same sign in ASL), so "I ..." sentences use 'ME'.
//   - WANT, NEED and PIZZA are NOT in the curriculum yet, so no sentence uses them. Add a sentence with
//     them only after those lessons exist in js/missions.js.
//   - No sentence may repeat a word, and every sentence has at least 3 signs.
// A learner only gets sentences whose signs they have ALL learned, so keep adding sentences built from the
// early chapters (feelings, needs, actions, people) so new learners have something to play.
export const SENTENCES = [
  { text: 'You are my friend.',          words: ['YOU', 'MY', 'FRIEND'] },
  { text: 'Please help me.',             words: ['PLEASE', 'HELP', 'ME'] },
  { text: 'I eat food.',                 words: ['ME', 'EAT', 'FOOD'] },
  { text: 'I drink water.',              words: ['ME', 'DRINK', 'WATER'] },
  { text: 'I drink milk.',               words: ['ME', 'DRINK', 'MILK'] },
  { text: 'I like my friend.',           words: ['ME', 'LIKE', 'MY', 'FRIEND'] },
  { text: 'You eat an apple.',           words: ['YOU', 'EAT', 'APPLE'] },
  { text: 'Mom drinks milk.',            words: ['MOM', 'DRINK', 'MILK'] },
  { text: 'Dad eats food.',              words: ['DAD', 'EAT', 'FOOD'] },
  { text: 'I go to school.',             words: ['ME', 'GO', 'SCHOOL'] },
  { text: 'You go home.',                words: ['YOU', 'GO', 'HOME'] },
  { text: 'My mom is happy.',            words: ['MY', 'MOM', 'HAPPY'] },
  { text: 'My dad is tired.',            words: ['MY', 'DAD', 'TIRED'] },
  { text: 'My friend is sad.',           words: ['MY', 'FRIEND', 'SAD'] },
  { text: 'My dog is hungry.',           words: ['MY', 'DOG', 'HUNGRY'] },
  { text: 'I see a bird.',               words: ['ME', 'SEE', 'BIRD'] },
  { text: 'The teacher reads a book.',   words: ['TEACHER', 'READ', 'BOOK'] },
  { text: 'Thank you, my friend.',       words: ['THANK YOU', 'MY', 'FRIEND'] },
  { text: 'Please give me water.',       words: ['PLEASE', 'GIVE', 'ME', 'WATER'] },
  { text: 'I like my teacher.',          words: ['ME', 'LIKE', 'MY', 'TEACHER'] },
  { text: 'You teach me.',               words: ['YOU', 'TEACH', 'ME'] },
  { text: 'I ask my teacher.',           words: ['ME', 'ASK', 'MY', 'TEACHER'] },
  { text: 'You tell me.',                words: ['YOU', 'TELL', 'ME'] },
  { text: 'Show me your book.',          words: ['SHOW', 'ME', 'YOUR', 'BOOK'] },
  { text: 'I walk to school.',           words: ['ME', 'WALK', 'SCHOOL'] },
  { text: 'I drink tea.',                words: ['ME', 'DRINK', 'TEA'] },
  { text: 'I eat a banana.',             words: ['ME', 'EAT', 'BANANA'] },
  { text: 'My mom reads a book.',        words: ['MY', 'MOM', 'READ', 'BOOK'] },
  { text: 'My friend drinks juice.',     words: ['MY', 'FRIEND', 'DRINK', 'JUICE'] }
];