import fs from 'fs';
import path from 'path';

export async function getRandomZodgyism(): Promise<string> {
    try {
        const response = await fetch('https://pastebin.com/raw/Ka7vUdxu');
        const text = await response.text();
        const quotes = text.split('|').filter(quote => quote.trim() !== '');
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    } catch (error) {
        console.error('Error fetching Zodgyisms:', error);
        return 'Error fetching Zodgyism';
    }
}

export async function getRandomKiwiism(): Promise<string> {
    try {
        const response = await fetch('https://pastebin.com/raw/AFbGuseu');
        const text = await response.text();
        const quotes = text.split('|').filter(quote => quote.trim() !== '');
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    } catch (error) {
        console.error('Error fetching Kiwiisms:', error);
        return 'Error fetching Kiwiism';
    }
}

export async function getRandomMelonism(): Promise<string> {
    try {
        const response = await fetch('https://pastebin.com/raw/uWqABQzG');
        const text = await response.text();
        const quotes = text.split('|').filter(quote => quote.trim() !== '');
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    } catch (error) {
        console.error('Error fetching Melonisms:', error);
        return 'Error fetching Melonism';
    }
}

export async function getRandomTwentyism(): Promise<string> {
    try {
        const response = await fetch('https://pastebin.com/raw/caGqdyyw');
        const text = await response.text();
        const quotes = text.split('|').filter(quote => quote.trim() !== '');
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    } catch (error) {
        console.error('Error fetching Twentyisms:', error);
        return 'Error fetching Twentyism';
    }
}

export async function getRandomAbhism(): Promise<string> {
    try {
        const response = await fetch('https://pastebin.com/raw/yka2FBBc');
        const text = await response.text();
        const quotes = text.split('|').filter(quote => quote.trim() !== '');
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    } catch (error) {
        console.error('Error fetching Abhisms:', error);
        return 'Error fetching Abhism';
    }
}