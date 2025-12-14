import mongoose from 'mongoose';

// Define a deck of cards
let deck = ['A♠', '2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', '10♠', 'J♠', 'Q♠', 'K♠',
    'A♣', '2♣', '3♣', '4♣', '5♣', '6♣', '7♣', '8♣', '9♣', '10♣', 'J♣', 'Q♣', 'K♣',
    'A♥', '2♥', '3♥', '4♥', '5♥', '6♥', '7♥', '8♥', '9♥', '10♥', 'J♥', 'Q♥', 'K♥',
    'A♦', '2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '8♦', '9♦', '10♦', 'J♦', 'Q♦', 'K♦'];

// Function to draw a card from the deck
function drawCard() {
    const randomIndex = Math.floor(Math.random() * deck.length);
    return deck.splice(randomIndex, 1)[0];
}

// Function to calculate the value of a hand
export function calculateHand(hand: string[]) {
    let value = 0;
    let aces = 0;
    let nonAceValue = 0;

    for (const card of hand) {
        const rank = card.slice(0, -1); // Extract the rank from the card
        if (rank === 'A') {
            aces += 1;
        } else if (['K', 'Q', 'J'].includes(rank)) {
            nonAceValue += 10;
        } else {
            nonAceValue += Number(rank);
        }
    }

    // Calculate the value of a hand without aces
    let handValue = nonAceValue;

    // Caclulate the value of a hand with aces
    for (let i = 0; i < aces; i++) {
        if (handValue + 11 <= 21) {
            handValue += 11;
        } else {
            handValue += 1;
        }
    }

    value = handValue; // Assign the calculated hand value to the value variable

    return value;
}

// Add this helper function
function hasBlackjack(hand: string[]) {
    return hand.length === 2 && calculateHand(hand) === 21;
}

export async function startBlackjack(db: typeof mongoose, username: string, bet: number) {
    const User = db.model('User');
    const user = await User.findOne({ username });
    if (!user) {
        return `${username} not found`;
    }
    if (user && user.blackjackHand.length > 0) {
        return `${username}, you are already playing blackjack! Your hand: ${calculateHand(user.blackjackHand)} (${user.blackjackHand.join(', ')}) Dealer shows: ${calculateHand(user.dealerHand)} (${user.dealerHand[0]}). Type !hit to draw another card, !double to double down (if you can afford it), or !stand to stick with your cards.`
    }
    if (!user || bet < 1 || bet > user.points) {
        return `${username}, invalid bet. Your current balance is ${user.points}`;
    }
    if (user && user.points && user.points >= bet) {
        deck = ['A♠', '2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', '10♠', 'J♠', 'Q♠', 'K♠',
            'A♣', '2♣', '3♣', '4♣', '5♣', '6♣', '7♣', '8♣', '9♣', '10♣', 'J♣', 'Q♣', 'K♣',
            'A♥', '2♥', '3♥', '4♥', '5♥', '6♥', '7♥', '8♥', '9♥', '10♥', 'J♥', 'Q♥', 'K♥',
            'A♦', '2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '8♦', '9♦', '10♦', 'J♦', 'Q♦', 'K♦'];
        user.points -= bet;
        user.blackjackBet = bet;
        user.blackjackHand = [drawCard(), drawCard()];
        user.dealerHand = [drawCard()];

        // Check for player blackjack
        if (hasBlackjack(user.blackjackHand)) {
            // Draw dealer's second card to check for dealer blackjack
            user.dealerHand.push(drawCard());
            
            if (hasBlackjack(user.dealerHand)) {
                // Push if both have blackjack
                user.points += bet;
                const message = `${username}, both you and dealer have Blackjack! Push. Your hand: ${user.blackjackHand.join(', ')}, Dealer's hand: ${user.dealerHand.join(', ')}`;
                user.blackjackHand = [];
                user.dealerHand = [];
                user.blackjackBet = 0;
                await user.save();
                return message;
            } else {
                // Player wins with blackjack (3:2 payout)
                user.points += bet + Math.floor(bet * 1.5);
                const message = `${username} got Blackjack! You win! Your hand: ${user.blackjackHand.join(', ')}, Dealer's hand: ${user.dealerHand.join(', ')}`;
                user.blackjackHand = [];
                user.dealerHand = [];
                user.blackjackBet = 0;
                await user.save();
                return message;
            }
        }

        await user.save();
        const userHandValue = calculateHand(user.blackjackHand);
        return `${username}, dealing cards! Your hand: ${userHandValue} (${user.blackjackHand.join(', ')}), Dealer shows: ${calculateHand(user.dealerHand)} (${user.dealerHand[0]}). Type !hit to draw another card, !double to double down (if you can afford it), or !stand to stick with your cards.`
    }
}

export async function hit(db: typeof mongoose, username: string) {
    const User = db.model('User');
    const user = await User.findOne({ username });
    if (user && user.blackjackHand.length > 0) {
        user.blackjackHand.push(drawCard());
        const userHandValue = calculateHand(user.blackjackHand);
        if (userHandValue > 21) {
            const message = `${username} busts! Your hand value is ${userHandValue} (${user.blackjackHand.join(', ')}).`;
            user.blackjackHand = [];
            user.dealerHand = [];
            user.blackjackBet = 0;
            await user.save();
            return message;
        }
        await user.save();
        return `${username}, your new hand: ${userHandValue} (${user.blackjackHand.join(', ')})`;
    }
    if(user.blackjackHand.length === 0){
        return `${username}, you are not currently playing blackjack.`;
    }
}

export async function doubleDown(db: typeof mongoose, username: string) {
    const User = db.model('User');
    const user = await User.findOne({ username });
    if (user && user.blackjackHand.length > 0) {
        if (user.points >= user.blackjackBet) {
            user.points -= user.blackjackBet;
            user.blackjackBet *= 2;
            user.blackjackHand.push(drawCard());
            await user.save();
            const userHandValue = calculateHand(user.blackjackHand);
            if (userHandValue > 21) {
                const message = `${username} busts! Your hand value is ${userHandValue} (${user.blackjackHand.join(', ')}).`;
                user.blackjackHand = [];
                user.dealerHand = [];
                user.blackjackBet = 0;
                await user.save();
                return message;
            } else {
                return stand(db, username);
            }
        }
        return `${username}, insufficient points to double down`;
    }
    if(user.blackjackHand.length === 0){
        return `${username}, you are not currently playing blackjack.`;
    }
}

export async function stand(db: typeof mongoose, username: string) {
    const User = db.model('User');
    const user = await User.findOne({ username });
    let userHandValue = 0;
    let dealerHandValue = 0;
    if (user && user.blackjackHand.length > 0) {
        dealerHandValue = calculateHand(user.dealerHand);
        while (dealerHandValue < 17) {
            user.dealerHand.push(drawCard());
            dealerHandValue = calculateHand(user.dealerHand);
        }
        userHandValue = calculateHand(user.blackjackHand);
        if(dealerHandValue > 21){
            const message = `Dealer busts! ${username} wins! Your hand value: ${userHandValue} (${user.blackjackHand.join(', ')}), Dealer final hand: ${dealerHandValue} (${user.dealerHand.join(', ')})`;
            user.points += user.blackjackBet * 2;
            user.blackjackHand = [];
            user.dealerHand = [];
            user.blackjackBet = 0;
            await user.save();
            return message;
        } else if (userHandValue > dealerHandValue) {
            const message = `${username} wins! Your hand value: ${userHandValue} (${user.blackjackHand.join(', ')}) Dealer final hand: ${dealerHandValue} (${user.dealerHand.join(', ')})`;
            user.points += 2 * user.blackjackBet;
            user.blackjackHand = [];
            user.dealerHand = [];
            user.blackjackBet = 0;
            await user.save();
            return message;
        } else if (userHandValue < dealerHandValue) {
            const message = `${username} loses! Your hand value: ${userHandValue} (${user.blackjackHand.join(', ')}) Dealer final hand: ${dealerHandValue} (${user.dealerHand.join(', ')})`;
            user.blackjackHand = [];
            user.dealerHand = [];
            user.blackjackBet = 0;
            await user.save();
            return message;
        } else {
            const message = `${username}, it's a tie! Your hand value: ${userHandValue} (${user.blackjackHand.join(', ')}) Dealer final hand: ${dealerHandValue} (${user.dealerHand.join(', ')})`;
            user.points += user.blackjackBet;
            user.blackjackHand = [];
            user.dealerHand = [];
            user.blackjackBet = 0;
            await user.save();
            return message;
        }
    }
    if(user.blackjackHand.length === 0){
        return `${username}, you are not currently playing blackjack.`;
    }
}
