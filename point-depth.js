
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
const lat_col = 0;
const long_col = 1;

const POLAR_RADIUS = 6356752 // meters
const EQUATORIAL_RADIUS = 6378137 // meters

const columns = {
		lat: 'Lat',
		long: 'Long',

};
////////////////////////////////////////

// Google has a rate limit of 10 requests per second per IP. This limits the outbound request to only go once every 100 milliseconds
const limiter = new Bottleneck({
  minTime: 100
});

// Read in lat long file data
console.log(`Starting file stream read from ${file_name}`);
const readInterface = readline.createInterface({
	input: fs.createReadStream(file_name),
	output: process.stdout,
	console: false
});

// Note: we use the crlfDelay option to recognize all instances of CR LF
// ('\r\n') in input.txt as a single line break.
const promises = [];
readInterface.on('line', (line) => {
	const splitLine = line.split(delimiter);
	const lat = splitLine[lat_col];
	const long = splitLine[long_col];
	promises.push(getPointElevation(lat, long));
});

readInterface.on('close', (line) => {
	Promise.all(promises)
	.then(results => {
		console.log(`Processing promises`)
		const time = Date.now();
		fs.writeFile(`data/${file_prefix}_${time}.csv`, results, function (err) {
			if (err) throw err;
			console.log('Saved!');
		});
		
	})
	.catch(error => {
		console.log(error);
	});

});



const getPointElevation = (lat, long) => {
	return new Promise((resolve,reject) => {
		if(!lat || !long) return reject(new Error('Missing either lat or long'));
		const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${long}&key=${api_key}`;
		limiter.schedule(() => axios.get(url))
			.then(result => {
				const elevation = result.data.results[0].elevation;
				const resolution = result.data.results[0].resolution;
				const location = result.data.results[0].location;
				const commaSeperated = `${location.lat},${location.lng},${elevation},${resolution}`;
				console.log(commaSeperated);
				return resolve(commaSeperated);
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