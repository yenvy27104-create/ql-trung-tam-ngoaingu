const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_4.json');

// Passages for Part 6 (131-146)
const p6_1 = `From: Vice President Donna Johnson
To: Helio Tech Employees
Date: July 5th
Subject: Lobby Renovation

Receiving the federal grant money last month 131_____ us to invest in upgrading a few areas of our building. 132______ We will be remodeling the lobby starting July 12th. It should take approximately two weeks. 133_____ that time, if you have a meeting with anyone from outside the company, please schedule to have it at the Rose Street Café on the corner. We have set up a special account that anyone from the company can use over those two weeks.
Please, just sign and date your check and return it to your server. We are 134_____ that this is a bit of an inconvenience, and we thank you for your cooperation.`;

const p6_2 = `Part Time Cook Needed

Paradise Café is looking 135_____ a part-time line cook. Applicants must be able to work in a fast-paced environment and be familiar with all standard breakfast fare. 136_____ This weekend schedule could change in the future. Ideally we are looking for an applicant that has 137_____ one year of experience working as a short-order cook. Paradise Café is located right next to the post office in downtown Millstown. Please apply in person with a resume and be prepared to cook an egg dish to order. We 138_____ forward to welcoming you to our team!`;

const p6_3 = `City Realty

City Realty is Washington’s number one real estate company, serving the state for over 50 years. We 139_____ recognized as the state’s leading experts in the industry and many of our agents have been awarded for their excellence in service by Forbes Property Magazine. Our agents are 140_____ to bringing their best knowledge and expertise to the table, and they have extensive know-how about the housing market dos and don’ts. Our agents specialize in different areas of the industry including corporate real estate, residential real estate, and rental properties. 141____

Our headquarters is located in the central downtown area where you can meet with one of our agents 142_____ a free consultation. You can also visit our website www.cityrealty.com for property listings and further information.`;

const p6_4 = `Employee Message Board
Holiday Office Party’s Success and Appreciation
Posted by Julie Norton

I want to thank everyone who 143_____ make this party a success. 144___ We had some ups and downs as we started preparing for this but the final result has been extraordinary. In fact, the 145_____ consensus seems to be that this year’s party was the best yet. We had the highest turnout ever and many seem to agree that this year’s activities contributed to the party’s success. It was a joy to see everyone get along so well and participate in all the events. We even 146_____ our children’s charity fundraising goals by over $1000. Once again, I would like to thank everyone.`;

// Passages for Part 7 (147-200)
const p7_147_148 = `April 3
Larry Martin
Kansas Neat & Tidy
5448 Lakeside Drive
Arlington, Kansas 67514

Dear Mr. Martin,
We are interested in using your company's cleaning services for this year's Halley Valley Rock Festival. The festival will begin on Friday, June 14, and last the entire weekend, ending on the night of Sunday, June 16. However, unlike previous years, this year we would like your company to clean the festival grounds intermittently throughout the festival. Therefore, we will be providing your company with a temporary office trailer where your workers can take breaks from the heat. We look forward to working with your company again this year.

Sincerely,
Karen Johnson
Festival Coordinator, Halley Valley Foundation`;

const p7_149_150 = `LAURA BURKE 5:09
Are you back in the city Monday?

ADVIK SHAN 5:15
I might be.

LAURA BURK 5:16
So, you're undecided?

ADVIK SHAN 5:17
Yeah. This factory is running into all kinds of problems. Fix one thing and then something else comes up.

LAURA BURKE 5:17
I heard. Well, at least it's nice not to be stuck in the office.

ADVIK SHAN 5:18
That's true.

ADVIK SHAN 5:19
What's going on Monday?

LAURA BURKE 5:20
Ms. Harris wants to have a meeting with you when you get back. Nothing urgent.

ADVIK SHAN 5:22
Okay. I’ll let you know when I get my schedule set.`;

const p7_151_152 = `To: Pat Blackburn <pblackburn@fastweb.com>
From: Go Natural Health Products <cs@gonatural.com>
Date: February 4, 3:34 P.M.
Subject: Product Order

We appreciate that you have chosen Go Natural Health Products for your vitamin and mineral supplements. All of our products are carefully inspected for quality and meet all government regulations. Additionally, during the month of February, customers making purchases over $100.00 do not have to pay any shipping fees.
Order number: 4330XM21
Order date: February 4, 3:31 P.M.
Shipping address: Pat Blackburn, 2709 Michigan Ave., Clinton WI
Details: 6 bottles of Green Source multivitamin pills.
Total: $180.00, paid with credit card (XXXX XXXX XXXX 8766)

All our products come with a 100% customer satisfaction guarantee. If you are dissatisfied, please call our customer service center at 987-555-3427 for a full refund within a week of the order.
Go Natural Health Products`;

const p7_153_154 = `Midnight Moon, the new jazz album by guitarist Nick Stanton, will start being sold in stores this Thursday. Midnight Mon is Mr. Stanton's first album in five years and has received praise from numerous music critics. Mr. Stanton wil be signing copies of his new album at Emerson Department Store, located at 4532 Main Street, this Saturday, March 12. An autograph is free with the purchase of the new album.`;

const p7_155_158 = `MEMO

To: All Employees
From: Betty Franklin, General Manager
Date: August 19
Subject: Receptionist

To all employees:
– [1] – Greta Jones, the receptionist at our studio will be taking some time off to deal with a personal matter. She will be gone from August 21st to September 5th. – [2] – Ms. Blanche will take care of the regular responsibilities that Ms. Jones usually handles including taking phone calls, handling appointments, organizing schedules, and dealing with clients. Please welcome Ms. Blanche to the studio and be available for her to ask questions if she has any.

Furthermore, if you have any long time clients that you give special prices and discounts to, please let Ms. Blanche know ahead of time. – [3] – She will charge the fees that are programmed into the computer system.

If you have any urgent concerns you need to discuss with Ms. Jones, or if you need to purchase any special hair dyes, treatment shampoos, or other requests that customers have, please do so today and tomorrow before she leaves. – [4] – You can contact me at any time if you have any further questions.`;

const p7_159_161 = `Shoe Shine
Your number one source for sneakers

We see that you are currently registered as a basic member at our Web site.
Click here to upgrade to our premium membership.

Once you become a premium member, you will enjoy the following benefits:
- Expedited shipping for $3 ($5 for a basic member)
- Exchanges on all items within 60 days of purchase at no extra charge (30 days for a basic member)
- Returns on all items within 30 days of purchase at no extra charge (7 days for a basic member)

Upgrading your service from basic to premium takes just one click.
To welcome customers to our new online store, this month we are offering the upgrade to annual premium membership at a discounted rate of just $50.`;

const p7_162_165 = `Lisa Hancock 9:39
I’m stopping by a coffee shop on my way to work. What does everyone want? It’s on me.

Nick Morton 9:39
Wow thanks! I’ll have just black coffee.

Lilly Smith 9:40
Thanks. I’d like a latte. Can you also bring some sugar?

Lisa Hancock 9:41
Sure, I’ll bring a couple of the sugar packets.

Richard Park 9:42
I can never turn down coffee. I’ll also have a latte with some sugar.

Emily Jordan 9:42
I’d like a herbal tea if they have any. I don’t drink anything caffeinated so any tea without caffeine would be great. Thanks.

Lisa Hancock 9:43
Alright then. I’ll be there in about 20 minutes with your drinks. See you soon. Oh and before I forget, please make sure that our orders from Cindy’s Boutique get set up in our showroom for our clients.

Richard Park 9:44
The boxes arrived this morning and our interns are working on unpacking them now. However, the order from Chantelle seems to have gone missing.

Lisa Hancock 9:45
What do you mean?

Nick Morton 9:45
We’re trying to locate the package. We contacted Chantelle and they sent it to the wrong address.

Lisa Hancock 9:46
That’s a disaster. Please try to find out where those dresses went.

Richard Park 9:47
Good news. I just got a message from the shipping company and they found the Chantelle order. They’re redirecting the shipment to us.

Lisa Hancock 9:48
I almost had a panic attack. When will it get here?

Richard Park 9:48
This afternoon.`;

const p7_166_168 = `To: All csall@cherishedgoods.com
From: Eric Nixon enix@cherishedgoods.com
Date: January 5, 10:00 A.M.
Subject: Shipping Error

Hello everyone,

Lilia Kent, the head of the shipping department, has informed me that yesterday our customer database experienced a system error and, as a result, many orders were sent to the wrong addresses. This morning, our department has already received multiple calls from customers complaining that they received the wrong package. Ms. Kent’s department has been working hard to locate the cause of the mistake. Therefore, any customer that calls with a wrong delivery should be asked to return the package. Additionally, please inform the customers that they will be given a 10 percent discount on their next purchase.

Eric Nixon`;

const p7_169_171 = `Dear Mr. Hurst,

As a loyal customer with a family membership at the Tate Community Center, you have sponsored us with your continued donations. We really appreciate your support.

The following table provides information on upcoming family events this month. We welcome your participation.

Crafts Day, June 7 | Paul Simpson, June 15 | Summer Picnic, June 22
A variety of craft supplies will be available for kids to make their own unique creations. | Come and listen to the beautiful music of local singer and songwriter Paul Simpson. | Everyone needs to bring a tasty dish to share with others. Free beverages will be provided.

For members, no purchase of tickets is necessary for participation in these events. We encourage you to attend these events and spend quality time with your family.

We look forward to seeing you.

Minnie Winters
Program Coordinator
Tate Community Center`;

const p7_172_175 = `J&P Industries
1462 Swinton Street
Cameron, GL 10288

March 29
Mr. Grant Lee
287 Silver Plains Road
Cameron, GL 18729

Dear Mr. Lee,

We thank you for your continued work and your dedication to your job at J&P Industries. – [1] – We are sending all employees information about the new changes that have been made to your health insurance benefits at our company. You will continue to be covered by the same insurance company, but because of the new state regulations that have been put forth, all employees must now undergo a basic medical check-up at a local clinic or hospital. This check-up will be covered by your health insurance, so you do not need to pay any extra fees and this by no means will affect the monthly insurance deductions. – [2] – Included in the envelope is the detailed information about the new medical program for employees.

The medical check-ups will include a blood test, urine test, eye test, height and weight measurements, hearing test, and chest X-rays. – [3] – Please make an appointment with a local clinic. You should have your results given to Karen Leigh at Human Resources by December 30th at the latest. If you fail to get a medical exam, then you may be subject to a fine up to $2000. – [4] – We thank you for your cooperation and hope you abide by the new changes.

If you have any further questions or concerns, please contact Karen at leighk@jpindustries.com.

Sincerely,
John Black
Executive Manager
J&P Industries`;

const p7_176_180 = `Summer Yoga Classes:
This summer we will be offering a variety of summer yoga classes for all age groups and skill levels.

Summer Class Schedule and Prices (registration fee):
- Beginner class, twice a week for two months ($150)
- Intermediate and advanced class, twice a week for two months ($200)
- Yoga for senior citizens, once a week for two months ($100)
- Hot power yoga, three times a week for two months ($250)

All necessary supplies will be provided by the Blooming Flower Yoga Studio.
Members should wear comfortable clothes that allow for free movement.

Address: 45 Clark Street, Indianapolis, IN 46202 | 715-555-5832 | www.bloomingfloweryoga.com

----------------------

To: Tammy Glenn tammyglenn@mxmail.com
From: Dwayne Moore dwaynemoore@bloomingfloweryoga.com
Date: May 23
Subject: New Student
Attachment: New member form

Dear Ms. Glenn,

I’m writing to let you know that you have one more student who has signed up for your class. Your new student is Jane Meyers and she will bring the $100 registration fee with her to the first class on Monday.

Also, on Monday, please give Ms. Meyers and any other new members the form they will need to fill out. I have attached the necessary paperwork to this e-mail. All you have to do is to print out copies and hand them out.

Your class now has nine members that will attend and is, therefore, almost at full capacity. In fact, all of the classes this summer have proved very popular, and I anticipate they will all fill up by the end of the month. Thank you so much for your many years of hard work as a teacher here at Blooming Flower Yoga Studio. If you have any questions, let me know.

Dwayne Moore`;

const p7_181_185 = `Issue with the Blackbeard’s Pirate Ship Model
Post by John Taylor
August 3, 10:55 A.M.

I recently purchased a model kit from the Mega Hobby online store. I bought the Blackbeard’s Pirate Ship model to put together with my son, and I am having a problem. After carefully reading the instruction manual, I noticed that a few essential parts have been left out of the box. Specifically, some parts that make up the mast and sail seem to be absent from the kit. I have bought many models from Mega Hobby for years and have always been happy with the products I received.

Has anyone else had the same problem with this kit? My son and I were planning to submit our finished model to a local model building contest at the end of the month, and we are very disappointed with this setback. If anyone else has any experience with this problem and solved it, I would greatly appreciate your advice.

----------------

Mega Hobby Models Community Forum

RE: Issue with the Blackbeard’s Pirate Ship Model
Post by Catherine Maxwell
August 3, 4:24 P.M.

Hi John,

I also recently purchased the Blackbeard’s Pirate Ship model from the Mega Hobby online store for my son and had the same problem that you did. At first, I thought I must have been mistaken, but after checking the list of all parts in the instruction manual, I determined that several parts must have been missing from the kit at the time of sale. I took the kit back to my local Mega Hobby store and a staff member confirmed my suspicion. The Mega Hobby employee was nice enough to exchange my model kit for one that had all of the parts. With the new kit, my son and I were able to put together the model exactly like the picture on the box. I suggest that you go to the Mega Hobby store closest to your home and ask them to exchange your defective product. Be sure to make a note of the order number when you go there.`;

const p7_186_190 = `Dreamspace Bed Emporium
Beds, Bedding, and Furniture
3600 Wilshire Road, Springfield, IL 62751
www.dreamspacebeds.com

Don’t let yourself suffer tossing and turning, not getting a good night’s sleep.
Come down to Dreamspace Bed Emporium and treat yourself to a comfortable bed catered to your exact needs. Customers are welcome to lie on any bed in the store.

First Floor: Beds (single, double, queen, king, etc.)
Second Floor: Bedding (sheets, pillows, blankets, cushions, etc.)
Third Floor: Furniture (chairs, sofas, tables, etc.)

In response to customer suggestions, our store now stays open two hours later to accommodate those who may work irregular shifts.
Do you need express delivery for a bed? Simply ask one of our staff members at the checkout and it can be easily arranged.
If you have any comments or suggestions for our store, a comment box can be found inside the main entrance.

--------------------

Comment and Suggestion Form
Dreamspace Bed Emporium
Customer name: Willy M. King | Date: August 9 | Contact number: 456-555-6123
Comment: Last week, I came into your store to shop for a new pillow, sheet, and blanket set for my bed at home. However, when I went to that section, I couldn't find any available staff members to assist me. I waited for about half an hour, but no one came to me. I needed help determining what sheet and blanket set would fit the dimensions of my bed, but ended up just leaving the store frustrated. I hope you can provide better service to customers so something like this doesn't happen again in the future. I have been a loyal customer of yours for years. If you don't explain why no one helped me, I may have to start shopping at one of your competitors' stores.

-----------------------

Hello everybody, I have called this meeting to talk about some of the problems that our new store policy of staying open later has caused. At first, this seemed like a great idea to help customers who worked all day. I know it can be hard to find time to do chores and your shopping when you work from 9 to 5. Unfortunately, this means that we have had to spread our staff too thin until we have hired and trained enough people.

As a result, we have been neglecting some of our customers lately. The photocopied Comment and Suggestion Form I have passed out to you all from Willy King sums up our shortcomings better than I ever could. Please give it a read and think about ways we can be made aware of a customer in need, even in a store as large as ours.

I understand that with our thin staff, we have to cover more space than we used to, so this meeting isn’t about punishment or blame, it’s just about solutions. Please do some brainstorming on this and drop in on me in my office if you think you have an idea; I have to go call Willy King.`;

const p7_191_195 = `http://www.acetraining.com

Home | Contact Us | Location | About Ace
Ace Training is a company that offers developmental courses for the employees of your store or business. You can rely on our team of successful professionals to improve the quality of your staff and help your company achieve its goals. We provide effective and results-oriented programs. Below are the training courses available:

Leadership: This program helps staff members develop strategic planning and management skills. It also enhances the supervisory skills of the employees in leadership positions.
Sales: We teach innovative strategies to increase sales and market share. This class is suitable for both salespeople in a store and employees who work over the phone.
Customer Service: Never undervalue the importance of your customers’ satisfaction. Your employees need the skills to become helpful and efficient when working directly with customers.
Technologies: In rapidly changing work environments, staff members should keep up with new trends and developments in the technological field. Your staff members will learn how to research and master new technologies quickly and accurately.
To enroll staff members for a program, contact Joshua York at josh@acestafftraining.com.

---------------------

From: Tiffany Tran tifftran@zellengifts.com
To: Joshua York josh@acestafftraining.com
Subject: Staff Training for Our Employees
Date: October 9

Dear Mr. York,

I’m contacting you about running a training program for some of our employees here at Zellen Gifts. We are planning on expanding our telemarketing department next month, but we don’t have enough properly trained employees to fill these new positions. Therefore, we will be transferring some employees from the customer service department to the telemarketing department to solve this problem. As our products are mainly targeted towards children, we are hoping to increase our profits as much as possible for this Christmas season. Please let me know the maximum number of students that you can accommodate at one time.

Thank you,
Tiffany Tran
Zellen Gifts

---------------------

PROPOSED ACE TRAINING SCHEDULE FOR ZELLEN GIFTS
November 1–5

Group Code and Student Numbers | Monday Sales Strategies | Tuesday Successful Negotiation | Wednesday Customers First! | Thursday Closing The Deal | Friday Start Polite, Stay Polite
Red Team (10 people) | 9:00–11:00 | 9:00–11:30 | 8:00–10:30 | 8:00–11:00 | 9:00–11:00
Blue Team (10 people) | 1:00–3:00 | 1:00–3:00 | 1:00–3:00 | 1:00–3:00 | 1:00–3:00
Green Team (10 people) | 3:00–5:00 | 3:00–5:00 | 3:00–5:00 | 3:00–5:00 | 3:00–5:00
White Team (10 people) | 5:00–7:00 | 5:00–7:00 | 5:00–7:00 | 5:00–7:00 | 5:00–7:00

Here is our proposed schedule for transitioning your customer service staff into successful telemarketers. You can see that we have an ambitious amount of material to cover, but I am confident it will be a success. We have tried to balance your need for a swift transition with your need to continue running Zellen Gifts while the training is in session. Therefore, we divided your staff into groups and staggered them throughout the day. This will result in better student-to-trainer numbers for your staff, and it should cause minimal disruptions in your business.
We look forward to a great week of training!
Joshua York
Ace Training Coordinator`;

const p7_196_200 = `Midcity Performing Arts Hall

Support the Midcity Performing Arts Hall in downtown Brenton by becoming a member. You can choose from the following membership plans:

General – For only $100, you can get a full-year membership to attend any two performing arts shows that have available seats in the D area of the theater.
Silver – For a fee of $200, you can attend any two performing arts shows that have available seats in the B area of the theater.
Gold – For a fee of $500, you will receive early alerts of popular programs with a ticket to any two performing arts shows with seats in the B area, and a guaranteed seat for any show of your choice within a one-year period in the front row section.
Diamond – For a fee of $1000, you will have exclusive access to signed autographs with performing arts stars, invitations to two exclusive pre-showings of popular programs, and a guaranteed seat for any show of your choice within a one-year period in the VIP section.
*Some restrictions do apply.
*Admissions to orchestral performances excluded

------------------------

To: bates@midcityarthall.com
From: Alicia Norton
Date: January 16
Subject: Membership
Thank you for the e-mail about the Midcity Performing Arts Hall membership. I have attached a fee of $1000. I was a general member last year and I enjoyed a couple of the musicals that were performed. I have become a theater enthusiast since the experience and I look forward to the benefits of the new membership plan.

By the way, the Art Hall has done a phenomenal job on the renovations to the building. I’m excited to come back this year.

-------------------

Below is the tentative schedule for shows at the Midcity Performing Arts Hall in the coming months. Please have a look and call anytime if you wish to get seats.

Show Title: Brenton Philharmonic Orchestra | Dates: January 28 to January 30
Show Title: Dancing Princess | Dates: February 3 to February 23
Show Title: Jazz that Dance | Dates: March 1 to March 26
Show Title: Opera Ghost | Dates: April 3 to April 29`;

const passagesMap = {
  131: p6_1, 132: p6_1, 133: p6_1, 134: p6_1,
  135: p6_2, 136: p6_2, 137: p6_2, 138: p6_2,
  139: p6_3, 140: p6_3, 141: p6_3, 142: p6_3,
  143: p6_4, 144: p6_4, 145: p6_4, 146: p6_4,
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
  191: p7_191_195, 192: p7_191_195, 193: p7_191_195, 194: p7_191_195, 195: p7_191_195,
  196: p7_196_200, 197: p7_196_200, 198: p7_196_200, 199: p7_196_200, 200: p7_196_200
};

const questionsParts67 = {
  131: { question: "Receiving the federal grant money last month 131_____ us to invest in upgrading a few areas of our building.", options: ["A. did allow", "B. has allowed", "C. allows", "D. are allowing"], answer: "B" },
  132: { question: "132______ We will be remodeling the lobby starting July 12th.", options: ["A. Construction will begin when the building permits are received.", "B. This celebration will last for most of the month of July.", "C. Considering the cost, the renovation might be postponed.", "D. The first area that will benefit from this is the lobby."], answer: "D" },
  133: { question: "133_____ that time, if you have a meeting with anyone from outside the company, please schedule to have it at the Rose Street Café on the corner.", options: ["A. Upon", "B. During", "C. Around", "D. Until"], answer: "B" },
  134: { question: "We are 134_____ that this is a bit of an inconvenience, and we thank you for your cooperation.", options: ["A. aware", "B. disciplined", "C. reluctant", "D. content"], answer: "A" },
  135: { question: "Paradise Café is looking 135_____ a part-time line cook.", options: ["A. hiring", "B. hire", "C. to hire", "D. to hiring"], answer: "C" },
  136: { question: "136_____ This weekend schedule could change in the future.", options: ["A. Applicants should know how to make scrambled eggs.", "B. People applying should know how to wash dishes.", "C. Anyone applying should be able to work nights.", "D. Currently, we can only offer weekday shifts but the applicant must be willing to work weekends if required"], answer: "D" },
  137: { question: "Ideally we are looking for an applicant that has 137_____ one year of experience working as a short-order cook.", options: ["A. at most", "B. below", "C. at least", "D. the least"], answer: "C" },
  138: { question: "We 138_____ forward to welcoming you to our team!", options: ["A. look", "B. looking", "C. looked", "D. looks"], answer: "A" },
  139: { question: "We 139_____ recognized as the state’s leading experts in the industry...", options: ["A. been", "B. had be", "C. are being", "D. have been"], answer: "D" },
  140: { question: "Our agents are 140_____ to bringing their best knowledge and expertise...", options: ["A. attached", "B. faithful", "C. committed", "D. loyal"], answer: "C" },
  141: { question: "Our agents specialize in different areas... 141____", options: ["A. You can be confident that they serve your specific needs.", "B. You can rent hundreds of properties from our listings.", "C. The agents in corporate real estate make the most earnings.", "D. The residential agents are very busy with the rising housing market."], answer: "A" },
  142: { question: "...where you can meet with one of our agents 142_____ a free consultation.", options: ["A. with", "B. for", "C. to", "D. from"], answer: "B" },
  143: { question: "I want to thank everyone who 143_____ make this party a success.", options: ["A. helps", "B. helped", "C. helping", "D. had help"], answer: "B" },
  144: { question: "144___ We had some ups and downs as we started preparing...", options: ["A. I really enjoyed all the food and chatting with everyone.", "B. I worked really hard to plan this event.", "C. Special thanks to Keith, Grant, Vanessa, and Melissa who spent many hours outside of work to help plan everything.", "D. I'm glad to see that everyone made it to work today."], answer: "C" },
  145: { question: "In fact, the 145_____ consensus seems to be that this year’s party was the best yet.", options: ["A. regular", "B. familiar", "C. different", "D. general"], answer: "D" },
  146: { question: "We even 146_____ our children’s charity fundraising goals by over $1000.", options: ["A. overstepped", "B. surrendered", "C. exceeded", "D. overwhelmed"], answer: "C" },
  147: { question: "Who most likely is Mr. Martin?", options: ["A. A musical performer", "B. A truck driver", "C. A cleaning company's representative", "D. A festival coordinator"], answer: "C" },
  148: { question: "According to the letter, what will be provided?", options: ["A. Food and water", "B. A sheltered area", "C. Musical equipment", "D. Cleaning supplies"], answer: "B" },
  149: { question: "What is suggested about Mr. Shan?", options: ["A. He has missed a meeting.", "B. He is considering a transfer.", "C. He has recently taken over the operations of a manufacturing facility.", "D. He doesn't know when he will be returning to his office."], answer: "D" },
  150: { question: "At 5:18, what does Mr. Shan mean when he writes, \"That's true\"?", options: ["A. He is worried about the conditions of the factory.", "B. He agrees that being out of the office is enjoyable.", "C. He has discovered an error.", "D. He is positive he will be back on Monday"], answer: "B" },
  151: { question: "What is indicated about Ms. Blackburn 's order?", options: ["A. It has been insured against loss.", "B. It is out of stock.", "C. It has been placed by her husband.", "D. It will be delivered free of charge."], answer: "D" },
  152: { question: "Why might Ms. Blackburn call the customer service center by February 11?", options: ["A. To revise her order", "B. To change payment options", "C. To get a payment back", "D. To apply for a membership"], answer: "C" },
  153: { question: "Who is Nick Stanton?", options: ["A. A department store employee", "B. A recording artist", "C. A music critic", "D. A real estate agent"], answer: "B" },
  154: { question: "According to the article, what will happen on March 12?", options: ["A. A concert will be held.", "B. A book will be released.", "C. An autograph session will take place.", "D. Some tickets will go on sale."], answer: "C" },
  155: { question: "Where do the recipients of the email most likely work?", options: ["A. At a department store", "B. At a hair salon", "C. At a movie studio", "D. At a photography studio"], answer: "B" },
  156: { question: "What is indicated about Greta Jones?", options: ["A. She is retiring.", "B. She is going on vacation.", "C. She will take some time off work.", "D. She will work only temporarily."], answer: "C" },
  157: { question: "By when should employees contact Ms. Jones with urgent business?", options: ["A. Before she leaves", "B. After she leaves", "C. Anytime", "D. When she gets back"], answer: "A" },
  158: { question: "In which of the positions marked [1], [2], [3] and [4] does the following sentence belong? \"During this time, we have hired a temporary replacement, Judith Blanche.\"", options: ["A. [1]", "B. [2]", "C. [3]", "D. [4]"], answer: "A" },
  159: { question: "What is the purpose of the Web page?", options: ["A. To advertise a new line of shoes", "B. To confirm an order", "C. To recommend a service upgrade", "D. To solicit donations"], answer: "C" },
  160: { question: "What is NOT mentioned as a benefit of premium membership?", options: ["A. Discounts on new items", "B. Faster shipping at a reduced price", "C. A longer period of free returns", "D. A longer period of free exchanges"], answer: "A" },
  161: { question: "What is indicated about Shoe Shine?", options: ["A. It has been in business for decades.", "B. It was founded by a local entrepreneur.", "C. Its merchandise is available through the Internet.", "D. It has three membership types."], answer: "C" },
  162: { question: "What type of business do the speakers probably work at?", options: ["A. A fashion company", "B. A clothing shop", "C. A costume company", "D. A coffee shop"], answer: "A" },
  163: { question: "At 9:39, what does Lisa Hancock mean when she says, it's on me?", options: ["A. She'll bring the coffee.", "B. She'll buy the drinks.", "C. She'll remember everyone's orders.", "D. It's her turn to get drinks."], answer: "B" },
  164: { question: "What is indicated about one of their shipments?", options: ["A. It was overcharged.", "B. It was returned to the boutique.", "C. It will arrive later in the day.", "D. It hasn't been located yet."], answer: "C" },
  165: { question: "What kind of business is Chantelle?", options: ["A. A fabric company", "B. A magazine company", "C. A shipping company", "D. A boutique"], answer: "D" },
  166: { question: "Who most likely received the e-mail?", options: ["A. Employees in the shipping department", "B. Dissatisfied customers", "C. Customer service representatives", "D. Internet technology specialists"], answer: "C" },
  167: { question: "According to the e-mail, what is Ms. Kent's staff trying to do?", options: ["A. Create a customer database", "B. Fix a system malfunction", "C. Locate a lost package", "D. Take calls from customers"], answer: "B" },
  168: { question: "What are recipients of the e-mail advised to do?", options: ["A. Update their personal information", "B. Deliver a package in person", "C. Enter data into a customer database", "D. Offer a price reduction to some customers"], answer: "D" },
  169: { question: "What is suggested about Mr. Hurst?", options: ["A. He is a local musician.", "B. He donates to an orphanage.", "C. He supports a public organization.", "D. He works at a community center."], answer: "C" },
  170: { question: "Why was the e-mail sent?", options: ["A. To announce a community board meeting", "B. To apply for a family membership", "C. To publicize upcoming events.", "D. To give information about a local election"], answer: "C" },
  171: { question: "What is indicated about Tate Community Center?", options: ["A. Its members gain free admission to the events.", "B. It offers regular music classes.", "C. It takes reservations by phone.", "D. It will serve beverages at all events."], answer: "A" },
  172: { question: "What is the purpose of the letter?", options: ["A. To inform an employee about a mandatory exam", "B. To encourage employees to donate blood to the hospital", "C. To discuss the changes made to the health insurance coverage", "D. To advertise the services of a new clinic"], answer: "A" },
  173: { question: "What did Mr. Black send with the letter?", options: ["A. An application form", "B. An insurance document", "C. A contract", "D. Extra information about the changes"], answer: "D" },
  174: { question: "The term \"subject to\" at the end of the third paragraph is closest in meaning to:", options: ["A. Dependent on", "B. Responsible for", "C. Withdrawn from", "D. Added to"], answer: "A" },
  175: { question: "In which of the positions marked [1], [2], [3] and [4] does the sentence best belong? \"The appointments should take no longer than 30 minutes.\"", options: ["A. [1]", "B. [2]", "C. [3]", "D. [4]"], answer: "D" },
  176: { question: "What is stated about the summer classes?", options: ["A. They started last week.", "B. They will be held outdoors.", "C. They are available to both children and adults.", "D. They are being offered at a discounted price."], answer: "C" },
  177: { question: "What is suggested about Ms. Meyers?", options: ["A. She has never learned yoga before.", "B. She is an elderly person.", "C. She wants to become a yoga instructor.", "D. She is a long-time member."], answer: "B" },
  178: { question: "What is Ms. Glenn asked to do?", options: ["A. Develop a new curriculum", "B. Attend a training seminar", "C. Sign a work contract", "D. Distribute some documents"], answer: "D" },
  179: { question: "In the e-mail, the word capacity in paragraph 3, line 1, is closest in meaning to", options: ["A. volume", "B. ability", "C. vacancy", "D. role"], answer: "A" },
  180: { question: "What is indicated about Ms. Glenn?", options: ["A. She works well with children.", "B. She is a long-term employee.", "C. She will be retiring soon.", "D. She will be receiving a pay raise."], answer: "B" },
  181: { question: "What is the subject of the first post?", options: ["A. A defect with a purchased product", "B. Mistakes in the instruction manual", "C. A discrepancy with an advertised price", "D. Registration for a competition"], answer: "A" },
  182: { question: "What is suggested about Mr. Taylor?", options: ["A. He knows Ms. Maxwell personally.", "B. He is a product designer at Mega Hobby.", "C. He owns a sailboat.", "D. He will enter a competition with his son."], answer: "D" },
  183: { question: "How did both Mr. Taylor and Ms. Maxwell realize there was a problem?", options: ["A. By talking with a customer service agent", "B. By watching an instructional video", "C. Be consulting a user manual", "D. By looking at a photograph"], answer: "C" },
  184: { question: "What is indicated about Ms. Maxwell?", options: ["A. She is a regular customer of Mega Hobby.", "B. She works with Mr. Taylor at Mega Hobby.", "C. She successfully completed the model kit.", "D. She received a full refund."], answer: "C" },
  185: { question: "What does Ms. Maxwell recommend?", options: ["A. Visiting a nearby store", "B. Canceling a membership", "C. Downloading a new instruction manual", "D. Purchasing replacement parts"], answer: "A" },
  186: { question: "What is NOT mentioned about beds at Dreamspace Bed Emporium?", options: ["A. They come in a variety of sizes.", "B. They can be tested by customers.", "C. They are displayed on the first floor.", "D. They come with a lifetime warranty."], answer: "D" },
  187: { question: "According to the advertisement, what is true about Dreamspace Bed Emporium?", options: ["A. It is located in a department store.", "B. It sells home appliances.", "C. It is hiring additional staff.", "D. It extended its operation hours."], answer: "D" },
  188: { question: "Where did Mr. King most likely search for the products he wanted?", options: ["A. On the first floor", "B. On the second floor", "C. On the third floor", "D. Near the main entrance"], answer: "B" },
  189: { question: "Who do you believe is speaking at the meeting?", options: ["A. The Dreamspace Bed Emporium manager", "B. Willy King", "C. A district manager from another city", "D. A check out clerk"], answer: "A" },
  190: { question: "What is most likely true based upon the information from the meeting the meeting?", options: ["A. Dreamspace Bed Emporium will change their hours back to what they used to be.", "B. Dreamspace Bed Emporium will extend their hours to serve more customers like Willy King.", "C. Dreamspace Bed Emporium will hire more employees so there are enough people to cover the size of their store.", "D. Dreamspace Bed Emporium will hold a raffle event and invite Willy King."], answer: "C" },
  191: { question: "Where does Mr. York work?", options: ["A. At a accounting firm", "B. At a sports management agency", "C. At a skill development institution", "D. At an advertising agency"], answer: "C" },
  192: { question: "What is stated about the program on technologies?", options: ["A. It is open to the public.", "B. It introduces recent Web programming skills.", "C. It teaches environmental protection.", "D. It keeps employees up-to-date."], answer: "D" },
  193: { question: "It what program is Ms. Tran most likely interested?", options: ["A. Leadership", "B. Sales", "C. Customer Service", "D. Technologies"], answer: "B" },
  194: { question: "What is indicated by the proposed training schedule and accompanying memo?", options: ["A. It is an easy course to complete", "B. There are 5 key topics that will be covered", "C. 50 employees will take part", "D. Joshua York will be one of the trainers"], answer: "C" },
  195: { question: "Based upon the proposed training schedule and accompanying memo, what can be inferred about Zellen Gifts?", options: ["A. They are trying to become better at customer relations.", "B. They are trying to conduct business as normal during their training period.", "C. They have a small customer service staff.", "D. They want to finish their training before the end of October."], answer: "B" },
  196: { question: "Which membership did Alicia Norton most likely purchase?", options: ["A. General", "B. Silver", "C. Gold", "D. Diamond"], answer: "D" },
  197: { question: "What is suggested about the Midcity Performing Arts Hall?", options: ["A. It hosts various sports programs.", "B. It had some changes made to the building.", "C. It is a place popular among celebrities.", "D. It is an old museum."], answer: "B" },
  198: { question: "When is a performance not free to members?", options: ["A. January", "B. February", "C. March", "D. April"], answer: "A" },
  199: { question: "What is implied about the schedule?", options: ["A. The shows have sold out.", "B. More shows may be available.", "C. It is fixed.", "D. It may change."], answer: "D" },
  200: { question: "What is meant by the expression \"some restrictions may apply?\"", options: ["A. Only certain people will be considered for membership.", "B. The membership plans may change without notice.", "C. Not all performances are available to members.", "D. Admissions will not be allowed non- members."], answer: "C" }
};

function updateTest4Parts67Full() {
  console.log('🔄 Updating TOEIC Test 4 Part 6 and Part 7 full passages, questions, & answers...');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let updatedCount = 0;

  data.questions.forEach(q => {
    const qNum = q.id;

    if (passagesMap[qNum]) {
      q.passage = passagesMap[qNum];
    }

    if (questionsParts67[qNum]) {
      q.question = questionsParts67[qNum].question;
      q.options = questionsParts67[qNum].options;
      q.answer = questionsParts67[qNum].answer;
      // Remove any leftover placeholder image on Part 6 & 7 text reading passages
      q.image = null;
      updatedCount++;
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully updated ${updatedCount} Part 6 & Part 7 questions and passages in TOEIC Test 4 (${jsonPath})!`);
}

updateTest4Parts67Full();
