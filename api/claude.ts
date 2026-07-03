import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

const SUGGEST_DESTINATIONS_TOOL = {
  name: 'suggest_destinations',
  description: 'Reply to the traveler and propose specific destinations matching their trip idea.',
  input_schema: {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description: "A short, warm, conversational reply (1-3 sentences) responding to the traveler's idea.",
      },
      suggestions: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: "Destination name, e.g. 'Cusco' or 'Sacred Valley'." },
            country: { type: 'string' },
            photoQuery: {
              type: 'string',
              description: "2-4 word photo search query, e.g. 'Cusco Peru mountains'.",
            },
            blurb: { type: 'string', description: '1-2 sentences on why this fits the request.' },
          },
          required: ['name', 'country', 'photoQuery', 'blurb'],
        },
      },
    },
    required: ['reply', 'suggestions'],
  },
};

const BUILD_ITINERARY_TOOL = {
  name: 'build_itinerary',
  description: 'Propose a day-by-day itinerary and a rough flight cost estimate for a chosen destination.',
  input_schema: {
    type: 'object',
    properties: {
      flightEstimate: {
        type: 'object',
        properties: {
          fromCity: { type: 'string' },
          toCity: { type: 'string' },
          estimatedRoundTripUsd: { type: 'number' },
          note: {
            type: 'string',
            description: 'Brief caveat that this is a rough, non-live estimate.',
          },
        },
        required: ['fromCity', 'toCity', 'estimatedRoundTripUsd', 'note'],
      },
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'number' },
            title: { type: 'string', description: "Short evocative day title, e.g. 'Into the caldera'." },
            summary: { type: 'string' },
            estCostPerPersonUsd: {
              type: 'number',
              description: 'Rough per-person cost for this day in USD (lodging + food + activities), rounded.',
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  category: { type: 'string', enum: ['hotel', 'restaurant', 'activity', 'sightseeing'] },
                  description: { type: 'string' },
                },
                required: ['title', 'category', 'description'],
              },
            },
          },
          required: ['day', 'title', 'summary', 'estCostPerPersonUsd', 'items'],
        },
      },
    },
    required: ['flightEstimate', 'days'],
  },
};

const REFINE_ITINERARY_TOOL = {
  name: 'refine_itinerary',
  description: "Reply to the traveler's request and return the complete updated day-by-day itinerary.",
  input_schema: {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description: 'A short, warm reply (1-3 sentences) explaining what you changed or answering their question.',
      },
      days: {
        type: 'array',
        description: 'The FULL updated itinerary — every day, including unchanged ones.',
        items: {
          type: 'object',
          properties: {
            day: { type: 'number' },
            title: { type: 'string' },
            summary: { type: 'string' },
            estCostPerPersonUsd: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  category: { type: 'string', enum: ['hotel', 'restaurant', 'activity', 'sightseeing'] },
                  description: { type: 'string' },
                },
                required: ['title', 'category', 'description'],
              },
            },
          },
          required: ['day', 'title', 'summary', 'estCostPerPersonUsd', 'items'],
        },
      },
    },
    required: ['reply', 'days'],
  },
};

const HIGHLIGHTS_TOOL = {
  name: 'destination_highlights',
  description: 'Provide editorial highlights and local secrets for a destination.',
  input_schema: {
    type: 'object',
    properties: {
      highlights: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: "Short evocative title, e.g. 'The caldera at golden hour'." },
            blurb: { type: 'string', description: '1-2 sentences, editorial magazine tone, specific not generic.' },
            photoQuery: { type: 'string', description: '3-5 word photo search query for this highlight.' },
            secret: { type: 'boolean', description: 'true if this is a lesser-known local secret rather than a marquee sight.' },
          },
          required: ['title', 'blurb', 'photoQuery', 'secret'],
        },
      },
    },
    required: ['highlights'],
  },
};

const EXPLORE_DESTINATION_TOOL = {
  name: 'explore_destination',
  description: 'Suggest specific hotels, restaurants, or activities in a destination matching a search query.',
  input_schema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        minItems: 1,
        maxItems: 8,
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Specific name, e.g. a real or plausible hotel/restaurant/trailhead name.' },
            category: { type: 'string', enum: ['hotel', 'restaurant', 'activity', 'sightseeing'] },
            photoQuery: { type: 'string', description: "2-4 word photo search query, e.g. 'Cusco hotel courtyard'." },
            blurb: { type: 'string', description: '1 sentence on what it is / why it fits the search.' },
            website: { type: 'string', description: "Official website URL for hotels and restaurants only, when you are confident it exists (e.g. 'https://www.fourseasons.com/tokyo'). Omit entirely if unsure — never guess a URL." },
          },
          required: ['name', 'category', 'photoQuery', 'blurb'],
        },
      },
    },
    required: ['results'],
  },
};

const PLAN_TRIP_TOOL = {
  name: 'plan_trip',
  description:
    'Assign each already-chosen place to a specific day of the trip, building a sensible day-by-day schedule.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '1-2 sentence overview of the plan and its logic.' },
      schedule: {
        type: 'array',
        description: 'One entry per input place id.',
        items: {
          type: 'object',
          properties: {
            placeId: { type: 'string', description: 'Must exactly match one of the provided place ids.' },
            day: { type: 'number', description: '1-indexed day number within the trip length.' },
            notes: { type: 'string', description: 'Optional short note, e.g. a time-of-day suggestion.' },
          },
          required: ['placeId', 'day'],
        },
      },
    },
    required: ['summary', 'schedule'],
  },
};

const ANSWER_QUESTION_TOOL = {
  name: 'answer_question',
  description: "Answer the traveler's question about their destination.",
  input_schema: {
    type: 'object',
    properties: {
      answer: { type: 'string', description: 'A helpful, concise, conversational answer (1-4 sentences unless more detail is clearly needed).' },
    },
    required: ['answer'],
  },
};

interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callClaude(system: string, userTextOrMessages: string | ClaudeMessage[], tool: ClaudeTool) {
  const messages: ClaudeMessage[] =
    typeof userTextOrMessages === 'string' ? [{ role: 'user', content: userTextOrMessages }] : userTextOrMessages;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const toolUse = json.content?.find((block: { type: string }) => block.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a structured response.');
  return toolUse.input;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
    return;
  }

  const { mode } = req.body ?? {};

  try {
    if (mode === 'destination') {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'prompt is required' });
        return;
      }
      const result = await callClaude(
        'You are a well-traveled trip-planning assistant for a 2-person travel app called Wanderlist. ' +
          'A traveler describes a trip idea in their own words — sometimes a country, sometimes a vibe ' +
          "(e.g. 'friends hiking trip'). Propose 2-4 specific, well-matched destinations. Be concrete and " +
          'concise, not generic.',
        prompt,
        SUGGEST_DESTINATIONS_TOOL
      );
      res.status(200).json(result);
      return;
    }

    if (mode === 'itinerary') {
      const { destination, country, departureCity, travelTiming, interests, days, season, travelers } = req.body;
      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'destination is required' });
        return;
      }
      const userText = [
        `Destination: ${destination}${country ? `, ${country}` : ''}`,
        typeof days === 'number' ? `Trip length: exactly ${days} days` : null,
        season ? `Time of year: ${season}` : null,
        typeof travelers === 'number' ? `Travelers: ${travelers}` : null,
        departureCity ? `Flying from: ${departureCity}` : null,
        travelTiming ? `Travel timing: ${travelTiming}` : null,
        interests ? `Interests / notes: ${interests}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await callClaude(
        'You are a well-traveled trip-planning assistant for a travel app called Wanderlist. ' +
          "Given a chosen destination and the traveler's preferences, build a realistic day-by-day itinerary " +
          '(honor the requested trip length exactly; otherwise 3-7 days) mixing accommodation, food, activities ' +
          'and sightseeing. Give each day a short evocative title and a rough per-person daily cost in USD ' +
          '(lodging + food + activities, mid-range unless preferences imply otherwise). Also give a rough ' +
          'round-trip flight cost estimate based on general knowledge — always caveat it as a rough, non-live ' +
          'estimate, not real-time pricing. Season matters: tailor activities to the stated time of year.',
        userText,
        BUILD_ITINERARY_TOOL
      );
      res.status(200).json(result);
      return;
    }

    if (mode === 'refine') {
      const { destination, country, days, season, travelers, itinerary, message, history } = req.body;
      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'destination is required' });
        return;
      }
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'message is required' });
        return;
      }
      if (!Array.isArray(itinerary) || itinerary.length === 0) {
        res.status(400).json({ error: 'itinerary is required and must be non-empty' });
        return;
      }

      const priorMessages: ClaudeMessage[] = Array.isArray(history)
        ? history
            .filter(
              (m: unknown): m is { role: string; text: string } =>
                !!m &&
                typeof m === 'object' &&
                ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
                typeof (m as { text?: unknown }).text === 'string'
            )
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }))
            .slice(-8)
        : [];

      const context = [
        `Destination: ${destination}${country ? `, ${country}` : ''}`,
        typeof days === 'number' ? `Trip length: ${days} days (keep it exactly this length unless asked)` : null,
        season ? `Time of year: ${season}` : null,
        typeof travelers === 'number' ? `Travelers: ${travelers}` : null,
        `Current itinerary JSON:\n${JSON.stringify(itinerary)}`,
        `Traveler's request: ${message}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await callClaude(
        'You are a well-traveled trip-planning assistant for a travel app called Wanderlist, refining a ' +
          'day-by-day itinerary together with the traveler. They may ask to change things, add interests, or ' +
          'ask questions. Always return the COMPLETE updated itinerary (every day, same shape, updated ' +
          'estCostPerPersonUsd per day) — if their message is only a question, answer in the reply and return ' +
          'the itinerary unchanged. Keep changes surgical: preserve days they have not asked you to touch.',
        [...priorMessages, { role: 'user', content: context }],
        REFINE_ITINERARY_TOOL
      );
      res.status(200).json(result);
      return;
    }

    if (mode === 'highlights') {
      const { destination, country } = req.body;
      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'destination is required' });
        return;
      }
      const result = await callClaude(
        'You write for the editorial travel magazine Wanderlist. For the given destination, provide 3-5 ' +
          '"highlights & local secrets": a mix of marquee experiences done the insider way and genuinely ' +
          'lesser-known local spots. Magazine tone — specific, sensory, never generic. Mark the lesser-known ' +
          'entries with secret: true.',
        `Destination: ${destination}${country ? `, ${country}` : ''}`,
        HIGHLIGHTS_TOOL
      );
      res.status(200).json(result);
      return;
    }

    if (mode === 'explore') {
      const { destination, country, query } = req.body;
      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'destination is required' });
        return;
      }
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'query is required' });
        return;
      }
      const userText = [`Destination: ${destination}${country ? `, ${country}` : ''}`, `Search: ${query}`].join('\n');

      const result = await callClaude(
        'You are a well-traveled trip-planning assistant for a 2-person travel app called Wanderlist. ' +
          "Given a destination and a search term (which may be a vibe like 'hiking' or 'nightlife', not a literal " +
          'category), suggest specific, well-matched hotels, restaurants, activities, or sightseeing spots there. ' +
          "Classify each result into category 'hotel', 'restaurant', 'activity', or 'sightseeing' regardless of how " +
          "the search term itself was phrased (e.g. a 'hiking' search should surface activity-category trailheads " +
          "or guided hikes). Use 'sightseeing' for landmarks, museums, and viewpoints you visit and observe, and " +
          "'activity' for tours, hikes, nightlife, and hands-on experiences. Be concrete and concise, not generic.",
        userText,
        EXPLORE_DESTINATION_TOOL
      );
      res.status(200).json(result);
      return;
    }

    if (mode === 'ask') {
      const { destination, country, question, history } = req.body;
      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'destination is required' });
        return;
      }
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'question is required' });
        return;
      }

      const priorMessages: ClaudeMessage[] = Array.isArray(history)
        ? history
            .filter(
              (m: unknown): m is { role: string; text: string } =>
                !!m &&
                typeof m === 'object' &&
                ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
                typeof (m as { text?: unknown }).text === 'string'
            )
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }))
        : [];

      const result = await callClaude(
        'You are a well-traveled trip-planning assistant for a 2-person travel app called Wanderlist, currently ' +
          `helping a traveler with questions about a trip to ${destination}${country ? `, ${country}` : ''}. ` +
          'Answer their questions helpfully and conversationally, grounded in general knowledge about the destination.',
        [...priorMessages, { role: 'user', content: question }],
        ANSWER_QUESTION_TOOL
      );
      res.status(200).json(result);
      return;
    }

    if (mode === 'plan') {
      const { destination, country, startDate, endDate, places, flights } = req.body;
      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'destination is required' });
        return;
      }
      if (!startDate || typeof startDate !== 'string' || !endDate || typeof endDate !== 'string') {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }
      if (!Array.isArray(places) || places.length === 0) {
        res.status(400).json({ error: 'places is required and must be non-empty' });
        return;
      }

      const placesText = places
        .map((p: { id: string; name: string; category: string; notes?: string | null; address?: string | null }) =>
          [`id: ${p.id}`, `name: ${p.name}`, `category: ${p.category}`, p.notes ? `notes: ${p.notes}` : null, p.address ? `address: ${p.address}` : null]
            .filter(Boolean)
            .join(', ')
        )
        .join('\n');

      const flightsText = Array.isArray(flights)
        ? flights
            .map((f: { fromAirport: string; toAirport: string; departureTime?: string | null; arrivalTime?: string | null }) =>
              [`${f.fromAirport} -> ${f.toAirport}`, f.departureTime ? `departs ${f.departureTime}` : null, f.arrivalTime ? `arrives ${f.arrivalTime}` : null]
                .filter(Boolean)
                .join(', ')
            )
            .join('\n')
        : '';

      const userText = [
        `Destination: ${destination}${country ? `, ${country}` : ''}`,
        `Trip dates: ${startDate} to ${endDate}`,
        flightsText ? `Flights:\n${flightsText}` : null,
        `Places to schedule:\n${placesText}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const result = await callClaude(
        'You are a well-traveled trip-planning assistant for a 2-person travel app called Wanderlist. ' +
          'The traveler has already chosen specific hotels, restaurants, and activities for their trip — your ' +
          'job is only to schedule the given places into a sensible day-by-day plan across the trip dates, not ' +
          'to invent new places. Group logically (e.g. activities earlier in the day, restaurants near meal ' +
          'times) and respect any flight-constrained days (arrival day, departure day). Base your judgment on ' +
          'general knowledge of the place names/categories/notes given — you do not have real-time location or ' +
          'distance data. Return exactly one schedule entry per given place id.',
        userText,
        PLAN_TRIP_TOOL
      );
      res.status(200).json(result);
      return;
    }

    res.status(400).json({ error: "mode must be 'destination', 'itinerary', 'refine', 'highlights', 'explore', 'ask', or 'plan'" });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Unknown error calling Claude' });
  }
}
