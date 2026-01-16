import { z } from 'zod';

export const CitySchema = z.enum(['Miami', 'Fort Lauderdale']);

export const PriceLabelSchema = z.enum(['Free', '$', '$$', '$$$']);

export const EventSourceSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

export const EventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }).optional(),
  timezone: z.string().default('America/New_York'),
  venueName: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().min(1),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  city: CitySchema,
  tags: z.array(z.string()).min(1),
  category: z.string().min(1),
  priceLabel: PriceLabelSchema.optional(),
  isOutdoor: z.boolean(),
  shortWhy: z.string().min(1).max(100),
  editorialWhy: z.string().min(1).max(500),
  description: z.string().min(1),
  source: EventSourceSchema.optional(),
  image: z.string().url().optional(),
  editorPick: z.boolean().optional(),
});

export const EventsArraySchema = z.array(EventSchema);

export const UserPreferencesSchema = z.object({
  tags: z.array(z.string()),
  radiusMiles: z.number().min(0.5).max(50),
  transportMode: z.enum(['walk', 'drive']),
});

export const UserLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timestamp: z.number(),
});

export const UserStateSchema = z.object({
  savedEventIds: z.array(z.string()),
  preferences: UserPreferencesSchema,
  lastKnownLocation: UserLocationSchema.optional(),
});

export type EventInput = z.input<typeof EventSchema>;
export type ValidatedEvent = z.output<typeof EventSchema>;
