"use strict";
require("dotenv").config();
const Alexa = require("ask-sdk");
const {
  HandleTemperatureAndLaunchIntent,
} = require("./handlers/TemperatureHandler");

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
