Stitch together google api map data along line.

To run, you will need NodeJs installed

https://nodejs.org/en/download/

To install dependencies, run the following command:

`npm install`

All of the configurable parameters are at the top of the `google_map_builder.js` file.

You will need a google api key. Place the api key in a file named `.env`

A sample env file is provided `.env_sample` Simply rename it to `.env` and paste your api key after the equals sign, without quotes.

Run `npm start` from the top most directory(the one with the `google_map_builder.js` file).

The data is put into the data folder with your prefix of choice and a timestamp.

