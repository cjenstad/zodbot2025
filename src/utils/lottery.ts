import mongoose from 'mongoose';

/**
 * Runs a lottery for a user.
 * @param db - The mongoose instance used to access the database.
 * @param username - The username of the user.
 * @param roll - The number the user is betting on.
 * @returns A string indicating the result of the lottery.
 */
export async function lotteryRoll(db: typeof mongoose, username: string, roll: number) {
  const Lottery = db.model('Lottery');
  const lottery = await Lottery.findOne();
  const User = db.model('User');
  const user = await User.findOne({ username }).exec();
    if (!user) {
        return 'User not found';
    }
    if (user.points < 100) {
        return `${username}, you need ${100 - user.points} points to buy a lottery ticket`;
    }
    if(roll < 1 || roll > 1000) {
        return 'Invalid number';
    }


    user.points -= 100;
    const winningNumber = Math.floor(Math.random() * 1000) + 1;
    // const winningNumber = 888; // For testing purposes
    if (roll === winningNumber){
        user.points += 1000000 + (lottery.lotteryBonus || 0);
        await user.save();
        lottery.lotteryBonus = 0;
        await lottery.save();
        return `Congratulations! ${username} won the lottery! The winning number was ${winningNumber}. ${username} now has ${user.points} points`;
    }else {
        if(lottery){
            lottery.lotteryBonus = (lottery.lotteryBonus || 0 ) + 99;
            await lottery.save();
        }
        await user.save();
        return `Better luck next time! The winning number was ${winningNumber}. The jackpot is now ${1000000 + (lottery.lotteryBonus || 0)} points. ${username} now has ${user.points} points`;
    }
}

/**
 * Runs a scamball lottery for a user.
 * @param db - The mongoose instance used to access the database.
 * @param username - The username of the user.
 * @param numbers - Array of 5 numbers between 1-69.
 * @param scamball - The scamball number between 1-26.
 * @returns A string indicating the result of the scamball.
 */
export async function scamballRoll(db: typeof mongoose, username: string, numbers: number[], scamball: number) {
    const Lottery = db.model('Lottery');
    const lottery = await Lottery.findOne();
    const User = db.model('User');
    const user = await User.findOne({ username }).exec();

    if (!user) {
        return 'User not found';
    }

    if (user.points < 2) {
        return `${username}, you need ${2 - user.points} more points to buy a scamball ticket`;
    }

    // Validate input numbers
    if (numbers.length !== 5) {
        return 'Please enter exactly 5 numbers between 1-69';
    }

    if (!numbers.every(n => n >= 1 && n <= 69)) {
        return 'All numbers must be between 1 and 69';
    }

    if (scamball < 1 || scamball > 26) {
        return 'Scamball number must be between 1 and 26';
    }

    if (new Set(numbers).size !== numbers.length) {
        return 'All numbers must be different';
    }

    // Deduct ticket cost
    user.points -= 2;

    // Generate winning numbers
    const winningNumbers: number[] = [];
    while (winningNumbers.length < 5) {
        const num = Math.floor(Math.random() * 69) + 1;
        if (!winningNumbers.includes(num)) {
            winningNumbers.push(num);
        }
    }
    const winningScamball = Math.floor(Math.random() * 26) + 1;

    // Count matching numbers
    const matchingNumbers = numbers.filter(n => winningNumbers.includes(n)).length;
    const scamballMatch = scamball === winningScamball;

    // Calculate prize
    let prize = 0;
    if (matchingNumbers === 5 && scamballMatch) {
        // Grand prize
        prize = lottery.scamballJackpot;
        lottery.scamballJackpot = 20000000; // Reset jackpot
    } else {
        // Add to jackpot if not grand prize
        lottery.scamballJackpot += 2;
        
        // Other prize tiers
        if (matchingNumbers === 5) prize = 1000000;
        else if (matchingNumbers === 4 && scamballMatch) prize = 50000;
        else if (matchingNumbers === 4) prize = 100;
        else if (matchingNumbers === 3 && scamballMatch) prize = 100;
        else if (matchingNumbers === 3) prize = 7;
        else if (matchingNumbers === 2 && scamballMatch) prize = 7;
        else if (matchingNumbers === 1 && scamballMatch) prize = 4;
        else if (scamballMatch) prize = 4;
    }

    // Update user points and save
    user.points += prize;
    await user.save();
    await lottery.save();

    return `${username} matched ${matchingNumbers} number${matchingNumbers !== 1 ? 's' : ''}${scamballMatch ? ' and the scamball' : ''}! ` +
           `Winning numbers: ${winningNumbers.join(', ')} (${winningScamball}). ` +
           `${prize > 0 ? `Won ${prize} points! ` : ''}` +
           `Current jackpot: ${lottery.scamballJackpot} points. ` +
           `${username} now has ${user.points} points`;
}

/**
 * Generates random numbers for scamball autopick.
 * @returns An object containing the picked numbers and scamball number.
 */
export function generateScamballNumbers(): { numbers: number[], scamball: number } {
    const numbers: number[] = [];
    while (numbers.length < 5) {
        const num = Math.floor(Math.random() * 69) + 1;
        if (!numbers.includes(num)) {
            numbers.push(num);
        }
    }
    const scamball = Math.floor(Math.random() * 26) + 1;
    return { numbers: numbers.sort((a, b) => a - b), scamball };
}
  