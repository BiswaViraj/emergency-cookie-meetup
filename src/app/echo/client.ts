import { Echo } from "@novu/echo";

import { renderGatherLinkEmail } from "./templates/gather-link-email";
import { renderInPersonMeetupEmail } from "./templates/in-person-meetup-email";
import { renderInPersonMeetupPush } from "./templates/in-person-meetup-push";
import {
  CookieCraver,
  StepEnum,
  WorkflowEnum,
  createTimeSlotsGroup,
  getGatherLink,
  getNearestCookieBucksLocation,
  separateVirtualAndInPersonMeet,
} from "./utils";

export const echo = new Echo({
  apiKey: process.env.API_KEY,
  /**
   * Enable this flag only during local development
   */
  devModeBypassAuthentication: process.env.NODE_ENV === "development",
});

echo.workflow(
  WorkflowEnum.EMERGENCY_COOKIE_MEETUP,
  async ({ step, payload, subscriber }) => {
    /**
     * Digest cookie cravers for the past 1 hour
     */
    await step.digest(StepEnum.DIGEST_1_HOUR, async () => {
      return {
        unit: "hours", // 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
        amount: 1, // the number of units to digest events for
        backoff: false,
        digestKey: "cookie-cravers",
        type: "regular",
      };
    });

    const cookieCravers = payload.cookieCravers || [];

    /**
     * Separate the cookie cravers into virtual and in-person meetups
     * according to their meeting preference
     */
    const { virtualMeet, inPersonMeet } = separateVirtualAndInPersonMeet(
      cookieCravers as CookieCraver[]
    );

    /**
     * Generate the gather link for the virtual meetup
     */
    const gatherLink = getGatherLink();

    /**
     * Send the gather link email to the subscriber
     */
    await step.email(
      StepEnum.GATHER_LINK_EMAIL,
      async () => {
        return {
          subject: "Emergency Cookie Meetup",
          body: renderGatherLinkEmail(gatherLink),
        };
      },
      {
        skip: () =>
          virtualMeet.length === 0 ||
          virtualMeet.every(
            (cookie) => cookie.firstName !== subscriber.firstName
          ),
      }
    );

    /**
     * Generate the time slots for the in-person meetup
     */
    const timeSlots = createTimeSlotsGroup(inPersonMeet);

    /**
     * Get the nearest Cookie Bucks location
     */
    const nearestCookieBucksLocation = getNearestCookieBucksLocation(
      payload.latitude as number,
      payload.longitude as number
    );

    /**
     * Send the in-person meetup email and push notification
     * for each time slot
     * Also send a push notification to the subscriber to eat a cookie
     * if they missed the in-person meetup
     */
    for (const [timeSlot, cookieCravers] of Object.entries(timeSlots)) {
      const skipCondition =
        cookieCravers.length === 0 ||
        cookieCravers.every(
          (cookie) => cookie.firstName !== subscriber.firstName
        );

      /**
       * Send the in-person meetup email for each time slot
       */
      await step.email(
        StepEnum.IN_PERSON_MEETUP_EMAIL,
        async () => {
          return {
            subject: "In-Person Cookie Meetup",
            body: renderInPersonMeetupEmail({
              timeSlot,
              nearestCookieBucksLocation,
            }),
          };
        },
        {
          skip: () => skipCondition,
        }
      );

      /**
       * Send a push notification to the subscriber for the in-person meetup
       */
      await step.push(
        StepEnum.IN_PERSON_MEETUP_PUSH,
        async () => {
          return {
            subject: "In-Person Cookie Meetup",
            body: renderInPersonMeetupPush(timeSlot),
          };
        },
        {
          skip: () => skipCondition,
        }
      );

      /**
       * Send a push notification to the subscriber to eat a cookie
       * if they missed the in-person meetup
       */
      await step.push(
        StepEnum.EAT_COOKIE_PUSH,
        async () => {
          return {
            subject: "Have a Cookie🍪",
            body: "Uh oh! You missed the cookie meetup. But you can still enjoy a cookie 🍪",
          };
        },
        {
          skip: () =>
            cookieCravers.length === 1 ||
            cookieCravers.every(
              (cookie) => cookie.firstName !== subscriber.firstName
            ),
        }
      );
    }
  },
  {
    payloadSchema: {
      type: "object",
      properties: {
        cookieCravers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              cookiesId: { type: "string" },
              meetingPreference: {
                type: "string",
                enum: ["in-person", "virtual"],
                default: "in-person",
              },
              preferredTimeSlot: {
                type: "string",
                enum: ["morning", "afternoon", "evening"],
                default: "morning",
              },
              firstName: { type: "string" },
              lastName: { type: "string" },
            },
          },
        },
        latitude: { type: "number", default: 429.0 },
        longitude: { type: "number", default: 429.0 },
      },
      required: ["cookieCravers", "latitude", "longitude"],
    },
  }
);
