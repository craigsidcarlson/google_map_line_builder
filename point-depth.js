
const { getPreciseDistance, getGreatCircleBearing, computeDestinationPoint } = require('geolib');
const axios = require('axios');
const fs = require('fs');
const readline = require('readline');
const Bottleneck = require('bottleneck');
require('dotenv').config();
const myArgs = process.argv.slice(2);
const file_name = myArgs[0];

const api_key = process.env.google_api_key;

if(!api_key) {
	console.log('Error! You need to put your google api key in the .env file. Read the Readme.md file for instructions');
	return;
}

////////////////////////////////////////
// Configurable Data
////////////////////////////////////////
const file_prefix = 'roz_data';

const delimiter = ',';
const lat_col = 1;
const long_col = 3;

////////////////////////////////////////

// Google has a rate limit of 10 requests per second per IP. This limits the outbound request to only go once every 100 milliseconds
const limiter = new Bottleneck({
  minTime: 100
});

const MAX_LOCATIONS_PER_REQUEST = 512;

// Read in lat long file data
console.log(`Starting file stream read from ${file_name}`);
const readInterface = readline.createInterface({
	input: fs.createReadStream(file_name),
	output: process.stdout,
	console: false
});

// Note: we use the crlfDelay option to recognize all instances of CR LF
// ('\r\n') in input.txt as a single line break.
const coordinates = [];
readInterface.on('line', (line) => {
	const splitLine = line.split(delimiter);
	const lat = splitLine[lat_col];
	const long = splitLine[long_col];
	coordinates.push({lat, long});
});

readInterface.on('close', () => {
	const promises = [];
	const batches = [];
	for (let i = 0; i < coordinates.length; i += MAX_LOCATIONS_PER_REQUEST) {
			const chunk = coordinates.slice(i, i + MAX_LOCATIONS_PER_REQUEST);
			batches.push(chunk);
	}
	for (let i = 0; i < batches.length; i++) {
		promises.push(getPointElevation(batches[i]));
	}

	Promise.all(promises)
	.then(results => {
		const time = Date.now();
		fs.writeFile(`data/${file_prefix}_${time}.csv`, results.flat().join('\n'), function (err) {
			if (err) throw err;
			console.log('Saved!');
		});
		
	})
	.catch(error => {
		console.log(error);
	});

});

const getPointElevation = (coordinates) => {
	return new Promise((resolve,reject) => {
		if(!coordinates || !coordinates.length) return reject(new Error('Missing either lat or long'));
		console.log(coordinates)
		let locationSearchString = '';
		for (let i = 0; i < coordinates.length; i++) {
			locationSearchString = locationSearchString.concat(`${coordinates[i].lat},${coordinates[i].long}`);
			if (i !== coordinates.length -1 ) locationSearchString = locationSearchString.concat('|');
		}
		console.log(`locationSearchString: ${locationSearchString}`);
		const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locationSearchString}&key=${api_key}`;
		limiter.schedule(() => axios.get(url))
			.then(results => {
				const commaSeperatedResponses = [];
				for(let i = 0; i < results.length; i++) {
					const elevation = results.data.results[i].elevation;
					const resolution = results.data.results[i].resolution;
					const location = results.data.results[i].location;
					commaSeperatedResponses.push(`${location.lat},${location.lng},${elevation},${resolution}`);
				}
				return resolve(commaSeperatedResponses);
			})
			.catch(error => {
				console.log(error);
				return reject(error);
			})
	});
}

function toDegrees(angle) {
  return angle * (180 / Math.PI);
}

function toRadians (angle) {
  return angle * (Math.PI / 180);
}

function cosine(angle) {
	return toDegrees(Math.cos(toRadians(angle)));
}

function sine(angle) {
	return toDegrees(Math.sin(toRadians(angle)));
}