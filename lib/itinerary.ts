import { ItineraryActivity } from './types';

const SLOT_ORDER: Record<string, number> = { Morning: 0, Afternoon: 1, Evening: 2 };

function slotRank(timeOfDay?: string): number {
  return timeOfDay && timeOfDay in SLOT_ORDER ? SLOT_ORDER[timeOfDay] : 3;
}

// Insert a new stop into a day's activities at a sensible position based on its
// time of day (Morning → Afternoon → Evening), after any existing stops in the
// same-or-earlier slot. Existing stops are never reordered.
export function insertActivityByTime(
  activities: ItineraryActivity[],
  next: ItineraryActivity
): ItineraryActivity[] {
  const rank = slotRank(next.timeOfDay);
  let insertAt = activities.length;
  for (let i = 0; i < activities.length; i++) {
    if (slotRank(activities[i].timeOfDay) > rank) {
      insertAt = i;
      break;
    }
  }
  const out = activities.slice();
  out.splice(insertAt, 0, next);
  return out;
}
