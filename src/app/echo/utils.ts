import { Gather, CookieMap } from "./integrations";

export enum WorkflowEnum {
  EMERGENCY_COOKIE_MEETUP = "emergency-cookie-meetup",
}

export enum StepEnum {
  DIGEST_1_HOUR = "digest-1-hour",
  GATHER_LINK_EMAIL = "gather-link-email",
  IN_PERSON_MEETUP_EMAIL = "in-person-meetup-email",
  IN_PERSON_MEETUP_PUSH = "in-person-meetup-push",
  EAT_COOKIE_PUSH = "eat-cookie-push",
}

export type CookieCraver = {
  cookiesId: string;
  meetingPreference: "in-person" | "virtual";
  preferredTimeSlot: "morning" | "afternoon" | "evening";
  firstName: string;
  lastName: string;

  [x: string]: unknown;
};

export const getGatherLink = () => {
  const gatherLink = Gather.createLink({
    title: "Emergency Cookie Meetup",
    description: "Let's meet up and discuss our cookie cravings!",
    location: "Cookie Headquarters",
    startTime: new Date(),
    // end time after 30mins
    endTime: new Date(Date.now() + 30 * 60 * 1000),
  });

  return gatherLink;
};

export const createTimeSlotsGroup = (inPersonMeet: CookieCraver[]) => {
  return inPersonMeet.reduce<{
    morning: typeof inPersonMeet;
    afternoon: typeof inPersonMeet;
    evening: typeof inPersonMeet;
  }>(
    (acc, craver) => {
      acc[craver.preferredTimeSlot].push(craver);
      return acc;
    },
    { morning: [], afternoon: [], evening: [] }
  );
};

export const separateVirtualAndInPersonMeet = (
  cookieCravers: CookieCraver[]
) => {
  return cookieCravers.reduce<{
    virtualMeet: CookieCraver[];
    inPersonMeet: CookieCraver[];
  }>(
    (acc, craver) => {
      if (craver.meetingPreference === "virtual") {
        acc.virtualMeet.push(craver as CookieCraver);
      } else {
        acc.inPersonMeet.push(craver as CookieCraver);
      }
      return acc;
    },
    { virtualMeet: [], inPersonMeet: [] }
  );
};

export const getNearestCookieBucksLocation = (
  latitude: number,
  longitude: number
) => {
  return CookieMap.findNearestCookieBucksCafe({
    latitude,
    longitude,
  });
};

export const PAYLOAD_SCHEMA = {
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
} as const;
