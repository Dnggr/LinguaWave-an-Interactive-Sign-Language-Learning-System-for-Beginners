// Sentence bank for Construct a Sentence.
//   text  : the English sentence shown to the player
//   words : the signs in the order they must be placed (ASL sign order, not always English order)
// Each word must match a signId in the curriculum (js/missions.js), case-insensitive, and that sign
// needs a plain .mp4 demo. Sentences with an unknown/unplayable word are skipped automatically
// (the console lists which words were the problem). No sentence may repeat a word.
export const SENTENCES = [
  { text: 'I want water.',             words: ['I', 'WANT', 'WATER'] },
  { text: 'I need help.',              words: ['I', 'NEED', 'HELP'] },
  { text: 'I like pizza.',             words: ['I', 'LIKE', 'PIZZA'] },
  { text: 'I go to school.',           words: ['I', 'GO', 'SCHOOL'] },
  { text: 'Mom drinks milk.',          words: ['MOM', 'DRINK', 'MILK'] },
  { text: 'You eat an apple.',         words: ['YOU', 'EAT', 'APPLE'] },
  { text: 'Dad cooks pizza.',          words: ['DAD', 'COOK', 'PIZZA'] },
  { text: 'My dog is hungry.',         words: ['MY', 'DOG', 'HUNGRY'] },
  { text: 'I see a bird.',             words: ['I', 'SEE', 'BIRD'] },
  { text: 'The teacher reads a book.', words: ['TEACHER', 'READ', 'BOOK'] },
  { text: 'My mom is happy.',          words: ['MY', 'MOM', 'HAPPY'] },
  { text: 'Please help me.',           words: ['PLEASE', 'HELP', 'ME'] },
  { text: 'I want food, please.',      words: ['I', 'WANT', 'FOOD', 'PLEASE'] },
  { text: 'You are my friend.',        words: ['YOU', 'MY', 'FRIEND'] }
];
