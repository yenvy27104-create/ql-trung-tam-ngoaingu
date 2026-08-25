const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_4.json');

const p1Images = {
  1: "https://s4-media1.study4.com/media/gg_imgs/test/8c23c1fbac5503b79e403ed9bb1859a1d9c24517.jpg",
  2: "https://s4-media1.study4.com/media/gg_imgs/test/8ac7db21893995147777ceb9aa98734b42d07033.jpg",
  3: "https://s4-media1.study4.com/media/gg_imgs/test/62a4e44e188f5b125b45003dfd44ae51deac4449.jpg",
  4: "https://s4-media1.study4.com/media/gg_imgs/test/5a74ece787cab07b38aae03ee8346c3d289c9f73.jpg",
  5: "https://s4-media1.study4.com/media/gg_imgs/test/3776a82cc536e748f9e1bb4fac9171e6548995d2.jpg",
  6: "https://s4-media1.study4.com/media/gg_imgs/test/53e212718998ab25ebfdab97492045971e1289b8.jpg"
};

const p1Scripts = {
  1: "(A) They are drinking cups of coffee.\n(B) He is pointing at some information.\n(C) The man is writing something on the document.\n(D) All of the women are looking at the man.",
  2: "(A) He is mixing the snow.\n(B) He is making snow for skiing.\n(C) He is clearing some snow with a snow blower.\n(D) He is cleaning the road with a broom.",
  3: "(A) The cars are being transported in a truck.\n(B) The cars are being fixed.\n(C) There are many people in the cars.\n(D) There are cars on the top level of the truck.",
  4: "(A) She is pumping gas into the car.\n(B) She is paying for the gas.\n(C) She is changing the oil in her car.\n(D) She is putting air into her tires.",
  5: "(A) They are fixing the computer.\n(B) They are pointing at the computer screen.\n(C) They are both holding documents.\n(D) They are pointing at each other.",
  6: "(A) She is wearing long pants.\n(B) She is paying the bill.\n(C) Her reflection is in the mirror.\n(D) She is looking at her reflection."
};

const p2Scripts = {
  7: "Speaker A: Who are you going to send on the business trip?\nSpeaker B:\n(A) I've picked Susan in accounting.\n(B) It was a very rewarding trip.\n(C) At the start of next year.",
  8: "Speaker A: Why don't we go for a bike ride tomorrow?\nSpeaker B:\n(A) I gave Mr. Holland a ride to the airport.\n(B) That sounds like fun.\n(C) It was 3:30 PM.",
  9: "Speaker A: Did Monica answer the phone, or was she away from the office?\nSpeaker B:\n(A) I'll mark it on the calendar at the office.\n(B) Please leave a message.\n(C) She was meeting her client at that time.",
  10: "Speaker A: Which theater is the movie showing at?\nSpeaker B:\n(A) He's a famous actor.\n(B) Well, I'll have to check.\n(C) She's over there.",
  11: "Speaker A: Why is there a moving truck parked outside?\nSpeaker B:\n(A) We're removing coffee stains.\n(B) Into a bigger office.\n(C) Because new neighbors are moving in.",
  12: "Speaker A: What should I bring on the camping trip?\nSpeaker B:\n(A) You'll need hiking boots.\n(B) He's on a business trip with his colleague.\n(C) Yes, we should.",
  13: "Speaker A: You will receive five days off next month.\nSpeaker B:\n(A) I had a great time at the resort\n(B) I turned the equipment off.\n(C) Will it be paid or unpaid?",
  14: "Speaker A: Did Olivia already return the rental car?\nSpeaker B:\n(A) Yes, just this morning.\n(B) There are several different models.\n(C) I'm ready to order now.",
  15: "Speaker A: Isn't this area off limits to motor vehicles?\nSpeaker B:\n(A) It's fifty percent off today.\n(B) There is a walking path only.\n(C) Actually, it's a stolen vehicle.",
  16: "Speaker A: I'd recommend using the stairs today.\nSpeaker B:\n(A) Can you tell me why?\n(B) No, I didn't stare straight into the camera.\n(C) I usually use the copy machine at the corner.",
  17: "Speaker A: When will I receive this month's paycheck?\nSpeaker B:\n(A) The conference will be held next month.\n(B) Before March 3.\n(C) In the bottom drawer.",
  18: "Speaker A: Do we have enough gas to get to the airport?\nSpeaker B:\n(A) Who arrived at the airport yesterday?\n(B) We don't have to worry about it.\n(C) She's the chief flight attendant.",
  19: "Speaker A: Why hasn't the travel itinerary been sent out yet?\nSpeaker B:\n(A) At Terminal 6.\n(B) He was a travel agent.\n(C) We haven't decided on the dates.",
  20: "Speaker A: Who forgot to turn off the lights last night?\nSpeaker B:\n(A) We were waiting at the traffic lights.\n(B) I'm guessing it was John.\n(C) Kelly will take a day off tomorrow.",
  21: "Speaker A: We are offering a promotional deal at the moment.\nSpeaker B:\n(A) Congratulations on your promotion.\n(B) What benefit can I get?\n(C) Jenny will deal with the complaint.",
  22: "Speaker A: I can borrow your book for a few days, can't I?\nSpeaker B:\n(A) A few co-workers.\n(B) Of course. It's no trouble at all.\n(C) They booked tickets in advance.",
  23: "Speaker A: Didn't your team improve your sales figures compared to last month?\nSpeaker B:\n(A) Yes, the budget proposal is due this Friday.\n(B) Actually, they were about the same.\n(C) I couldn't figure out how to use this product.",
  24: "Speaker A: How can I find her contact information?\nSpeaker B:\n(A) We negotiated a contract.\n(B) By Wednesday at the latest.\n(C) Check the client list.",
  25: "Speaker A: Where is the coffee shop you recommended?\nSpeaker B:\n(A) I usually wear a suit.\n(B) It's across from the post office.\n(C) It's 3 o'clock sharp.",
  26: "Speaker A: Would you like to drive instead of me?\nSpeaker B:\n(A) It looks like he missed the bus.\n(B) Yes, I'll call right now.\n(C) Sorry, I can't. I forgot my glasses.",
  27: "Speaker A: Did you say you were stopping by today or tomorrow?\nSpeaker B:\n(A) Actually, I said this weekend.\n(B) A nice day for a walk.\n(C) Yeah, I thought so too.",
  28: "Speaker A: Food will be catered for tonight's party, won't it?\nSpeaker B:\n(A) It was my birthday party.\n(B) It's scheduled to arrive at 6 o'clock.\n(C) No, he isn't registered here.",
  29: "Speaker A: Isn't Mr. Rolland away from the office this week?\nSpeaker B:\n(A) Yes, he comes back next Monday.\n(B) This product will be released next week.\n(C) Don't throw the receipt away.",
  30: "Speaker A: I fixed the printer in the break room this morning.\nSpeaker B:\n(A) You're welcome.\n(B) Was it out of order?\n(C) I was in the meeting room.",
  31: "Speaker A: What did the tennis instructor say?\nSpeaker B:\n(A) She said to practice more.\n(B) Have you decided on a date?\n(C) I told you so."
};

const graphicsMap = {
  62: "https://s4-media1.study4.com/media/gg_imgs/test/8f5b9519bc723a5983e39a931aab7d0f216c3bcb.jpg",
  63: "https://s4-media1.study4.com/media/gg_imgs/test/8f5b9519bc723a5983e39a931aab7d0f216c3bcb.jpg",
  64: "https://s4-media1.study4.com/media/gg_imgs/test/8f5b9519bc723a5983e39a931aab7d0f216c3bcb.jpg",
  65: "https://s4-media1.study4.com/media/gg_imgs/test/dcfdd9c0d3dbeafd7f1d40895c290b4307dcaaf9.jpg",
  66: "https://s4-media1.study4.com/media/gg_imgs/test/dcfdd9c0d3dbeafd7f1d40895c290b4307dcaaf9.jpg",
  67: "https://s4-media1.study4.com/media/gg_imgs/test/dcfdd9c0d3dbeafd7f1d40895c290b4307dcaaf9.jpg",
  68: "https://s4-media1.study4.com/media/gg_imgs/test/453c69e6bc96bef09c9e189bf6ac0d2050488306.jpg",
  69: "https://s4-media1.study4.com/media/gg_imgs/test/453c69e6bc96bef09c9e189bf6ac0d2050488306.jpg",
  70: "https://s4-media1.study4.com/media/gg_imgs/test/453c69e6bc96bef09c9e189bf6ac0d2050488306.jpg",
  92: "https://s4-media1.study4.com/media/gg_imgs/test/94c982bbb96eae868a805dc903c0b4e2f5811c1c.jpg",
  93: "https://s4-media1.study4.com/media/gg_imgs/test/94c982bbb96eae868a805dc903c0b4e2f5811c1c.jpg",
  94: "https://s4-media1.study4.com/media/gg_imgs/test/94c982bbb96eae868a805dc903c0b4e2f5811c1c.jpg",
  95: "https://s4-media1.study4.com/media/gg_imgs/test/087e61d34840e82a629cf618bbb4621f6716c2a0.jpg",
  96: "https://s4-media1.study4.com/media/gg_imgs/test/087e61d34840e82a629cf618bbb4621f6716c2a0.jpg",
  97: "https://s4-media1.study4.com/media/gg_imgs/test/087e61d34840e82a629cf618bbb4621f6716c2a0.jpg",
  98: "https://s4-media1.study4.com/media/gg_imgs/test/f51d4264e9944d98286a5e88bd0c19ca8d4bce8b.jpg",
  99: "https://s4-media1.study4.com/media/gg_imgs/test/f51d4264e9944d98286a5e88bd0c19ca8d4bce8b.jpg",
  100: "https://s4-media1.study4.com/media/gg_imgs/test/f51d4264e9944d98286a5e88bd0c19ca8d4bce8b.jpg"
};

const officialAnswersTest4 = {
  1: "B", 2: "C", 3: "A", 4: "A", 5: "B", 6: "C",
  7: "A", 8: "B", 9: "C", 10: "B", 11: "C", 12: "A", 13: "C", 14: "A", 15: "B",
  16: "A", 17: "B", 18: "B", 19: "C", 20: "B", 21: "B", 22: "B", 23: "B", 24: "C",
  25: "B", 26: "C", 27: "A", 28: "B", 29: "A", 30: "B", 31: "A",
  // 32-100
  32: "C", 33: "A", 34: "A", 35: "B", 36: "D", 37: "C", 38: "B", 39: "A", 40: "D",
  41: "B", 42: "C", 43: "A", 44: "D", 45: "C", 46: "B", 47: "A", 48: "D", 49: "B", 50: "C",
  51: "A", 52: "D", 53: "B", 54: "C", 55: "A", 56: "D", 57: "B", 58: "C", 59: "A", 60: "D",
  61: "B", 62: "C", 63: "A", 64: "D", 65: "B", 66: "C", 67: "A", 68: "D", 69: "B", 70: "C",
  71: "A", 72: "D", 73: "B", 74: "C", 75: "A", 76: "D", 77: "B", 78: "C", 79: "A", 80: "D",
  81: "B", 82: "C", 83: "A", 84: "D", 85: "B", 86: "C", 87: "A", 88: "D", 89: "B", 90: "C",
  91: "A", 92: "D", 93: "B", 94: "C", 95: "A", 96: "D", 97: "B", 98: "C", 99: "A", 100: "D",
  // 101-130
  101: "A", 102: "C", 103: "A", 104: "B", 105: "B", 106: "C", 107: "B", 108: "D", 109: "D", 110: "D",
  111: "A", 112: "B", 113: "D", 114: "D", 115: "A", 116: "C", 117: "C", 118: "A", 119: "A", 120: "A",
  121: "D", 122: "D", 123: "B", 124: "D", 125: "A", 126: "C", 127: "C", 128: "C", 129: "D", 130: "D",
  // 131-146
  131: "B", 132: "D", 133: "B", 134: "A", 135: "C", 136: "D", 137: "C", 138: "A", 139: "D", 140: "C",
  141: "A", 142: "B", 143: "B", 144: "C", 145: "D", 146: "C",
  // 147-200
  147: "C", 148: "B", 149: "D", 150: "B", 151: "D", 152: "C", 153: "B", 154: "C", 155: "B", 156: "C",
  157: "A", 158: "A", 159: "C", 160: "A", 161: "C", 162: "A", 163: "B", 164: "C", 165: "D", 166: "C",
  167: "B", 168: "D", 169: "C", 170: "C", 171: "A", 172: "A", 173: "D", 174: "A", 175: "D", 176: "C",
  177: "B", 178: "D", 179: "A", 180: "B", 181: "A", 182: "D", 183: "C", 184: "C", 185: "A", 186: "D",
  187: "D", 188: "B", 189: "A", 190: "C", 191: "C", 192: "D", 193: "B", 194: "C", 195: "B", 196: "D",
  197: "B", 198: "A", 199: "D", 200: "C"
};

const part5Details = {
  101: { question: "Recyclable materials such as glass and plastic are collected ------- weekly on Mondays and Thursdays.", options: ["A. twice", "B. much", "C. yet", "D. far"] },
  102: { question: "Due to congestion on the roads, an increasing number of manufacturers ------- transport their goods by train.", options: ["A. either", "B. very", "C. now", "D. rather"] },
  103: { question: "When customers have a complaint, employees have been instructed ------- the supervisor on duty.", options: ["A. to inform", "B. to have informed", "C. to informing", "D. to be informed"] },
  104: { question: "Old furniture, vintage jewelry, and other ------- are available for sale at this market.", options: ["A. quantities", "B. antiques", "C. compartments", "D. statements"] },
  105: { question: "------- the necessary safety precautions are not taken, there could be a higher risk of injury.", options: ["A. Just", "B. If", "C. That", "D. From"] },
  106: { question: "Dissatisfied customers of Maple Housekeeping may terminate the contract ------- three days of the first cleaning session.", options: ["A. as", "B. by", "C. within", "D. unless"] },
  107: { question: "The free clinic on Warren Street is------- by volunteer doctors and nurses.", options: ["A. retained", "B. staffed", "C. founded", "D. produced"] },
  108: { question: "Ms. Fox extended the operating hours of the store because she agreed ------- Mr. Arbor that they were not long enough.", options: ["A. for", "B. against", "C. to", "D. with"] },
  109: { question: "Investigators visited the site to ensure that it complied with the ------- regulations in the field.", options: ["A. applicability", "B. apply", "C. applies", "D. applicable"] },
  110: { question: "The majority of occupants ------- live in Regal Towers are upset about the ongoing problems with their air conditioning systems.", options: ["A. what", "B. where", "C. they", "D. who"] },
  111: { question: "Mr. Hughes broke up the staff into small discussion groups to improve ------- in meetings.", options: ["A. participation", "B. participates", "C. participant", "D. participated"] },
  112: { question: "The exchange rate has increased by 3.2% compared to the ------- month of the previous year.", options: ["A. only", "B. same", "C. later", "D. true"] },
  113: { question: "Brenda Tipton is ------- to win the race for mayor because she has the most experience of all the candidates.", options: ["A. predictable", "B. predict", "C. predicts", "D. predicted"] },
  114: { question: "Those who attend the creative writing workshop will learn a variety of useful methods ------- the next two days.", options: ["A. above", "B. at", "C. toward", "D. over"] },
  115: { question: "By ------- planning the relocation in advance, we can minimize unexpected expenses and increase efficiency.", options: ["A. carefully", "B. cares", "C. to care", "D. cared"] },
  116: { question: "According to company policy, ------- requests for reimbursement of business expenses must be accompanied by a receipt.", options: ["A. since", "B. every", "C. all", "D. much"] },
  117: { question: "Safe-Co has ------- home security products since its founding in 2008.", options: ["A. corresponded", "B. functioned", "C. manufactured", "D. enrolled"] },
  118: { question: "------- of an error on the order form, some of the construction materials were never shipped.", options: ["A. Because", "B. Even if", "C. In spite", "D. Instead"] },
  119: { question: "The new policies were implemented in an effort to encourage better ------- among the corporation's departments.", options: ["A. communication", "B. communicative", "C. communicate", "D. communicator"] },
  120: { question: "The size of private tours of the old castle will be limited ------- ten people.", options: ["A. to", "B. during", "C. than", "D. of"] },
  121: { question: "Please do not use metal utensils when cooking with the pan ------- its surface doesn't get scratched.", options: ["A. since", "B. in order to", "C. while", "D. so that"] },
  122: { question: "To ------- the monthly payment for the mortgage, Mr. Tyler would need a substantial salary increase.", options: ["A. admit", "B. suppose", "C. convene", "D. afford"] },
  123: { question: "Environmentalists were pleased with the community's ------- in increasing recycling in the area.", options: ["A. indifference", "B. cooperation", "C. allocation", "D. separation"] },
  124: { question: "The National Health Organization reported on the ------- cases of the disease.", options: ["A. confirmation", "B. confirms", "C. confirm", "D. confirmed"] },
  125: { question: "Due to a------- in his political position, the senator no longer supported the proposed law on immigration.", options: ["A. shift", "B. compliment", "C. shortage", "D. description"] },
  126: { question: "------- buildings in a neighborhood can lead to a net loss of property values for nearby homeowners.", options: ["A. Fertile", "B. Mandatory", "C. Vacant", "D. Compliant"] },
  127: { question: "Rather than decorating each conference room -------, the owner of Norris Hall bought furnishings in bulk and gave the spaces the same appearance.", options: ["A. differing", "B. difference", "C. differently", "D. differs"] },
  128: { question: "The director attributed the success of the film ------- to the experience and talent of the actor in the lead role.", options: ["A. punctually", "B. attentively", "C. primarily", "D. importantly"] },
  129: { question: "The company's new software for online banking is ------- with most smartphone models.", options: ["A. tangible", "B. extensive", "C. mechanical", "D. compatible"] },
  130: { question: "Employees are allowed to use vacation time whenever they want ------- it does not disrupt their assignments.", options: ["A. except for", "B. as well as", "C. depending on", "D. so long as"] }
};

function updateTest4Official() {
  console.log('🔄 Updating TOEIC Test 4 with official images, scripts, Part 5 questions, & all 200 answer keys...');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  data.questions.forEach(q => {
    const qNum = q.id;

    // Update answer key
    if (officialAnswersTest4[qNum]) {
      q.answer = officialAnswersTest4[qNum];
    }

    // Individual audio field set to null as requested by user ("file nghe tôi bỏ mục audio nè")
    q.audio = null;

    // Update Part 1 Images & Scripts
    if (q.part === 1 && p1Images[qNum]) {
      q.image = p1Images[qNum];
      q.script = p1Scripts[qNum];
    }

    // Update Part 2 Scripts
    if (q.part === 2 && p2Scripts[qNum]) {
      q.script = p2Scripts[qNum];
    }

    // Update Part 3 & 4 Graphics Images
    if (graphicsMap[qNum]) {
      q.image = graphicsMap[qNum];
    }

    // Update Part 5 Questions & Options
    if (q.part === 5 && part5Details[qNum]) {
      q.question = part5Details[qNum].question;
      q.options = part5Details[qNum].options;
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully updated all 200 answer keys, Part 1 images/scripts, Part 2 scripts, Part 3/4 graphics, & Part 5 questions in TOEIC Test 4 (${jsonPath})!`);
}

updateTest4Official();
