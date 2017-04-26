'use strict';

const http = require('http');
const https = require('https');

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `${title}`,
            content: `${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildPermissionResponse() {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: "Just the Temperature doesn't have permission to use your location. Please go into the alexa app and grant it permission.",
    },
    card: {
      type: 'AskForPermissionsConsent',
      permissions: ['read::alexa:device:all:address:country_and_postal_code'],
    },
    shouldEndSession: true,
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getHelpResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const cardTitle = 'Just the Temperature';
    const speechOutput = 'To use Just the Temperature, just start the skill or ask it the current temperature.';
    const shouldEndSession = true;
    callback({},buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function handleSessionEndRequest(callback) {

}

function handleTemperatureIntent(session, deviceId, consentToken, apiEndpoint, callback) {
  console.log(`consentToken=${JSON.stringify(consentToken)}`);
  if (consentToken === null || consentToken === undefined) {
    console.log('consentToken not found');
    callback({},buildPermissionResponse());
  } else {
    const host = apiEndpoint.replace('https://','');
    const path = `/v1/devices/${deviceId}/settings/address/countryAndPostalCode`;
    const auth = `Bearer ${consentToken}`;
    console. log(`host=${host} path=${path} auth=${auth}`)
    const req = https.request({
      host: host,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': auth
      }
    }, (res)  => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      if(res.statusCode === 200) {
        res.on('data', (chunk) => {
          var addressRes = JSON.parse(chunk);
          // console.log(JSON.stringify(addressRes));
          getCurrentTemperature(addressRes.postalCode, addressRes.countryCode, callback);
        });
      } else {
        const cardTitle = 'Error';
        const speechOutput = 'There was a problem getting your location information. Please try again later.';
        const shouldEndSession = true;
        callback({},buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
      }
    });

    req.on('error', (e) => {
      const cardTitle = 'Error';
      const speechOutput = 'There was a problem getting your location information. Please try again later.';
      const shouldEndSession = true;
      callback({},buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
    });

    req.end();
  }
}

function getCurrentTemperature(postalCode, countryCode, callback) {
  var temp = 0.0;
  var units = '';
  if (countryCode === 'US' || countryCode === 'BS' || countryCode === 'BZ' || countryCode === 'KY' || countryCode === 'MH' || countryCode === 'FM' || countryCode === 'PW' || countryCode === 'PR' || countryCode === 'GU' || countryCode === 'VI') {
    units = 'imperial';
  } else {
    units = 'metric';
  }
  const req = http.request(`http://api.openweathermap.org/data/2.5/weather?zip=${postalCode},${countryCode}&APPID=${process.env.weather_key}&units=${units}`, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    if (res.statusCode === 200){
      res.on('data', (chunk) => {
        var weatherRes = JSON.parse(chunk);
        // console.log(JSON.stringify(weatherRes));
        temp = weatherRes.main.temp;
        console.log(temp);
        const cardTitle = 'Current Temperature';
        const speechOutput = `The current temperature is ${Math.round(temp)} degrees.`;
        const shouldEndSession = true;
        callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
      });
    } else {
      const cardTitle = 'Error';
      const speechOutput = 'There was an error getting weather data. Please try again later.';
      const shouldEndSession = true;
      callback({},buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
    }
  });

  req.on('error', (e) => {
    const cardTitle = 'Error';
    const speechOutput = 'There was an error getting weather data. Please try again later.';
    const shouldEndSession = true;
    callback({},buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
  });

  req.end();
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
    // console.log(process.env.weather_key);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, context, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
    //console.log(`deviceId=${context.System.device.deviceId}, consentToken=${context.System.user.permissions.consentToken}`);
    console.log(JSON.stringify(launchRequest));

    var deviceId = null;
    var consentToken = null;
    var apiEndpoint = null;
    if (context !== undefined && context.hasOwnProperty('System.device.deviceId') && context.hasOwnProperty('System.user.permissions.consentToken') && context.hasOwnProperty('Sytem.apiEndpoint')){
      deviceId = context.System.device.deviceId;
      consentToken = context.System.user.permissions.consentToken;
      apiEndpoint = context.System.apiEndpoint;
    }
    handleTemperatureIntent(session, deviceId, consentToken, apiEndpoint, callback);
    // Dispatch to your skill's launch.
    //handleTemperatureIntent(intent, session, deviceId, consentToken, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, context, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, intentName = ${intentRequest.intent.name}, sessionId=${session.sessionId}`);
    // console.log(JSON.stringify(context));

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;
    var deviceId = null;
    var consentToken = null;
    var apiEndpoint = null;
    if (context !== undefined && context.hasOwnProperty('System.device.deviceId') && context.hasOwnProperty('System.user.permissions.consentToken') && context.hasOwnProperty('Sytem.apiEndpoint')){
      deviceId = context.System.device.deviceId;
      consentToken = context.System.user.permissions.consentToken;
      apiEndpoint = context.System.apiEndpoint;
    }
    console.log(`deviceId=${JSON.stringify(deviceId)} consentToken=${JSON.stringify(consentToken)} apiEndpoint=${JSON.stringify(apiEndpoint)}`);
    // Dispatch to your skill's intent handlers
    if (intentName === 'TemperatureIntent') {
        handleTemperatureIntent(session, deviceId, consentToken, apiEndpoint, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getHelpResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);
        console.log(`CONTEXT=${JSON.stringify(event.context)}`);

        if (event.session.application.applicationId !== 'amzn1.ask.skill.70de330a-7fb5-4939-a9b6-06cdf2e0690f') {
             callback('Invalid Application ID');
        }


        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session, event.context,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session, event.context,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
