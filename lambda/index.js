"use strict";
require("dotenv").config();
const axios = require("axios");

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: "PlainText",
      text: output,
    },
    card: {
      type: "Simple",
      title: `${title}`,
      content: `${output}`,
    },
    reprompt: {
      outputSpeech: {
        type: "PlainText",
        text: repromptText,
      },
    },
    shouldEndSession,
  };
}

function buildPermissionResponse() {
  return {
    outputSpeech: {
      type: "PlainText",
      text:
        "Just the Temperature needs permission to use your location. Please go into the alexa app to manage permissions.",
    },
    card: {
      type: "AskForPermissionsConsent",
      permissions: [
        "read::alexa:device:all:address:country_and_postal_code",
        "read::alexa:device:all:geolocation",
      ],
    },
    shouldEndSession: true,
  };
}

function buildTemperatureResponse(temp) {
  return {
    outputSpeech: {
      type: "PlainText",
      text: `It's ${temp.temp} degrees ${
        temp.units == "imperial" ? "Fahrenheit" : "Celcius"
      }.`,
    },
    card: {
      type: "Simple",
      title: "Current Temperature",
      content: `${temp.temp}° ${temp.units == "imperial" ? "F" : "C"}`,
    },
    shouldEndSession: true,
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: "1.0",
    sessionAttributes,
    response: speechletResponse,
  };
}

// --------------- Functions that control the skill's behavior -----------------------

async function getUnits(deviceId, apiEndpoint, apiAccessToken) {
  const tempUrl = `/v2/devices/${deviceId}/settings/System.temperatureUnit`;
  try {
    let response = await axios.get(apiEndpoint + tempUrl, {
      headers: {
        Authorization: `Bearer ${apiAccessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
  }
}

async function getAddress(deviceId, apiEndpoint, apiAccessToken) {
  const addrUrl = `/v1/devices/${deviceId}/settings/address/countryAndPostalCode`;
  try {
    let response = await axios.get(apiEndpoint + addrUrl, {
      headers: {
        Authorization: `Bearer ${apiAccessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log(error);
    if (error.response.status == "403") {
      throw "LocationPermissionError";
    } else {
      throw "UnknownLocationError";
    }
  }
}

function getHelpResponse(callback) {
  // If we wanted to initialize the session to have some attributes we could add those here.
  const cardTitle = "Just the Temperature";
  const speechOutput =
    "To use Just the Temperature, just start the skill or ask it the current temperature. The easiest way to use it is to say, Alexa, just the temperature.";
  const shouldEndSession = true;
  callback(
    {},
    buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession)
  );
}

function handleSessionEndRequest(callback) {}

async function handleTemperatureIntent(session, context, callback) {
  console.log("Handle Temp Context: " + JSON.stringify(context));
  const deviceId = context.System.device.deviceId;
  const apiEndpoint = context.System.apiEndpoint;
  const apiToken = context.System.apiAccessToken;

  const units = await getUnits(deviceId, apiEndpoint, apiToken);
  console.log(units);

  let location = {};

  if (
    context.System.device.supportedInterfaces.Geolocation &&
    context.System.user.permissions.scopes[
      "alexa::devices:all:geolocation:read"
    ].status === "GRANTED"
  ) {
    location.lat = context.Geolocation.coordinate.latitudeInDegrees;
    location.lon = context.Geolocation.coordinate.longitudeInDegrees;
    console.log(location);
  } else {
    let address;
    try {
      address = await getAddress(deviceId, apiEndpoint, apiToken);
    } catch (error) {
      console.log(error);
      if (error == "LocationPermissionError")
        callback({}, buildPermissionResponse());
      if (error == "UnknownLocationError")
        callback(
          {},
          buildSpeechletResponse(
            "ERROR",
            "There was an unknown error getting your location. Please try again.",
            "",
            true
          )
        );
      return;
    }
    console.log(address);
    location = address;
  }
  let temp;
  try {
    temp = await getCurrentTemperature(location, units, callback);
  } catch (error) {
    if (error == "UnknownWeatherError")
      callback(
        {},
        buildSpeechletResponse(
          "ERROR",
          "There was an unknown error getting weather data. Please try again.",
          "",
          true
        )
      );
    return;
  }
  console.log(temp);
  callback({}, buildTemperatureResponse(temp));
}

async function getCurrentTemperature(location, deviceUnits, callback) {
  let units = deviceUnits === "FAHRENHEIT" ? "imperial" : "metric";
  const weatherUrl = "http://api.openweathermap.org/data/2.5/weather?";
  const weatherApiKey = process.env.weather_key;
  let weatherQuery;

  if (location.lat) {
    weatherQuery = `lat=${location.lat}&lon=${location.lon}`;
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
    deviceUnits == "" &&
    (country == "US" || country == "KY" || country == "LR")
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

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
  console.log(
    `onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`
  );
  console.log(process.env.weather_key);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, context, callback) {
  console.log(
    `onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`
  );
  //console.log(`deviceId=${context.System.device.deviceId}, consentToken=${context.System.user.permissions.consentToken}`);
  console.log(JSON.stringify(launchRequest));
  handleTemperatureIntent(session, context, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, context, callback) {
  console.log(
    `onIntent requestId=${intentRequest.requestId}, intentName = ${intentRequest.intent.name}, sessionId=${session.sessionId}`
  );
  // console.log(JSON.stringify(context));
  const intentName = intentRequest.intent.name;
  // console.log(`deviceId=${JSON.stringify(deviceId)} consentToken=${JSON.stringify(consentToken)} apiEndpoint=${JSON.stringify(apiEndpoint)}`);
  // Dispatch to your skill's intent handlers
  if (intentName === "TemperatureIntent") {
    handleTemperatureIntent(session, context, callback);
  } else if (intentName === "AMAZON.HelpIntent") {
    getHelpResponse(callback);
  } else if (
    intentName === "AMAZON.StopIntent" ||
    intentName === "AMAZON.CancelIntent"
  ) {
    handleSessionEndRequest(callback);
  } else {
    throw new Error("Invalid intent");
  }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
  console.log(
    `onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`
  );
  // Add cleanup logic here
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
  try {
    console.log(
      `event.session.application.applicationId=${event.session.application.applicationId}`
    );
    console.log(`CONTEXT=${JSON.stringify(event.context)}`);

    if (
      event.session.application.applicationId !==
      "amzn1.ask.skill.70de330a-7fb5-4939-a9b6-06cdf2e0690f"
    ) {
      callback("Invalid Application ID");
    }

    if (event.session.new) {
      onSessionStarted({ requestId: event.request.requestId }, event.session);
    }

    if (event.request.type === "LaunchRequest") {
      onLaunch(
        event.request,
        event.session,
        event.context,
        (sessionAttributes, speechletResponse) => {
          callback(null, buildResponse(sessionAttributes, speechletResponse));
        }
      );
    } else if (event.request.type === "IntentRequest") {
      onIntent(
        event.request,
        event.session,
        event.context,
        (sessionAttributes, speechletResponse) => {
          callback(null, buildResponse(sessionAttributes, speechletResponse));
        }
      );
    } else if (event.request.type === "SessionEndedRequest") {
      onSessionEnded(event.request, event.session);
      callback();
    }
  } catch (err) {
    callback(err);
  }
};
