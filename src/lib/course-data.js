/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// This file contains all the static course content for the expedition map.
// This allows the app to function offline for standard lessons.
export const courseData = {
  a1: {
    0: { // Greetings
      prompts: [
        { text: "Hello, how are you?", translation: "ہیلو آپ کیسے ہیں؟" },
        { text: "My name is Sarah.", translation: "میرا نام سارہ ہے۔" },
        { text: "Nice to meet you.", translation: "آپ سے مل کر اچھا لگا۔" },
        { text: "Good morning.", translation: "صبح بخیر۔" },
        { text: "Thank you.", translation: "شکریہ۔" },
        { text: "You're welcome.", translation: "خوش آمدید۔" },
        { text: "Goodbye.", translation: "خدا حافظ۔" },
      ]
    },
    1: { // Family
      prompts: [
        { text: "This is my mother.", translation: "یہ میری ماں ہے۔" },
        { text: "He is my brother.", translation: "وہ میرا بھائی ہے۔" },
        { text: "I have two sisters.", translation: "میری دو بہنیں ہیں۔" },
        { text: "My father is a doctor.", translation: "میرے والد ڈاکٹر ہیں۔" },
        { text: "She is my grandmother.", translation: "وہ میری دادی ہیں۔" },
      ]
    },
    2: { // Food
      prompts: [
        { text: "I am hungry.", translation: "مجھے بھوک لگی ہے۔" },
        { text: "I like to eat apples.", translation: "مجھے سیب کھانا پسند ہے۔" },
        { text: "Water, please.", translation: "پانی، براہ مہربانی۔" },
        { text: "This bread is delicious.", translation: "یہ روٹی مزیدار ہے۔" },
        { text: "Do you want some rice?", translation: "کیا آپ کو کچھ چاول چاہئیں؟" },
      ]
    },
    3: { // Colors
      prompts: [
        { text: "The sky is blue.", translation: "آسمان نیلا ہے۔" },
        { text: "The grass is green.", translation: "گھاس ہری ہے۔" },
        { text: "She has a red car.", translation: "اس کے پاس ایک سرخ کار ہے۔" },
        { text: "The sun is yellow.", translation: "سورج پیلا ہے۔" },
        { text: "I have a black cat.", translation: "میرے پاس ایک کالی بلی ہے۔" },
      ]
    },
    4: { // Animals
      prompts: [
        { text: "The dog is big.", translation: "کتا بڑا ہے۔" },
        { text: "A bird can fly.", translation: "ایک پرندہ اڑ سکتا ہے۔" },
        { text: "The fish swims in the water.", translation: "مچھلی پانی میں تیرتی ہے۔" },
        { text: "The lion is the king of the jungle.", translation: "شیر جنگل کا بادشاہ ہے۔" },
        { text: "A cow gives milk.", translation: "گائے دودھ دیتی ہے۔" },
      ]
    },
    5: { // Numbers & Time
      prompts: [
        { text: "I have three books.", translation: "میرے پاس تین کتابیں ہیں۔" },
        { text: "There are seven days in a week.", translation: "ایک ہفتے میں سات دن ہوتے ہیں۔" },
        { text: "What time is it?", translation: "کیا وقت ہوا ہے؟" },
        { text: "It is ten o'clock.", translation: "دس بجے ہیں۔" },
        { text: "She is five years old.", translation: "وہ پانچ سال کی ہے۔" },
      ]
    },
    6: { // Clothing
      prompts: [
        { text: "I am wearing a blue shirt.", translation: "میں نے نیلی قمیض پہنی ہوئی ہے۔" },
        { text: "Her shoes are new.", translation: "اس کے جوتے نئے ہیں۔" },
        { text: "He needs a warm coat.", translation: "اسے ایک گرم کوٹ کی ضرورت ہے۔" },
        { text: "Put on your hat.", translation: "اپنی ٹوپی پہن لو۔" },
        { text: "My socks are white.", translation: "میرے موزے سفید ہیں۔" },
      ]
    },
    7: { // At School
      prompts: [
        { text: "This is my classroom.", translation: "یہ میرا کلاس روم ہے۔" },
        { text: "The teacher is writing on the board.", translation: "استاد بورڈ پر لکھ رہا ہے۔" },
        { text: "Please open your book.", translation: "براہ کرم اپنی کتاب کھولیں۔" },
        { text: "I like to read stories.", translation: "مجھے کہانیاں پڑھنا پسند ہے۔" },
        { text: "The students are playing outside.", translation: "طلباء باہر کھیل رہے ہیں۔" },
      ]
    },
    8: { // A1 Final Challenge
      scenario: "You are at a cafe. Order a coffee and a sandwich from the barista.",
      chatHistory: [{ role: 'ai', text: 'Hello! Welcome to our cafe. What can I get for you today?' }],
      prompt: { userTranscript: null, feedback: null, score: null }
    }
  },
  a2: {
    0: { // Daily Routine
      prompts: [
        { text: "I wake up at seven in the morning.", translation: "میں صبح سات بجے اٹھتا ہوں۔" },
        { text: "She brushes her teeth every day.", translation: "وہ روزانہ اپنے دانت صاف کرتی ہے۔" },
        { text: "He goes to work by bus.", translation: "وہ بس سے کام پر جاتا ہے۔" },
        { text: "We have lunch at noon.", translation: "ہم دوپہر کو لنچ کرتے ہیں۔" },
        { text: "They watch television in the evening.", translation: "وہ شام کو ٹیلی ویژن دیکھتے ہیں۔" },
        { text: "I go to bed around eleven at night.", translation: "میں رات کو گیارہ بجے کے قریب سوتا ہوں۔" },
      ]
    },
    1: { // The Weather
      prompts: [
        { text: "It is sunny and warm today.", translation: "آج دھوپ اور گرمی ہے۔" },
        { text: "It might rain in the afternoon.", translation: "دوپہر میں بارش ہو سکتی ہے۔" },
        { text: "Yesterday was cold and windy.", translation: "کل سردی اور ہوا تھی۔" },
        { text: "What's the weather like in your city?", translation: "آپ کے شہر میں موسم کیسا ہے؟" },
        { text: "I hope it doesn't snow tomorrow.", translation: "مجھے امید ہے کہ کل برفباری نہیں ہوگی۔" },
      ]
    },
    8: { // A2 Final Challenge
      scenario: "You are lost. Ask a stranger for directions to the nearest train station.",
      chatHistory: [{ role: 'ai', text: 'Excuse me, can I help you? You look a bit lost.' }],
      prompt: { userTranscript: null, feedback: null, score: null }
    }
  },
  b1: {
    2: { // Role Play: Cafe
      scenario: "You are at a cafe with a friend. Discuss what to order and talk about your day.",
      chatHistory: [{ role: 'ai', text: "Hey! I'm so glad we could finally meet. Have you looked at the menu yet?" }],
      prompt: { userTranscript: null, feedback: null, score: null }
    },
    3: { // Describe a Situation
      prompts: [
        { text: "Describe a time you felt very happy.", translation: "ایک ایسے وقت کو بیان کریں جب آپ نے بہت خوشی محسوس کی۔" },
        { text: "Talk about your favorite holiday destination.", translation: "اپنی پسندیدہ چھٹیوں کی منزل کے بارے میں بات کریں۔" },
        { text: "Describe what you can see from your window right now.", translation: "بیان کریں کہ آپ ابھی اپنی کھڑکی سے کیا دیکھ سکتے ہیں۔" },
      ]
    },
    6: { // Word Scramble
      prompts: [
        { scrambledText: "She decided to *keat pu* a new hobby.", correctText: "She decided to take up a new hobby.", translation: "اس نے ایک نیا مشغلہ اپنانے کا فیصلہ کیا۔" },
        { scrambledText: "Can you please *untr no* the lights?", correctText: "Can you please turn on the lights?", translation: "کیا آپ براہ کرم لائٹس جلا سکتے ہیں؟" },
        { scrambledText: "We should *tge otegreht* for dinner soon.", correctText: "We should get together for dinner soon.", translation: "ہمیں جلد ہی رات کے کھانے کے لیے اکٹھے ہونا چاہیے۔" },
      ]
    },
    8: { // B1 Final Challenge
      scenario: "Your boss has given you too much work to finish by the end of the day. Politely explain the situation and ask for an extension on one of the tasks.",
      chatHistory: [{ role: 'ai', text: "Hi, thanks for coming in. I just wanted to check if you'll have those reports ready by 5 PM." }],
      prompt: { userTranscript: null, feedback: null, score: null }
    }
  },
  b2: {
    1: { // Role Play: Hotel
      scenario: "You are checking into a hotel, but there is a problem with your reservation. Explain the issue to the receptionist.",
      chatHistory: [{ role: 'ai', text: "Good evening, welcome to the Grand Hotel. How can I help you?" }],
      prompt: { userTranscript: null, feedback: null, score: null }
    },
    3: { // Describe a Memory
      prompts: [
        { text: "Describe your earliest childhood memory in detail.", translation: "اپنے بچپن کی ابتدائی یاد کو تفصیل سے بیان کریں۔" },
        { text: "Talk about a challenging situation you overcame.", translation: "ایک مشکل صورتحال کے بارے میں بات کریں جس پر آپ نے قابو پایا۔" },
        { text: "Describe an important event that changed your life.", translation: "ایک اہم واقعہ بیان کریں جس نے آپ کی زندگی بدل دی۔" },
      ]
    },
    6: { // Word Scramble
      prompts: [
        { scrambledText: "It's important not to *vige pu no* your dreams.", correctText: "It's important not to give up on your dreams.", translation: "یہ ضروری ہے کہ آپ اپنے خوابوں کو نہ چھوڑیں۔" },
        { scrambledText: "I'm really *kooglin wfrroad ot* the weekend.", correctText: "I'm really looking forward to the weekend.", translation: "میں واقعی ہفتے کے آخر کا انتظار کر رہا ہوں۔" },
        { scrambledText: "We need to *emoc pu tiwh* a better solution.", correctText: "We need to come up with a better solution.", translation: "ہمیں ایک بہتر حل کے ساتھ آنا ہوگا۔" },
      ]
    },
    8: { // B2 Final Challenge
      scenario: "You are in a debate. Argue for or against the statement: 'Social media does more harm than good for society.'",
      chatHistory: [{ role: 'ai', text: "Alright, let's begin the debate. The topic is: 'Social media does more harm than good.' You have the floor." }],
      prompt: { userTranscript: null, feedback: null, score: null }
    }
  },
  c1: {
    0: { // Society & Culture
      prompts: [
        { text: "To what extent do you think tradition should be preserved in a rapidly modernizing world?", translation: "آپ کے خیال میں تیزی سے جدید ہوتی دنیا میں روایت کو کس حد تک محفوظ رکھا جانا چاہیے؟" },
        { text: "How does art reflect the culture of a society?", translation: "فن کسی معاشرے کی ثقافت کی عکاسی کیسے کرتا ہے؟" },
      ]
    }
  },
  c2: {
    0: { // Global Issues
      prompts: [
        { text: "What, in your opinion, is the most effective strategy for combating global climate change?", translation: "آپ کی رائے میں، عالمی موسمیاتی تبدیلیوں کا مقابلہ کرنے کی سب سے مؤثر حکمت عملی کیا ہے؟" },
      ]
    }
  }
};

// Fill in missing lesson data with empty prompts to avoid errors
for (const levelKey in courseData) {
    const level = courseData[levelKey];
    if (level) {
        for (let i = 0; i < 9; i++) {
            if (!level[i]) {
                level[i] = { prompts: [{ text: `Placeholder prompt for ${levelKey} lesson ${i+1}.`, translation: "ترجمہ" }] };
            }
        }
    }
}
