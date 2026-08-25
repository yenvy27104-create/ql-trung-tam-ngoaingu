const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_2.json');

const officialAnswersTest2 = {
  1: "A", 2: "C", 3: "C", 4: "B", 5: "A", 6: "A",
  7: "A", 8: "B", 9: "A", 10: "B", 11: "C", 12: "C", 13: "A", 14: "C", 15: "B",
  16: "C", 17: "A", 18: "B", 19: "C", 20: "B", 21: "C", 22: "A", 23: "A", 24: "C",
  25: "A", 26: "C", 27: "C", 28: "A", 29: "A", 30: "C", 31: "A", 32: "A", 33: "B",
  34: "B", 35: "B", 36: "A", 37: "C", 38: "C", 39: "B", 40: "A", 41: "D", 42: "C",
  43: "D", 44: "D", 45: "A", 46: "C", 47: "D", 48: "C", 49: "C", 50: "A", 51: "A",
  52: "C", 53: "C", 54: "A", 55: "B", 56: "C", 57: "B", 58: "C", 59: "C", 60: "B",
  61: "A", 62: "C", 63: "C", 64: "D", 65: "A", 66: "D", 67: "A", 68: "C", 69: "B",
  70: "B", 71: "B", 72: "A", 73: "C", 74: "C", 75: "A", 76: "B", 77: "C", 78: "A",
  79: "C", 80: "D", 81: "A", 82: "D", 83: "A", 84: "A", 85: "D", 86: "C", 87: "A",
  88: "A", 89: "C", 90: "A", 91: "A", 92: "C", 93: "D", 94: "D", 95: "A", 96: "C",
  97: "D", 98: "B", 99: "A", 100: "D", 101: "B", 102: "A", 103: "C", 104: "C", 105: "D",
  106: "C", 107: "A", 108: "D", 109: "D", 110: "A", 111: "D", 112: "C", 113: "C", 114: "A",
  115: "C", 116: "A", 117: "C", 118: "B", 119: "B", 120: "C", 121: "A", 122: "A", 123: "A",
  124: "C", 125: "D", 126: "B", 127: "A", 128: "D", 129: "B", 130: "B", 131: "C", 132: "D",
  133: "B", 134: "A", 135: "D", 136: "A", 137: "C", 138: "B", 139: "B", 140: "D", 141: "C",
  142: "A", 143: "C", 144: "A", 145: "C", 146: "D", 147: "C", 148: "D", 149: "B", 150: "B",
  151: "D", 152: "B", 153: "B", 154: "D", 155: "C", 156: "C", 157: "D", 158: "B", 159: "A",
  160: "C", 161: "A", 162: "B", 163: "B", 164: "D", 165: "D", 166: "B", 167: "A", 168: "C",
  169: "B", 170: "A", 171: "D", 172: "C", 173: "B", 174: "A", 175: "C", 176: "C", 177: "D",
  178: "B", 179: "D", 180: "B", 181: "C", 182: "D", 183: "B", 184: "C", 185: "D", 186: "C",
  187: "B", 188: "C", 189: "C", 190: "B", 191: "B", 192: "C", 193: "B", 194: "D", 195: "C",
  196: "B", 197: "C", 198: "B", 199: "D", 200: "C"
};

const officialTranscriptsPart1Test2 = {
  1: "(A) The man is pointing at the flowers.\n(B) She is picking some flowers.\n(C) The man is holding a flower.\n(D) They are all looking at the plants.",
  2: "(A) He is wearing a tool belt.\n(B) The man is loading a cart.\n(C) He is changing the tire in the garage.\n(D) The tire is brand new.",
  3: "(A) He is driving a car in the snow.\n(B) He has already shoveled the snow off of the roof.\n(C) His car door is covered in snow.\n(D) He is playing with friends in the snow.",
  4: "(A) The lecture theater is full of students.\n(B) The lecture theater is empty.\n(C) All of the students are outside the lecture theater.\n(D) There is a man giving a lecture.",
  5: "(A) The woman is looking at the computer.\n(B) The woman is eating some fruits.\n(C) The woman has her hair down.\n(D) The woman is typing on the computer.",
  6: "(A) She is holding a vegetable.\n(B) She is looking at some fish.\n(C) She is checking her shopping list.\n(D) She is tasting the vegetables."
};

const officialTranscriptsPart2Test2 = {
  7: "Speaker A: Who's presenting the sales report at the next meeting?\nSpeaker B:\n(A) I think Jason is.\n(B) It's already been sold.\n(C) At the nearest port.",
  8: "Speaker A: Would you prefer an appointment today or tomorrow?\nSpeaker B:\n(A) I arrived yesterday.\n(B) This afternoon is fine.\n(C) The office on the second floor.",
  9: "Speaker A: How can you improve product quality?\nSpeaker B:\n(A) By using better materials.\n(B) I can prove him wrong.\n(C) Production costs.",
  10: "Speaker A: Which road is fastest?\nSpeaker B:\n(A) Why don't I drive?\n(B) Take the highway.\n(C) Slow down.",
  11: "Speaker A: Do you mind if I print a document?\nSpeaker B:\n(A) It's black and white.\n(B) This is not mine.\n(C) No problem. Go ahead.",
  12: "Speaker A: Who's welcoming our guest?\nSpeaker B:\n(A) I think it's April 24.\n(B) Please reserve a room.\n(C) Mary is responsible for that.",
  13: "Speaker A: That piano player was really talented, wasn't he?\nSpeaker B:\n(A) Yes, I was very impressed.\n(B) It was rather expensive.\n(C) I bought the player online.",
  14: "Speaker A: Why is the copy center closed today?\nSpeaker B:\n(A) 300 copies, please.\n(B) In the storage closet.\n(C) It's Sunday.",
  15: "Speaker A: Where can I apply for a job?\nSpeaker B:\n(A) The application fee.\n(B) On our website.\n(C) Mr. Marshall will conduct an interview.",
  16: "Speaker A: I signed up for the leadership workshop.\nSpeaker B:\n(A) At the local community center.\n(B) I've been assigned the role.\n(C) Oh, so did I.",
  17: "Speaker A: The wellness seminar is this afternoon, isn't it?\nSpeaker B:\n(A) Yes, don't be late.\n(B) No, please register online.\n(C) It was quite informative.",
  18: "Speaker A: Where can I find the client's phone number?\nSpeaker B:\n(A) Before 5:00 P.M.\n(B) The secretary should know.\n(C) No, she never called back.",
  19: "Speaker A: The network system isn't functioning.\nSpeaker B:\n(A) New login information.\n(B) For the corporate function.\n(C) It's being repaired.",
  20: "Speaker A: Why are you still advertising this position?\nSpeaker B:\n(A) The new advertising strategy.\n(B) We still haven't hired anyone.\n(C) Every other week.",
  21: "Speaker A: When are membership fees due?\nSpeaker B:\n(A) No, but you can upgrade.\n(B) A bank account number.\n(C) The last week of every month.",
  22: "Speaker A: Are you scheduled for a private consultation?\nSpeaker B:\n(A) No, I forgot to call ahead.\n(B) That was helpful.\n(C) She departed on schedule.",
  23: "Speaker A: Weren't you going to purchase a large-screen television?\nSpeaker B:\n(A) I bought a projector instead.\n(B) How much did it cost?\n(C) Turn down the volume.",
  24: "Speaker A: Do you want to work on this task together?\nSpeaker B:\n(A) I'll walk on the treadmill for half an hour.\n(B) A family get-together.\n(C) Sure. When do you want to start?",
  25: "Speaker A: The manager expects everyone to arrive by 7:00 A.M.\nSpeaker B:\n(A) I'll set the alarm.\n(B) What did you expect?\n(C) Leave it at the front desk.",
  26: "Speaker A: Where do we store past years' sales records?\nSpeaker B:\n(A) I'll inform a store manager.\n(B) Yes, it's an expense report.\n(C) They have all been digitized.",
  27: "Speaker A: Would you be willing to organize the conference?\nSpeaker B:\n(A) The keynote speaker.\n(B) Regarding consumer preferences.\n(C) Well, it depends on when it is.",
  28: "Speaker A: Have you found a new intern, or are you still searching?\nSpeaker B:\n(A) The new intern starts tomorrow.\n(B) The sales department.\n(C) They will found a new company later this year.",
  29: "Speaker A: Can I talk to Mr. Marquez in the finance department, please?\nSpeaker B:\n(A) Yes, I'll transfer you.\n(B) He lives in a studio apartment.\n(C) No, he's a finance expert.",
  30: "Speaker A: Is it possible to have this repaired today?\nSpeaker B:\n(A) Yes, a pair of scissors.\n(B) Won't the event be held tomorrow?\n(C) No, we have to order new parts.",
  31: "Speaker A: Why don't we send the parcel express?\nSpeaker B:\n(A) It still won't arrive in time.\n(B) Throughout the press conference.\n(C) They deliver supplies to your doorstep."
};

function updateTest2Official() {
  console.log('🔄 Updating TOEIC Test 2 with official answers & transcripts...');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let updatedCount = 0;

  data.questions.forEach(q => {
    const qNum = q.id;
    if (officialAnswersTest2[qNum]) {
      if (q.answer !== officialAnswersTest2[qNum]) {
        console.log(`✅ Q#${qNum}: Answer '${q.answer}' -> '${officialAnswersTest2[qNum]}'`);
        q.answer = officialAnswersTest2[qNum];
        updatedCount++;
      }
    }

    if (q.part === 1 && officialTranscriptsPart1Test2[qNum]) {
      q.script = officialTranscriptsPart1Test2[qNum];
    } else if (q.part === 2 && officialTranscriptsPart2Test2[qNum]) {
      q.script = officialTranscriptsPart2Test2[qNum];
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully updated ${updatedCount} answer keys and all scripts in TOEIC Test 2 (${jsonPath})!`);
}

updateTest2Official();
