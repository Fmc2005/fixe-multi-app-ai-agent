import { describe, expect, it } from "vitest";

import { rankPlaces, scorePlace } from "@/agent/ranking";
import type { NormalizedPlace, UserPreferenceProfile } from "@/agent/schemas";

const profile: UserPreferenceProfile = {
  dietaryRestrictions: [],
  budget: 100,
  transportation: "walking",
  interests: ["coffee"],
  favoritePlaceIds: ["fav-1"],
};

const fullPlace: NormalizedPlace = {
  placeId: "fav-1",
  name: "Favorite Cafe",
  category: "restaurant",
  location: { lat: 0, lng: 0 },
  rating: 5,
  priceLevel: 0,
  openNow: true,
  distanceMeters: 0,
};

describe("scorePlace", () => {
  it("gives a perfect score when every signal is maximally favorable", () => {
    const { score, missingSignals } = scorePlace(fullPlace, profile);
    expect(missingSignals).toEqual([]);
    expect(score).toBeCloseTo(1, 4);
  });

  it("redistributes weight across available signals when a field is missing", () => {
    const partialPlace: NormalizedPlace = { ...fullPlace, rating: undefined, priceLevel: undefined };
    const { score, missingSignals, scoreBreakdown } = scorePlace(partialPlace, profile);
    expect(missingSignals.sort()).toEqual(["affordability", "rating"]);
    // remaining weights (preferenceMatch, distance, openAtProposedTime) sum to 1
    const total = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(score, 4);
    expect(score).toBeGreaterThan(0);
  });

  it("never lets score exceed 1 even when all signals are present", () => {
    const { score } = scorePlace(fullPlace, profile);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("rankPlaces", () => {
  it("sorts highest score first", () => {
    const worse: NormalizedPlace = {
      ...fullPlace,
      placeId: "other",
      name: "Random Diner",
      rating: 1,
      priceLevel: 4,
      openNow: false,
      distanceMeters: 5000,
    };
    const ranked = rankPlaces([worse, fullPlace], profile);
    expect(ranked[0]?.placeId).toBe("fav-1");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });
});
