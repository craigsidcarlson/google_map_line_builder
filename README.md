Stitch together google api map data along line.

To run, you will need NodeJs installed

https://nodejs.org/en/download/

Download this repository then install dependencies by running the following command:

`npm install`

All of the configurable parameters are at the top of the `google_map_builder.js` file.

You will need a google api key. Place the api key in a file named `.env`

A sample env file is provided `.env_sample` Simply rename it to `.env` and paste your api key after the equals sign, without quotes.

Run `npm start` from the top most directory(the one with the `google_map_builder.js` file).

The data is put into the data folder with your prefix of choice and a timestamp.



To get the elevation data from a list of lat long coordintes, follow the above instructions but instead of running the `npm start` command run `npm run point-depth -- fileName.csv` where `fileName.csv` is the name of the file to be read. In the point-depth.js there are hard coded configurations for which column your lat and long data is located in defaults to 0 and 1.

The response includes the elevation at that point, in meters, along with the resolution value (the maximum distance between data points from which the elevation was interpolated, in meters).