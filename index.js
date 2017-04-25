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
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
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
    card: {
      type: 'AskForPermissionConsent',
      permissions: ['read::alexa:device:all:address:country_and_postal_code']
    }
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

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    getCurrentTemperature(callback);
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Alexa Skills Kit sample. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function handleTemperatureIntent(intent, session, deviceId, consentToken, callback) {
  if (consentToken === undefined) {
    console.log('consentToken not found');
    callback({},buildPermissionResponse());
  }
  // https.request({
  //   host:
  // }, (res)  => {
  //
  // });
  else {
    getCurrentTemperature(callback);
  }
}

function getCurrentTemperature(callback) {
  var temp = 0.0;
  var postalCode = '87108';
  var country = 'us';
  http.request(`http://api.openweathermap.org/data/2.5/weather?zip=${postalCode},${country}&APPID=39079801eb920786911ab78ede676b58&units=imperial`, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      var weatherRes = JSON.parse(chunk);
      console.log(JSON.stringify(weatherRes));
      temp = weatherRes.main.temp;
      console.log(temp);
      const cardTitle = 'Current Temperature';
      const speechOutput = `The current temperature is ${Math.round(temp)} degrees.`;
      const shouldEndSession = true;
      callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
    });
  }).end();
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, context, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
    //console.log(`deviceId=${context.System.device.deviceId}, consentToken=${context.System.user.permissions.consentToken}`);
    console.log(JSON.stringify(launchRequest));

    // Dispatch to your skill's launch.
    //handleTemperatureIntent(intent, session, deviceId, consentToken, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, context, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, intentName = ${intentRequest.intent.name}, sessionId=${session.sessionId}`);
    console.log(JSON.stringify(context));

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;
    if (context.System !== undefined){
      const deviceId = context.System.device.deviceId;
      const consentToken = context.System.user.permissions.consentToken;
      const apiEndpoint = context.System.apiEndpoint;
    } else {
      const deviceId = {};
      const consentToken = {};
      const apiEndpoint = {};
    }

    // Dispatch to your skill's intent handlers
    if (intentName === 'TemperatureIntent') {
        handleTemperatureIntent(intent, session, deviceId, consentToken, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
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

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

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
