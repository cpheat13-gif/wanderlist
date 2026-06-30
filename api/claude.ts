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
            summary: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  category: { type: 'string', enum: ['hotel', 'restaurant', 'activity'] },
                  description: { type: 'string' },
                },
                required: ['title', 'category', 'description'],
              },
            },
          },
          required: ['day', 'summary', 'items'],
        },
      },
    },
    required: ['flightEstimate', 'days'],
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
            category: { type: 'string', enum: ['hotel', 'restaurant', 'activity'] },
            photoQuery: { type: 'string', description: "2-4 word photo search query, e.g. 'Cusco hotel courtyard'." },
            blurb: { type: 'string', description: '1 sentence on what it is / why it fits the search.' },
          },
          required: ['name', 'category', 'photoQuery', 'blurb'],
        },
      },
    },
    required: ['results'],
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
      const { destination, country, departureCity, travelTiming, interests } = req.body;
      if (!destination || typeof destination !== 'string') {
        res.status(400).json({ error: 'destination is required' });
        return;
      }
      const userText = [
        `Destination: ${destination}${country ? `, ${country}` : ''}`,
        departureCity ? `Flying from: ${departureCity}` : null,
        travelTiming ? `Travel timing: ${travelTiming}` : null,
        interests ? `Interests / notes: ${interests}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const result = await callClaude(
        'You are a well-traveled trip-planning assistant for a 2-person travel app called Wanderlist. ' +
          'Given a chosen destination and the traveler\'s preferences, build a realistic day-by-day itinerary ' +
          '(3-7 days unless the timing implies otherwise) mixing hotels, restaurants, and activities. Also give ' +
          'a rough round-trip flight cost estimate based on general knowledge — always caveat it as a rough, ' +
          'non-live estimate, not real-time pricing.',
        userText,
        BUILD_ITINERARY_TOOL
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
          'category), suggest specific, well-matched hotels, restaurants, or activities there. Classify each result ' +
          "into category 'hotel', 'restaurant', or 'activity' regardless of how the search term itself was phrased " +
          "(e.g. a 'hiking' search should surface activity-category trailheads or guided hikes). Be concrete and " +
          'concise, not generic.',
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

    res.status(400).json({ error: "mode must be 'destination', 'itinerary', 'explore', or 'ask'" });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Unknown error calling Claude' });
  }
}
