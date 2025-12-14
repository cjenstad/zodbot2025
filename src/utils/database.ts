import mongoose from 'mongoose';

//Define the User schema
export const UserSchema = new mongoose.Schema({
    username: String,
    points: {type: Number, default: 100},
    ownedStocks: [{
        symbol: String,
        quantity: Number,
        purchasePrice: Number
    }],
    blackjackBet: {type: Number, default: 0},
    blackjackHand: {type: [String], default: []},
    dealerHand: {type: [String], default: []},
    isDueling: {type: Boolean, default: false},
    duelInitiator: {type: Boolean, default: false},
    duelOpponent: {type: String, default: ''},
    duelBet: {type: Number, default: 0},
    emojiCollection: {type: [String], default: []},
    lastDumpsterDive: {type: Date, default: null},
    dumpsterBanUntil: {type: Date, default: null}
});

//Define the Lottery schema
export const LotterySchema = new mongoose.Schema({
    lotteryBonus: { type: Number, default: 0 },
    scamballJackpot: { type: Number, default: 20000000 }
});

//Define the Stocks schema
export const StocksSchema = new mongoose.Schema({
    symbol: String,
    currentPrice: Number,
    lastPrice: Number
});

//Create models from the schemas
export const User = mongoose.model('User', UserSchema);
export const Lottery = mongoose.model('Lottery', LotterySchema);
export const Stocks = mongoose.model('Stocks', StocksSchema);

//Function to add a user
export async function addUser(db: typeof mongoose, username: string, points: number, ownedStocks: string[] | null, blackjackBet: number, blackjackHand: string[] | null, dealerHand: string[] | null, isDueling: boolean, duelInitiator: boolean, duelOpponent: string, duelBet: number, emojiCollection: string[] | null) {
    const User = db.model('User');
    const user = new User({
        username,
        points,
        ownedStocks,
        blackjackBet,
        blackjackHand,
        dealerHand,
        isDueling,
        duelInitiator,
        duelOpponent,
        duelBet,
        emojiCollection,
        lastDumpsterDive: null,
        dumpsterBanUntil: null
    });
    await user.save();
}

//Function to create a lottery
export async function addLottery(db: typeof mongoose, lotteryBonus: number) {
    const Lottery = db.model('Lottery', LotterySchema);
    const lottery = new Lottery({
        lotteryBonus,
        scamballJackpot: 20000000  // Initialize with 20M points
    });
    await lottery.save();
}

//Function to add a stock
export async function addStocks(db: typeof mongoose, symbol: string, currentPrice: number, lastPrice: number) {
    const Stocks = db.model('Stocks', StocksSchema);
    const stock = new Stocks({
        symbol,
        currentPrice,
        lastPrice
    });
    await stock.save();
}