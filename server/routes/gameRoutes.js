const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const cron = require("node-cron");

const DailyChallenge = require("../models/DailyChallenge");
const Puzzle = require("../models/Puzzle");
const GameAttempts = require("../models/GameAttempts");
const authMiddleware = require("../middleware/authMiddleware");

const { GoogleGenAI } = require("@google/genai");

// ==========================================
// CONFIGURATION
// ==========================================

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const GEMINI_VERIFY_MODEL =
  process.env.GEMINI_VERIFY_MODEL || GEMINI_MODEL;

const TIME_ZONE = "Asia/Kolkata";

const PUZZLES_PER_DAY = 10;
const POOL_SIZE = 30;
const MAX_ATTEMPTS = 4;
const RECENT_DAYS = 30;

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// GEMINI RETRY
// ==========================================

async function generateWithRetry(ai, request, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(request);
    } catch (error) {
      const message = error.message || "";

      const temporaryError =
        message.includes("503") ||
        message.includes("429") ||
        message.includes("UNAVAILABLE") ||
        message.includes("high demand");

      if (!temporaryError || attempt === maxRetries) {
        throw error;
      }

      const delay = 1500 * attempt;

      console.log(
        `[Gemini] Temporary error. Retrying in ${delay / 1000} seconds...`
      );

      await sleep(delay);
    }
  }
}

// ==========================================
// DATE HELPERS
// ==========================================

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDaysToDateString(dateString, days = 1) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day + days)
  );

  return date.toISOString().slice(0, 10);
}

// ==========================================
// SHARED HELPERS
// ==========================================

const EMOJI_ONLY =
  /^\p{Extended_Pictographic}(?:\uFE0F)?(?:\s*\+\s*\p{Extended_Pictographic}(?:\uFE0F)?){1,2}$/u;

const stripVS = value =>
  String(value).replace(/\uFE0F/g, "").trim();

const emojisOf = question =>
  question.question.split("+").map(stripVS);

const letters = value =>
  String(value).toLowerCase().replace(/[^a-z]/g, "");

const UNCOMMON_DECOYS = new Set([
  "nutmeat"
]);

const UNCOMMON_ANSWERS = new Set([
  "carphone"
]);



const questionKey = question =>
  emojisOf(question).join("|");

const escapeRegExp = value =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const capitalize = value =>
  value.charAt(0).toUpperCase() + value.slice(1);

function parseJSON(text) {
  try {
    const cleaned = String(text || "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    return null;
  }
}

function hashString(str) {
  let hash = 2166136261;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed;

  return function () {
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t =
      (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^
      t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, rand) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));

    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// ==========================================
// DICTIONARY
// npm install word-list
// ==========================================

function loadDictionary() {
  const candidates = [
    path.join(
      process.cwd(),
      "node_modules",
      "word-list",
      "words.txt"
    ),

    path.join(
      __dirname,
      "..",
      "node_modules",
      "word-list",
      "words.txt"
    ),

    path.join(
      __dirname,
      "..",
      "..",
      "node_modules",
      "word-list",
      "words.txt"
    )
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        const words = new Set(
          fs.readFileSync(file, "utf8")
            .split(/\r?\n/)
            .filter(Boolean)
        );

        console.log(`[dictionary] loaded ${words.size} words`);

        return words;
      }
    } catch (error) {
      // Try the next path.
    }
  }

  console.error(
    "[dictionary] word-list not found. Run npm install word-list in server."
  );

  return null;
}

const dictionary = loadDictionary();

function isRealPhrase(phrase) {
  return (
    !!dictionary &&
    String(phrase)
      .toLowerCase()
      .split(/\s+/)
      .every(word => dictionary.has(word))
  );
}

// ==========================================
// EMOJI VOCABULARY
// ==========================================

const VOCAB_ROWS = [

  // Weather and nature

  ["☀️", "sun"],
  ["🌙", "moon"],
  ["⭐", "star"],
  ["☁️", "cloud"],
  ["🌧️", "rain"],
  ["❄️", "snow"],
  ["⛈️", "storm", "thunder"],
  ["🔥", "fire"],
  ["💧", "water", "drop"],
  ["🌊", "sea", "wave", "ocean"],
  ["🌹", "rose"],
  ["🌼", "blossom", "flower"],
  ["🌴", "palm"],
  ["🌲", "pine"],
  ["🌳", "tree"],
  ["🍀", "clover"],
  ["🍁", "maple", "leaf"],
  ["🍂", "leaf", "fall"],
  ["🌵", "cactus"],
  ["🌱", "plant", "seed"],
  ["⛰️", "mountain"],

  // Animals

  ["🐶", "dog"],
  ["🐱", "cat"],
  ["🐭", "mouse"],
  ["🐰", "rabbit"],
  ["🦊", "fox"],
  ["🐻", "bear"],
  ["🐼", "panda"],
  ["🐯", "tiger"],
  ["🦁", "lion"],
  ["🐮", "cow"],
  ["🐷", "pig"],
  ["🐸", "frog"],
  ["🐵", "monkey"],
  ["🐔", "chicken"],
  ["🐧", "penguin"],
  ["🐦", "bird"],
  ["🦆", "duck"],
  ["🦅", "eagle"],
  ["🦉", "owl"],
  ["🐺", "wolf"],
  ["🐴", "horse"],
  ["🦄", "unicorn"],
  ["🐝", "bee"],
  ["🦋", "butterfly"],
  ["🐌", "snail"],
  ["🐜", "ant"],
  ["🕷️", "spider"],
  ["🕸️", "web"],
  ["🐢", "turtle"],
  ["🐍", "snake"],
  ["🐙", "octopus"],
  ["🦀", "crab"],
  ["🐟", "fish"],
  ["🐬", "dolphin"],
  ["🐳", "whale"],
  ["🦈", "shark"],
  ["🐘", "elephant"],
  ["🐑", "sheep"],
  ["🐐", "goat"],
  ["🐪", "camel"],
  ["🦇", "bat"],
  ["🐓", "rooster"],
  ["🐣", "chick"],
  ["🦢", "swan"],
  ["🦜", "parrot"],
  ["🐀", "rat"],
  ["🐚", "shell"],

  // Food and drink

  ["🍎", "apple"],
  ["🍌", "banana"],
  ["🍇", "grape"],
  ["🍓", "strawberry"],
  ["🍒", "cherry"],
  ["🍑", "peach"],
  ["🍋", "lemon"],
  ["🥥", "coconut"],
  ["🥕", "carrot"],
  ["🌽", "corn"],
  ["🥔", "potato"],
  ["🍞", "bread"],
  ["🧀", "cheese"],
  ["🥚", "egg"],
  ["🥓", "bacon"],
  ["🍔", "burger"],
  ["🍕", "pizza"],
  ["🍟", "fries"],
  ["🥜", "peanut", "nut"],
  ["🍰", "cake"],
  ["🍪", "cookie"],
  ["🍫", "chocolate"],
  ["🍬", "candy"],
  ["🍯", "honey"],
  ["🥛", "milk"],
  ["☕", "coffee", "cup"],
  ["🍵", "tea"],
  ["🍩", "donut"],
  ["🧈", "butter"],
  ["🥧", "pie"],
  ["🍿", "popcorn"],
  ["🍄", "mushroom"],
  ["🎃", "pumpkin"],
  ["🥄", "spoon"],
  ["🥣", "bowl"],

  // Body

  ["👂", "ear"],
  ["👁️", "eye"],
  ["👃", "nose"],
  ["👄", "mouth"],
  ["🦷", "tooth"],
  ["🦶", "foot"],
  ["✋", "hand"],
  ["🧠", "brain"],
  ["❤️", "heart"],
  ["💀", "skull"],

  // Objects

  ["🔑", "key"],
  ["🔔", "bell"],
  ["🚪", "door"],
  ["🏠", "house"],
  ["🛏️", "bed"],
  ["💡", "light", "bulb"],
  ["📖", "book"],
  ["⌚", "watch"],
  ["👓", "glasses"],
  ["💍", "ring"],
  ["👟", "shoe"],
  ["🧥", "coat"],
  ["👕", "shirt"],
  ["👜", "bag"],
  ["🔧", "wrench", "tool"],
  ["📌", "pin"],
  ["⛓️", "chain"],
  ["🕯️", "candle"],
  ["🛁", "bath"],
  ["⚽", "ball"],
  ["🥁", "drum"],
  ["📱", "phone"],
  ["🎁", "gift"],
  ["📦", "box"],
  ["✉️", "mail", "letter"],
  ["💎", "diamond"],
  ["⚔️", "sword"],
  ["🏹", "bow", "arrow"],
  ["👔", "tie"],
  ["🥇", "gold", "medal"],
  ["🗼", "tower"],
  ["🏖️", "beach"],
  ["🏫", "school"],

  // Vehicles

  ["🚗", "car"],
  ["🚌", "bus"],
  ["🚂", "train"],
  ["✈️", "plane"],
  ["🚀", "rocket"],
  ["🚢", "ship"],
  ["⛵", "boat"],
  ["🚲", "bike"],
  ["🚜", "tractor"],
  ["🚚", "truck"],

  // People

  ["👨", "man"],
  ["👩", "woman"],
  ["👦", "boy"],
  ["👧", "girl"],
  ["👶", "baby"],

  // Colors

  ["🔴", "red"],
  ["🟠", "orange"],
  ["🟡", "yellow"],
  ["🟢", "green"],
  ["🔵", "blue"],
  ["🟣", "purple"],
  ["⚫", "black"],
  ["⚪", "white"],
  ["🟤", "brown"]

];

const VOCAB = new Map();

for (const [emoji, ...words] of VOCAB_ROWS) {
  const key = stripVS(emoji);

  if (VOCAB.has(key)) {
    console.warn(`[vocab] duplicate emoji skipped: ${emoji}`);
    continue;
  }

  VOCAB.set(key, {
    emoji,
    key,
    words
  });
}

// ==========================================
// APPROVED TWO-WORD PHRASES
// ==========================================

const PHRASES = [

  ["Apple Pie", "apple", "pie"],
  ["Cherry Pie", "cherry", "pie"],
  ["Peach Pie", "peach", "pie"],
  ["Pumpkin Pie", "pumpkin", "pie"],
  ["Peanut Butter", "peanut", "butter"],
  ["Banana Bread", "banana", "bread"],
  ["Carrot Cake", "carrot", "cake"],
  ["Chocolate Cake", "chocolate", "cake"],
  ["Lemon Cake", "lemon", "cake"],
  ["Coffee Cake", "coffee", "cake"],
  ["Chocolate Milk", "chocolate", "milk"],
  ["Cheese Pizza", "cheese", "pizza"],
  ["Pizza Box", "pizza", "box"],
  ["Gift Box", "gift", "box"],
  ["School Bus", "school", "bus"],
  ["Fire Truck", "fire", "truck"],
  ["Sea Lion", "sea", "lion"],
  ["Sea Turtle", "sea", "turtle"],
  ["Apple Tree", "apple", "tree"],
  ["Cherry Tree", "cherry", "tree"],
  ["Phone Book", "phone", "book"],
  ["Rose Water", "rose", "water"]

];

// ==========================================
// SYNONYMS
// ==========================================

const SYNONYM_GROUPS = [

  ["fireman", "firefighter"],
  ["mailman", "postman", "mailcarrier"],
  ["mailbox", "postbox"],
  ["handbag", "purse"],
  ["doghouse", "kennel"],
  ["football", "soccer"],
  ["sunglasses", "shades"],
  ["snowman", "snowperson"],
  ["seashell", "conch"],
  ["sailboat", "yacht"],
  ["cowboy", "cowhand"],
  ["raincoat", "slicker"],
  ["bluebird", "bluejay"]

];

function sameMeaning(a, b) {
  const x = letters(a);
  const y = letters(b);

  return SYNONYM_GROUPS.some(
    group => group.includes(x) && group.includes(y)
  );
}

// Answers that are too uncommon or confusing for a general-audience game
const BLOCKED_ANSWERS = new Set([
  "butterball",
  "moonbow",
  "snowbell",
  "tiepin",
  "footlight",
  "drumfire",
  "watchbox"
]);

function isCommonAnswer(answer) {
  const answerKey = letters(answer);

  return (
    !UNCOMMON_ANSWERS.has(answerKey) &&
    !BLOCKED_ANSWERS.has(answerKey)
  );
}

// ==========================================
// BUILD APPROVED RECIPES
// ==========================================

function buildRecipes() {
  if (!dictionary) {
    return {
      list: [],
      byPair: new Map()
    };
  }

  const entries = [...VOCAB.values()];

  const candidates = new Map();

  const add = (a, b, w1, w2, answer) => {
    const pairKey = `${a.key}|${b.key}`;

    if (!candidates.has(pairKey)) {
      candidates.set(pairKey, new Map());
    }

    const bucket = candidates.get(pairKey);
    const answerKey = letters(answer);

    if (!bucket.has(answerKey)) {
      bucket.set(answerKey, {
        pairKey,
        emojis: [a.emoji, b.emoji],
        question: `${a.emoji} + ${b.emoji}`,
        parts: [w1, w2],
        answer
      });
    }
  };

  // Approved phrases

  for (const [answer, w1, w2] of PHRASES) {
    for (const a of entries) {
      if (!a.words.includes(w1)) continue;

      for (const b of entries) {
        if (b.key !== a.key && b.words.includes(w2)) {
          add(a, b, w1, w2, answer);
        }
      }
    }
  }

  // Dictionary compound words

  for (const a of entries) {
    for (const b of entries) {
      if (a.key === b.key) continue;

      for (const w1 of a.words) {
        for (const w2 of b.words) {
          if (w1 === w2) continue;

          const joined = w1 + w2;

          if (dictionary.has(joined)) {
            add(
              a,
              b,
              w1,
              w2,
              capitalize(joined)
            );
          }
        }
      }
    }
  }

  const list = [];
  const byPair = new Map();

  for (const [pairKey, bucket] of candidates) {
    // Skip ambiguous emoji combinations.
    if (bucket.size !== 1) continue;

    const recipe = [...bucket.values()][0];

    list.push(recipe);
    byPair.set(pairKey, recipe);
  }

  console.log(
    `[recipes] ${list.length} approved emoji puzzles available`
  );

  return {
    list,
    byPair
  };
}

const {
  list: RECIPES,
  byPair: RECIPE_BY_PAIR
} = buildRecipes();

// ==========================================
// HAND-CHECKED PUZZLE BANK
// LAST RESORT ONLY
// ==========================================

const PUZZLE_BANK = [

  {
    id: "p01",
    question: "⭐ + 🐟",
    parts: ["star", "fish"],
    answer: "Starfish",
    options: ["Starfish", "Goldfish", "Swordfish", "Jellyfish"],
    hint: "A five-armed creature found on the ocean floor."
  },

  {
    id: "p02",
    question: "❄️ + 👨",
    parts: ["snow", "man"],
    answer: "Snowman",
    options: ["Snowman", "Snowflake", "Snowball", "Snowstorm"],
    hint: "A winter figure with a carrot nose."
  },

  {
    id: "p03",
    question: "🌧️ + 🏹",
    parts: ["rain", "bow"],
    answer: "Rainbow",
    options: ["Rainbow", "Raincoat", "Raindrop", "Rainstorm"],
    hint: "A colorful arc in the sky after a shower."
  },

  {
    id: "p04",
    question: "🦶 + ⚽",
    parts: ["foot", "ball"],
    answer: "Football",
    options: ["Football", "Basketball", "Baseball", "Handball"],
    hint: "The world's most popular team sport, played on a pitch with goals."
  },

  {
    id: "p05",
    question: "☀️ + 👓",
    parts: ["sun", "glasses"],
    answer: "Sunglasses",
    options: ["Sunglasses", "Sunscreen", "Sunrise", "Sunflower"],
    hint: "Shades that protect your eyes from bright light."
  },

  {
    id: "p06",
    question: "🐶 + 🏠",
    parts: ["dog", "house"],
    answer: "Doghouse",
    options: ["Doghouse", "Dogfish", "Dogwood", "Dogsled"],
    hint: "A small shelter for a backyard pet."
  },

  {
    id: "p07",
    question: "🌊 + 🐴",
    parts: ["sea", "horse"],
    answer: "Seahorse",
    options: ["Seahorse", "Racehorse", "Workhorse", "Warhorse"],
    hint: "A tiny upright swimmer with a curled tail."
  },

  {
    id: "p08",
    question: "🌙 + 💡",
    parts: ["moon", "light"],
    answer: "Moonlight",
    options: ["Moonlight", "Starlight", "Sunlight", "Flashlight"],
    hint: "Silvery glow that brightens a dark night."
  },

  {
    id: "p09",
    question: "🍎 + 🥧",
    parts: ["apple", "pie"],
    answer: "Apple Pie",
    options: ["Apple Pie", "Apple Juice", "Cherry Pie", "Pumpkin Pie"],
    hint: "A classic dessert with a flaky crust and cinnamon."
  },

  {
    id: "p10",
    question: "🧀 + 🍰",
    parts: ["cheese", "cake"],
    answer: "Cheesecake",
    options: ["Cheesecake", "Cheeseburger", "Cheesesteak", "Cupcake"],
    hint: "A creamy dessert with a crumbly biscuit base."
  },

  {
    id: "p11",
    question: "🌲 + 🍎",
    parts: ["pine", "apple"],
    answer: "Pineapple",
    options: ["Pineapple", "Pine Nut", "Crab Apple", "Green Apple"],
    hint: "A spiky tropical fruit with a leafy crown."
  },

  {
    id: "p12",
    question: "🌙 + 🚶",
    parts: ["moon", "walk"],
    answer: "Moonwalk",
    options: ["Moonwalk", "Sleepwalk", "Boardwalk", "Jaywalk"],
    hint: "A backward-gliding dance move made famous by a pop star."
  },

  {
    id: "p13",
    question: "🔵 + 🐦",
    parts: ["blue", "bird"],
    answer: "Bluebird",
    options: ["Bluebird", "Blackbird", "Songbird", "Lovebird"],
    hint: "A small feathered singer with a sky-colored coat."
  },

  {
    id: "p14",
    question: "🟢 + 🏠",
    parts: ["green", "house"],
    answer: "Greenhouse",
    options: ["Greenhouse", "Lighthouse", "Warehouse", "Birdhouse"],
    hint: "A glass building where plants are grown all year."
  },

  {
    id: "p15",
    question: "🐮 + 👦",
    parts: ["cow", "boy"],
    answer: "Cowboy",
    options: ["Cowboy", "Cowgirl", "Cowbell", "Cowhide"],
    hint: "A rancher on the prairie with a wide-brimmed hat and boots."
  },

  {
    id: "p16",
    question: "🐱 + 🐟",
    parts: ["cat", "fish"],
    answer: "Catfish",
    options: ["Catfish", "Dogfish", "Swordfish", "Goldfish"],
    hint: "A whiskered river swimmer named after a household pet."
  },

  {
    id: "p17",
    question: "🥜 + 🧈",
    parts: ["peanut", "butter"],
    answer: "Peanut Butter",
    options: ["Peanut Butter", "Almond Butter", "Peanut Brittle", "Cocoa Butter"],
    hint: "A creamy sandwich spread made from roasted legumes."
  },

  {
    id: "p18",
    question: "🌽 + 🍞",
    parts: ["corn", "bread"],
    answer: "Cornbread",
    options: ["Cornbread", "Cornflakes", "Cornmeal", "Corn Dog"],
    hint: "A golden Southern baked staple made from ground maize."
  },

  {
    id: "p19",
    question: "🚪 + 🔔",
    parts: ["door", "bell"],
    answer: "Doorbell",
    options: ["Doorbell", "Doorknob", "Doormat", "Doorstep"],
    hint: "Press it to let someone know you've arrived."
  },

  {
    id: "p20",
    question: "👂 + 💍",
    parts: ["ear", "ring"],
    answer: "Earring",
    options: ["Earring", "Earphone", "Earmuff", "Earplug"],
    hint: "Jewelry worn on the lobe."
  },

  {
    id: "p21",
    question: "🔑 + ⛓️",
    parts: ["key", "chain"],
    answer: "Keychain",
    options: ["Keychain", "Keyhole", "Keyboard", "Keypad"],
    hint: "A small loop that keeps your door and car openers together."
  },

  {
    id: "p22",
    question: "🧠 + ⛈️",
    parts: ["brain", "storm"],
    answer: "Brainstorm",
    options: ["Brainstorm", "Brainwash", "Brainchild", "Brain Freeze"],
    hint: "A group session to rapidly come up with ideas."
  },

  {
    id: "p23",
    question: "🌊 + 🐚",
    parts: ["sea", "shell"],
    answer: "Seashell",
    options: ["Seashell", "Nutshell", "Bombshell", "Eggshell"],
    hint: "A beachcomber's souvenir, once home to a mollusk."
  },

  {
    id: "p24",
    question: "💧 + 🍂",
    parts: ["water", "fall"],
    answer: "Waterfall",
    options: ["Waterfall", "Waterfront", "Watermelon", "Waterproof"],
    hint: "Where a river drops over a cliff edge."
  },

  {
    id: "p25",
    question: "🥚 + 🌱",
    parts: ["egg", "plant"],
    answer: "Eggplant",
    options: ["Eggplant", "Eggroll", "Eggnog", "Egg Salad"],
    hint: "A purple vegetable also known as aubergine."
  },

  {
    id: "p26",
    question: "☀️ + 🔥",
    parts: ["sun", "burn"],
    answer: "Sunburn",
    options: ["Sunburn", "Sunscreen", "Sunrise", "Sunset"],
    hint: "Red, sore skin from too long outdoors at midday."
  },

  {
    id: "p27",
    question: "🌧️ + 🧥",
    parts: ["rain", "coat"],
    answer: "Raincoat",
    options: ["Raincoat", "Rainbow", "Raindrop", "Rainstorm"],
    hint: "A waterproof jacket for wet weather."
  },

  {
    id: "p28",
    question: "🛏️ + 🐛",
    parts: ["bed", "bug"],
    answer: "Bedbug",
    options: ["Bedbug", "Bedroom", "Bedtime", "Bedsheet"],
    hint: "A tiny biting pest that hides in mattresses."
  },

  {
    id: "p29",
    question: "⌚ + 🐶",
    parts: ["watch", "dog"],
    answer: "Watchdog",
    options: ["Watchdog", "Bulldog", "Sheepdog", "Hot Dog"],
    hint: "A guard animal that barks at intruders."
  },

  {
    id: "p30",
    question: "🌳 + 🏠",
    parts: ["tree", "house"],
    answer: "Treehouse",
    options: ["Treehouse", "Birdhouse", "Lighthouse", "Playhouse"],
    hint: "A hideout built among the branches."
  }

];



// ==========================================
// VALIDATION
// ==========================================

function hintLeaks(hint, recipe) {
  const words =
    String(hint).toLowerCase().match(/[a-z]+/g) || [];

  const banned = [
    ...recipe.answer.toLowerCase().split(/\s+/),
    ...recipe.parts.map(part => part.toLowerCase())
  ];

  return words.some(word =>
    banned.some(
      part =>
        word === part ||
        word === part + "s" ||
        word === part + "es" ||
        (part.length >= 4 && word.startsWith(part))
    )
  );
}

function structuralProblems(q) {
  const problems = [];

  if (
    !q ||
    typeof q.question !== "string" ||
    typeof q.answer !== "string" ||
    typeof q.hint !== "string" ||
    !q.question.trim() ||
    !q.answer.trim() ||
    !q.hint.trim()
  ) {
    return ["missing field"];
  }

  if (!EMOJI_ONLY.test(q.question.trim())) {
    problems.push("question must be 2-3 emojis joined by +");
  }

  const emojis = emojisOf(q);

  if (new Set(emojis).size !== emojis.length) {
    problems.push("repeated emoji");
  }

  if (!/^[A-Za-z]+( [A-Za-z]+)?$/.test(q.answer.trim())) {
    problems.push("answer must be 1-2 plain words");
  }

  if (
    !Array.isArray(q.options) ||
    q.options.length !== 4 ||
    q.options.some(
      option => typeof option !== "string" || !option.trim()
    )
  ) {
    problems.push("needs exactly 4 text options");
  } else {
    const normalized = q.options.map(option =>
      letters(option)
    );

    if (new Set(normalized).size !== 4) {
      problems.push("duplicate options");
    }

    if (!normalized.includes(letters(q.answer))) {
      problems.push("answer not in options");
    }
  }

  const hintLower = q.hint.toLowerCase();

  const answerLeaks = q.answer
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some(word =>
      new RegExp(
        `\\b${escapeRegExp(word)}\\b`
      ).test(hintLower)
    );

  if (answerLeaks) {
    problems.push("hint leaks the answer");
  }

  return problems;
}

// ==========================================
// DECOY VALIDATION
// ==========================================

function decoyProblems(recipe, decoy) {
  if (
    typeof decoy !== "string" ||
    !/^[A-Za-z]+( [A-Za-z]+)?$/.test(decoy.trim())
  ) {
    return ["decoy must be 1-2 plain words"];
  }

  const problems = [];

  const d = decoy.trim();
  const dl = d.toLowerCase();

  const answerWords = recipe.answer.split(" ");
  const decoyWords = dl.split(" ");

  const [p1, p2] = recipe.parts;

  const answerKey = letters(recipe.answer);
  const decoyKey = letters(d);

  // Reject uncommon decoys
  if (UNCOMMON_DECOYS.has(decoyKey)) {
    problems.push(`"${d}" is an uncommon decoy`);
  }

  // Check word pattern
  if (decoyWords.length !== answerWords.length) {
    problems.push(`"${d}" has a different word pattern`);
  }

  // Check dictionary
  if (!isRealPhrase(d)) {
    problems.push(`"${d}" is not a real word`);
  }

  // Reject the correct answer
  if (decoyKey === answerKey) {
    problems.push(`"${d}" equals the answer`);
  }

  // Plural / singular check
  if (
    decoyKey === answerKey + "s" ||
    decoyKey === answerKey + "es" ||
    answerKey === decoyKey + "s" ||
    answerKey === decoyKey + "es"
  ) {
    problems.push(`"${d}" is a plural of the answer`);
  }

  // Check shared word parts
  let shares;

  if (answerWords.length === 1) {
    shares =
      (dl.startsWith(p1) && dl.length > p1.length) ||
      (dl.endsWith(p2) && dl.length > p2.length);
  } else {
    shares =
      decoyWords[0] === p1 ||
      decoyWords[1] === p2;
  }

  if (!shares) {
    problems.push(`"${d}" does not share a part with the answer`);
  }

  // Reject synonyms
  if (sameMeaning(d, recipe.answer)) {
    problems.push(`"${d}" means the same as the answer`);
  }

  return problems;
}

function isPluralPair(a, b) {
  const x = letters(a);
  const y = letters(b);

  return (
    x === y + "s" ||
    x === y + "es" ||
    y === x + "s" ||
    y === x + "es"
  );
}

function decoySetProblems(decoys) {
  const problems = [];

  for (let i = 0; i < decoys.length; i++) {
    for (let j = i + 1; j < decoys.length; j++) {

      if (isPluralPair(decoys[i], decoys[j])) {
        problems.push(
          `"${decoys[i]}" and "${decoys[j]}" look like duplicates`
        );
      }

      if (sameMeaning(decoys[i], decoys[j])) {
        problems.push(
          `"${decoys[i]}" and "${decoys[j]}" have similar meanings`
        );
      }
    }
  }

  return problems;
}

// ==========================================
// TRUSTED PUZZLE VALIDATION
// ==========================================

function trustedProblems(q) {
  const problems = structuralProblems(q);

  if (problems.length) return problems;

  // Reject uncommon answers
  if (!isCommonAnswer(q.answer)) {
    return ["answer is too uncommon for the game"];
  }

  const recipe = RECIPE_BY_PAIR.get(
    emojisOf(q).join("|")
  );

  if (!recipe) {
    return ["emojis are not an approved pair"];
  }

  if (letters(recipe.answer) !== letters(q.answer)) {
    return ["answer does not match the emojis"];
  }

  if (hintLeaks(q.hint, recipe)) {
    problems.push("hint leaks the answer or a part of it");
  }

  const wrong = q.options.filter(
    option => letters(option) !== letters(q.answer)
  );

  wrong.forEach(option => {
    problems.push(...decoyProblems(recipe, option));
  });

  problems.push(...decoySetProblems(wrong));

  return problems;
}

// ==========================================
// GEMINI GENERATION PROMPT
// ==========================================

function createGenerationPrompt(pool) {
  const items = pool.map((recipe, id) => ({
    id,
    emojis: recipe.question,
    answer: recipe.answer,
    parts: recipe.parts
  }));

  return `
You are the word-and-hint writer for an emoji word-guessing game.

The emojis and answers are already checked and fixed.
Never change them.

YOUR JOB:
For every puzzle you keep, write exactly 3 decoys and 1 hint.

Keep AT MOST 18 puzzles.

Skip a puzzle when:
- The answer is obscure, archaic, regional or technical.
- The answer is not common English.
- Its meaning has nothing to do with its two parts.
- You cannot create 3 strong decoys.
- The answer is unsuitable for children.
- The answer is uncommon or unfamiliar to an average English-speaking student.
- The answer is a rare compound, obscure object, botanical name, technical term,
  brand name, or unusual expression.
- The answer would require explaining an uncommon meaning.
- Prefer familiar everyday words such as Starfish, Raincoat, Snowman and Waterfall.
- When uncertain whether a word is common, SKIP it.

DECOY RULES:

1. Each decoy must be a real, common English word or phrase.
2. Keep the same word pattern as the answer.
3. Each decoy must retain either the first or last part.
4. Each decoy must be clearly wrong for the changed emoji.
5. Never use synonyms or alternative names.
6. Never use plurals of the answer.
7. The three wrong options must be different.

Examples:

Snowman:
Snowflake, Snowball, Snowstorm.

Apple Pie:
Apple Juice, Cherry Pie, Pumpkin Pie.

HINT RULES:

- One short sentence.
- Maximum 15 words.
- Describe what the answer is.
- Do not include the answer or either part.
- Do not mention emojis.

PUZZLES:

${JSON.stringify(items)}

OUTPUT:

Return only valid JSON.

{
  "puzzles": [
    {
      "id": 0,
      "decoys": ["Snowflake", "Snowball", "Snowstorm"],
      "hint": "A winter figure with a carrot nose."
    }
  ]
}
`;
}

// ==========================================
// CREATE PUZZLE
// ==========================================

function makePuzzle(recipe, decoys, hint) {
  const options = seededShuffle(
    [recipe.answer, ...decoys],
    mulberry32(hashString(recipe.answer + hint))
  );

  return {
    question: recipe.question,
    parts: recipe.parts,
    answer: recipe.answer,
    options,
    hint
  };
}

// ==========================================
// GENERATE CANDIDATES
// ==========================================

async function generateCandidates(ai, pool) {
  const response = await generateWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: createGenerationPrompt(pool),
    config: {
      responseMimeType: "application/json",
      temperature: 0.4
    }
  });

  const rawText = response.text || "";
  const parsed = parseJSON(rawText);

  // Accept both supported response structures
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.puzzles)
      ? parsed.puzzles
      : null;

  if (!list) {
    console.error(
      "[Gemini] Invalid response format:",
      String(rawText).slice(0, 1500)
    );
    return [];
  }

  const out = [];
  const seen = new Set();

  for (const p of list) {
    const index = Number(p?.id);
    const recipe =
      Number.isInteger(index) && index >= 0
        ? pool[index]
        : null;

    if (!recipe || seen.has(index)) continue;

    seen.add(index);

    const decoys = Array.isArray(p.decoys)
      ? p.decoys.map(d => String(d).trim())
      : [];

    const hint = String(p.hint || "").trim();

    const problems = [];

    if (decoys.length !== 3) {
      problems.push("needs exactly 3 decoys");
    }

    if (new Set(decoys.map(letters)).size !== decoys.length) {
      problems.push("duplicate decoys");
    }

    decoys.forEach(decoy => {
      problems.push(...decoyProblems(recipe, decoy));
    });

    problems.push(...decoySetProblems(decoys));

    if (hint.length < 8 || hint.length > 140) {
      problems.push("hint has a bad length");
    }

    if (hintLeaks(hint, recipe)) {
      problems.push("hint leaks the answer or a part of it");
    }

    if (problems.length) {
      console.warn(
        `[local] Rejected "${recipe.answer}": ${problems.join("; ")}`
      );
      continue;
    }

    out.push(makePuzzle(recipe, decoys, hint));
  }

  console.log(`[Gemini] ${out.length} candidates passed local validation.`);

  return out;
}

// ==========================================
// GEMINI BLIND VERIFICATION
// ==========================================

function createVerifyPrompt(items) {
  return `
You are a strict judge for an emoji rebus game.

You are NOT told the correct answers.

The emojis are read from left to right.
Each emoji must directly represent one part of the answer.

For every puzzle, judge every option.

For each option:
- Split the option into its natural parts.
- Identify what each emoji literally depicts.
- "fits" is true only when all parts match in order.
- "confusable" is true when an incorrect option is a synonym or alternative name.

Do not mark an option confusing merely because it shares one part.

PUZZLES:

${JSON.stringify(items)}

Return ONLY JSON in this format:

{
  "results": [
    {
      "id": 0,
      "options": [
        {
          "option": "Snowman",
          "parts": ["snow", "man"],
          "emoji_names": ["snowflake", "man"],
          "fits": true,
          "confusable": false
        }
      ]
    }
  ]
}
`;
}

async function verifyCandidates(ai, candidates) {
  if (!candidates.length) return [];

  const items = candidates.map((q, id) => ({
    id,
    emojis: q.question,
    options: q.options
  }));

  const response = await generateWithRetry(ai, {
    model: GEMINI_VERIFY_MODEL,
    contents: createVerifyPrompt(items),
    config: {
      responseMimeType: "application/json",
      temperature: 0
    }
  });

  const parsed = parseJSON(response.text);

  const results = Array.isArray(parsed?.results)
    ? parsed.results
    : [];

  return candidates.filter((q, id) => {
    const result = results.find(
      item => item && Number(item.id) === id
    );

    const options = Array.isArray(result?.options)
      ? result.options
      : [];

    let reason = "";

    const expectedOptions = new Set(
      q.options.map(letters)
    );

    const judgedOptions = new Set(
      options.map(item => letters(item?.option))
    );

    const fits = options.filter(
      option => option && option.fits === true
    );

    const confusing = options.filter(
      option =>
        option &&
        option.fits !== true &&
        option.confusable === true
    );

    if (!result) {
      reason = "no verifier result";
    } else if (options.length !== 4) {
      reason = "verifier did not judge all 4 options";
    } else if (
      judgedOptions.size !== 4 ||
      [...expectedOptions].some(
        option => !judgedOptions.has(option)
      )
    ) {
      reason = "verifier options do not match the puzzle";
    } else if (fits.length !== 1) {
      reason = `${fits.length} options fit`;
    } else if (
      letters(fits[0].option) !== letters(q.answer)
    ) {
      reason = `verifier chose "${fits[0].option}"`;
    } else if (confusing.length) {
      reason =
        `confusing option: ${
          confusing.map(option => option.option).join(", ")
        }`;
    }

    if (reason) {
      console.warn(
        `[verify] rejected "${q.answer}": ${reason}`
      );
    }

    return !reason;
  });
}

// ==========================================
// SAVE VALIDATED GEMINI PUZZLES
// ==========================================

async function saveGeminiPuzzles(questions, today) {
  let savedCount = 0;

  for (const q of questions) {
    const answerRegex = new RegExp(
      `^${escapeRegExp(q.answer)}$`,
      "i"
    );

    const existing = await Puzzle.findOne({
      answer: answerRegex
    });

    const puzzleData = {
      question: q.question,
      parts: q.parts,
      answer: q.answer,
      options: q.options,
      hint: q.hint,
      origin: "gemini",
      generatedForDate: today,
      model: GEMINI_MODEL
    };

    if (existing) {
      const existingData =
        typeof existing.toObject === "function"
          ? existing.toObject()
          : existing;

      // Keep an already valid saved puzzle.
      if (trustedProblems(existingData).length === 0) {
        continue;
      }

      // Replace an invalid saved version.
      await Puzzle.updateOne(
        { _id: existing._id },
        { $set: puzzleData }
      );

      savedCount++;
      continue;
    }

    await Puzzle.create(puzzleData);
    savedCount++;
  }

  console.log(
    `[puzzle-bank] Saved or updated ${savedCount} Gemini puzzles.`
  );

  return savedCount;
}

// ==========================================
// RECENT CHALLENGE HISTORY
// ==========================================

async function getRecentHistory(excludeDate) {
  const docs = await DailyChallenge.find(
    {
      date: {
        $lt: excludeDate
      }
    },
    {
      questions: 1,
      _id: 0
    }
  )
    .sort({ date: -1 })
    .limit(RECENT_DAYS)
    .lean();

  const answers = new Set();
  const questions = new Set();

  for (const doc of docs) {
    for (const q of doc.questions || []) {
      if (q.answer) {
        answers.add(letters(q.answer));
      }

      if (q.question) {
        questions.add(questionKey(q));
      }
    }
  }

  console.log(
    `[history] Checked ${docs.length} previous daily challenges.`
  );

  return {
    answers,
    questions
  };
}

// ==========================================
// ADD A UNIQUE PUZZLE
// ==========================================

function addIfFresh(selected, state, q, origin) {
  const emojis = emojisOf(q);

  const answerKey = letters(q.answer);
  const qKey = questionKey(q);

  // No duplicate answer or emoji combination.
  if (state.answers.has(answerKey)) return false;
  if (state.questions.has(qKey)) return false;

  // Do not reuse an emoji inside today's 10 puzzles.
  if (
    emojis.some(emoji => state.emojis.has(emoji))
  ) {
    return false;
  }

  emojis.forEach(emoji => {
    state.emojis.add(emoji);
  });

  state.answers.add(answerKey);
  state.questions.add(qKey);

  selected.push({
    id: q._id
      ? String(q._id)
      : q.id || `${origin}-${answerKey}`,

    question: q.question,
    parts: q.parts || [],
    answer: q.answer,
    options: q.options,
    hint: q.hint,
    origin
  });

  return true;
}

// ==========================================
// PICK A FRESH GEMINI RECIPE POOL
// ==========================================

function pickPool(today, attempt, history, state) {
  const rand = mulberry32(
    hashString(`${today}-pool-${attempt}`)
  );

  const eligible = RECIPES.filter(recipe => {
    const answerKey = letters(recipe.answer);
    const qKey = questionKey(recipe);

    return (
      isCommonAnswer(recipe.answer) &&
      !history.answers.has(answerKey) &&
      !history.questions.has(qKey) &&
      !state.answers.has(answerKey) &&
      !state.questions.has(qKey) &&
      !recipe.emojis.some(
        emoji => state.emojis.has(stripVS(emoji))
      )
    );
  });

  const ordered = seededShuffle(eligible, rand);

  const usedEmojis = new Set();
  const pool = [];

  for (const recipe of ordered) {
    const keys = recipe.emojis.map(stripVS);

    if (
      keys.some(key => usedEmojis.has(key))
    ) {
      continue;
    }

    keys.forEach(key => usedEmojis.add(key));

    pool.push(recipe);

    if (pool.length >= POOL_SIZE) {
      break;
    }
  }

  return pool;
}

// ==========================================
// BUILD TODAY'S 10 PUZZLES
// ==========================================

async function buildQuestions(
  today,
  blockedAnswers = [],
  blockedQuestions = []
) {
  const selected = [];

  const state = {
    emojis: new Set(),
    answers: new Set(),
    questions: new Set()
  };

  const history = await getRecentHistory(today);

  // Prevent reuse from a challenge that is being replaced.
  blockedAnswers.forEach(answer => {
    history.answers.add(letters(answer));
  });

  blockedQuestions.forEach(question => {
    if (question) {
      history.questions.add(
        question
          .split("+")
          .map(stripVS)
          .join("|")
      );
    }
  });

  console.log(
    `[daily] Preparing ${PUZZLES_PER_DAY} fresh puzzles for ${today}.`
  );

  // ----------------------------------------
  // STEP 1: REUSE VALID, UNUSED GEMINI PUZZLES
  // ----------------------------------------

  const stored = await Puzzle.find({
    origin: "gemini"
  }).lean();

  const validStored = stored.filter(q => {
    if (trustedProblems(q).length !== 0) {
      return false;
    }

    const answerKey = letters(q.answer);
    const qKey = questionKey(q);

    return (
      !history.answers.has(answerKey) &&
      !history.questions.has(qKey)
    );
  });

  const storedRandom = mulberry32(
    hashString(`${today}-stored`)
  );

  for (const q of seededShuffle(validStored, storedRandom)) {
    if (selected.length >= PUZZLES_PER_DAY) {
      break;
    }

    addIfFresh(selected, state, q, "gemini");
  }

  console.log(
    `[daily] Loaded ${selected.length}/${PUZZLES_PER_DAY} fresh saved Gemini puzzles.`
  );

  // ----------------------------------------
  // STEP 2: GENERATE NEW GEMINI PUZZLES
  // ----------------------------------------

  const apiKey = process.env.GEMINI_API_KEY;

  if (
    selected.length < PUZZLES_PER_DAY &&
    apiKey &&
    dictionary &&
    RECIPES.length
  ) {
    const ai = new GoogleGenAI({
      apiKey
    });

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS &&
      selected.length < PUZZLES_PER_DAY;
      attempt++
    ) {
      try {
        console.log(
          `[daily] Gemini attempt ${attempt}/${MAX_ATTEMPTS}...`
        );

        const pool = pickPool(
          today,
          attempt,
          history,
          state
        );

        if (!pool.length) {
          console.warn(
            "[daily] No unused approved recipes remain."
          );

          break;
        }

        const candidates = await generateCandidates(
          ai,
          pool
        );

        console.log(
          `[daily] ${candidates.length} puzzles passed local validation.`
        );

        if (!candidates.length) {
          continue;
        }

        const verified = await verifyCandidates(
          ai,
          candidates
        );

        console.log(
          `[daily] ${verified.length} puzzles passed blind verification.`
        );

        await saveGeminiPuzzles(
          verified,
          today
        );

        for (const q of verified) {
          if (selected.length >= PUZZLES_PER_DAY) {
            break;
          }

          addIfFresh(
            selected,
            state,
            q,
            "gemini"
          );
        }

        console.log(
          `[daily] Progress: ${selected.length}/${PUZZLES_PER_DAY}`
        );

      } catch (error) {
        console.error(
          `[daily] Gemini attempt ${attempt} failed:`,
          error.message
        );
      }
    }
  }

  // ----------------------------------------
  // STEP 3: FRESH HAND-CHECKED BANK ONLY
  // ----------------------------------------

  if (selected.length < PUZZLES_PER_DAY) {
    console.log(
      `[daily] Checking fresh hand-checked puzzles: ${PUZZLES_PER_DAY - selected.length} needed.`
    );

    const freshBank = PUZZLE_BANK.filter(q => {
      if (structuralProblems(q).length !== 0) {
        return false;
      }

      const answerKey = letters(q.answer);
      const qKey = questionKey(q);

      return (
        !history.answers.has(answerKey) &&
        !history.questions.has(qKey)
      );
    });

    const bankRandom = mulberry32(
      hashString(`${today}-bank`)
    );

    for (const q of seededShuffle(freshBank, bankRandom)) {
      if (selected.length >= PUZZLES_PER_DAY) {
        break;
      }

      addIfFresh(
        selected,
        state,
        q,
        "puzzle-bank"
      );
    }
  }

  // ----------------------------------------
  // STEP 4: DO NOT REPEAT OLD QUESTIONS
  // ----------------------------------------

  if (selected.length !== PUZZLES_PER_DAY) {
    throw new Error(
      `Only ${selected.length}/${PUZZLES_PER_DAY} fresh questions are available. No recently used questions were repeated.`
    );
  }

  const final = seededShuffle(
    selected,
    mulberry32(hashString(`${today}-order`))
  );

  const geminiCount = final.filter(
    q => q.origin === "gemini"
  ).length;

  const source =
    geminiCount === PUZZLES_PER_DAY
      ? "gemini"
      : geminiCount > 0
        ? "gemini+bank"
        : "puzzle-bank";

  const generatedBy =
    source === "gemini"
      ? "Google Gemini AI"
      : source === "gemini+bank"
        ? "Gemini AI + Puzzle Bank"
        : "Questify Puzzle Bank";

  console.log(
    `[daily] Successfully built ${final.length} fresh puzzles (${source}).`
  );

  return {
    questions: final,
    source,
    generatedBy
  };
}

// ==========================================
// CHECK WHETHER A QUESTION IS FROM THE BANK
// ==========================================

function findBankQuestion(q) {
  return PUZZLE_BANK.find(
    bankQuestion =>
      bankQuestion.question === q.question &&
      letters(bankQuestion.answer) === letters(q.answer)
  );
}

function challengeIsTrusted(challenge) {
  const questions = challenge.questions || [];

  if (questions.length !== PUZZLES_PER_DAY) {
    return false;
  }

  const seenAnswers = new Set();
  const seenQuestions = new Set();
  const seenEmojis = new Set();

  for (const q of questions) {
    const answerKey = letters(q.answer);
    const qKey = questionKey(q);

    if (seenAnswers.has(answerKey)) {
      return false;
    }

    if (seenQuestions.has(qKey)) {
      return false;
    }

    const emojis = emojisOf(q);

    if (emojis.some(emoji => seenEmojis.has(emoji))) {
      return false;
    }

    seenAnswers.add(answerKey);
    seenQuestions.add(qKey);

    emojis.forEach(emoji => {
      seenEmojis.add(emoji);
    });

    const bankQuestion = findBankQuestion(q);

    if (bankQuestion) {
      const sameOptions =
        Array.isArray(q.options) &&
        q.options.map(letters).sort().join("|") ===
        bankQuestion.options.map(letters).sort().join("|");

      const isValidBankQuestion =
        q.question === bankQuestion.question &&
        letters(q.answer) === letters(bankQuestion.answer) &&
        q.hint === bankQuestion.hint &&
        sameOptions;

      if (!isValidBankQuestion) {
        return false;
      }
    } else {
      if (trustedProblems(q).length !== 0) {
        return false;
      }
    }
  }

  return true;
}

// ==========================================
// SAVE OR REPLACE DAILY CHALLENGE
// ==========================================

async function buildAndSave(
  today,
  replaceId = null,
  blockedAnswers = [],
  blockedQuestions = []
) {
  const {
    questions,
    source,
    generatedBy
  } = await buildQuestions(
    today,
    blockedAnswers,
    blockedQuestions
  );

  const challengeData = {
    date: today,
    questions,
    source,
    generatedBy,
    model: GEMINI_MODEL,
    generatedAt: new Date()
  };

  // Update the old challenge only after the replacement is ready.
  if (replaceId) {
    const updated = await DailyChallenge.findByIdAndUpdate(
      replaceId,
      {
        $set: challengeData
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (updated) {
      console.log(`[daily] Replaced challenge for ${today}.`);
      return updated.toObject();
    }
  }

  try {
    const created = await DailyChallenge.create(
      challengeData
    );

    console.log(
      `[daily] Saved ${today} (${source}).`
    );

    return created.toObject();

  } catch (error) {
    if (error.code === 11000) {
      return DailyChallenge.findOne({
        date: today
      }).lean();
    }

    throw error;
  }
}

// ==========================================
// ENSURE DAILY CHALLENGE
// ==========================================

const inFlight = new Map();

async function ensureChallenge(today) {

  // If another request is already generating this date,
  // reuse the same promise instead of generating twice.

  if (inFlight.has(today)) {
    return inFlight.get(today);
  }

  const generationPromise = (async () => {
    const existing = await DailyChallenge.findOne({
      date: today
    }).lean();

    const history = await getRecentHistory(today);

    const hasRecentRepeat =
      existing &&
      (existing.questions || []).some(q => {
        return (
          history.answers.has(letters(q.answer)) ||
          history.questions.has(questionKey(q))
        );
      });

    const trusted =
      existing &&
      existing.source &&
      (
        !dictionary ||
        challengeIsTrusted(existing)
      );

    // Existing valid challenge with no repeats.
    if (trusted && !hasRecentRepeat) {
      console.log(
        `[daily] Existing challenge for ${today} is valid.`
      );

      return existing;
    }

    // Do not replace a challenge once players have started it.
    // Their saved answers refer to the existing question IDs.

    if (existing) {
      const attemptsStarted = await GameAttempts.countDocuments({
        date: today
      });

      if (attemptsStarted > 0) {
        console.warn(
          `[daily] Keeping ${today}'s existing challenge because player progress already exists.`
        );

        return existing;
      }
    }

    if (existing) {
      console.warn(
        `[daily] Challenge for ${today} failed validation or contains recent repeats. Rebuilding...`
      );
    }

    const blockedAnswers = (
      existing?.questions || []
    ).map(q => q.answer);

    const blockedQuestions = (
      existing?.questions || []
    ).map(q => q.question);

    return await buildAndSave(
      today,
      existing ? existing._id : null,
      blockedAnswers,
      blockedQuestions
    );
  })();

  inFlight.set(today, generationPromise);

  try {
    return await generationPromise;
  } finally {
    inFlight.delete(today);
  }
}

// ==========================================
// GET TODAY'S CHALLENGE
// Correct answers are NEVER sent to the client
// ==========================================

router.get("/daily", async (req, res) => {
  try {
    const challenge = await ensureChallenge(
      getTodayDate()
    );

    return res.json({
      date: challenge.date,
      generatedBy: challenge.generatedBy,

      questions: challenge.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        hint: q.hint
      }))
    });

  } catch (error) {
    console.error(
      "Daily Challenge Error:",
      error
    );

    return res.status(503).json({
      success: false,
      message:
        "Today's challenge is being prepared. Please try again shortly."
    });
  }
});

// ==========================================
// CHECK PLAYER'S ANSWER
// ==========================================

router.post("/answer", authMiddleware, async (req, res) => {
  try {
    const {
      date,
      questionId,
      selectedAnswer
    } = req.body;

    const userId = req.user._id;

   if (
  !date ||
  !questionId ||
  typeof selectedAnswer !== "string" ||
  !selectedAnswer.trim()
) {
  return res.status(400).json({
    success: false,
    message: "Date, question ID and a valid answer are required."
  });
}

    const today = getTodayDate();

    if (date !== today) {
      return res.status(400).json({
        success: false,
        message: "This daily challenge has expired."
      });
    }

    // Retrieve today's challenge.
    const challenge = await DailyChallenge.findOne({ date }).lean();

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: "Daily challenge not found."
      });
    }

    const question = challenge.questions.find(
      q => q.id === questionId
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found."
      });
    }

    if (!question.options.includes(selectedAnswer)) {
      return res.status(400).json({
        success: false,
        message: "Invalid answer option."
      });
    }

    const isCorrect =
      question.answer.trim().toLowerCase() ===
      selectedAnswer.trim().toLowerCase();

    // Ensure today's attempt exists.
    try {
      await GameAttempts.findOneAndUpdate(
        { userId, date, },
        {
          $setOnInsert: {
            userId,
            date,
            answers: [],
            score: 0,
            completed: false
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }

    const now = new Date();

    const newAnsweredCount = {
      $add: [
        { $size: { $ifNull: ["$answers", []] } },
        1
      ]
    };

    // Atomically add the answer and update the score.
    const attempt = await GameAttempts.findOneAndUpdate(
      {
        userId,
        date,
        completed: false,
        "answers.questionId": { $ne: questionId },
        $expr: {
          $lt: [
            { $size: { $ifNull: ["$answers", []] } },
            PUZZLES_PER_DAY
          ]
        }
      },
      [
        {
          $set: {
             
            answers: {
              $concatArrays: [
                { $ifNull: ["$answers", []] },
                [{
                  questionId,
                  selectedAnswer,
                  correct: isCorrect,
                  answeredAt: now
                }]
              ]
            },

            score: {
              $add: [
                { $ifNull: ["$score", 0] },
                isCorrect ? 10 : 0
              ]
            },

            completed: {
              $gte: [
                newAnsweredCount,
                PUZZLES_PER_DAY
              ]
            },

            completedAt: {
              $cond: [
                {
                  $gte: [
                    newAnsweredCount,
                    PUZZLES_PER_DAY
                  ]
                },
                now,
                "$completedAt"
              ]
            }
          }
        }
      ],
      {
        new: true,
        updatePipeline: true
      }
    );

    // Handle duplicate answers or completed attempts.
    if (!attempt) {
      const existingAttempt = await GameAttempts.findOne({
        userId,
        date
      }).lean();

      if (existingAttempt?.completed) {
        return res.status(403).json({
          success: false,
          message: "You have already completed today's challenge."
        });
      }

      if (
        existingAttempt?.answers.some(
          answer => answer.questionId === questionId
        )
      ) {
        return res.status(409).json({
          success: false,
          message: "You have already answered this question."
        });
      }

      return res.status(403).json({
        success: false,
        message: "No more questions can be answered today."
      });
    }

    return res.status(200).json({
      success: true,
      correct: isCorrect,
      correctAnswer: question.answer,
      score: attempt.score,
      answeredCount: attempt.answers.length,
      completed: attempt.completed
    });

  } catch (error) {
    console.error("Answer Checking Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to check the answer."
    });
  }
});

// ==========================================
// PRE-GENERATE TOMORROW'S CHALLENGE
// EVERY DAY AT 11 PM IST
// ==========================================

cron.schedule(
  "0 23 * * *",
  async () => {
    const tomorrow = addDaysToDateString(
      getTodayDate(),
      1
    );

    console.log(
      `[scheduler] Preparing tomorrow's challenge: ${tomorrow}`
    );

    try {
      await ensureChallenge(tomorrow);

      console.log(
        `[scheduler] Tomorrow's challenge is ready: ${tomorrow}`
      );

    } catch (error) {
      console.error(
        "[scheduler] Tomorrow's generation failed:",
        error.message
      );
    }
  },
  {
    timezone: TIME_ZONE
  }
);

console.log(
  "[scheduler] Tomorrow's generation scheduled for 11:00 PM IST."
);

// ==========================================
// MIDNIGHT FALLBACK
// ==========================================

cron.schedule(
  "0 0 * * *",
  async () => {
    const today = getTodayDate();

    console.log(
      `[scheduler] Checking daily challenge for ${today}`
    );

    try {
      await ensureChallenge(today);

      console.log(
        `[scheduler] Daily challenge ready for ${today}`
      );

    } catch (error) {
      console.error(
        "[scheduler] Generation failed:",
        error.message
      );
    }
  },
  {
    timezone: TIME_ZONE
  }
);

console.log(
  "[scheduler] Midnight challenge check scheduled for 12:00 AM IST."
);

// ==========================================
// PUZZLE BANK STATISTICS
// ==========================================

router.get("/bank/stats", async (req, res) => {
  try {
    const total = await Puzzle.countDocuments();

    const gemini = await Puzzle.countDocuments({
      origin: "gemini"
    });

    const puzzleBank = await Puzzle.countDocuments({
      origin: "puzzle-bank"
    });

    const latest = await Puzzle.findOne()
  .sort({ createdAt: -1 })
  .select("generatedForDate createdAt model");

    return res.status(200).json({
      success: true,

      statistics: {
        total,
        gemini,
        puzzleBank,
        approvedRecipes: RECIPES.length
      },

      latest
    });

  } catch (error) {
    console.error(
      "Puzzle Statistics Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch puzzle statistics."
    });
  }
});

// ==========================================
// GET PLAYER PROGRESS
// ==========================================

router.get("/progress", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const date = getTodayDate();


    const attempt = await GameAttempts.findOne({
      userId,
      date
    }).lean();

    if (!attempt) {
      return res.json({
        success: true,
        answered: [],
        score: 0,
        completed: false
      });
    }

    return res.json({
      success: true,
      answered: attempt.answers,
      score: attempt.score,
      completed: attempt.completed
    });

  } catch (error) {
    console.error(
      "Progress Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load game progress."
    });
  }
});

// ==========================================
// EXPORT ROUTER
// ==========================================

// ==========================================
// DEVELOPER: PREVIEW TOMORROW'S QUESTIONS
// Does not replace the saved daily challenge.
// ==========================================

router.get("/dev-preview-next", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      message: "Not Found."
    });
  }

  try {



    const tomorrow = addDaysToDateString(getTodayDate(), 1);

    console.log(
      `[dev-preview] Generating preview for ${tomorrow}`
    );

    const result = await buildQuestions(tomorrow);

    return res.json({
      success: true,
      date: tomorrow,
      generatedBy: result.generatedBy,
      source: result.source,
      count: result.questions.length,
      questions: result.questions.map(q => ({
        question: q.question,
        answer: q.answer,
        options: q.options,
        hint: q.hint,
        origin: q.origin
      }))
    });

  } catch (error) {
    console.error("[dev-preview] Generation failed:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
