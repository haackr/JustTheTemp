"use strict";
require("doenv").config();
const axios = require("axios");

async function getCurrentTemperature(location, deviceUnits) {
  let units = deviceUnits === "FAHRENHEIT" ? "imperial" : "metric";
  const weatherUrl = "http://api.openweathermap.org/data/2.5/weather?";
  const weatherApiKey = process.env.weather_key;
  let weatherQuery;

  if (location.latitudeInDegrees) {
    weatherQuery = `lat=${location.latitudeInDegrees}&lon=${location.longitudeInDegrees}`;
  } else {
    weatherQuery = `zip=${location.postalCode},${location.countryCode}`;
  }
  let result;
  try {
    result = await axios.get(
      weatherUrl + weatherQuery + `&APPID=${weatherApiKey}&units=${units}`
    );
  } catch (error) {
    console.log(error);
    throw "UnknownWeatherError";
  }
  console.log(result);

  let temp = result.data.main.temp;
  const country = result.data.sys.country;

  if (
    deviceUnits === "" &&
    (country === "US" || country === "KY" || country === "LR")
  ) {
    temp = convertCtoF(temp);
    units = "imperial";
  }

  return {
    temp: Math.round(temp),
    units: units,
  };
}

function convertCtoF(temp) {
  return (temp * 9) / 5 + 32;
}

module.exports = {
  getCurrentTemperature,
};
