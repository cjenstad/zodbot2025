import mongoose from 'mongoose';

/**
 * Represents an emoji that can be bought and sold.
 */
export class Emoji {
    character: string;
    alias: string;
    price: number;
    isHidden: boolean;

    constructor(character: string, alias: string, price: number, isHidden: boolean = false) {
        this.character = character;
        this.alias = alias;
        this.price = price;
        this.isHidden = isHidden;
    }
}

/**
 * Buys an emoji for a user.
 * @param db - The mongoose instance.
 * @param username - The username of the user.
 * @param emoji - The emoji to be bought.
 * @returns A string indicating the result of the purchase.
 */
export async function buyEmoji(db: typeof mongoose, username: string, emoji: Emoji) {
    const User = db.model('User');

    const user = await User.findOne({ username: username }).exec();
    if (!user) {
        return 'User not found';
    }
    if (user.emojiCollection.includes(emoji.character)) {
        return `You already own ${emoji.character}`;
    }
    if (user.points < emoji.price) {
        return `You need ${emoji.price - user.points} more points to buy ${emoji.character}`;
    }
    user.points -= emoji.price;
    user.emojiCollection.push(emoji.character);
    await user.save();
    return `${user.username} bought an emoji: ${emoji.character}`;
}

/**
 * Sells an emoji for a user.
 * @param db - The mongoose instance.
 * @param username - The username of the user.
 * @param emoji - The emoji to be sold.
 * @returns A string indicating the result of the sale.
 */
export async function sellEmoji(db: typeof mongoose, username: string, emoji: Emoji) {
    const User = db.model('User');

    const user = await User.findOne({ username: username }).exec();
    if (!user) {
        return 'User not found';
    }

    // Special handling for raccoon (both emoji and text input)
    if (emoji.character === '🦝' || emoji.alias === 'raccoon') {
        if (user.emojiCollection.includes('🦝')) {
            return `${username}, you can't sell your best friend! 🦝 is here to stay.`;
        }
        // If they try to sell a raccoon but don't have one, let it fall through to normal emoji check
    }

    // Check if emoji is non-sellable (price = 0)
    if (emoji.price === 0) {
        return `${username}, this emoji cannot be sold!`;
    }

    const emojiIndex = user.emojiCollection.indexOf(emoji.character);
    if (emojiIndex === -1) {
        return `You don't own ${emoji.character}`;
    }
    user.points += emoji.price;
    user.emojiCollection.splice(emojiIndex, 1);
    await user.save();
    return `${user.username} parted ways with ${emoji.character}`;
}

// Calculate emoji rarity based on price
function calculateEmojiChance(price: number): number {
    // Use a higher log base (e.g., 5) and fourth power to make the scaling more extreme
    const logScale = Math.log10(price + 100);
    const rawChance = 1 / Math.pow(logScale, 4);
    
    console.log(`calculateEmojiChance raw: price=${price}, logScale=${logScale.toFixed(4)}, rawChance=${rawChance.toFixed(8)}`);
    
    return rawChance;
}

export async function dumpsterDive(db: typeof mongoose, username: string, emojis: Emoji[]): Promise<string> {
    const User = db.model('User');
    const Lottery = db.model('Lottery');
    const user = await User.findOne({ username }).exec();
    const lottery = await Lottery.findOne().exec();

    if (!user) {
        return 'User not found';
    }

    // Check if user is banned
    if (user.dumpsterBanUntil && user.dumpsterBanUntil > new Date()) {
        const expiryDate = new Date(user.dumpsterBanUntil);
        return `@${username}, the police have banned you from this dumpster! Come back on ${expiryDate.toLocaleDateString()}.`;
    }

    // Check cooldown
    const cooldownMinutes = 15;
    if (user.lastDumpsterDive) {
        const timeSinceLastDive = new Date().getTime() - user.lastDumpsterDive.getTime();
        const minutesLeft = Math.ceil(cooldownMinutes - (timeSinceLastDive / (1000 * 60)));
        
        if (minutesLeft > 0) {
            return `@${username}, security's watching your dumpster, so you can't dive in it yet! (${minutesLeft} minutes until cooldown ends)`;
        }
    }

    // Update last dumpster dive time
    user.lastDumpsterDive = new Date();
    await user.save();

    const roll = Math.random();
    console.log(`\n=== New Dumpster Dive for ${username} ===`);
    console.log(`Roll: ${roll.toFixed(6)}`);
    let currentThreshold = 0;

    const raccoon = emojis.find(e => e.character === '🦝');
    if (roll < 0.0005) { // Check for raccoon (0.0005% chance) before other outcomes
        if (!raccoon) {
            console.error('Error: Raccoon emoji not found in emoji collection');
            return `@${username}, you dove in the dumpster but found nothing interesting. You now have ${user.points} points.`;
        }
        if (user.emojiCollection.includes(raccoon.character)) {
            return `@${username}, you dove in the dumpster and found... another raccoon!? But ${raccoon.character} scared it off... You now have ${user.points} points.`;
        }
        user.emojiCollection.push(raccoon.character);
        await user.save();
        return `@${username}, you dove in the dumpster and found... a raccoon!? ${raccoon.character} is now your lifelong pal! (check your !collection) You now have ${user.points} points.`;
    }

    // Check for emoji finds next
    const availableEmojis = emojis.filter(emoji => !emoji.isHidden && emoji.price > 0);
    console.log('\nEmoji Probability Thresholds:');
    
    // First calculate raw chances for all emojis
    const rawChances = availableEmojis.map(emoji => ({
        emoji,
        rawChance: calculateEmojiChance(emoji.price)
    }));

    // Calculate sum of all raw chances for normalization
    const totalRawChance = rawChances.reduce((sum, item) => sum + item.rawChance, 0);
    
    // The total probability for finding any emoji should be 20%
    const TOTAL_EMOJI_CHANCE = 0.20;
    
    for (const item of rawChances) {
        // Normalize the chance to be a portion of the 20% total
        const normalizedChance = (item.rawChance / totalRawChance) * TOTAL_EMOJI_CHANCE;
        currentThreshold += normalizedChance;
        
        console.log(`${item.emoji.character} (${item.emoji.alias}): normalizedChance=${normalizedChance.toFixed(6)}, threshold=${currentThreshold.toFixed(6)}`);

        if (roll < currentThreshold) {
            console.log(`Found emoji: ${item.emoji.character} (roll ${roll.toFixed(6)} < threshold ${currentThreshold.toFixed(6)})`);
            if (user.emojiCollection.includes(item.emoji.character)) {
                return `@${username}, you dove in the dumpster and found a ${item.emoji.character}, but you already have one! You threw it back in the dumpster. You now have ${user.points} points.`;
            }
            user.emojiCollection.push(item.emoji.character);
            await user.save();
            return `@${username}, you dove in the dumpster and found a ${item.emoji.character}! You now have ${user.points} points.`;
        }
    }

    // Reset threshold and use absolute probabilities instead of additive
    const SCAMBALL_CHANCE = 1 / 11000000; // 1 in 11 million
    const LOTTERY_CHANCE = 1 / 250; // 1 in 250 (0.4%)
    const LARGE_POINTS_CHANCE = 0.015; // 1.5%
    const POLICE_CHANCE = 0.005; // 0.5%
    const JUNK_ITEMS_CHANCE = 0.15; // 15% total (5% each for rotten food, trash, rocks)
    const SMALL_POINTS_CHANCE = 0.43; // 43% (3% for 100 points, 40% for 10 points)

    if (roll < SCAMBALL_CHANCE) {
        const prize = lottery.scamballJackpot;
        user.points += prize;
        lottery.scamballJackpot = 20000000;
        await lottery.save();
        await user.save();
        return `@${username}, you dove in the dumpster and found a winning scamball ticket! You won ${prize} points! You now have ${user.points} points!`;
    }
    else if (roll < LOTTERY_CHANCE) {
        const prize = 1000000 + (lottery.lotteryBonus || 0);
        user.points += prize;
        lottery.lotteryBonus = 0;
        await lottery.save();
        await user.save();
        return `@${username}, you dove in the dumpster and found a winning lottery ticket! You won ${prize} points! You now have ${user.points} points!`;
    }
    else if (roll < LARGE_POINTS_CHANCE) {
        user.points += 1000;
        await user.save();
        return `@${username}, you dove in the dumpster and found 1000 points! You now have ${user.points} points!`;
    }
    else if (roll < POLICE_CHANCE) {
        const percentageToTake = Math.floor(Math.random() * (95 - 10 + 1)) + 10;
        const fine = Math.floor((user.points * percentageToTake) / 100);
        user.points -= fine;
        lottery.scamballJackpot += fine;
        
        // Set 30-day ban
        user.dumpsterBanUntil = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
        
        await Promise.all([user.save(), lottery.save()]);
        return `@${username}, you dove in the dumpster and... were caught trespassing by the police! They have seized ${percentageToTake}% of your points and banned you from dumpster diving for 30 days! You now have ${user.points} points.`;
    }
    else if (roll < JUNK_ITEMS_CHANCE) {
        return `@${username}, you dove in the dumpster and found rotten food. Yuck! You now have ${user.points} points.`;
    }
    else if (roll < JUNK_ITEMS_CHANCE + 0.05) {
        return `@${username}, you dove in the dumpster and found trash. Great. You now have ${user.points} points.`;
    }
    else if (roll < JUNK_ITEMS_CHANCE + 0.1) {
        return `@${username}, you dove in the dumpster and found some rocks. Why were these even in here? You now have ${user.points} points.`;
    }
    else if (roll < SMALL_POINTS_CHANCE) {
        user.points += 100;
        await user.save();
        return `@${username}, you dove in the dumpster and found 100 points! You now have ${user.points} points!`;
    }
    else if (roll < SMALL_POINTS_CHANCE + 0.4) {
        user.points += 10;
        await user.save();
        return `@${username}, you dove in the dumpster and found 10 points! You now have ${user.points} points!`;
    }
    else { // Remaining % - Nothing
        return `@${username}, you dove in the dumpster and found nothing. Yippee. You now have ${user.points} points.`;
    }
}

