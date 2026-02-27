import { musicContentService, type MusicEntry } from "./musicContentService";

const GUIDED_MEDITATION_CATEGORY_ID = "679d6f2ad0059516eb9c5a78";

interface GuidedMeditationUploadInput {
  name: string;
  description: string;
  slug: string;
  position: number;
  isPremium: boolean;
  audioFilename: string;
  imageFilename?: string;
  duration?: number;
}

interface GuidedMeditationUpdateInput {
  name: string;
  description: string;
  slug: string;
  position: number;
  isPremium: boolean;
  audioFilename: string;
  imageFilename?: string;
  duration?: number;
}

const normalizeDuration = (duration?: number): number | undefined => {
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
    return undefined;
  }
  return Math.round(duration);
};

export const guidedMeditationsService = {
  async create(input: GuidedMeditationUploadInput): Promise<MusicEntry> {
    return musicContentService.create({
      name: input.name.trim(),
      description: input.description.trim() || " ",
      categories: [GUIDED_MEDITATION_CATEGORY_ID],
      isPremium: input.isPremium ? "true" : "false",
      typeContent: "app",
      audioFilename: input.audioFilename.trim(),
      imageFilename: input.imageFilename?.trim() || "",
      duration: normalizeDuration(input.duration),
      slug: input.slug.trim(),
      position: input.position,
    });
  },

  async getById(id: string): Promise<MusicEntry> {
    return musicContentService.getById(id);
  },

  async update(id: string, input: GuidedMeditationUpdateInput): Promise<MusicEntry> {
    return musicContentService.update(id, {
      name: input.name.trim(),
      description: input.description.trim() || " ",
      categories: [GUIDED_MEDITATION_CATEGORY_ID],
      isPremium: input.isPremium ? "true" : "false",
      typeContent: "app",
      audioFilename: input.audioFilename.trim(),
      imageFilename: input.imageFilename?.trim() || "",
      duration: normalizeDuration(input.duration),
      slug: input.slug.trim(),
      position: input.position,
    });
  },
};

export { GUIDED_MEDITATION_CATEGORY_ID };
export type { GuidedMeditationUploadInput, GuidedMeditationUpdateInput };
