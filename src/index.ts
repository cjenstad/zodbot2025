import { config } from 'dotenv';
import * as tmi from 'tmi.js';
import { UserSchema, LotterySchema, StocksSchema, addUser, addLottery } from './utils/database';
import { initStocks, updateStocks, updateTicker, buyStock, sellStock, checkMyStocks } from './utils/stocks';
import { Emoji, buyEmoji, sellEmoji, dumpsterDive } from './utils/emoji';
import { startBlackjack, hit, doubleDown, stand } from './utils/blackjack';
import { lotteryRoll, scamballRoll, generateScamballNumbers } from './utils/lottery';
import { getRandomZodgyism, getRandomKiwiism, getRandomMelonism, getRandomTwentyism, getRandomAbhism } from './utils/chatcommands';

config();

const opts = {
    identity: {
        username: process.env.USERNAME || 'chatbot',
        password: process.env.OAUTH || 'oauth:your_token_here'
    },
    channels: process.env.CHANNELS?.split(',')
};

const client = new tmi.client(opts);

client.connect().catch(console.error);
client.on('connected', () => {
    console.log('Connected to Twitch');
    if (opts.channels) {                    // says connected to all channels
    //     opts.channels.forEach(channel => {
    //         client.say(channel, 'connected');
    //     });
        client.say(opts.channels[0], 'connected'); // says connected to first channel
    }

});

const mongoose = require('mongoose');

const connections = new Map<string, typeof mongoose>();

const botEnabledChannels = new Set<string>();

main().catch(err => console.log(err));

/**
 * The main function that connects to MongoDB databases for each channel.
 * @returns {Promise<void>} A promise that resolves when the connection is established.
 */
async function main() {
    if (opts.channels) {
        for (const channel of opts.channels) {
            const dbName = channel.trim().replace('#', '');
            const conn = mongoose.createConnection(`mongodb://127.0.0.1:27017/${dbName}`);
            conn.model('User', UserSchema);
            conn.model('Lottery', LotterySchema);
            conn.model('Stocks', StocksSchema);
            connections.set(channel, conn);
            console.log(`Connected to MongoDB database for channel: ${dbName}`);
        }
    }
}

// init emojis
const emojis = [
    new Emoji('🫓', 'flatbread', 10),
    new Emoji('🗑️', 'trash', 100),
    new Emoji('🧅', 'onion', 200),
    new Emoji('🍳', 'egg', 399),
    new Emoji('🍩', 'donut', 1000),
    new Emoji('🍔', 'burger', 2000),
    new Emoji('🍕', 'pizza', 2000),
    new Emoji('🍨', 'icecream', 2000),
    new Emoji('🍟', 'fries', 2000),
    new Emoji('🍌', 'banana', 5000),
    new Emoji('🪃', 'boomerang', 5000),
    new Emoji('🙈', 'seenoevil', 5000),
    new Emoji('🙉', 'hearnoevil', 5000),
    new Emoji('🙊', 'speaknoevil', 5000),
    new Emoji('🦍', 'gorilla', 10000),
    new Emoji('🐸', 'frog', 10000),
    new Emoji('🦘', 'kangaroo', 10000),
    new Emoji('🐶', 'dog', 20000),
    new Emoji('🐱', 'cat', 20000),
    new Emoji('🦧', 'orangutan', 20000),
    new Emoji('🐊', 'crocodile', 20000),
    new Emoji('💰', 'moneybag', 50000),
    new Emoji('💎', 'diamond', 100000),
    new Emoji('🗿', 'moai', 200000),
    new Emoji('🏎️', 'car', 500000),
    new Emoji('🚁', 'helicopter', 1000000),
    new Emoji('🪂', 'parachute', 1000000),
    new Emoji('👑', 'crown', 10000000),
    new Emoji('🚀', 'rocket', 100000000),
    new Emoji('🛸', 'ufo', 200000000),
    new Emoji('💦', 'sweat', 500000000),
    new Emoji('🦝', 'raccoon', 0, true), // Hidden raccoon emoji
    new Emoji('🎅', 'santa', 0, true) // Hidden santa emoji
];

client.on('message', async (channel, tags, message, self) => {
    // check if database connection exists for channel
    const db = connections.get(channel);
    if (!db) {
        console.log(`No database connection found for channel: ${channel}`);
        return;
    }

    // get models from database connection
    const { User, Lottery, Stocks } = db.models;

    // clean channel name, check if user is mod, get message username
    const channelName = channel.trim().replace('#', '');
    const modStatus: boolean = tags.mod || (tags.username === channelName) || false;
    const msgUsername: string = tags.username || '';
    if (self) return;

    // if user doesn't exist, create it
    const user = await User.findOne({ username: tags.username }).exec();
    if (!user) {
        console.log(`User not found, adding ${tags.username} to channel database ${channelName}`);
        addUser(db, msgUsername, 1000, [], 0, [], [], false, false, '', 0, []) // add user with 1000 points
            .catch(err => console.error('Error adding user: ', err));
    }

    // if user exists, give them a point per message
    if (user) {
        user.points += 1;
        await user.save();
    }

    let chat = message.trim();
    while (chat.substring(chat.length - 2) === '󠀀') { // trim invisible character from 7tv (so annoying)
        chat = chat.substring(0, chat.length - 3);
    }

    // if lottery doesn't exist, create it
    const lottery = await Lottery.findOne().exec();
    if (!lottery) {
        addLottery(db, 0)
            .catch(err => console.error('Error adding lottery: ', err));
    }

    // if stocks don't exist, create them
    try {
        const stocks = await Stocks.find().exec();
        if (!stocks || stocks.length === 0) {
            await initStocks(db);
            console.log('Stocks initialized successfully');
        }
    } catch (err) {
        console.error('Error checking/initializing stocks:', err);
    }

    // Bot toggle command - STREAMER ONLY
    const botToggleRegex = /^!bot (on|off)$/i;
    const botToggleMatch = chat.match(botToggleRegex);
    if (botToggleMatch && modStatus) {
        const command = botToggleMatch[1].toLowerCase();
        if (command === 'on') {
            botEnabledChannels.add(channel);
            client.say(channel, 'Bot commands enabled');
        } else {
            botEnabledChannels.delete(channel);
            client.say(channel, 'Bot commands disabled');
        }
        return;
    }

    // If bot is disabled, only allow mod-only commands
    if (!botEnabledChannels.has(channel)) {
        // Still allow points per message
        if (user) {
            user.points += 1;
            await user.save();
        }

        // Only process mod-only commands when bot is off
        if (modStatus) {
            // !setpoints command
            const setPointsRegex = /^!setpoints (\S+) (\d+)$/i;
            const setPointsMatch = chat.match(setPointsRegex);
            if (setPointsMatch) {
                const username = setPointsMatch[1].toLowerCase();
                const points = parseInt(setPointsMatch[2]);
                const user = await User.findOne({ username });
                if (user) {
                    user.points = points;
                    await user.save();
                    client.say(channel, `${username} now has ${points} points`);
                } else { // user does not exist
                    client.say(channel, `${username} does not exist`);
                }
            }

            // !resetpoints command
            const resetPointsRegex = /^!resetpoints(?:\s+confirm)?$/i;
            const resetPointsMatch = chat.match(resetPointsRegex);
            if (resetPointsMatch) {
                if (chat.toLowerCase() === '!resetpoints confirm') {
                    try {
                        // Get all non-hidden emoji characters for filtering
                        const nonHiddenEmojis = emojis
                            .filter(emoji => !emoji.isHidden)
                            .map(emoji => emoji.character);

                        // Find all users and update them
                        const users = await User.find({});
                        for (const user of users) {
                            // Reset points to 1000
                            user.points = 1000;
                            
                            // Clear stock portfolio
                            user.ownedStocks = [];
                            
                            // Filter out non-hidden emojis, keeping only hidden ones
                            user.emojiCollection = user.emojiCollection.filter(
                                (emoji: string) => !nonHiddenEmojis.includes(emoji)
                            );
                            
                            await user.save();
                        }

                        client.say(channel, 'All users have been reset to 1000 points, portfolios cleared, and non-hidden emojis removed.');
                    } catch (err) {
                        console.error('Error resetting users:', err);
                        client.say(channel, 'An error occurred while resetting users.');
                    }
                } else {
                    client.say(channel, 'MOD ONLY - Reset all users to 1000 points, clear portfolios, and remove non-hidden emojis. To execute, type "!resetpoints confirm"');
                }
            }
        }
        return;
    }

    // If we get here, bot is enabled and we process all normal commands
    //points section
    // !points: check points
    const pointsRegex = /^!points$/i;
    if (chat.match(pointsRegex)) {
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            client.say(channel, `${msgUsername} has ${user.points} points`);
        }
    }

    // !leaderboard: check leaderboard
    const leaderboardRegex = /^!leaderboard$/i;
    if (chat.match(leaderboardRegex)) {
        const users = await User.find().sort({ points: -1 }).limit(5);
        if (users) {
            for (let i = 0; i < users.length; i++) {
                const message = `${i + 1}. ${users[i].username} - ${users[i].points} points`;
                client.say(channel, message);
            }
        }
    }

    // !donate [username] [points]: donate points to another user
    const donateRegex = /^!donate (\S+) (\d+)$/i;
    const donateMatch = chat.match(donateRegex);
    if (donateMatch) {
        const recipient = donateMatch[1].toLowerCase();
        const points = parseInt(donateMatch[2]);
        const user = await User.findOne({ username: msgUsername });
        const recipientUser = await User.findOne({ username: recipient });
        if (user && recipientUser) {
            if (points < 1 || points > user.points) {
                client.say(channel, 'Invalid donation amount');
                return;
            }
            if (msgUsername.toLowerCase() === recipient.toLowerCase()) {
                client.say(channel, "You can't donate points to yourself! scammer >:(");
                return;
            }
            user.points -= points;
            recipientUser.points += points;
            await user.save();
            await recipientUser.save();
            client.say(channel, `${msgUsername} donated ${points} points to ${recipient}`);
        }
    }

    // !duel [username] [points]: duel another user, winner receives points
    const duelRegex = /^!duel (\S+) (\d+)$/i;
    const duelMatch = chat.match(duelRegex);
    if (duelMatch) {
        const opponent = duelMatch[1].toLowerCase();
        const points = parseInt(duelMatch[2]);
        const user = await User.findOne({ username: msgUsername });
        const opponentUser = await User.findOne({ username: opponent });
        if (user && opponentUser) {
            if (points < 1 || points > user.points || points > opponentUser.points) {
                client.say(channel, 'Invalid duel amount');
                return;
            }
            if (user.isDueling) {
                client.say(channel, `You are already in a duel with ${user.duelOpponent}`);
                return;
            }
            if (opponentUser.isDueling) {
                client.say(channel, `${opponent} is already in a duel with ${opponentUser.duelOpponent}`);
                return;
            }
            user.points -= points;
            user.duelBet = points;
            opponentUser.points -= points;
            opponentUser.duelBet = points;
            user.isDueling = true;
            opponentUser.isDueling = true;
            user.duelInitiator = true;
            user.duelOpponent = opponent;
            opponentUser.duelOpponent = msgUsername;
            await user.save();
            await opponentUser.save();
            client.say(channel, `${msgUsername} has challenged ${opponent} to a duel for ${points} points! Type !accept or !decline to respond.`);
        }
    }

    // !accept: accept a duel
    const acceptRegex = /^!accept$/i;
    if (chat.match(acceptRegex)) {
        const user = await User.findOne({ username: msgUsername });
        const opponent = await User.findOne({ username: user?.duelOpponent });
        if (user && opponent && user.isDueling && opponent.isDueling && user.duelOpponent === opponent.username) {
            // check if user is the duel initiator, if so, they can't accept
            if (user.duelInitiator) {
                client.say(channel, `${msgUsername}, you can't accept a duel you initiated!`);
                return;
            }

            const random = Math.floor((Math.random() * 100) + 1);
            if (random > 50) {
                user.points += 2 * user.duelBet;
                client.say(channel, `${msgUsername} won the duel! ${msgUsername} now has ${user.points} points`);
            } else {
                opponent.points += 2 * opponent.duelBet;
                client.say(channel, `${user.duelOpponent} won the duel! ${user.duelOpponent} now has ${opponent.points} points`);
            }

            user.isDueling = false;
            opponent.isDueling = false;
            user.duelInitiator = false;
            opponent.duelInitiator = false;
            user.duelOpponent = '';
            opponent.duelOpponent = '';
            user.duelBet = 0;
            opponent.duelBet = 0;
            await user.save();
            await opponent.save();
        }
    }

    // !decline: decline a duel
    const declineRegex = /^!decline$/i;
    if (chat.match(declineRegex)) {
        const user = await User.findOne({ username: msgUsername });
        const opponent = await User.findOne({ username: user?.duelOpponent });
        if (user && opponent && user.isDueling && opponent.isDueling && user.duelOpponent === opponent.username) {
            client.say(channel, `${msgUsername} declined the duel. maybe next time :(`);
            user.isDueling = false;
            opponent.isDueling = false;
            user.duelInitiator = false;
            opponent.duelInitiator = false;
            user.duelOpponent = '';
            opponent.duelOpponent = '';
            user.points += user.duelBet;
            opponent.points += opponent.duelBet;
            user.duelBet = 0;
            opponent.duelBet = 0;
            await user.save();
            await opponent.save();
        }
    }

    // !setpoints [username] [points]: set points - MOD ONLY
    const setPointsRegex = /^!setpoints (\S+) (\d+)$/i;
    const setPointsMatch = chat.match(setPointsRegex);
    if (setPointsMatch && modStatus) {
        const username = setPointsMatch[1].toLowerCase();
        const points = parseInt(setPointsMatch[2]);
        const user = await User.findOne({ username });
        if (user) {
            user.points = points;
            await user.save();
            client.say(channel, `${username} now has ${points} points`);
        } else { // user does not exist
            client.say(channel, `${username} does not exist`);
        }
    }

    // channel points redeem - 10k voucher
    if (tags["custom-reward-id"] === "961a64c7-8d29-4910-8fbe-5ce66dc13b4c") { // change to your own channel points reward id
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            user.points += 10000;
            client.say(channel, `${msgUsername} redeemed 10k points!`);
            await user.save();
        }
    }

    // !gamble [points]: simple gamble points
    const gambleRegex = /^!gamble (\d+|all)$/i;
    const gambleMatch = chat.match(gambleRegex);
    if (gambleMatch) {
        const user = await User.findOne({ username: msgUsername });
        let bet: number;

        if (gambleMatch[1].toLowerCase() === 'all') {
            if (!user) {
                client.say(channel, 'Invalid bet');
                return;
            }
            bet = user.points;
        } else {
            bet = parseInt(gambleMatch[1]);
        }

        if (!user || bet < 1 || bet > user.points) {
            client.say(channel, 'Invalid bet');
            return;
        } else {
            const random = Math.floor(Math.random() * 100) + 1;
            if (random < 50) {
                user.points -= bet;
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points :(`);
            } else {
                user.points += bet;
                client.say(channel, `${msgUsername} rolled a ${random}. ${msgUsername} now has ${user.points} points :)`);
            }
            await user.save();
        }
    }

    // stock market commands
    // !buy [item] [quantity]: buy item (emoji or stock)
    const buyRegex = /^!buy (\S+)(?: (\d+))?$/i;
    const buyMatch = chat.match(buyRegex); // declare buyMatch for price change prevention
    if (buyMatch) {
        const itemInput = buyMatch[1].toLowerCase();
        const quantity = parseInt(buyMatch[2]) || 1; // Default to 1 if no quantity is provided

        // Check if the item is an emoji
        const emoji = emojis.find(e => e.character === itemInput || e.alias === itemInput);
        if (emoji) {
            const message = await buyEmoji(db, user.username, emoji) || '';
            client.say(channel, message);
        } else {
            //assume item is a stock
            const stock = itemInput.toUpperCase();
            const message = await buyStock(db, user.username, stock, quantity) || '';
            client.say(channel, message);
        }
    }

    // !sell [item] [quantity]: sell item (emoji or stock)
    const sellRegex = /^!sell (\S+)(?: (\d+))?$/i;
    const sellMatch = chat.match(sellRegex); // declare sellMatch for price change prevention
    if (sellMatch) {
        const itemInput = sellMatch[1].toLowerCase();
        const quantity = parseInt(sellMatch[2]) || 1;

        // Check if the item is an emoji
        const emoji = emojis.find(e => e.character === itemInput || e.alias === itemInput);
        if (emoji) {
            const message = await sellEmoji(db, user.username, emoji) || '';
            client.say(channel, message);
        } else {
            //assume item is a stock
            const stock = itemInput.toUpperCase();
            const message = await sellStock(db, user.username, stock, quantity) || '';
            client.say(channel, message);
        }
    }

    // !portfolio: check user's stock portfolio
    const portfolioRegex = /^!(portfolio|mystocks)$/i;
    const portfolioMatch = chat.match(portfolioRegex); // declare portfolioMatch for price change prevention
    if (portfolioMatch) {
        const message = await checkMyStocks(db, user.username) || '';
        client.say(channel, message);
    }

    // !stockmarket: check stock market
    const stockMarketRegex = /^!(stockmarket|stocks)$/i;
    const stockMarketMatch = chat.match(stockMarketRegex); // declare stockMarketMatch for price change prevention
    if (chat.match(stockMarketRegex)) {
        const stockMarketMessage = await updateTicker(db) || '';
        client.say(channel, stockMarketMessage);
    }

    if (!stockMarketMatch && !buyMatch && !sellMatch && !portfolioMatch) {
        await updateStocks(db);
    }

    //blackjack section
    const blackjackRegex = /^!blackjack (\d+|all)$/i;
    const hitRegex = /^!hit$/i;
    const standRegex = /^!stand$/i;
    const doubleDownRegex = /^!double$/i;

    // !blackjack [bet]: start a blackjack game
    const blackjackMatch = chat.match(blackjackRegex);
    if (blackjackMatch) {
        let bet: number;
        if (blackjackMatch[1] === 'all') {
            bet = user.points;
        } else {
            bet = parseInt(blackjackMatch[1]);
        }
        const message = await startBlackjack(db, user.username, bet) || '';
        client.say(channel, message);
    }

    // !hit: draw a card in blackjack
    const hitMatch = chat.match(hitRegex);
    if (hitMatch) {
        const message = await hit(db, user.username) || '';
        client.say(channel, message);
    }

    // !double: double down in blackjack
    const doubleDownMatch = chat.match(doubleDownRegex);
    if (doubleDownMatch) {
        const message = await doubleDown(db, user.username) || '';
        client.say(channel, message);
    }

    // !stand: end turn in blackjack
    const standMatch = chat.match(standRegex);
    if (standMatch) {
        const message = await stand(db, user.username) || '';
        client.say(channel, message);
    }

    //lottery section
    // !lottery [number|rules]: buy a lottery ticket or show rules
    const lotteryRegex = /^!lottery(?:\s+(\d+|rules))?$/i;
    const lotteryMatch = chat.match(lotteryRegex);
    if (lotteryMatch) {
        if (lotteryMatch[1]?.toLowerCase() === 'rules') {
            client.say(channel, 'Lottery Rules: Cost is 100 points per ticket. Pick a number between 1-1000. ' +
                'If your number matches the winning number, you win the jackpot (1,000,000 points + bonus pot)! ' +
                'Every losing ticket adds 99 points to the bonus pot.');
        } else if (lotteryMatch[1]) {
            const roll = parseInt(lotteryMatch[1]);
            const message = await lotteryRoll(db, user.username, roll) || '';
            client.say(channel, message);
        }
    }

    // !scamball [numbers|rules|autopick]: play scamball lottery or show rules
    const scamballRegex = /^!scamball(?:\s+(?:(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+\((\d+)\)|autopick|rules))?$/i;
    const scamballMatch = chat.match(scamballRegex);
    if (scamballMatch) {
        if (scamballMatch[0].toLowerCase().includes('rules')) {
            const lottery = await Lottery.findOne();
            client.say(channel, 'Scamball Rules: Cost is 2 points per ticket. Pick 5 different numbers (1-69) and 1 scamball number (1-26). ' +
                'Format: !scamball n1 n2 n3 n4 n5 (s) or !scamball autopick. Prizes: Match 5+SB=Jackpot, 5=1M, 4+SB=50k, 4=100, 3+SB=100, ' +
                '3=7, 2+SB=7, 1+SB=4, SB=4 points. Current jackpot: ' + lottery.scamballJackpot + ' points.');
        } else if (scamballMatch[0].toLowerCase().includes('autopick') || scamballMatch[1]) {
            let numbers: number[];
            let scamball: number;
            
            if (scamballMatch[0].toLowerCase().includes('autopick')) {
                const pick = generateScamballNumbers();
                numbers = pick.numbers;
                scamball = pick.scamball;
            } else {
                numbers = [
                    parseInt(scamballMatch[1]),
                    parseInt(scamballMatch[2]),
                    parseInt(scamballMatch[3]),
                    parseInt(scamballMatch[4]),
                    parseInt(scamballMatch[5])
                ];
                scamball = parseInt(scamballMatch[6]);
            }
            
            const message = await scamballRoll(db, user.username, numbers, scamball) || '';
            client.say(channel, message);
        }
    }

    //emoji section
    // !store: check available emojis in store
    const storeRegex = /^!(store|shop)$/i;
    if (chat.match(storeRegex)) {
        let message = 'Available to buy: ';
        emojis
            .filter(emoji => !emoji.isHidden)
            .forEach((emoji, index, filteredArray) => {
                message += `${emoji.character} (${emoji.price})`;
                if (index !== filteredArray.length - 1) {
                    message += ', ';
                }
            });
        client.say(channel, message);
    }

    // !collection: check emoji collection
    const collectionRegex = /^!collection$/i;
    if (chat.match(collectionRegex)) {
        const user = await User.findOne({ username: msgUsername });
        if (user) {
            const message = user.emojiCollection.length > 0 ? `${msgUsername}'s collection: ${user.emojiCollection.join(' , ')}` : `${msgUsername} has nothing but dust in their collection :(`;
            client.say(channel, message);
        }
    }

    // !zodgyism: get a random Zodgyism
    const zodgyismRegex = /^!zodgyism$/i;
    if (chat.match(zodgyismRegex)) {
        const quote = await getRandomZodgyism();
        client.say(channel, quote);
    }

    // !kiwiism: get a random Kiwiism
    const kiwiismRegex = /^!kiwiism$/i;
    if (chat.match(kiwiismRegex)) {
        const quote = await getRandomKiwiism();
        client.say(channel, quote);
    }

    // !melonism: get a random Melonism
    const melonismRegex = /^!melonism$/i;
    if (chat.match(melonismRegex)) {
        const quote = await getRandomMelonism();
        client.say(channel, quote);
    }

    //!twentyism: get a random Twentyism
    const twentyismRegex = /^!twentyism$/i;
    if (chat.match(twentyismRegex)) {
        const quote = await getRandomTwentyism();
        client.say(channel, quote);
    }

    //!abhism: get a random Abhism
    const abhismRegex = /^!abhism$/i;
    if (chat.match(abhismRegex)) {
        const quote = await getRandomAbhism();
        client.say(channel, quote);
    }

    // !dumpsterdive: dive in the dumpster for random rewards
    const dumpsterDiveRegex = /^!dumpsterdive$/i;
    if (chat.match(dumpsterDiveRegex)) {
        const message = await dumpsterDive(db, msgUsername, emojis);
        client.say(channel, message);
    }

    // !resetpoints: reset all users' points to 1000 - MOD ONLY
    const resetPointsRegex = /^!resetpoints(?:\s+confirm)?$/i;
    const resetPointsMatch = chat.match(resetPointsRegex);
    if (resetPointsMatch && modStatus) {
        if (chat.toLowerCase() === '!resetpoints confirm') {
            try {
                // Get all non-hidden emoji characters for filtering
                const nonHiddenEmojis = emojis
                    .filter(emoji => !emoji.isHidden)
                    .map(emoji => emoji.character);

                // Find all users and update them
                const users = await User.find({});
                for (const user of users) {
                    // Reset points to 1000
                    user.points = 1000;
                    
                    // Clear stock portfolio
                    user.ownedStocks = [];
                    
                    // Filter out non-hidden emojis, keeping only hidden ones
                    user.emojiCollection = user.emojiCollection.filter(
                        (emoji: string) => !nonHiddenEmojis.includes(emoji)
                    );
                    
                    await user.save();
                }

                client.say(channel, 'All users have been reset to 1000 points, portfolios cleared, and non-hidden emojis removed.');
            } catch (err) {
                console.error('Error resetting users:', err);
                client.say(channel, 'An error occurred while resetting users.');
            }
        } else {
            client.say(channel, 'MOD ONLY - Reset all users to 1000 points, clear portfolios, and remove non-hidden emojis. To execute, type "!resetpoints confirm"');
        }
    }
});
