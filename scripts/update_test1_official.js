const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_1.json');

const officialAnswers = {
  1: "C", 2: "D", 3: "A", 4: "B", 5: "A", 6: "A",
  7: "A", 8: "B", 9: "B", 10: "A", 11: "C", 12: "C", 13: "B", 14: "C", 15: "C",
  16: "B", 17: "A", 18: "B", 19: "A", 20: "A", 21: "A", 22: "C", 23: "A", 24: "B",
  25: "C", 26: "B", 27: "C", 28: "B", 29: "C", 30: "B", 31: "A", 32: "C", 33: "A",
  34: "B", 35: "D", 36: "B", 37: "A", 38: "C", 39: "A", 40: "B", 41: "A", 42: "C",
  43: "B", 44: "A", 45: "D", 46: "C", 47: "A", 48: "C", 49: "D", 50: "A", 51: "D",
  52: "B", 53: "C", 54: "D", 55: "A", 56: "D", 57: "A", 58: "C", 59: "B", 60: "C",
  61: "D", 62: "B", 63: "C", 64: "B", 65: "C", 66: "B", 67: "C", 68: "B", 69: "C",
  70: "B", 71: "D", 72: "B", 73: "B", 74: "B", 75: "A", 76: "C", 77: "B", 78: "C",
  79: "A", 80: "C", 81: "D", 82: "C", 83: "B", 84: "A", 85: "C", 86: "A", 87: "C",
  88: "A", 89: "B", 90: "A", 91: "B", 92: "A", 93: "C", 94: "D", 95: "A", 96: "A",
  97: "D", 98: "D", 99: "B", 100: "C", 101: "A", 102: "D", 103: "C", 104: "B", 105: "A",
  106: "B", 107: "B", 108: "A", 109: "B", 110: "B", 111: "D", 112: "C", 113: "D", 114: "B",
  115: "B", 116: "D", 117: "A", 118: "C", 119: "C", 120: "D", 121: "A", 122: "C", 123: "B",
  124: "B", 125: "A", 126: "D", 127: "C", 128: "D", 129: "A", 130: "A", 131: "C", 132: "D",
  133: "C", 134: "B", 135: "C", 136: "B", 137: "D", 138: "A", 139: "A", 140: "C", 141: "B",
  142: "C", 143: "C", 144: "D", 145: "A", 146: "B", 147: "B", 148: "C", 149: "C", 150: "B",
  151: "C", 152: "B", 153: "D", 154: "A", 155: "C", 156: "A", 157: "B", 158: "D", 159: "C",
  160: "C", 161: "C", 162: "B", 163: "D", 164: "A", 165: "C", 166: "B", 167: "C", 168: "B",
  169: "D", 170: "B", 171: "B", 172: "B", 173: "A", 174: "C", 175: "D", 176: "D", 177: "A",
  178: "B", 179: "B", 180: "B", 181: "C", 182: "A", 183: "D", 184: "B", 185: "B", 186: "A",
  187: "D", 188: "C", 189: "A", 190: "D", 191: "A", 192: "A", 193: "C", 194: "B", 195: "A",
  196: "A", 197: "D", 198: "B", 199: "B", 200: "A"
};

const officialTranscriptsPart1 = {
  1: "(A) There are a lot of other people at the park.\n(B) The boy is riding on his daddy's shoulders.\n(C) They are taking a walk in the park.\n(D) The boy is running on the path.",
  2: "(A) The men are all wearing glasses.\n(B) One of the men is typing on his laptop.\n(C) The women are looking at each other.\n(D) They are having a business meeting.",
  3: "(A) She is putting air into her car tire.\n(B) Someone is helping her fill the tire with air.\n(C) She is pumping gas into her car.\n(D) She is changing the tire on the car.",
  4: "(A) She is cooking a steak in a frying pan.\n(B) She is tasting the food while cooking.\n(C) There are many fruits on the counter.\n(D) She is cutting vegetables.",
  5: "(A) They are running on the treadmills.\n(B) They are using exercise bikes.\n(C) All of the treadmills are being used.\n(D) The man is pressing some buttons on the treadmill.",
  6: "(A) He is taking the hook out of the fish's mouth.\n(B) There are several men in the boat.\n(C) He is cooking the fish.\n(D) He has a lot of fish in the boat."
};

const officialTranscriptsPart2 = {
  7: "Speaker A: When will the meeting be held?\nSpeaker B:\n(A) After lunch.\n(B) Yes, it will be.\n(C) Next to the conference room.",
  8: "Speaker A: Do you want me to sign this document?\nSpeaker B:\n(A) The recent documentary.\n(B) Yes, right here.\n(C) I can't read them.",
  9: "Speaker A: Who will be responsible for interviewing new job applicants?\nSpeaker B:\n(A) Before the New Year.\n(B) That's Jenny's duty.\n(C) Just apply online.",
  10: "Speaker A: How many hotel rooms would you like to reserve?\nSpeaker B:\n(A) I think at least five.\n(B) He stayed overnight.\n(C) At the beginning of March.",
  11: "Speaker A: Was that the last speaker of the conference?\nSpeaker B:\n(A) The conference schedule.\n(B) At 5:00 P.M.\n(C) No, there will be another this afternoon.",
  12: "Speaker A: When will workshop registration happen?\nSpeaker B:\n(A) The shop opened last year.\n(B) He is the new instructor.\n(C) It will begin next week.",
  13: "Speaker A: Where should I store these books?\nSpeaker B:\n(A) Yes, they are for sale.\n(B) Please put them in the closet.\n(C) He came in first place.",
  14: "Speaker A: Could you pick up our client from the airport as soon as possible?\nSpeaker B:\n(A) It's a domestic flight.\n(B) Check the contract.\n(C) Sure, I'll leave now.",
  15: "Speaker A: You locked the front door after you left, didn't you?\nSpeaker B:\n(A) No, she left early.\n(B) It's in the front.\n(C) Yes, don't worry.",
  16: "Speaker A: Why was the quarterly training session canceled?\nSpeaker B:\n(A) He's undergoing intensive training.\n(B) Actually, it was rescheduled.\n(C) Because the pencil was broken.",
  17: "Speaker A: Can you give me the e-mail address for the sales department?\nSpeaker B:\n(A) I'll forward it to you.\n(B) It's a sale price for a limited time.\n(C) What a nice dress!",
  18: "Speaker A: Didn't you get my proposal?\nSpeaker B:\n(A) It's not a new garbage disposal.\n(B) Yes, and I replied.\n(C) I didn't get there in time.",
  19: "Speaker A: Are you interested in a year-long membership or something short-term?\nSpeaker B:\n(A) I'll try just a month at first.\n(B) It's only available for members.\n(C) This loan offers low interest.",
  20: "Speaker A: You can park your car in front of our building.\nSpeaker B:\n(A) Oh, that's convenient.\n(B) I ran out of gas.\n(C) It overlooks an amusement park.",
  21: "Speaker A: Is this laptop very portable?\nSpeaker B:\n(A) Yes, it's small and lightweight.\n(B) It's comfortable to sit on.\n(C) No, it wasn't on my lap.",
  22: "Speaker A: How can I find a roster of all the volunteers?\nSpeaker B:\n(A) He volunteered to attend the conference.\n(B) Please register your complaint.\n(C) Just access the company database.",
  23: "Speaker A: Please take a brochure before the presentation.\nSpeaker B:\n(A) Thanks. I'll read it.\n(B) At the podium.\n(C) I forgot her present.",
  24: "Speaker A: Ms. Schneider didn't call yet.\nSpeaker B:\n(A) They did call for help.\n(B) Don't worry. She will soon.\n(C) Please transfer her call to me right away.",
  25: "Speaker A: Shouldn't we inform our customers of the policy change soon?\nSpeaker B:\n(A) Yes, it's custom furniture.\n(B) That was my application form.\n(C) I'll let them know.",
  26: "Speaker A: You can fix my bicycle, can't you?\nSpeaker B:\n(A) I ride the bus to work.\n(B) Sure, but it will take some time.\n(C) Yes, I can teach a graphics course.",
  27: "Speaker A: I didn't turn in the assignment punctually.\nSpeaker B:\n(A) Take a left turn at the corner.\n(B) We appreciate your punctuality.\n(C) Maybe you should contact your professor.",
  28: "Speaker A: What kind of ink does the printer use?\nSpeaker B:\n(A) He's a world-famous sprinter.\n(B) Consult the manual.\n(C) It's very kind of you to say so.",
  29: "Speaker A: Would you like to go out for lunch?\nSpeaker B:\n(A) It was tasty.\n(B) The lights will go out after 7:00 P.M.\n(C) When is your break?",
  30: "Speaker A: Why was the manuscript I submitted rejected by the editor?\nSpeaker B:\n(A) Submit the form online.\n(B) Actually, I'm not in charge of editing.\n(C) It was written on the menu.",
  31: "Speaker A: I need to confirm your reservation.\nSpeaker B:\n(A) I'll send the confirmation number.\n(B) No, there is no room.\n(C) The seat was fairly firm."
};

function updateTest1Official() {
  console.log('🔄 Updating TOEIC Test 1 with official answers & transcripts...');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let updatedCount = 0;

  data.questions.forEach(q => {
    const qNum = q.id;
    if (officialAnswers[qNum]) {
      if (q.answer !== officialAnswers[qNum]) {
        console.log(`✅ Q#${qNum}: Answer '${q.answer}' -> '${officialAnswers[qNum]}'`);
        q.answer = officialAnswers[qNum];
        updatedCount++;
      }
    }

    // Update Transcripts for Part 1 & Part 2
    if (q.part === 1 && officialTranscriptsPart1[qNum]) {
      q.script = officialTranscriptsPart1[qNum];
    } else if (q.part === 2 && officialTranscriptsPart2[qNum]) {
      q.script = officialTranscriptsPart2[qNum];
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully updated ${updatedCount} answer keys and all scripts in TOEIC Test 1 (${jsonPath})!`);
}

updateTest1Official();
