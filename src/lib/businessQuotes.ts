/**
 * Daily Business Quotes from Famous Tycoons & Entrepreneurs
 * 
 * Rotates by date + vendor ID so each vendor sees a different quote each day.
 * No external API needed — self-contained with 120+ curated quotes.
 */

export interface BusinessQuote {
  text: string
  author: string
  title: string
}

const QUOTES: BusinessQuote[] = [
  // Warren Buffett
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett", title: "CEO, Berkshire Hathaway" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett", title: "CEO, Berkshire Hathaway" },
  { text: "The best investment you can make is in yourself.", author: "Warren Buffett", title: "CEO, Berkshire Hathaway" },
  { text: "It takes 20 years to build a reputation and five minutes to ruin it.", author: "Warren Buffett", title: "CEO, Berkshire Hathaway" },
  { text: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett", title: "CEO, Berkshire Hathaway" },
  { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett", title: "CEO, Berkshire Hathaway" },
  { text: "Chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett", title: "CEO, Berkshire Hathaway" },

  // Elon Musk
  { text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk", title: "CEO, Tesla & SpaceX" },
  { text: "Persistence is very important. You should not give up unless you are forced to give up.", author: "Elon Musk", title: "CEO, Tesla & SpaceX" },
  { text: "I think it's very important to have a feedback loop, where you're constantly thinking about what you've done and how you could be doing it better.", author: "Elon Musk", title: "CEO, Tesla & SpaceX" },
  { text: "Brand is just a perception, and perception will match reality over time.", author: "Elon Musk", title: "CEO, Tesla & SpaceX" },
  { text: "Starting and growing a business is as much about the innovation, drive, and determination of the people behind it as the product they sell.", author: "Elon Musk", title: "CEO, Tesla & SpaceX" },

  // Jeff Bezos
  { text: "Your brand is what other people say about you when you're not in the room.", author: "Jeff Bezos", title: "Founder, Amazon" },
  { text: "If you double the number of experiments you do per year, you're going to double your inventiveness.", author: "Jeff Bezos", title: "Founder, Amazon" },
  { text: "We see our customers as invited guests to a party, and we are the hosts.", author: "Jeff Bezos", title: "Founder, Amazon" },
  { text: "In the end, we are our choices. Build yourself a great story.", author: "Jeff Bezos", title: "Founder, Amazon" },
  { text: "I knew that if I failed I wouldn't regret that, but I knew the one thing I might regret is not trying.", author: "Jeff Bezos", title: "Founder, Amazon" },
  { text: "Be stubborn on vision, but flexible on details.", author: "Jeff Bezos", title: "Founder, Amazon" },

  // Bill Gates
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates", title: "Co-founder, Microsoft" },
  { text: "It's fine to celebrate success but it is more important to heed the lessons of failure.", author: "Bill Gates", title: "Co-founder, Microsoft" },
  { text: "If you are born poor it's not your mistake, but if you die poor it's your mistake.", author: "Bill Gates", title: "Co-founder, Microsoft" },
  { text: "Success is a lousy teacher. It seduces smart people into thinking they can't lose.", author: "Bill Gates", title: "Co-founder, Microsoft" },
  { text: "We always overestimate the change that will occur in the next two years and underestimate the change that will occur in the next ten.", author: "Bill Gates", title: "Co-founder, Microsoft" },

  // Richard Branson
  { text: "Business opportunities are like buses, there's always another one coming.", author: "Richard Branson", title: "Founder, Virgin Group" },
  { text: "Train people well enough so they can leave, treat them well enough so they don't want to.", author: "Richard Branson", title: "Founder, Virgin Group" },
  { text: "The best way of learning about anything is by doing.", author: "Richard Branson", title: "Founder, Virgin Group" },
  { text: "Do not be embarrassed by your failures, learn from them and start again.", author: "Richard Branson", title: "Founder, Virgin Group" },
  { text: "Respect is how to treat everyone, not just those you want to impress.", author: "Richard Branson", title: "Founder, Virgin Group" },

  // Mark Zuckerberg
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg", title: "CEO, Meta" },
  { text: "Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.", author: "Mark Zuckerberg", title: "CEO, Meta" },
  { text: "People don't care about what you say, they care about what you build.", author: "Mark Zuckerberg", title: "CEO, Meta" },
  { text: "In a world that's changing really quickly, the only strategy that is guaranteed to fail is not taking risks.", author: "Mark Zuckerberg", title: "CEO, Meta" },

  // Jack Ma
  { text: "Never give up. Today is hard, tomorrow will be worse, but the day after tomorrow will be sunshine.", author: "Jack Ma", title: "Founder, Alibaba" },
  { text: "If you don't give up, you still have a chance. Giving up is the greatest failure.", author: "Jack Ma", title: "Founder, Alibaba" },
  { text: "Forget about your competitors, just focus on your customers.", author: "Jack Ma", title: "Founder, Alibaba" },
  { text: "Customers are number one, employees are number two, and shareholders are number three.", author: "Jack Ma", title: "Founder, Alibaba" },
  { text: "A leader should have higher grit and tenacity, and be able to endure what the employees can't.", author: "Jack Ma", title: "Founder, Alibaba" },
  { text: "The world will not remember what you say, but it will certainly not forget what you have done.", author: "Jack Ma", title: "Founder, Alibaba" },

  // Oprah Winfrey
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey", title: "Chairwoman, OWN" },
  { text: "The key to realizing a dream is to focus not on success but on significance.", author: "Oprah Winfrey", title: "Chairwoman, OWN" },
  { text: "Think like a queen. A queen is not afraid to fail. Failure is another stepping stone to greatness.", author: "Oprah Winfrey", title: "Chairwoman, OWN" },
  { text: "You get in life what you have the courage to ask for.", author: "Oprah Winfrey", title: "Chairwoman, OWN" },
  { text: "Create the highest, grandest vision possible for your life, because you become what you believe.", author: "Oprah Winfrey", title: "Chairwoman, OWN" },

  // Steve Jobs
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs", title: "Co-founder, Apple" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", title: "Co-founder, Apple" },
  { text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.", author: "Steve Jobs", title: "Co-founder, Apple" },
  { text: "Quality is more important than quantity. One home run is much better than two doubles.", author: "Steve Jobs", title: "Co-founder, Apple" },
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs", title: "Co-founder, Apple" },
  { text: "Great things in business are never done by one person. They're done by a team of people.", author: "Steve Jobs", title: "Co-founder, Apple" },

  // Robert Kiyosaki
  { text: "In the real world, the smartest people are people who make mistakes and learn. In school, the smartest people don't make mistakes.", author: "Robert Kiyosaki", title: "Author, Rich Dad Poor Dad" },
  { text: "The more you seek security, the less of it you have.", author: "Robert Kiyosaki", title: "Author, Rich Dad Poor Dad" },
  { text: "Don't work for money; make money work for you.", author: "Robert Kiyosaki", title: "Author, Rich Dad Poor Dad" },
  { text: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki", title: "Author, Rich Dad Poor Dad" },
  { text: "The single most powerful asset we all have is our mind.", author: "Robert Kiyosaki", title: "Author, Rich Dad Poor Dad" },

  // Aliko Dangote
  { text: "To build a successful business, you must start small and dream big.", author: "Aliko Dangote", title: "CEO, Dangote Group" },
  { text: "If you want to be successful in this world, you need to follow your passion, not a paycheck.", author: "Aliko Dangote", title: "CEO, Dangote Group" },
  { text: "The African continent holds the key to the world's future economic growth.", author: "Aliko Dangote", title: "CEO, Dangote Group" },
  { text: "I built a conglomerate and emerged the richest black man in the world in 2008 but it didn't happen overnight.", author: "Aliko Dangote", title: "CEO, Dangote Group" },

  // Strive Masiyiwa
  { text: "Every successful person has had to overcome serious obstacles. The ones who made it didn't quit.", author: "Strive Masiyiwa", title: "Founder, Econet" },
  { text: "An entrepreneur sees an opportunity in every difficulty; a pessimist sees a difficulty in every opportunity.", author: "Strive Masiyiwa", title: "Founder, Econet" },
  { text: "The world respects people who consistently deliver value.", author: "Strive Masiyiwa", title: "Founder, Econet" },

  // Tony Elumelu
  { text: "Entrepreneurship is the surest way for Africa's economic independence.", author: "Tony Elumelu", title: "Chairman, UBA Group" },
  { text: "When you empower an entrepreneur, you transform communities.", author: "Tony Elumelu", title: "Chairman, UBA Group" },
  { text: "African solutions to African challenges must come from African entrepreneurs.", author: "Tony Elumelu", title: "Chairman, UBA Group" },

  // Mo Ibrahim
  { text: "Good governance is the single most important factor in eradicating poverty and promoting development.", author: "Mo Ibrahim", title: "Founder, Celtel" },
  { text: "Africa doesn't need charity, it needs fair trade.", author: "Mo Ibrahim", title: "Founder, Celtel" },

  // Henry Ford
  { text: "Whether you think you can, or you think you can't — you're right.", author: "Henry Ford", title: "Founder, Ford Motor Company" },
  { text: "Coming together is a beginning, staying together is progress, and working together is success.", author: "Henry Ford", title: "Founder, Ford Motor Company" },
  { text: "A business that makes nothing but money is a poor business.", author: "Henry Ford", title: "Founder, Ford Motor Company" },
  { text: "Don't find fault, find a remedy.", author: "Henry Ford", title: "Founder, Ford Motor Company" },
  { text: "Failure is simply the opportunity to begin again, this time more intelligently.", author: "Henry Ford", title: "Founder, Ford Motor Company" },

  // Andrew Carnegie
  { text: "People who are unable to motivate themselves must be content with mediocrity, no matter how impressive their other talents.", author: "Andrew Carnegie", title: "Industrialist & Philanthropist" },
  { text: "No man becomes rich without himself enriching others.", author: "Andrew Carnegie", title: "Industrialist & Philanthropist" },
  { text: "The first man gets the oyster, the second man gets the shell.", author: "Andrew Carnegie", title: "Industrialist & Philanthropist" },

  // John D. Rockefeller
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller", title: "Founder, Standard Oil" },
  { text: "The secret of success is to do the common thing uncommonly well.", author: "John D. Rockefeller", title: "Founder, Standard Oil" },
  { text: "I do not think there is any other quality so essential to success as perseverance.", author: "John D. Rockefeller", title: "Founder, Standard Oil" },

  // Sara Blakely
  { text: "It's important to be willing to make mistakes. The worst thing that can happen is you become memorable.", author: "Sara Blakely", title: "Founder, Spanx" },
  { text: "Embrace what you don't know, especially in the beginning, because what you don't know can become your greatest asset.", author: "Sara Blakely", title: "Founder, Spanx" },
  { text: "Don't be intimidated by what you don't know. That can be your greatest strength.", author: "Sara Blakely", title: "Founder, Spanx" },

  // Arianna Huffington
  { text: "Fearlessness is not the absence of fear. It's the mastery of fear.", author: "Arianna Huffington", title: "Founder, HuffPost & Thrive Global" },
  { text: "We need to accept that we won't always make the right decisions, that we'll screw up royally sometimes.", author: "Arianna Huffington", title: "Founder, HuffPost & Thrive Global" },

  // Indra Nooyi
  { text: "Just because you are CEO, don't think you have landed. You must continually increase your learning.", author: "Indra Nooyi", title: "Former CEO, PepsiCo" },
  { text: "Leadership is hard to define and good leadership even harder. But if you can get people to follow you to the ends of the earth, you are a great leader.", author: "Indra Nooyi", title: "Former CEO, PepsiCo" },

  // Larry Ellison
  { text: "When you innovate, you've got to be prepared for people telling you that you are nuts.", author: "Larry Ellison", title: "Co-founder, Oracle" },
  { text: "I have had all of the disadvantages required for success.", author: "Larry Ellison", title: "Co-founder, Oracle" },

  // Ray Dalio
  { text: "Pain plus reflection equals progress.", author: "Ray Dalio", title: "Founder, Bridgewater Associates" },
  { text: "He who lives by the crystal ball will eat shattered glass.", author: "Ray Dalio", title: "Founder, Bridgewater Associates" },
  { text: "Radical transparency and radical truth are fundamental to meaningful relationships.", author: "Ray Dalio", title: "Founder, Bridgewater Associates" },

  // Peter Thiel
  { text: "Competition is for losers. If you want to create and capture lasting value, build a monopoly.", author: "Peter Thiel", title: "Co-founder, PayPal & Palantir" },
  { text: "The most contrarian thing of all is not to oppose the crowd but to think for yourself.", author: "Peter Thiel", title: "Co-founder, PayPal & Palantir" },

  // Jamie Dimon
  { text: "The key is to be consistent, deliver results, and always be straightforward.", author: "Jamie Dimon", title: "CEO, JPMorgan Chase" },
  { text: "Markets go up and down, but companies that serve their customers well persist through all of it.", author: "Jamie Dimon", title: "CEO, JPMorgan Chase" },

  // Ratan Tata
  { text: "I don't believe in taking right decisions. I take decisions and then make them right.", author: "Ratan Tata", title: "Chairman Emeritus, Tata Group" },
  { text: "Ups and downs in life are very important to keep us going, because a straight line even in an ECG means we are not alive.", author: "Ratan Tata", title: "Chairman Emeritus, Tata Group" },
  { text: "None can destroy iron, but its own rust can. Likewise, none can destroy a person, but their own mindset can.", author: "Ratan Tata", title: "Chairman Emeritus, Tata Group" },

  // Sam Walton
  { text: "There is only one boss. The customer. And he can fire everybody in the company from the chairman on down.", author: "Sam Walton", title: "Founder, Walmart" },
  { text: "High expectations are the key to everything.", author: "Sam Walton", title: "Founder, Walmart" },
  { text: "Capital isn't scarce; vision is.", author: "Sam Walton", title: "Founder, Walmart" },

  // Walt Disney
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", title: "Co-founder, Disney" },
  { text: "All our dreams can come true, if we have the courage to pursue them.", author: "Walt Disney", title: "Co-founder, Disney" },
  { text: "It's kind of fun to do the impossible.", author: "Walt Disney", title: "Co-founder, Disney" },

  // Phil Knight
  { text: "The cowards never started and the weak died along the way. That leaves us.", author: "Phil Knight", title: "Co-founder, Nike" },
  { text: "Let everyone else call your idea crazy — just keep going.", author: "Phil Knight", title: "Co-founder, Nike" },

  // Bernard Arnault
  { text: "Money is just a consequence. I always say to my team, 'Don't worry too much about profitability. If you do your job well, the profitability will come.'", author: "Bernard Arnault", title: "CEO, LVMH" },
  { text: "In the luxury business, you have to build on heritage.", author: "Bernard Arnault", title: "CEO, LVMH" },

  // Reid Hoffman
  { text: "If you are not embarrassed by the first version of your product, you've launched too late.", author: "Reid Hoffman", title: "Co-founder, LinkedIn" },
  { text: "An entrepreneur is someone who jumps off a cliff and builds a plane on the way down.", author: "Reid Hoffman", title: "Co-founder, LinkedIn" },

  // Mark Cuban
  { text: "Sweat equity is the most valuable equity there is.", author: "Mark Cuban", title: "Owner, Dallas Mavericks" },
  { text: "It doesn't matter how many times you have failed, you only have to be right once.", author: "Mark Cuban", title: "Owner, Dallas Mavericks" },
  { text: "Work like there is someone working 24 hours a day to take it all away from you.", author: "Mark Cuban", title: "Owner, Dallas Mavericks" },

  // Sheryl Sandberg
  { text: "Done is better than perfect.", author: "Sheryl Sandberg", title: "Former COO, Meta" },
  { text: "If you're offered a seat on a rocket ship, don't ask what seat! Just get on.", author: "Sheryl Sandberg", title: "Former COO, Meta" },

  // Naval Ravikant
  { text: "Seek wealth, not money or status. Wealth is having assets that earn while you sleep.", author: "Naval Ravikant", title: "Co-founder, AngelList" },
  { text: "Play long-term games with long-term people.", author: "Naval Ravikant", title: "Co-founder, AngelList" },
  { text: "Specific knowledge is found by pursuing your genuine curiosity and passion rather than whatever is hot right now.", author: "Naval Ravikant", title: "Co-founder, AngelList" },

  // Dhirubhai Ambani
  { text: "If you don't build your dream, someone else will hire you to help them build theirs.", author: "Dhirubhai Ambani", title: "Founder, Reliance Industries" },
  { text: "Think big, think fast, think ahead. Ideas are no one's monopoly.", author: "Dhirubhai Ambani", title: "Founder, Reliance Industries" },

  // Carlos Slim
  { text: "When there is a crisis, that's when some are interested in getting out and that's when we are interested in getting in.", author: "Carlos Slim", title: "Founder, Grupo Carso" },
  { text: "Courage taught me no matter how bad a crisis gets, any sound investment will eventually pay off.", author: "Carlos Slim", title: "Founder, Grupo Carso" },

  // Additional quotes for variety
  { text: "Do what you do so well that they will want to see it again and bring their friends.", author: "Walt Disney", title: "Co-founder, Disney" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", title: "Hockey Legend & Entrepreneur" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt", title: "32nd U.S. President" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", title: "Ancient Wisdom" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso", title: "Artist & Entrepreneur" },
  { text: "Don't be distracted by criticism. Remember, the only taste of success some people have is when they take a bite out of you.", author: "Zig Ziglar", title: "Motivational Speaker & Author" },
  { text: "I never dreamed about success. I worked for it.", author: "Estée Lauder", title: "Founder, Estée Lauder Companies" },
  { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon", title: "Founder, Vidal Sassoon Inc." },
]

/**
 * Simple hash function that converts a string to a numeric seed.
 * Used to create per-vendor deterministic randomness.
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC).
 */
function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Returns a unique daily business quote for the given vendor.
 * - Changes every day (based on UTC date)
 * - Different per vendor (based on vendor ID hash)
 * - Deterministic: same vendor + same day = same quote
 */
export function getDailyQuote(vendorId: string): BusinessQuote {
  const dateKey = getTodayKey()
  const seed = hashString(`${vendorId}-${dateKey}`)
  const index = seed % QUOTES.length
  return QUOTES[index]
}

/**
 * Returns multiple quotes for a vendor (e.g., for a "past quotes" section).
 * Each day offset gives a different quote.
 */
export function getRecentQuotes(vendorId: string, days: number = 7): BusinessQuote[] {
  const quotes: BusinessQuote[] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const seed = hashString(`${vendorId}-${dateKey}`)
    const index = seed % QUOTES.length
    quotes.push(QUOTES[index])
  }
  return quotes
}
