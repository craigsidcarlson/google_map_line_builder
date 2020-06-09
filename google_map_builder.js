
const { getPreciseDistance, getGreatCircleBearing, computeDestinationPoint } = require('geolib');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const api_key = process.env.google_api_key;

if(!api_key) {
	console.log('Error! You need to put your google api key in the .env file. Read the Readme.md file for instructions');
	return;
}

////////////////////////////////////////
// Configurable Data
////////////////////////////////////////
const file_prefix = 'roz_data';

const start_lat = 41.30;
const start_long = -131.300;

const end_lat = 40.90;
const end_long = -131.30;

const increments = 50; // meters

const POLAR_RADIUS = 6356752 // meters
const EQUATORIAL_RADIUS = 6378137 // meters
////////////////////////////////////////

//  Vincenty inverse formula for ellipsoids.
const distance = getPreciseDistance({latitude: start_lat, longitude: start_long}, {latitude: end_lat, longitude: end_long});
const compass_direction = getGreatCircleBearing({latitude: start_lat, longitude: start_long}, {latitude: end_lat, longitude: end_long});

console.log(`Distance ${distance}`);
console.log(`Bearing ${compass_direction}`);

const google_api_limit = 510;
const segment_length = increments * google_api_limit; // meters

const segments = Math.ceil(distance / segment_length);
console.log(`Stitching together ${segments} segments`);

const promises = [];
let start = { latitude: start_lat, longitude: start_long };
let earth_radius_with_lat = calculateEarthRadiusAtLat(start.latitude);
let end;
for(let i = 0; i < segments; i++) {

	if(i === segments - 1) end = {latitude: end_lat, longitude: end_long};
	else {
		// computeDestinationPoint(point, distance, bearing, radius = earthRadius)
		end = computeDestinationPoint({latitude: start.latitude, longitude: start.longitude}, segment_length, compass_direction, earth_radius_with_lat);
	}
	promises.push(callGoogleApi(start, end, google_api_limit));
	start = end;
	earth_radius_with_lat = calculateEarthRadiusAtLat(start.latitude);
}

Promise.all(promises)
	.then(results => {
		if(results) {
			let data = [];
			for(let i = 0; i < results.length; i++) {
				let segment_data = [];

				if(i > 0) {
					// remove first data point as it was the last data point in the previous segment
					results[i].data.results.shift();
				}
				segment_data = results[i].data.results;
				let combined_data = data.concat(segment_data);
				data = combined_data;
			}
			const time = Date.now();

			const output = {
				results: data,
				status: 'OK'
			};

			fs.writeFile(`data/${file_prefix}_${time}.json`, JSON.stringify(output), function (err) {
			  if (err) throw err;
			  console.log('Saved!');
			});
		}
	})
	.catch(error => {
		console.log(error);
	});



function callGoogleApi(start, end, google_api_limit) {
	return new Promise((resolve, reject) => {
		const url = `https://maps.googleapis.com/maps/api/elevation/json?path=${start.latitude},${start.longitude}|${end.latitude},${end.longitude}&samples=${google_api_limit}&key=${api_key}`
		console.log(`Making request ${url}`);
		axios.get(url)
			.then(resolve)
			.catch(error => {
				console.log(error);
				return reject(error);
			})
	});
}

function calculateEarthRadiusAtLat(lat) {
	const equatorial_numerator = Math.pow((Math.pow(EQUATORIAL_RADIUS, 2) * cosine(lat)), 2);
	const polar_numberator = Math.pow((Math.pow(POLAR_RADIUS, 2) * sine(lat)), 2);

	const equatorial_denominator = Math.pow((EQUATORIAL_RADIUS * cosine(lat)), 2);
	const polar_denominator = Math.pow((POLAR_RADIUS * sine(lat)), 2);

	const geocentric_radius = Math.sqrt(((equatorial_numerator + polar_numberator)/(equatorial_denominator + polar_denominator)));
	console.log(`Geocentric Radius at latitude: ${lat} = ${geocentric_radius}`);
	return geocentric_radius;
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