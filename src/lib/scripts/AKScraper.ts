//import type { Character, HairColor, Color, Gender } from '$lib/types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_DELAY = 1000; //There was 1 request a second so I hope this is enough?
const OUTPUT_DIR = path.join(__dirname, '../data');
const ID_FILE = path.join(OUTPUT_DIR, 'arknights-character-ids.json');

//All the data available on the animecharacterdatabase
interface ScrapeData {
	id: string;
	name: string;
	game?: string;
	gender?: string;
	eyeColor?: string;
	hairColor?: string;
	voiceActor?: string;
}

function delay(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, SITE_DELAY));
}

function extractField(html: string, field: string): string | undefined {
	const pattern = new RegExp(`${field}[\\s\\S]*?<\\/?[^>]+>([^<\\n]+)`, 'i');
	const match = html.match(pattern);
	if (match && match[1] && !match[1].includes('AD') && match[1].trim().length < 50) {
		return match[1].trim();
	}
	return undefined;
}

async function scrapePage(id: number, name: string): Promise<ScrapeData | null> {
	const url = `https://www.animecharactersdatabase.com/characters.php?id=${id}`;
	try {
		console.log(`Trying to fetch data ID: ${id}`);
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP: ${response.status}: ${response.statusText}`);
		}
		const html = await response.text();
		const rawData: ScrapeData = {
			id: name.toLowerCase(),
			name,
			game: extractField(html, 'Primary Assignment'),
			gender: extractField(html, 'Gender'),
			eyeColor: extractField(html, 'Eye Color'),
			hairColor: extractField(html, 'Hair Color'),
			voiceActor: extractField(html, 'Voiced By')
		};
		console.log(rawData);
		console.log(
			`Little validator: ${name} | Eye: ${rawData.eyeColor} | Hair: ${rawData.hairColor}`
		);
		return rawData;
	} catch (error) {
		console.error(`Error: ${name} `, error);
	}
	return null;
}

/* Finish later
function transformCharacter(raw: ScrapeData): Character {
  return {
    id: raw.name.toLowerCase(),
    name: raw.name,
    game: "Arknights", //Change later I'm dumb
    releaseDate: "Unknown",
    rarity: "Other",
    gender: raw.gender,


  }
}*/

//Under work, it does not work at all yet
async function scrapeAllPages() {
	console.log('Staring');

	//Checks for the file with all ids for every character if it exists
	if (!fs.existsSync(ID_FILE)) {
		console.error(`Error: ${ID_FILE} not found`);
		process.exit(1);
	}

	const idList = JSON.parse(fs.readFileSync(ID_FILE, 'utf-8'));
	console.log(`Loaded list: ${ID_FILE} with ${idList.length}`);

	//const rawResults: ScrapeData[] = [];
	//const errors: {id: number; name: string; error: string }[] = [];

	//Just placeholder
	delay();
}

//Test function for now to run it, you can try it with npm run scrape:arknights from cmd
scrapePage(100951, 'Amiya').catch((error) => {
	console.error('Did not work', error);
	process.exit(1);
});

scrapeAllPages().catch((error) => {
	console.error('All pages did not work', error);
	process.exit(1);
});
