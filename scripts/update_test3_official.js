const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_3.json');

const officialAnswersTest3 = {
  1: "C", 2: "D", 3: "B", 4: "A", 5: "D", 6: "D",
  7: "C", 8: "B", 9: "C", 10: "A", 11: "C", 12: "A", 13: "B", 14: "C", 15: "A",
  16: "B", 17: "C", 18: "B", 19: "A", 20: "B", 21: "A", 22: "C", 23: "B", 24: "B",
  25: "A", 26: "C", 27: "A", 28: "B", 29: "C", 30: "A", 31: "A", 32: "C", 33: "B",
  34: "B", 35: "C", 36: "B", 37: "A", 38: "D", 39: "A", 40: "C", 41: "D", 42: "B",
  43: "C", 44: "B", 45: "C", 46: "D", 47: "B", 48: "A", 49: "D", 50: "A", 51: "C",
  52: "C", 53: "C", 54: "A", 55: "C", 56: "B", 57: "C", 58: "A", 59: "C", 60: "D",
  61: "A", 62: "A", 63: "C", 64: "B", 65: "A", 66: "B", 67: "C", 68: "B", 69: "C",
  70: "D", 71: "B", 72: "C", 73: "A", 74: "A", 75: "B", 76: "D", 77: "C", 78: "D",
  79: "A", 80: "B", 81: "B", 82: "C", 83: "C", 84: "A", 85: "C", 86: "A", 87: "C",
  88: "D", 89: "C", 90: "B", 91: "A", 92: "C", 93: "B", 94: "A", 95: "C", 96: "B",
  97: "B", 98: "C", 99: "A", 100: "D", 101: "D", 102: "B", 103: "C", 104: "A", 105: "C",
  106: "B", 107: "A", 108: "D", 109: "A", 110: "B", 111: "A", 112: "C", 113: "D", 114: "C",
  115: "D", 116: "C", 117: "A", 118: "A", 119: "C", 120: "C", 121: "C", 122: "C", 123: "D",
  124: "D", 125: "B", 126: "A", 127: "B", 128: "C", 129: "B", 130: "C", 131: "B", 132: "D",
  133: "C", 134: "A", 135: "C", 136: "C", 137: "A", 138: "D", 139: "C", 140: "B", 141: "A",
  142: "A", 143: "D", 144: "B", 145: "A", 146: "C", 147: "A", 148: "C", 149: "C", 150: "B",
  151: "D", 152: "B", 153: "A", 154: "C", 155: "B", 156: "C", 157: "B", 158: "C", 159: "A",
  160: "D", 161: "C", 162: "C", 163: "B", 164: "A", 165: "D", 166: "A", 167: "C", 168: "B",
  169: "C", 170: "A", 171: "C", 172: "C", 173: "B", 174: "D", 175: "C", 176: "B", 177: "C",
  178: "C", 179: "C", 180: "C", 181: "A", 182: "C", 183: "B", 184: "C", 185: "D", 186: "D",
  187: "C", 188: "C", 189: "D", 190: "B", 191: "B", 192: "A", 193: "C", 194: "D", 195: "B",
  196: "C", 197: "B", 198: "C", 199: "B", 200: "C"
};

const officialTranscriptsPart1Test3 = {
  1: "(A) She has some grocery bags.\n(B) She is holding some flowers.\n(C) She is reaching out to pick up a vegetable.\n(D) She is washing the fruits.",
  2: "(A) The boy is putting bait on the hook.\n(B) The father has his right arm around the boy.\n(C) The boy is reeling in a fish.\n(D) They are fishing on the pier.",
  3: "(A) He is washing the fruits.\n(B) He is cutting up some vegetables.\n(C) There are some glasses of water on the table.\n(D) She is standing next to him.",
  4: "(A) They are looking at some documents on the table.\n(B) They are wearing helmets.\n(C) There are some people working behind them.\n(D) One of the men is writing on the document.",
  5: "(A) There are some building designs on the table.\n(B) The woman is drinking a cup of coffee.\n(C) The woman is writing a recipe.\n(D) The woman is talking on the phone.",
  6: "(A) The man is typing on the computer.\n(B) They are both looking at the laptop.\n(C) The men are wearing ties.\n(D) The men are checking some blueprints."
};

const officialTranscriptsPart2Test3 = {
  7: "Speaker A: Who's responsible for the report?\nSpeaker B:\n(A) Sometime in the afternoon.\n(B) In the news report.\n(C) It's John Draper.",
  8: "Speaker A: Where can I buy a ticket?\nSpeaker B:\n(A) A round-trip ticket.\n(B) On the official website.\n(C) By 5:00 at the latest.",
  9: "Speaker A: Did Mr. Stacks show you the new work schedule?\nSpeaker B:\n(A) Yes, he was.\n(B) It's behind schedule.\n(C) Actually, Ms. Dwain did.",
  10: "Speaker A: When should I call the travel agency?\nSpeaker B:\n(A) Sometime before Friday.\n(B) In my desk drawer.\n(C) We don't allow refunds.",
  11: "Speaker A: How many tables should I set up?\nSpeaker B:\n(A) It's a table for four.\n(B) There isn't enough time.\n(C) At least twenty.",
  12: "Speaker A: Let's take a short break.\nSpeaker B:\n(A) I'd like that.\n(B) It's a short-term contract.\n(C) I put the brakes on.",
  13: "Speaker A: Why won't the television turn on?\nSpeaker B:\n(A) Because of a scheduling conflict.\n(B) Maybe it isn't plugged in.\n(C) It was yesterday.",
  14: "Speaker A: Would you rather eat out or pack a lunch?\nSpeaker B:\n(A) It was delicious.\n(B) We're preparing for a new product launch.\n(C) Let's go to a restaurant.",
  15: "Speaker A: Sam is a really great clerk, isn't he?\nSpeaker B:\n(A) Yeah, he is very hard-working.\n(B) Well, the clock is a few minutes slow.\n(C) No, he just moved last week.",
  16: "Speaker A: How often does this bus come?\nSpeaker B:\n(A) I will come up with some ideas.\n(B) Every twenty minutes.\n(C) The train to Hemsville.",
  17: "Speaker A: Isn't Mary having a baby?\nSpeaker B:\n(A) No, it was a baby toy.\n(B) Of course. I'd love to.\n(C) Sometime next month, I think.",
  18: "Speaker A: Is this food enough, or should I prepare more?\nSpeaker B:\n(A) The restaurant is busy.\n(B) That will be plenty.\n(C) I need a pair of gloves.",
  19: "Speaker A: When will the manager be making the announcement?\nSpeaker B:\n(A) At around 3:00 P.M.\n(B) Yes, that's what I heard too.\n(C) In the auditorium.",
  20: "Speaker A: Which shirt did you decide to buy for your sister?\nSpeaker B:\n(A) I decided to hire more employees.\n(B) Actually, I bought a scarf instead.\n(C) How much is it?",
  21: "Speaker A: Would you like me to return this book for you?\nSpeaker B:\n(A) No, I haven't finished it yet.\n(B) Book a room for you.\n(C) Please help me lift this.",
  22: "Speaker A: I'm having a hard time choosing what to wear.\nSpeaker B:\n(A) I bought the clothes last week.\n(B) Where is the exit?\n(C) I can give you advice.",
  23: "Speaker A: Isn't the museum closed on Mondays?\nSpeaker B:\n(A) Sometime this morning.\n(B) You're right.\n(C) We will open a new branch.",
  24: "Speaker A: Mr. Yamaoka will be dropping by today, won't he?\nSpeaker B:\n(A) Can you pick it up for me?\n(B) No, he said he's too busy.\n(C) Yes, it was his first visit.",
  25: "Speaker A: I think I need to fill the car up with gas.\nSpeaker B:\n(A) Take a right turn here, then.\n(B) It's a natural gas company.\n(C) Don't forget to pack the truck.",
  26: "Speaker A: Could you come to the office early tomorrow?\nSpeaker B:\n(A) It's reflected on the surface.\n(B) Yes, I met him in the office.\n(C) What time?",
  27: "Speaker A: Why hasn't the delivery arrived yet?\nSpeaker B:\n(A) Let me call Ms. Anderson.\n(B) I've signed the document.\n(C) A cardboard box.",
  28: "Speaker A: Were you at the workshop this weekend?\nSpeaker B:\n(A) I'll visit her next weekend.\n(B) Yes, I attended with Jake and Melissa.\n(C) I was going to shop for groceries.",
  29: "Speaker A: Would you prefer to meet this Wednesday or on Saturday?\nSpeaker B:\n(A) I won't refer to the matter again.\n(B) We can meet the deadline.\n(C) I'm most free on the weekends.",
  30: "Speaker A: Have you printed a copy of the itinerary for everyone?\nSpeaker B:\n(A) Yes, right here.\n(B) A cup of coffee, please.\n(C) No one knows where she is.",
  31: "Speaker A: This book is too difficult for me.\nSpeaker B:\n(A) Then I'll pick out a different one.\n(B) The library is close by.\n(C) Try this hat on."
};

function updateTest3Official() {
  console.log('🔄 Updating TOEIC Test 3 with official answers & transcripts...');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let updatedCount = 0;

  data.questions.forEach(q => {
    const qNum = q.id;
    if (officialAnswersTest3[qNum]) {
      if (q.answer !== officialAnswersTest3[qNum]) {
        console.log(`✅ Q#${qNum}: Answer '${q.answer}' -> '${officialAnswersTest3[qNum]}'`);
        q.answer = officialAnswersTest3[qNum];
        updatedCount++;
      }
    }

    if (q.part === 1 && officialTranscriptsPart1Test3[qNum]) {
      q.script = officialTranscriptsPart1Test3[qNum];
    } else if (q.part === 2 && officialTranscriptsPart2Test3[qNum]) {
      q.script = officialTranscriptsPart2Test3[qNum];
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully updated ${updatedCount} answer keys and all scripts in TOEIC Test 3 (${jsonPath})!`);
}

updateTest3Official();
