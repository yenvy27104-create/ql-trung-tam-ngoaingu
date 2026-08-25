const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_5.json');

// Part 1 Image URLs
const p1Images = {
  1: "https://s4-media1.study4.com/media/gg_imgs/test/db53a8ecd4c544c7df0503cd26663c67eeb6d141.jpg",
  2: "https://s4-media1.study4.com/media/gg_imgs/test/860e10cc27754e70466674e9294d7b205481a978.jpg",
  3: "https://s4-media1.study4.com/media/gg_imgs/test/cefabdbd570ade54f235fbab8cc1eae92939bce0.jpg",
  4: "https://s4-media1.study4.com/media/gg_imgs/test/e328c2bf092f3e8918de056442a6efbdbd7cff65.jpg",
  5: "https://s4-media1.study4.com/media/gg_imgs/test/dba9ef785eee4f6c2bb6b27719836af3f11cc7fe.jpg",
  6: "https://s4-media1.study4.com/media/gg_imgs/test/a2c41beff97972bc67fd04247be59dd784240943.jpg"
};

// Part 3 & 4 Graphic Images
const graphicImages = {
  62: "https://s4-media1.study4.com/media/gg_imgs/test/61ea7f953a784d3dd3978979375e1e23074d8d01.jpg",
  63: "https://s4-media1.study4.com/media/gg_imgs/test/61ea7f953a784d3dd3978979375e1e23074d8d01.jpg",
  64: "https://s4-media1.study4.com/media/gg_imgs/test/61ea7f953a784d3dd3978979375e1e23074d8d01.jpg",
  65: "https://s4-media1.study4.com/media/gg_imgs/test/6fac18792019e74853e94ede75048aefa1f87d7b.jpg",
  66: "https://s4-media1.study4.com/media/gg_imgs/test/6fac18792019e74853e94ede75048aefa1f87d7b.jpg",
  67: "https://s4-media1.study4.com/media/gg_imgs/test/6fac18792019e74853e94ede75048aefa1f87d7b.jpg",
  68: "https://s4-media1.study4.com/media/gg_imgs/test/6cd4bda4d66d20e14e1b8f4dfccf3b58514b8f53.jpg",
  69: "https://s4-media1.study4.com/media/gg_imgs/test/6cd4bda4d66d20e14e1b8f4dfccf3b58514b8f53.jpg",
  70: "https://s4-media1.study4.com/media/gg_imgs/test/6cd4bda4d66d20e14e1b8f4dfccf3b58514b8f53.jpg",
  92: "https://s4-media1.study4.com/media/gg_imgs/test/80ef6c130f8fa34b88387a13b5365053f0844052.jpg",
  93: "https://s4-media1.study4.com/media/gg_imgs/test/80ef6c130f8fa34b88387a13b5365053f0844052.jpg",
  94: "https://s4-media1.study4.com/media/gg_imgs/test/80ef6c130f8fa34b88387a13b5365053f0844052.jpg",
  95: "https://s4-media1.study4.com/media/gg_imgs/test/877cb4de17cf1602e9a07e3680964deb897d6d92.jpg",
  96: "https://s4-media1.study4.com/media/gg_imgs/test/877cb4de17cf1602e9a07e3680964deb897d6d92.jpg",
  97: "https://s4-media1.study4.com/media/gg_imgs/test/877cb4de17cf1602e9a07e3680964deb897d6d92.jpg",
  98: "https://s4-media1.study4.com/media/gg_imgs/test/ba8bceae18d50478f6a7286b18ed6fcea887c468.jpg",
  99: "https://s4-media1.study4.com/media/gg_imgs/test/ba8bceae18d50478f6a7286b18ed6fcea887c468.jpg",
  100: "https://s4-media1.study4.com/media/gg_imgs/test/ba8bceae18d50478f6a7286b18ed6fcea887c468.jpg"
};

const qData = {
  32: { question: "Who is the man?", options: ["A. A hotel guest", "B. A janitor", "C. A night manager", "D. A receptionist"], answer: "D" },
  33: { question: "Why is Mr. Carter unavailable?", options: ["A. He is meeting a client.", "B. He is on vacation.", "C. He has not arrived at work yet.", "D. He is giving a presentation."], answer: "B" },
  34: { question: "What will the man do next?", options: ["A. Watch training videos", "B. Conduct an interview", "C. Contact Mr. Carter", "D. Fill out paperwork"], answer: "D" },
  35: { question: "What are the speakers discussing?", options: ["A. Preparations for a meeting", "B. A keynote speech", "C. A seminar agenda", "D. Meeting locations"], answer: "A" },
  36: { question: "What does the man say that he is relieved about?", options: ["A. A product is selling well.", "B. A trip was not delayed.", "C. A new employee was hired.", "D. A meeting room is available."], answer: "D" },
  37: { question: "What does the woman offer to do?", options: ["A. Act as an interpreter during a meeting", "B. Inform the man ahead of time", "C. Call Mr. Takahashi's secretary", "D. Listen to a weather report"], answer: "B" },
  38: { question: "What does the woman ask the man about?", options: ["A. The status of a project", "B. The location of a store", "C. The list of clients", "D. The cause of a problem"], answer: "A" },
  39: { question: "Why was the man unable to complete his work?", options: ["A. He didn't have enough time.", "B. His car wouldn't start.", "C. He was busy with other projects.", "D. His computer malfunctioned."], answer: "D" },
  40: { question: "What is the woman planning to do?", options: ["A. Terminate a contract", "B. Ask for a deadline extension", "C. Meet with a company executive", "D. Hire a new designer"], answer: "B" },
  41: { question: "What problem does the man report?", options: ["A. Internet access has been disconnected.", "B. A delivery has not arrived yet.", "C. A power outage occurred.", "D. Some equipment has malfunctioned."], answer: "A" },
  42: { question: "Where most likely does the woman work?", options: ["A. At an electronics store", "B. At a power company", "C. At a toy factory", "D. At a communications provider"], answer: "D" },
  43: { question: "What does the woman suggest the man do?", options: ["A. Take shelter elsewhere", "B. Report the incident to the police", "C. Restart his computer", "D. Arrive ahead of schedule"], answer: "C" },
  44: { question: "Where does the man work?", options: ["A. At an immigration office", "B. At a public school", "C. At a post office", "D. At a travel agency"], answer: "D" },
  45: { question: "Why is the woman in a hurry?", options: ["A. She is late to work.", "B. She forgot an important event.", "C. She must meet a deadline.", "D. She has another appointment."], answer: "D" },
  46: { question: "What does the man recommend?", options: ["A. Making a phone call", "B. Visiting a different business", "C. Sending an e-mail", "D. Canceling a subscription"], answer: "B" },
  47: { question: "What type of business does the man work for?", options: ["A. An auto repair shop", "B. An insurance company", "C. An automobile dealership", "D. A construction contractor"], answer: "C" },
  48: { question: "What does the woman say is her top priority when she makes a purchase?", options: ["A. Affordability", "B. Popularity", "C. Design", "D. Safety"], answer: "A" },
  49: { question: "What does the man suggest doing?", options: ["A. Replacing a broken part", "B. Evaluating a different model", "C. Visiting a new branch", "D. Paying a deposit"], answer: "B" },
  50: { question: "What are the speakers mainly discussing?", options: ["A. High sales figures", "B. A staff conflict", "C. Low sales figures", "D. New training manual"], answer: "C" },
  51: { question: "What does the woman mean when she says I'm actually on my way to a meeting?", options: ["A. She doesn't have a lot of time to talk.", "B. She can stay and chat for a long time.", "C. She is asking the man out to lunch.", "D. She will send him an e-mail later on."], answer: "A" },
  52: { question: "What possible solution does the man suggest?", options: ["A. To employ more staff members", "B. That the woman should be fired", "C. They should have lunch together", "D. The woman might have to fire someone"], answer: "D" },
  53: { question: "What is the problem?", options: ["A. The person who was supposed to give the speech is sick.", "B. The person who was giving the speech said they don't want to.", "C. There is no keynote speech anymore.", "D. The keynote speech is cancelled."], answer: "A" },
  54: { question: "What does the woman ask the man?", options: ["A. She asks him to find someone to do the speech.", "B. She says she will deliver the speech.", "C. She asks him to deliver the keynote speech.", "D. She says the board is not happy."], answer: "C" },
  55: { question: "What does the man imply when he says \"Thanks, but I'll have to pass on it\"?", options: ["A. He will deliver the speech.", "B. He doesn't want to deliver the speech.", "C. He will talk to the board of directors.", "D. He needs some more information."], answer: "B" },
  56: { question: "Why is the man calling Tristar Logistics?", options: ["A. To reschedule a delivery", "B. To cancel his order", "C. To change his address", "D. To update his details"], answer: "A" },
  57: { question: "What does he imply when he says That won't work for me?", options: ["A. It contains important documents.", "B. He will pay with a money order.", "C. He doesn't want them to leave it with someone at the office.", "D. He wants it left at the office."], answer: "C" },
  58: { question: "What does the woman say she wants?", options: ["A. The office address", "B. His cell phone number", "C. The order number", "D. His building number"], answer: "C" },
  59: { question: "What are the speakers mainly discussing?", options: ["A. The delivery of some furniture", "B. The signing of a rental contract", "C. The drafting of a document", "D. The delivery of computer equipment"], answer: "D" },
  60: { question: "What problem do the speakers have?", options: ["A. They don't need the equipment.", "B. They will miss some important deadlines.", "C. They need to train their new staff.", "D. They haven't found the documents."], answer: "B" },
  61: { question: "What does the woman suggest they do?", options: ["A. Accept the late order", "B. Cancel the order", "C. Call another supplier", "D. Rent some equipment"], answer: "D" },
  62: { question: "Who most likely are the speakers?", options: ["A. Store clerks", "B. Artists", "C. Painters", "D. Electricians"], answer: "C" },
  63: { question: "Look at the graphic. Where is the man currently working?", options: ["A. Swanson and Sons", "B. Harlington Accounting", "C. Jersey Construction", "D. Grounds LTD."], answer: "B" },
  64: { question: "What does the woman recommend to the man?", options: ["A. To bring more paint", "B. To bring one ladder", "C. To bring at least three ladders", "D. To paint the roof first"], answer: "C" },
  65: { question: "What does the woman say she will do tomorrow?", options: ["A. Go out for a dinner", "B. Visit her family", "C. Host an award show", "D. Attend an award ceremony"], answer: "D" },
  66: { question: "Look at the graphic. What is the gown made of?", options: ["A. Cotton", "B. Wool", "C. Denim", "D. Cypress"], answer: "A" },
  67: { question: "What does the woman say she will do?", options: ["A. Pick it up at 9 PM", "B. Send her husband to pick it up", "C. Send her intern to pick it up", "D. Cancel the order"], answer: "C" },
  68: { question: "According to the woman, what is causing people to arrive late to work?", options: ["A. An electrical storm", "B. A parking lot is closed", "C. A protest", "D. Some new traffic rules"], answer: "B" },
  69: { question: "Look at the graphic. Where is the sign most likely located?", options: ["A. On Swinton Road", "B. The Cranson Lot", "C. Menzies Street", "D. Prunkel Street"], answer: "A" },
  70: { question: "What does the man suggest they do?", options: ["A. Go home", "B. Buy some parking tickets", "C. Have an early dinner", "D. Walk to work"], answer: "D" },
  71: { question: "Where does the announcement most likely take place?", options: ["A. On a train", "B. On a bus", "C. On a plane", "D. On a ship"], answer: "C" },
  72: { question: "What is the speaker waiting for?", options: ["A. An itinerary", "B. Authorization to depart", "C. Some passengers to board", "D. A parking permit"], answer: "B" },
  73: { question: "What does the speaker suggest listeners do?", options: ["A. Have their tickets reissued", "B. Transfer to another line", "C. Stay near a departure gate", "D. Modify their plans"], answer: "D" },
  74: { question: "What type of business does the speaker work for?", options: ["A. An electronics store", "B. A furniture outlet", "C. A clothing store", "D. A theater company"], answer: "C" },
  75: { question: "What improvement is mentioned?", options: ["A. Product selection will be increased.", "B. More staff will be able to help.", "C. Free parking will be offered.", "D. Store hours will be extended."], answer: "D" },
  76: { question: "When can customers receive a discount?", options: ["A. On Tuesday", "B. On Wednesday", "C. On Thursday", "D. On Friday"], answer: "A" },
  77: { question: "What is being advertised?", options: ["A. A security system", "B. A rented house", "C. A gardening tool", "D. An insulating product"], answer: "D" },
  78: { question: "What is mentioned about the product?", options: ["A. It is domestically produced.", "B. It reduces the cost of living.", "C. It won several awards.", "D. It received positive reviews."], answer: "B" },
  79: { question: "What must listeners do to receive a discount?", options: ["A. Buy a certain amount of products", "B. Apply for a membership card", "C. Talk about the advertisement", "D. Make a payment in cash"], answer: "B" },
  80: { question: "What event is ending?", options: ["A. A grand opening", "B. A consumer electronics expo", "C. A product demonstration", "D. A museum tour"], answer: "B" },
  81: { question: "What is required of volunteers?", options: ["A. Relevant experience", "B. A degree in engineering", "C. Availability to work on weekends", "D. Fluency in two languages"], answer: "D" },
  82: { question: "What are potential volunteers cautioned about?", options: ["A. Missing a deadline", "B. Leaking confidential information", "C. Damaging a device", "D. Interrupting a presenter"], answer: "A" },
  83: { question: "What is the company recruiting?", options: ["A. Programmer", "B. Chef", "C. Interns", "D. Factory workers"], answer: "C" },
  84: { question: "What does the man imply when he says, \"Have you seen the interview questions we use?\"", options: ["A. He is postponing an appointment.", "B. He needs a record of the report.", "C. He wants her to help him with the questions.", "D. He will recruit some accountants."], answer: "C" },
  85: { question: "Why does the man want to meet with the woman?", options: ["A. To get some assistance from her", "B. To ask her for some records", "C. To get a new letter head", "D. To plan an orientation"], answer: "A" },
  86: { question: "What is the purpose of the announcement?", options: ["A. To announce winning firm of the year", "B. To announce a rise in sales", "C. To announce a new team member", "D. To complete a project"], answer: "C" },
  87: { question: "What does the woman imply when she says \"So let's keep moving up!\"?", options: ["A. They need to continue working hard.", "B. They are moving buildings.", "C. She is renovating the office.", "D. They are going on a business trip."], answer: "A" },
  88: { question: "What does the woman ask the staff to do?", options: ["A. Study the new hand book", "B. Prepare a report", "C. Study the material on corporate law", "D. Write a memo"], answer: "A" },
  89: { question: "Why is the woman calling?", options: ["A. To say thank you", "B. To ask a favor", "C. To discuss travel plans", "D. To request a form"], answer: "A" },
  90: { question: "What does the woman imply when she says, \"you have to show me the design sometime!\"?", options: ["A. She wants to learn how to make it.", "B. She wasn't sure about the details.", "C. She needs a dentist recommendation.", "D. She is writing a design manual."], answer: "A" },
  91: { question: "What will the women do next week?", options: ["A. Plan for the Grayson wedding", "B. Plan for the Christmas party", "C. Design a new invitation", "D. Meet for coffee"], answer: "D" },
  92: { question: "What is indicated about Springdale Music Club?", options: ["A. They love all music equally.", "B. They take pride in location.", "C. They specialize in country music.", "D. They have never carried world music before."], answer: "C" },
  93: { question: "Look at the graphic. What can you infer about the bands?", options: ["A. They will be great.", "B. They are jazz musicians.", "C. The acts following Djubai Djinn play rock and roll.", "D. It will be loud."], answer: "C" },
  94: { question: "Why does Springdale Music Club ask you to bring your money?", options: ["A. The concert will be expensive.", "B. There is a bar.", "C. To help support Djubai Djinn's US tour", "D. To pay for your meats"], answer: "B" },
  95: { question: "Who most likely are the listeners?", options: ["A. Residents", "B. Tourists", "C. Park employees", "D. Forest rangers"], answer: "B" },
  96: { question: "Look at the map. What place are the listeners unable to go to?", options: ["A. Lake Kitano", "B. Eastgate", "C. Kilmore Cliff", "D. Paradise Garden"], answer: "C" },
  97: { question: "What does the woman mention about Kilmore Cliff?", options: ["A. It is dangerous.", "B. The views are spectacular.", "C. People who fear heights may not enjoy it.", "D. It is 50 meters from the final destination."], answer: "A" },
  98: { question: "Look at the graphic. Which department filled out the order form?", options: ["A. Finance", "B. IT", "C. Public Relations", "D. Human Resources"], answer: "D" },
  99: { question: "What does the speaker anticipate may happen?", options: ["A. Some departments may go over budget.", "B. The warehouse may not have enough supplies.", "C. The orders may not arrive on time.", "D. The departments may forget some items."], answer: "C" },
  100: { question: "What does the speaker request of Lima?", options: ["A. To fax over the orders", "B. To file the papers", "C. To arrange a meeting", "D. To contact him"], answer: "D" },
  101: { question: "Our spokesperson will explain an ------- opportunity for property investors.", options: ["A. excitedly", "B. excitement", "C. excited", "D. exciting"], answer: "D" },
  102: { question: "Some of the leather used in this handbag must ------- from Italy.", options: ["A. will import", "B. be imported", "C. to import", "D. have imported"], answer: "B" },
  103: { question: "Rockwell Bank's automated teller machines are ------- located in various sections of the city.", options: ["A. abruptly", "B. conveniently", "C. fluently", "D. periodically"], answer: "B" },
  104: { question: "As soon as both sides reach ------- terms, the licensing contract will be signed.", options: ["A. agreeable", "B. agree", "C. agreement", "D. agreed"], answer: "A" },
  105: { question: "Anyone who cannot ------- one of the safety training workshops before September 1 should inform a manager.", options: ["A. impress", "B. employ", "C. attend", "D. reply"], answer: "C" },
  106: { question: "------- for using the hotel's spa and dining services have appeared on the final invoice.", options: ["A. Charge", "B. Charges", "C. Charging", "D. Charged"], answer: "B" },
  107: { question: "Members of the security team have been instructed to report ------- unattended bag to the local police department.", options: ["A. any", "B. much", "C. most", "D. all"], answer: "A" },
  108: { question: "The head chef has the restaurant manager ------- the order for the ingredients every evening.", options: ["A. authoritative", "B. authority", "C. authorities", "D. authorize"], answer: "D" },
  109: { question: "The automotive company------- pursued technologies that would improve the efficiency of its engines.", options: ["A. aggressive", "B. aggressiveness", "C. aggressively", "D. aggression"], answer: "C" },
  110: { question: "On the first day of the painting course, students should provide the teacher with proof of -------.", options: ["A. registration", "B. proposal", "C. accumulation", "D. copyright"], answer: "A" },
  111: { question: "The furniture in this apartment is not ------- but belongs to the landlord and must be returned at the end of the lease.", options: ["A. ours", "B. we", "C. our", "D. us"], answer: "A" },
  112: { question: "The driver------- Mr. Dwight is expected to arrive at the conference venue 20 minutes prior to the ending time.", options: ["A. unti", "B. in", "C. for", "D. among"], answer: "C" },
  113: { question: "Three of the new chemists, who ------- developed the material, will be recognized by the CEO at Saturday's ceremony.", options: ["A. collaborating", "B. collaborate", "C. collaboratively", "D. collaborative"], answer: "C" },
  114: { question: "The goal of the program is to make health services readily available to those in both rural and urban -------.", options: ["A. purposes", "B. settings", "C. monuments", "D. standards"], answer: "B" },
  115: { question: "Please send a check in the amount of £550 ------- the document that needs to be checked by our agency.", options: ["A. despite", "B. while", "C. with", "D. through"], answer: "C" },
  116: { question: "Using a fingerprint system is generally ------- as the primary means of security at laboratories in this country.", options: ["A. to accept", "B. accept", "C. accepting", "D. accepted"], answer: "D" },
  117: { question: "Living further from the city center will ------- your rental costs, but it affects your commute .", options: ["A. shorten", "B. misplace", "C. lower", "D. collapse"], answer: "C" },
  118: { question: "FryMate brand cookware can be purchased directly from the company's Web site or at a retailer------- you.", options: ["A. against", "B. to", "C. along", "D. near"], answer: "D" },
  119: { question: "Weekly ------- of the facility help to ensure that minor maintenance issues are discovered and resolved early.", options: ["A. investigations", "B. investigated", "C. investigative", "D. investigates"], answer: "A" },
  120: { question: "Patients should call the emergency line immediately if they experience ------- changes in temperature.", options: ["A. sudden", "B. contemporary", "C. ideal", "D. reasonable"], answer: "A" },
  121: { question: "Participants who are taking part in the half- day historical tour should be at the meeting point------- than 7:45 A.M .", options: ["A. as for", "B. particularly", "C. whenever", "D. no later"], answer: "D" },
  122: { question: "The supervisor allowed Mr. Martin to take three additional vacation days because of his ------- achievement.", options: ["A. no later", "B. noteworthy", "C. identical", "D. satisfied"], answer: "B" },
  123: { question: "Ms. Stevens ------- acknowledged that she was unable to complete the task in the specified time frame.", options: ["A. regretfully", "B. regret", "C. regrets", "D. regretful"], answer: "A" },
  124: { question: "The customer's steak was ------- undercooked, so he requested that it be sent back to the kitchen.", options: ["A. rather", "B. such", "C. many", "D. rarely"], answer: "A" },
  125: { question: "The contact details provided on this survey are for in-house purposes and will not be ------- to a third party.", options: ["A. suspended", "B. responded", "C. equipped", "D. released"], answer: "D" },
  126: { question: "Mr. Brannon can assemble the shelves for the booth ------- as long as he has a set of tools.", options: ["A. his", "B. himself", "C. him", "D. his own"], answer: "B" },
  127: { question: "Ms. Stevenson contacted the real estate agent ------- name and phone number appeared on the advertisement.", options: ["A. what", "B. which", "C. whose", "D. who"], answer: "C" },
  128: { question: "The home's sale becomes------- when the official document is recorded at the county office.", options: ["A. finally", "B. finalize", "C. finals", "D. final"], answer: "D" },
  129: { question: "The main activity performed at the workshop required team members to ------- with each other.", options: ["A. cooperate", "B. oversee", "C. shrink", "D. encounter"], answer: "A" },
  130: { question: "According to the physician, Ms. Oliver's pain ------- within two hours of taking the medication.", options: ["A. alleviated", "B. will be alleviated", "C. is alleviating", "D. should alleviate"], answer: "D" },

  // Part 6 (131-146)
  131: { question: "If you want (131) your packaged goods to an international audience...", options: ["A. promotion", "B. promoting", "C. to promote", "D. have promoted"], answer: "C" },
  132: { question: "With over 200 booths (132) by companies from all over the world...", options: ["A. represented", "B. expressed", "C. delivered", "D. revealed"], answer: "A" },
  133: { question: "...ranging (133) desserts and snacks to canned meats...", options: ["A. to", "B. for", "C. from", "D. with"], answer: "C" },
  134: { question: "(134). Spots are limited and going fast.", options: ["A. Ice creams will not be allowed on the premises.", "B. You can sample items as you browse.", "C. You'll have a chance to promote you r food of choice.", "D. Apply for a booth now before they're all taken ."], answer: "D" },
  135: { question: "This weekend the renovations to our second floor offices (135) .", options: ["A. has began", "B. will begin", "C. beginning", "D. begun"], answer: "B" },
  136: { question: "(136), all cabinets and drawers should be locked.", options: ["A. Furthermore", "B. As a consequence", "C. Because", "D. Therefore"], answer: "A" },
  137: { question: "The renovations will take approximately 5 days. (137).", options: ["A. If it takes longer, we will notify you.", "B. All business will be suspended until the renovations end.", "C. During this time, your temporary workspace will be the first floor conference room.", "D. Your office space will look new and improved after the renovations."], answer: "C" },
  138: { question: "We apologize for the inconvenience but we ask for your (138).", options: ["A. service", "B. association", "C. connection", "D. cooperation"], answer: "D" },
  139: { question: "The ideal candidate would have at least three years of experience (139) with complex business transactions.", options: ["A. working", "B. work", "C. to work", "D. worked"], answer: "A" },
  140: { question: "(140). The types of contract work that we...", options: ["A. Government experience would also be a plus.", "B. Working with children would help your resume.", "C. Experience with animals is essential.", "D. Working with disabled people is a bonus."], answer: "A" },
  141: { question: "The types of contract work that we (141) at Johnson, Johnson, and Kindness deal exclusively...", options: ["A. perform", "B. achieve", "C. allow", "D. transform"], answer: "A" },
  142: { question: "If (142) feel that you would be qualified to join our team...", options: ["A. you", "B. I", "C. us", "D. they"], answer: "A" },
  143: { question: "I am (143) in response to the advertisement you placed...", options: ["A. message", "B. to write", "C. writing", "D. looking"], answer: "C" },
  144: { question: "I have five years (144) working in a fast paced corporate environment.", options: ["A. experience", "B. knowledge", "C. working", "D. knowing"], answer: "A" },
  145: { question: "...and many of them are Spanish speaking.(145)", options: ["A. I am a certified level 5 speaker of Spanish", "B. Spanish people can be hard to work with", "C. I don't know any Spanish, but I could study", "D. Spanish speakers are good workers"], answer: "A" },
  146: { question: "I have attached my resume and would be happy (146) provide excellent references...", options: ["A. in", "B. to", "C. for", "D. will"], answer: "B" },

  // Part 7 (147-195)
  147: { question: "Where would the information most likely appear?", options: ["A. In an instruction manual", "B. On a product receipt", "C. In a promotional flyer", "D. In a telephone directory"], answer: "C" },
  148: { question: "What is mentioned as a convenient feature of the product?", options: ["A. Its simple set-up procedure", "B. Its long warranty period", "C. Its compatibility with other devices", "D. Its detailed instructions"], answer: "A" },
  149: { question: "What is suggested about Mr. Hewitt?", options: ["A. He is late for a lunch appointment.", "B. He has accepted a new position.", "C. He is in a taxi .", "D. He is on his way to a presentation."], answer: "C" },
  150: { question: "At 12:14, what does Mr. Hewitt mean when he writes, \"Exactly\"?", options: ["A. He would like to know where they're having lunch.", "B. He is looking forward to meeting Anderson & Wright.", "C. He is on his way back to the office.", "D. That he would also like Anderson & Wright to join the project."], answer: "D" },
  151: { question: "How would Mr. Tepper's latest book most likely be classified?", options: ["A. Romance", "B. Historical fiction", "C. Fantasy", "D. Poetry"], answer: "C" },
  152: { question: "Where are copies available this week?", options: ["A. At all major bookstores", "B. On a Web site", "C. At a literary event", "D. In select public libraries"], answer: "C" },
  153: { question: "What is the purpose of the e-mail?", options: ["A. To offer a discounted subscription rate", "B. To advertise a new online shopping mall", "C. To introduce a digital publication", "D. To remind some subscribers to renew their subscription"], answer: "C" },
  154: { question: "What can subscribers find in a paper edition in July?", options: ["A. A discount coupon", "B. A special supplement", "C. An exclusive interview", "D. An access code"], answer: "D" },
  155: { question: "What is the purpose of the article?", options: ["A. To report changes in public transportation", "B. To describe the city during the holidays", "C. To inform the public about traffic delays", "D. To advertise new shopping centers"], answer: "A" },
  156: { question: "What is suggested about Mr. Reiner?", options: ["A. He is happy with the mayor.", "B. He may stage a protest.", "C. He seems satisfied with the working conditions.", "D. He would like some time off for the holidays ."], answer: "C" },
  157: { question: "What is stated about the city during the holiday season?", options: ["A. It closes down for the holidays.", "B. Many visitors come from out of town.", "C. More taxi drivers lose their business.", "D. The citizens travel to other cities."], answer: "B" },
  158: { question: "In which of the positions marked [1], [2], [3] and [4] does the following sentence belong? \"Overall, the city seems prepared for the influx of tourists and holiday shoppers as Christmas draws near.\"", options: ["A. [1]", "B. [2]", "C. [3]", "D. [4]"], answer: "D" },
  159: { question: "What is the focus of the channel?", options: ["A. Food", "B. Sports", "C. Nature", "D. Childen"], answer: "C" },
  160: { question: "According to the schedule, who is a scientist?", options: ["A. Pat Russell", "B. Dan Reed", "C. Kerry Peterson", "D. Ken Ruskin"], answer: "C" },
  161: { question: "Which program will teach viewers about survival skills?", options: ["A. Anatomy of a Dinosaur", "B. Amazing Sights of Africa", "C. Blue Ocean", "D. Rocky"], answer: "D" },
  162: { question: "What is the discussion mainly about?", options: ["A. Those who can't attend a party", "B. The best caterers", "C. Becoming vegan", "D. Ordering food for a party"], answer: "D" },
  163: { question: "At 5:39, what does Patrick Stone mean by I'm going to take a pass this year?", options: ["A. He'll stop by for a short time.", "B. He'll decline this time.", "C. He can't make it.", "D. He wants to get a free pass."], answer: "B" },
  164: { question: "What is mentioned about Four-Leaf Catering?", options: ["A. It offers vegan food.", "B. It has only vegan options.", "C. It has catered previous office parties.", "D. It specializes in special orders."], answer: "A" },
  165: { question: "What will Eva Sanderson most likely do next?", options: ["A. Work on the menu", "B. Contact the caterers", "C. Confirm a meeting", "D. Order some lunch"], answer: "B" },
  166: { question: "What did Ms. Sullivan do on March 13?", options: ["A. Purchased a home security system", "B. Returned a product", "C. Signed up for Internet service", "D. Made an appointment"], answer: "C" },
  167: { question: "What is suggested about Ms. Sullivan?", options: ["A. She teaches a computer training class.", "B. She had trouble installing some software.", "C. She will have access to watching movies.", "D. She has recently moved in."], answer: "C" },
  168: { question: "What is indicated about Midas Touch Internet Provider?", options: ["A. It dispatches its employees for installation work.", "B. It sells computer accessories.", "C. Its headquarters are located in Parsons.", "D. It offers Web site developing services."], answer: "A" },
  169: { question: "What is suggested about Marion?", options: ["A. It will restore an old building soon.", "B. It has closed a park for repairs.", "C. It is planning a music festival.", "D. Its population is decreasing."], answer: "A" },
  170: { question: "What is the purpose of Marion Hall?", options: ["A. To serve as a play center for children", "B. To hold city council meetings", "C. To offer public education classes", "D. To provide cultural events"], answer: "D" },
  171: { question: "What will happen in April?", options: ["A. A famous speaker will give a presentation.", "B. A new mayor will be elected.", "C. Some public facilities will be improved.", "D. A new play will be performed."], answer: "C" },
  172: { question: "What is true about CC Wheel Delivery?", options: ["A. A contract of theirs has just been canceled.", "B. Legal action is being taking against them.", "C. The president of CC Wheel delivery has stepped down.", "D. Two of their trucks were in an accident."], answer: "B" },
  173: { question: "What is indicated about the company that the speaker works for?", options: ["A. It is financially insecure.", "B. It has recently been created", "C. It will be closing.", "D. It is a delivery company."], answer: "A" },
  174: { question: "Why does the man wish to stop working with CC Wheel Delivery?", options: ["A. To protect his company from financial damage", "B. To cut production costs over the next four months", "C. To lower the price of an individual product", "D. To avoid legal trouble in the future"], answer: "A" },
  175: { question: "In which of the marked positions [1], [2], [3], or [4] does this sentence best belong? \"Yes, we've worked with them for a long time.\"", options: ["A. [1]", "B. [2]", "C. [3]", "D. [4]"], answer: "C" },
  176: { question: "What is the main purpose of the article?", options: ["A. To publicize an upcoming book", "B. To provide advice for professional chefs", "C. To advertise a new restaurant", "D. To describe a television show"], answer: "A" },
  177: { question: "According to Ms. Lee, what is the secret to successful cooking?", options: ["A. Following a recipe book", "B. Using quality ingredients", "C. Balancing all the flavors", "D. Choosing the correct spices"], answer: "B" },
  178: { question: "What is the first thing to do in order to become a fan club member?", options: ["A. Access a Web site", "B. Call a hotline", "C. Visit Ms. Lee's restaurant", "D. Purchase a book"], answer: "D" },
  179: { question: "In the e-mail, what does Suzie Sanders say about the article?", options: ["A. It was written by a famous journalist.", "B. It was featured on a popular cooking Web site.", "C. It helped increase fan club membership.", "D. It contained excerpts from Ms. Lee's book."], answer: "C" },
  180: { question: "What is suggested about next month's newsletter?", options: ["A. It will be mailed behind schedule.", "B. It will feature a column about healthy eating habits", "C. It will contain an article on desserts.", "D. It will include a copy of Ms. Lee's book."], answer: "C" },
  181: { question: "What is indicated about the Titus Conference Center?", options: ["A. It recently improved its facilities.", "B. It demands full payment at the time of reservation.", "C. It is located next to an international airport.", "D. It currently has no vacancies for the month."], answer: "A" },
  182: { question: "What is NOT mentioned as a benefit of using the Titus Conference Center?", options: ["A. Convenient transportation", "B. Complimentary meals", "C. A printing service", "D. Presentation supplies"], answer: "B" },
  183: { question: "When will Ms. Rose most likely arrive at the Titus Conference Center?", options: ["A. On August 7", "B. On August 14", "C. On August 15", "D. On August 16"], answer: "B" },
  184: { question: "What is the main purpose of the second e-mail?", options: ["A. To reserve tickets for an upcoming conference", "B. To request help in making a payment", "C. To confirm a reservation", "D. To inquire about payment options"], answer: "C" },
  185: { question: "What does Ms. Rose suggest about the Titus Conference Center?", options: ["A. It will be their first time working together.", "B. It will relocate in August.", "C. It has several locations in the country.", "D. It failed to satisfy some guests last year."], answer: "D" },
  186: { question: "What is indicated about Carl Ennens?", options: ["A. He is a senior in high school", "B. He is a junior in college", "C. He will graduate in two years", "D. He is a senior in college"], answer: "D" },
  187: { question: "What is indicated about Dr. Alcobar?", options: ["A. Nobody knows who he is.", "B. People do not appreciate his opinion.", "C. He is respected by John Masterson.", "D. He has done a lot of prominent research."], answer: "C" },
  188: { question: "In the second e-mail, the term \"headquarters\" in the fourth line, is closest in meaning to what word or term?", options: ["A. base", "B. main office", "C. warehouse", "D. distribution center"], answer: "B" },
  189: { question: "According to the memorandum, what will Carl Ennens be expected to do?", options: ["A. fluid dynamic research", "B. cook", "C. help wherever is needed", "D. watch and learn"], answer: "C" },
  190: { question: "What position does John Masterson have in the company?", options: ["A. Chief Executive Officer", "B. Chief Financial Officer", "C. Sales Executive", "D. Owner"], answer: "A" },
  191: { question: "What does Dr. Keenan suggest about Xtreme 7?", options: ["A. It is the most effective cream on the market.", "B. It is worth the high price tag.", "C. It is both effective and cheap.", "D. It is the only cream that doctors would recommend."], answer: "C" },
  192: { question: "What is suggested about Brand-X?", options: ["A. Products are currently only available in Europe.", "B. It is Europe's most popular brand.", "C. It is a luxury skincare company.", "D. The company was first launched 10 years ago."], answer: "A" },
  193: { question: "According to the article, what does Brand-X plan to do?", options: ["A. Sell more products in Europe", "B. Expand outside of Europe", "C. Develop a makeup line", "D. Build a factory in America"], answer: "B" },
  194: { question: "What is indicated in the advertisement?", options: ["A. All positions don't require previous work experience.", "B. Applicants must be bilingual.", "C. Experience in certain fields can lead to management positions.", "D. The available positions are only temporary."], answer: "C" },
  195: { question: "For what position was Jacqueline most likely hired?", options: ["A. Management", "B. Dermatology", "C. Marketing", "D. Customer Service"], answer: "D" }
};

// Passages for Part 6 (131-146)
const p6_131_134 = `International Goods Fair

If you want (131) your packaged goods to an international audience, join the 8th annual International Goods Fair. The fair runs from March 5th to March 7th at the Galaxy Convention in downtown New York. With over 200 booths (132) by companies from all over the world, you can make business connections while promoting your own products to interested customers and businesses. The products should be mainly packaged foods ranging (133) desserts and snacks to canned meats and dried jerky. (134). Spots are limited and going fast.`;

const p6_135_138 = `From: Vice President Jordan Smith
To: K Group Employees
Subject: Company Renovations
Date: February 26

To all employees,

This weekend the renovations to our second floor offices (135) . We ask that you take home all important documents and file away any loose materials on your desks. All electronic devices should be turned off and unplugged. (136), all cabinets and drawers should be locked.

The renovations will take approximately 5 days. (137). If you have any meetings scheduled with clients next week, please schedule to meet them outside the company premises due to the noise. We apologize for the inconvenience but we ask for your (138). Thank you.`;

const p6_139_142 = `Attorney Opening

Johnson, Johnson, and Kindness PLC have an immediate position available for a contract attorney. The ideal candidate would have at least three years of experience (139) with complex business transactions.(140). The types of contract work that we (141) at Johnson, Johnson, and Kindness deal exclusively with business relationships between private companies and the government. If (142) feel that you would be qualified to join our team, please email our HR manager at JJC@law.com.`;

const p6_143_146 = `To: bobsaget@Bob'sJob's.com
From: HarrisonG@gmail.com
Date: September 20
Subject: business proposal

Dear Mr. Saget,

My name is Harrison Goodbody. I am (143) in response to the advertisement you placed in the Times about a new human resource manager. I have five years (144) working in a fast paced corporate environment. I understand that your firm employs upwards of 300 employees and many of them are Spanish speaking.(145) I have attached my resume and would be happy (146) provide excellent references should you request them. Thank you for your time.

Sincerely, Harrison Goodbody`;

// Passages for Part 7 (147-195)
const p7_147_148 = `The new Sensonic Curved Television is now on sale at the shockingly low price of just $1999. Enjoy your favorite television shows, movies, and games on a 55-inch screen that offers ultra-high definition images! Best of all, you don't have to struggle with a complicated instruction manual. Once you take the television home and install it, it begins working with your preferences immediately without annoying adjustments.`;

const p7_149_150 = `Tom Arnold 11:55
Are you coming back to the office today?

Richard Hewitt 12:08
Yeah, I just finished that pitch to Anderson & Wright about the riverside restaurant.

Tom Arnold 12:13
Great. How did it go?

Richard Hewitt 12:13
I think they might bite.

Tom Arnold 12:13
Nice. It'd be great to have them in on this project.

Richard Hewitt 12:14
Exactly!

Tom Arnold 12:35
Can you join Harold and I for lunch at 1? At the Kettle Room?

Richard Hewitt 12:35
Sure. I'll have the cab change directions and meet you there.

Richard Hewitt 12:39
Good. See you soon.`;

const p7_151_152 = `The buzz at New York's premier book fair is all about the upcoming book from poet-turned-novelist Harry S. Tepper. The Nightingales of Fall is the eagerly awaited sequel to his best-selling debut novel, The Swallows of Spring. The book follows the journey of Sally Harknett through the weird world of Underfell, mixing social commentary with sharp wit and just a dash of magic and mystery. Tepper burst onto the scene over a decade ago with the acclaimed poetry collection, King Harmon's Castle, and the expectation for this latest novel is another chart-topping success. Later this week, the first editions will be made available in a prize drawing at the New York Book Fair, with the official launch at major bookstores next month.`;

const p7_153_154 = `To: All Subscribers
From: Customer Support <customersupport@stylefashionmz.com>
Date: June 5
Subject: New Edition

Dear loyal subscribers,

Style & Fashion Magazine is excited to announce the launch of the new digital edition of our monthly magazine this summer. Although the print and digital editions are nearly identical, the digital edition will contain some longer content and more images that won't appear in the print edition.

Current subscribers to the print edition of our magazine will automatically receive a code that will allow access to the digital edition. Your code will be included with next month's print magazine that is delivered to your house.`;

const p7_155_158 = `More Buses During the Holidays

November 28 - [1].- Although the holiday season signals a nice week long vacation for many, bus drivers will work longer hours and straight into the holidays to accommodate the many tourists that are flooding the city this time of year and the shoppers that are busy buying those last minute gifts. - [2] - The city announced new bus schedules for the next few weeks which included some routes where the buses would run all day and all night. While most buses stop running by 1 am, some parts of downtown will see buses running all night. The Bingham shopping district will also see buses running until 3 am. "This is when we have the most tourists and out of town folks coming to visit," explained Mayor Bill Nate. "We felt it was important to provide the necessary services during this time." - [3] When the bus drivers' union leader, Nathan Reiner was asked about the new schedules he responded, "We worked out a payment that is agreeable on both sides and have enough drivers that can work in shifts so that there is no danger of overworking or exhaustion. Many of us will still get some time off during the holidays with our families."-[4]-`;

const p7_159_161 = `Channel 19 Program Schedule

March 3

Time | Program | Description
6:00 A.M.–7:00 A.M. | Life in Alaska | Follow the life of Ken Ruskin, a fisherman, living in the remote Alaskan tundra.
7:00 A.M.–9:00 A.M. | Amazing Sights of Africa | Learn about the diverse animals and plants in the African savanna.
9:00 A.M.–10:30 A.M. | Anatomy of a Dinosaur | In this episode, paleontologist Dr. Kerry Peterson tells you everything you wanted to know about the tyrannosaurus.
10:30 A.M.–11:00 A.M. | Rocky | Host Dan Reed demonstrates how to survive the extreme conditions of the Canadian outdoors in winter.
11:00 A.M.–1:00 P.M. | Natural Phenomenon | Host Julia Fromm investigates the most mysterious naturally occurring phenomena on Earth.
1:00 P.M.–2:00 P.M. | Blue Ocean | Travel with us to the ocean waters around Australia, where diver Pat Russell finds dolphins, sharks, seals, and much more.`;

const p7_162_165 = `J&R International Group Discussion

Sunny Rhee [5:37]: Is anyone unable to make it to Friday’s office party?
Kevin King [5:38]: I can be there for the first hour, but I need to leave early for a family get together.
Patrick Stone [5:39]: I have a business trip to Hong Kong the next day so I’m going to take a pass this year.
Sunny Rhee [5:42]: Is that everyone then? I just want to make sure that we have enough snacks. Eva, did you contact the caterers yet?
Eva Sanderson [5:43]: I called a couple of different places, but only Four-Leaf Catering offers vegan options.
Sunny Rhee [5:44]: Why don’t we give them a try then? I think a couple of people here are vegans.
Holly Johnson [5:45]: I don’t normally like to advertise my eating preferences, but I would love to have vegan options this time.
Eva Sanderson [5:46]: I agree. I think it would make everything more interesting. I’m thinking of trying to go vegan myself and this would be a good first step for me.
Holly Johnson [5:47]: Well, it’s not easy but I’ll be there to support you.
Eva Sanderson [5:47]: Thanks. I’ll order our platters from the caterers then.
Angelo Smith [5:48]: But make sure there are some meat dishes for us meat-lovers.
Eva Sanderson [5:49]: Of course. I emailed everyone our tentative menu and most of you seemed to like the choices.
Sunny Rhee [5:50]: Don’t forget to email the caterers about the security clearance they’ll need to enter the building.
Eva Sanderson [5:51]: I’ll work on that now.`;

const p7_166_168 = `Midas Touch Internet Provider

Contract Summary
Date: March 22

Customer: Ms. Tanya Sullivan
Address: 345 Oak Street, Parsons, WY 54055
Purchase Date: March 13

Services Purchased:
- Midas Internet multimedia package ($40.00/month)
- Security Guard virus protection ($5.00/month)
- Modem and router rental service ($3.00/month)

Summary:
Subtotal: $48.00/month | Tax: $3.45/month | Total: $51.45/month

Just call us 341-555-6487 and our technician will come to your house to take care of everything that you need to connect to the Internet via the modem and router.`;

const p7_169_171 = `April 2- Repairs will begin next Friday on the historic Marion Hall in downtown Marion. In its heyday, Marion Hall was a popular downtown destination for residents to dance, enjoy live music, and watch movies. However, it has lost its popularity gradually since the multiplex building was completed on Henson Street 4 years ago.

After all of the necessary repairs are made on Marion Hall, city officials will strive to invite various performers including famous theater companies, musicians, comedians, and speakers to the newly renovated theater. "We hope Marion Hall can serve as a new center for culture here in Marion," said Marion City Mayor Greg Fields.

The revitalization of Marion Hall is part of a larger project to enhance the public facilities in Marion. On April 29, the Marion Children's Park, which features a baseball field as well as several playgrounds, is scheduled to have its grand reopening.`;

const p7_172_175 = `As I'm sure you're aware, this week we must decide if we want to continue working with CC Wheel Delivery. After yesterday's meeting, it's clear that they are being sued for the accident that happened last week. - [1] - We all agreed that the whole company shouldn't be liable for the mistakes of a few careless workers. But, that was a conversation we had before we had really thought about the ramifications of our decision. - [2] - Unfortunately, the situation is escalating and there is about to be a lot of bad press. - [3] - It's true that many of them are our friends. But, we must protect our company. We can't handle anything that could alter our sales. For the last four months we've been operating with a very thin margin for error. If our sales drop even the slightest, it could be detrimental. So, I'm suggesting that, as a means of protecting ourselves from any negative backlash, we cut our ties with CC Wheel Delivery. Maybe later, if they're able to rehabilitate their name, we'll work with them again. - [4] - I propose we vote one more time on whether or not to work with them.`;

const p7_176_180 = `September 21- What is the secret to delicious home-cooked meals? Kimberly Lee, host of the My Home Cooking television show and owner of her own restaurant chain, seems to know all the secrets. Her show has been on the air for over two years, and now she has a devoted group of followers around the country. When she sat down for an interview with us, she said that fresh vegetables and local produce are the key to cooking healthy and tasty food.

Ms. Lee is scheduled to publish her very first cookbook near the end of the month. The book is entitled Kimberly Lee's My Home Cooking, and it provides easy-to-follow recipes that can be made in less than 30 minutes. Over 40,000 copies have already been pre-ordered so far.

Ms. Lee says that the final page of the book will include a detachable fan club membership form. Those who fill the form out and send it in to the provided address will receive a monthly newsletter and exclusive recipes available only to those in the fan club. Fan club members will also receive a password that allows access to a fan club Web site.

—-----------------

To: Kimberly Lee <kimberlylee@kimberlylee.com>
From: Suzie Sanders <suziesanders@kimberlylee.com>
Date: October 12
Subject: Update

Dear Ms. Lee,

Great news! I'm happy to report that not only has your book been selling well, but the number of new members joining the fan club has been increasing drastically since it was published. I'm certain that the article in the newspaper helped generate considerable publicity for your book.

Also, we have received a lot of feedback from new members expressing a desire for more recipes for cakes, cookies, and candies to be featured in next month's newsletter. I think it would be a good idea to meet their needs this time.

Sincerely,
Suzie Sanders
Publicity Coordinator`;

const p7_181_185 = `From: Stacey Watkins <staceywatkins@titus.com>
To: Ann Rose <annrose@putkincomp.com>
Subject: Conference of Bank Managers
Date: February 12

Dear Ms. Rose,

You recently contacted us about using our conference center again this year to host your Annual Conference of Bank Managers. This year we have updated our conference room with new projectors and more comfortable seating. We will be providing shuttle buses from the airport and a premium buffet in the dining hall as well as an Internet café where guests can use computers or print documents at no cost. For your convenience, we will also be providing useful supplies such as flip charts, 10-foot whiteboards, and projector screens.

Once you decide on a date, we ask that you please make a down payment of $1,000 after we see if it is available. The remaining balance should be paid upon your arrival. Also, we ask that as the organizer of the event, you arrive at the conference center a day before the conference begins. This way, any unforeseen circumstances can be taken care of beforehand.

We appreciate your business with the Titus Conference Center again. We are looking forward to providing you with the best service possible.

Stacey Watkins, Director

—-----------------

From: Ann Rose <annrose@putkincomp.com>
To: Stacey Watkins <staceywatkins@titus.com>
Subject: RE: Conference of Bank Managers
Date: February 16

Dear Mr. Watkins,

I am also pleased to be working with you again this year. We would like to reserve your conference space for the weekend of August 15 to 16. Additionally, the down payment will be handled by our financial department. I will have one of the employees contact you soon.

There is one thing that I would like to tell you. Actually, last year, some of our attendees were disappointed because the dining hall didn't offer a variety of vegetarian options. I hope this inconvenience will be dealt with in advance this year.

Thank you,
Ann Rose
Organizer, Annual Conference of Bank Managers`;

const p7_186_190 = `To: John Masterson<jmasterson@gmail.com>
From: Carl Ennens<cennens@masterstrokeindustries.com>
Date: December 30
Subject: Internship

Dear Mr. Masterson,

My name is Carl Ennens and I am entering my final year at Evergreen State College. I am majoring in industrial engineering here, and my liquid dynamics professor, Dr. Alcobar, recommended Master Stroke Industries as a possible internship opportunity. Your company is recognized as a leader in flow research. If you would be willing to accept an intern for the coming spring semester I could give you up to 15 hours per week of work, provided that you are able to write some performance evaluations that I could turn in to Dr. Alcobar for credit. Thank you for your consideration, and if you would like to see my transcript I would be happy to forward it to you.

All the best,
Carl Ennens

—-----------------

To: Carl Ennens<cennens@masterstrokeindustries.com>
From: John Masterson<jmasterson@gmail.com>
Date: December 31
Subject: Internship

Dear Carl Ennens,

I appreciate your interest in interning with us here at Master Stroke Industries. We have not accepted a lot of interns in the past, but I know Dr. Alcobar personally, and if he recommended that you contact us, he must have faith in your ability. I think we should set up an interview at our headquarters downtown on Holly Street. We can get to know each other a bit over some coffee and I will show you around our facilities. Don't worry about your transcripts, like I said, If Dr. Alcobar thinks you'll be a good fit, I'll trust his judgment. How about this coming Friday at 10 AM?

Look forward to meeting you Carl,
John Masterson
CEO, Master Stroke Industries

—-----------------

Memorandum To Master Stroke Industry Employees

This spring at Master Stroke Industries we will have an intern assisting us with everything from making coffee to solving complex equations. Carl Ennens is a student here at the University and has kindly offered his services in exchange for a piece of our operational knowledge. Please treat him with respect and don't be afraid to use him for an extra pair of hands, eyes, or opinion should you need it. And I did hear he makes a good cup of coffee!`;

const p7_191_195 = `Brand-X Coming to Town

March 9 - Popular Danish skin care company Brand-X is finally launching their best-selling line in America. The 88 year old company has been Denmark's leading skin care brand and the top selling cream, Xtreme 7, has been Europe's most popular facial cream for over 10 years. Though Americans may not have had access to these creams before, the brand is already generating much excitement. Dermatologist Dr. Francis Keenan explains, "Tests have shown that Xtreme 7 dramatically reduces the fine lines around the eye area and laugh lines after only 30 days of use, but the price of the creams is only a fraction of what department store brands sell for. I'll definitely recommend this cream to my clients.”

"People have been asking about Xtreme 7 but the products haven't even arrived yet!" added Susan Chan, an employee at a beauty counter. "People are already calling in to pre-order."

A spokesperson for the company explained that Brand-X is making moves to expand into the North American and Asian markets. For now, only the best-selling line will be available sometime next month, outside of Europe, but within a year, more products will be available.

—-----------------

Brand-X Positions at American Headquarters in Westminster, California

Don't miss your chance to work in an exciting career in skincare and beauty with Brand-X. 80 administrative and customer service positions will be available regardless of experience. Applicants need to have good communication skills, bilingual ability in both English and Spanish is preferred but not necessary, and knowledge in computer use is a must. Applicants with experience in cosmetics, dermatology, or marketing will get a chance to work in several management positions for Brand-X. Please visit our website at www.brandx.com/iobs for more information. You can fill out the application forms and send them in before March 20th. Interviews will take place at Hillway Building on 143 Garden Road. Be sure to bring your resumes and reference letters.

—-----------------

E-mail
To: Professor David Mills
From: Jacqueline O'Hare
Date: March 28
Subject: job

Dear Professor Mills,

Thank you so much for the reference letter you supplied me with. I was recently hired by Brand-X and I begin my orientations next week Wednesday at 10am. However, we have our statistics test at that time. Is there any way that I can take a make-up test at a different time or hand in another assignment as a replacement for the test? I would hate to miss the orientations which are mandatory and I don't want to disappoint my new employers. The job should not have any other impact on my school work otherwise. I kindly appreciate your consideration in this.

Sincerely
Jacqueline O'Hare`;

const passageMapPart67 = {
  131: p6_131_134, 132: p6_131_134, 133: p6_131_134, 134: p6_131_134,
  135: p6_135_138, 136: p6_135_138, 137: p6_135_138, 138: p6_135_138,
  139: p6_139_142, 140: p6_139_142, 141: p6_139_142, 142: p6_139_142,
  143: p6_143_146, 144: p6_143_146, 145: p6_143_146, 146: p6_143_146,
  147: p7_147_148, 148: p7_147_148,
  149: p7_149_150, 150: p7_149_150,
  151: p7_151_152, 152: p7_151_152,
  153: p7_153_154, 154: p7_153_154,
  155: p7_155_158, 156: p7_155_158, 157: p7_155_158, 158: p7_155_158,
  159: p7_159_161, 160: p7_159_161, 161: p7_159_161,
  162: p7_162_165, 163: p7_162_165, 164: p7_162_165, 165: p7_162_165,
  166: p7_166_168, 167: p7_166_168, 168: p7_166_168,
  169: p7_169_171, 170: p7_169_171, 171: p7_169_171,
  172: p7_172_175, 173: p7_172_175, 174: p7_172_175, 175: p7_172_175,
  176: p7_176_180, 177: p7_176_180, 178: p7_176_180, 179: p7_176_180, 180: p7_176_180,
  181: p7_181_185, 182: p7_181_185, 183: p7_181_185, 184: p7_181_185, 185: p7_181_185,
  186: p7_186_190, 187: p7_186_190, 188: p7_186_190, 189: p7_186_190, 190: p7_186_190,
  191: p7_191_195, 192: p7_191_195, 193: p7_191_195, 194: p7_191_195, 195: p7_191_195
};

function populateTest5Content() {
  console.log('🔄 Updating TOEIC Test 5 questions, graphics, and passages...');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  data.questions.forEach(q => {
    const qNum = q.id;

    // Set audio to null as requested
    q.audio = null;

    // Part 1 Image updates
    if (p1Images[qNum]) {
      q.image = p1Images[qNum];
    }

    // Part 3 & 4 Graphic Image updates
    if (graphicImages[qNum]) {
      q.image = graphicImages[qNum];
    }

    // Questions Data update (32-195)
    if (qData[qNum]) {
      q.question = qData[qNum].question;
      q.options = qData[qNum].options;
      q.answer = qData[qNum].answer;
    }

    // Passages update (131-195)
    if (passageMapPart67[qNum]) {
      q.passage = passageMapPart67[qNum];
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully updated TOEIC Test 5 content in (${jsonPath})!`);
}

populateTest5Content();
