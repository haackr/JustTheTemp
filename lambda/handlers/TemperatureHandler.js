"use strict";
const Alexa = require("ask-sdk");
const { getCurrentTemperature } = require("../utils");
const tempDocument = require("../tempDocument.json");

const TEMP_TOKEN = "tempToken";

const HandleTemperatureAndLaunchIntent = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest" ||
      (Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "TemperatureIntent") ||
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.FallbackIntent"
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

    // Get the preferred units
    const upsServiceClient = handlerInput.serviceClientFactory.getUpsServiceClient();
    let units;
    try {
      units = await upsServiceClient.getSystemTemperatureUnit(deviceId);
    } catch (error) {
      console.log(error);
    }
    console.log(units);

    // Using the location and units, get the current weather
    const { temp, returnedUnits } = await getCurrentTemperature(
      location,
      units
    );
    console.log(temp, returnedUnits);

    let response = handlerInput.responseBuilder.speak(`It's ${temp} degrees.`);

    if (
      Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)[
        "Alexa.Presentation.APL"
      ]
    ) {
      response.addDirective({
        type: "Alexa.Presentation.APL.RenderDocument",
        token: TEMP_TOKEN,
        document: tempDocument,
      });
    } else if (
      Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)[
        "Alexa.Presentation.APLT"
      ]
    ) {
    }

    return response.getResponse();
  },
};

module.exports = {
  HandleTemperatureAndLaunchIntent,
};
