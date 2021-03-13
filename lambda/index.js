"use strict";
require("dotenv");
const Alexa = require("ask-sdk");

const HelpIntentHandler = {
  canHanle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "Intent Reuqest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const speechText =
      "To use Just the Temperature, just start the skill or ask it the current temperature. The easiest way to use it is to say, Alexa, just the temperature.";

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard("How to Use Just The Temperature", speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.CancelIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.StopIntent")
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .withShouldEndSession(true)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`ERROR OCCURED: ${error.message}`);
    return handlerInput.responseBuilder
      .speak("Sorry an error occured. Please try again.")
      .getResponse();
  },
};

const HandleTemperatureAndLaunchIntent = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest" ||
      (Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "TemperatureIntent")
    );
  },
  async handle(handlerInput) {
    const { context } = handlerInput.requestEnvelope;
    const deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);
    // Check to see if they have granted address or location services permissions
    const hasGeoLocationPermission =
      context.System.user.permissions.scopes[
        "alexa::devices:all:geolocation:read"
      ].status === "GRANTED";

    const hasAddressPermission = context.System.user.permissions.consentToken;

    if (!hasGeoLocationPermission && !hasAddressPermission) {
      return handlerInput.responseBuilder
        .speak("Please enable location permissions in the Amazon Alexa app.")
        .withAskForPermissionsConsentCard([
          "read::alexa:device:all:address:country_and_postal_code",
          "read::alexa:device:all:geolocation",
        ])
        .withShouldEndSession(true)
        .getResponse();
    }

    if (
      hasGeoLocationPermission &&
      !context.Geolocation &&
      !hasAddressPermission
    ) {
      return handlerInput.responseBuilder
        .speak(
          "Please enable location services on your device or enable address permissions in the Amazon Alexa app."
        )
        .withAskForPermissionsConsentCard([
          "read::alexa:device:all:address:country_and_postal_code",
          "read::alexa:device:all:geolocation",
        ])
        .withShouldEndSession(true)
        .getResponse();
    }

    // Get their location
    let location;
    if (hasGeoLocationPermission && context.Geolocation) {
      location = context.Geolocation.coordinate;
    } else {
      const deviceAddressServiceClient = handlerInput.serviceClientFactory.getDeviceAddressServiceClient();
      try {
        location = await deviceAddressServiceClient.getCountryAndPostalCode(
          deviceId
        );
      } catch (error) {
        console.log(error);
      }
    }
    console.log(location);
    // Get the preferred units

    // Using the location and units, get the current weather

    return handlerInput.responseBuilder
      .speak("The temperature will go here.")
      .getResponse();
  },
};

let skill;

exports.handler = async function (event, context) {
  console.log(`REQUEST+++${JSON.stringify(event)}`);
  if (!skill) {
    skill = Alexa.SkillBuilders.custom()
      .addRequestHandlers(
        HandleTemperatureAndLaunchIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
      )
      .addErrorHandlers(ErrorHandler)
      .withApiClient(new Alexa.DefaultApiClient())
      .create();
  }

  const response = await skill.invoke(event, context);
  console.log(`RESPONSE+++${JSON.stringify(response)}`);

  return response;
};
