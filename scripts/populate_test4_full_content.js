const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_4.json');

const questionsData = {
  32: { question: "What does the woman ask the man to do?", options: ["A. Introduce a new client", "B. Help to prepare a presentation", "C. Repair malfunctioning equipment", "D. Look for an instruction manual"], answer: "C" },
  33: { question: "Why is the man unable to help?", options: ["A. He has to meet a major client soon.", "B. He finds the problem too complicated.", "C. He isn't nearby at the moment.", "D. He doesn't have the necessary tools."], answer: "A" },
  34: { question: "What will the woman do next?", options: ["A. Attempt to solve the problem herself", "B. Cancel an appointment", "C. Print out a document", "D. Have a meeting with a client"], answer: "A" },
  35: { question: "What problem does the woman mention?", options: ["A. The advertisements are not widely circulated.", "B. The store inventory is inadequate.", "C. The discounted price is not competitive.", "D. The product is not selling well."], answer: "B" },
  36: { question: "What does the woman say about this month's sales figures?", options: ["A. They are beginning to decrease.", "B. They are similar to last month's figures.", "C. They are unusually high.", "D. They are impossible to predict."], answer: "D" },
  37: { question: "What does the man ask the woman to do?", options: ["A. Extend the length of the promotion", "B. Direct customers to the online store", "C. Secure more advertising space", "D. Offer customers a bigger discount"], answer: "C" },
  38: { question: "Where most likely does the man work?", options: ["A. At a hospital", "B. At a factory", "C. At a clothing store", "D. At a restaurant"], answer: "B" },
  39: { question: "Why does the woman think she is qualified for the job?", options: ["A. She completed a training course.", "B. She has worked similar jobs before.", "C. She likes interacting with people.", "D. She majored in a related field."], answer: "A" },
  40: { question: "What will the speakers discuss next?", options: ["A. Work hours", "B. An annual salary", "C. Job qualifications", "D. Previous jobs"], answer: "D" },
  41: { question: "Where most likely does the woman work?", options: ["A. At a wedding hall", "B. At a bakery", "C. At a clothing store", "D. At a shipping company"], answer: "B" },
  42: { question: "Why is the man unable to visit the woman's workplace?", options: ["A. He has urgent arrangements to make.", "B. He must attend a wedding today.", "C. He is not feeling well.", "D. He has to prepare an order."], answer: "C" },
  43: { question: "What information will the man probably provide?", options: ["A. Directions to a location", "B. An individual's name", "C. His home address", "D. His phone number"], answer: "A" },
  44: { question: "Where most likely do the speakers work?", options: ["A. At a souvenir shop", "B. At a language school", "C. At a restaurant", "D. At a travel agency"], answer: "D" },
  45: { question: "What does the man recommend doing?", options: ["A. Hiring bilingual staff", "B. Opening a second location", "C. Taking language classes", "D. Planning a vacation"], answer: "C" },
  46: { question: "What has the woman done?", options: ["A. Contacted a translation agency", "B. Scheduled job interviews", "C. Extended operating hours", "D. Hired new employees"], answer: "B" },
  47: { question: "Why did Jessica leave work early?", options: ["A. She had a prior engagement.", "B. She wasn't feeling well.", "C. Her doctor called.", "D. She had to attend a wedding."], answer: "A" },
  48: { question: "What does the man ask the woman to do?", options: ["A. Work an additional shift", "B. Clean the store tomorrow morning", "C. Deliver a presentation at a meeting", "D. Calculate sales figures"], answer: "D" },
  49: { question: "What will the woman do next?", options: ["A. Fill out a form", "B. Distribute paychecks", "C. Go to the hospital", "D. Call her co-workers"], answer: "B" },
  50: { question: "What problem does the man mention?", options: ["A. The fridge is not working.", "B. The temperature is too low.", "C. The freezer temperature is too high.", "D. Water is leaking from the fridge."], answer: "C" },
  51: { question: "What does the woman mention about the fridge?", options: ["A. It is a very old model.", "B. It is no longer manufactured.", "C. It is not from their company.", "D. It is a popular model."], answer: "A" },
  52: { question: "What does the woman offer to do?", options: ["A. Give him a new manual", "B. Give him a link to a website", "C. Let him get a replacement", "D. Sent a technician"], answer: "D" },
  53: { question: "Where do the speakers most likely work?", options: ["A. A plumbing company", "B. An electrical company", "C. A construction company", "D. In an office"], answer: "B" },
  54: { question: "What does the woman mean when she says \"I intended to call them today\"?", options: ["A. She wasn't going to call her.", "B. They were going to call her back.", "C. She was going to call them that day.", "D. She was going to send them an e-mail."], answer: "C" },
  55: { question: "What is the problem?", options: ["A. They can't install the electrical.", "B. The plumbing is already installed.", "C. There is some problems with the payment.", "D. They may need to dig deeper to install the plumbing."], answer: "A" },
  56: { question: "What does the man mean when he says Are you serious?", options: ["A. He believes the woman is correct.", "B. He doesn't believe she is correct.", "C. He is going to pay by card.", "D. He will pay with cash."], answer: "D" },
  57: { question: "What does the woman want to know?", options: ["A. How much room service he ordered", "B. She wants to clarify what room he stayed in.", "C. She wants to confirm his credit card number.", "D. To negotiate a better price"], answer: "B" },
  58: { question: "What does the woman offer to do?", options: ["A. Give him his room for free", "B. Give him a discount on his next visit", "C. Give him free room service", "D. Give him a gift certificate"], answer: "C" },
  59: { question: "What is Robert Porter's position?", options: ["A. Lead Repairer", "B. Head Engineer", "C. Main Engineer", "D. Main Repairer"], answer: "A" },
  60: { question: "What problem does Susan Sherman describe?", options: ["A. Some of the measurements weren't done.", "B. All of their equipment is missing.", "C. Some of their equipment is missing.", "D. A piece of equipment is still in the office."], answer: "D" },
  61: { question: "Why did Robert take the equipment away?", options: ["A. To review it further", "B. For special repairs", "C. For replacement", "D. To evaluate its condition"], answer: "B" },

  // Part 4 (71-91)
  71: { question: "What is the advertisement about?", options: ["A. A martial arts class", "B. An athletic contest", "C. A city tour bus", "D. A downtown festival"], answer: "A" },
  72: { question: "Who is the special offer directed at?", options: ["A. Senior citizens", "B. Beginners", "C. Children", "D. Local residents"], answer: "D" },
  73: { question: "What does the speaker say about the advertised location?", options: ["A. It is accessible by public transportation.", "B. It has no parking space available.", "C. It is near a train station.", "D. It is in the same building as Geller Bank."], answer: "B" },
  74: { question: "Where is the introduction taking place?", options: ["A. At a school", "B. At a museum", "C. At a radio station", "D. At a community center"], answer: "C" },
  75: { question: "Who is George Butler?", options: ["A. A computer technician", "B. A mechanical engineer", "C. An electrician", "D. A technology expert"], answer: "A" },
  76: { question: "What is offered for teenage students?", options: ["A. A hands-on experience", "B. A weekly after-school class", "C. A complimentary souvenir", "D. A discounted ticket price"], answer: "D" },
  77: { question: "What has caused the change in plans?", options: ["A. Broken kitchen equipment", "B. The absence of some clients", "C. A late delivery", "D. Traffic congestion"], answer: "B" },
  78: { question: "What will listeners receive?", options: ["A. A conference schedule", "B. A meal voucher", "C. A lunch menu", "D. A name tag"], answer: "C" },
  79: { question: "What will begin at 1:00 P.M.?", options: ["A. A software demonstration", "B. A leadership workshop", "C. A luncheon", "D. A client meeting"], answer: "A" },
  80: { question: "What is the purpose of the planning committee?", options: ["A. To tighten some regulations", "B. To supervise a construction project", "C. To review employee performance", "D. To develop a new curriculum"], answer: "D" },
  81: { question: "What does the volunteer need to do?", options: ["A. Pick up a client", "B. Introduce a guest", "C. Write down an agenda", "D. Give a presentation"], answer: "B" },
  82: { question: "What will listeners do next?", options: ["A. Go on a business trip", "B. Participate in a workshop", "C. Introduce themselves", "D. Select a group leader"], answer: "C" },
  83: { question: "Who most likely are the listeners?", options: ["A. Factory workers", "B. Lawyers", "C. Accountants", "D. Web developers"], answer: "A" },
  84: { question: "What does the woman mean when she says, I know that you are all overworked?", options: ["A. She recognizes the listeners concerns.", "B. She doesn't really mind what they think.", "C. She wants them to work less.", "D. She is inviting them to a meeting."], answer: "D" },
  85: { question: "What task does the speaker assign to the listeners?", options: ["A. Prepare some instructions", "B. Prepare a new budget", "C. Revise some training materials", "D. Hire new staff"], answer: "B" },
  86: { question: "What is Beyond the Blue about?", options: ["A. Online bullying", "B. The ocean", "C. Whales and sharks", "D. Mountains"], answer: "C" },
  87: { question: "Why does the speaker say, \"Remember, this is the first film Mr. Harris has made\"?", options: ["A. To suggest that he is an impressive director", "B. To suggest the film will be poor", "C. To recommend him as a good worker", "D. To suggest they shouldn't watch the film"], answer: "A" },
  88: { question: "What is going to happen after the film?", options: ["A. They will give away free DVDs.", "B. They will watch it again.", "C. The director will have a short Q&A.", "D. An actor will sign autographs."], answer: "D" },
  89: { question: "According to the speaker what has happened to the company in the last year?", options: ["A. Their products have gained global success.", "B. Their sales are down.", "C. The product is low quality.", "D. Their CEO is upset."], answer: "B" },
  90: { question: "What most likely are the GNU reporters doing on Wednesday?", options: ["A. Interviewing some office workers", "B. Interviewing the President", "C. Making a music video", "D. Promoting their new web series"], answer: "C" },
  91: { question: "Why does the man say, You realize what this means?", options: ["A. To discuss future renovations", "B. To make a point clear", "C. To highlight that the company will grow", "D. To give staff some bonuses"], answer: "A" }
};

const passage131_134 = `From: Vice President Donna Johnson
To: Helio Tech Employees
Date: July 5th
Subject: Lobby Renovation

Receiving the federal grant money last month 131_____ us to invest in upgrading a few areas of our building. 132______ We will be remodeling the lobby starting July 12th. It should take approximately two weeks. 133_____ that time, if you have a meeting with anyone from outside the company, please schedule to have it at the Rose Street Café on the corner. We have set up a special account that anyone from the company can use over those two weeks.
Please, just sign and date your check and return it to your server. We are 134_____ that this is a bit of an inconvenience, and we thank you for your cooperation.`;

const passage135_138 = `Part Time Cook Needed

Paradise Café is looking 135_____ a part-time line cook. Applicants must be able to work in a fast-paced environment and be familiar with all standard breakfast fare. 136_____ This weekend schedule could change in the future. Ideally we are looking for an applicant that has 137_____ one year of experience working as a short-order cook. Paradise Café is located right next to the post office in downtown Millstown. Please apply in person with a resume and be prepared to cook an egg dish to order. We 138_____ forward to welcoming you to our team!`;

const passage139_142 = `City Realty

City Realty is Washington’s number one real estate company, serving the state for over 50 years. We 139_____ recognized as the state’s leading experts in the industry and many of our agents have been awarded for their excellence in service by Forbes Property Magazine. Our agents are 140_____ to bringing their best knowledge and expertise to the table, and they have extensive know-how about the housing market dos and don’ts. Our agents specialize in different areas of the industry including corporate real estate, residential real estate, and rental properties. 141____

Our headquarters is located in the central downtown area where you can meet with one of our agents 142_____ a free consultation. You can also visit our website www.cityrealty.com for property listings and further information.`;

const passage143_146 = `Employee Message Board
Holiday Office Party’s Success and Appreciation
Posted by Julie Norton

I want to thank everyone who 143_____ make this party a success. 144___ We had some ups and downs as we started preparing for this but the final result has been extraordinary. In fact, the 145_____ consensus seems to be that this year’s party was the best yet. We had the highest turnout ever and many seem to agree that this year’s activities contributed to the party’s success. It was a joy to see everyone get along so well and participate in all the events. We even 146_____ our children’s charity fundraising goals by over $1000. Once again, I would like to thank everyone.`;

const part6Passages = {
  131: passage131_134, 132: passage131_134, 133: passage131_134, 134: passage131_134,
  135: passage135_138, 136: passage135_138, 137: passage135_138, 138: passage135_138,
  139: passage139_142, 140: passage139_142, 141: passage139_142, 142: passage139_142,
  143: passage143_146, 144: passage143_146, 145: passage143_146, 146: passage143_146
};

function populateTest4FullContent() {
  console.log('🔄 Populating TOEIC Test 4 full questions, options, & passages...');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  data.questions.forEach(q => {
    const qNum = q.id;

    // Part 3 & 4 Updates
    if (questionsData[qNum]) {
      q.question = questionsData[qNum].question;
      q.options = questionsData[qNum].options;
      q.answer = questionsData[qNum].answer;
    }

    // Part 6 Passages
    if (part6Passages[qNum]) {
      q.passage = part6Passages[qNum];
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully populated full TOEIC Test 4 questions, options, & passages in (${jsonPath})!`);
}

populateTest4FullContent();
