import { Platform } from 'react-native';

// Editorial serif for magazine-style display type.
export const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export interface Review {
  name: string;
  date: string;
  rating: number;
  text: string;
}

export interface Highlight {
  title: string;
  blurb: string;
  photoQuery: string;
  secret: boolean;
}

export interface EditorialDestination {
  slug: string;
  name: string;
  country: string;
  region: string;
  tagline: string;
  photoQuery: string;
  galleryQueries: string[];
  toursCount: number;
  fromPrice: number;
  intro: string;
  facts: { season: string; language: string; currency: string; tripLength: string };
  vibes: string[];
  // Rough per-person, per-day estimate in USD — powers the running trip estimate.
  estDailyCost: number;
  highlights: Highlight[];
  rating: number;
  reviewCount: number;
  // Percentage distribution for 5★ → 1★
  ratingDist: [number, number, number, number, number];
  reviews: Review[];
}

export const VIBES = [
  'Hiking',
  'Beach',
  'Friends trip',
  'Honeymoon',
  'Food & wine',
  'Adventure',
  'Culture',
  'Wildlife',
  'Relaxation',
] as const;

export const REGIONS = [
  'The Mediterranean',
  'Southeast Asia',
  'Patagonia & the Andes',
  'Africa & Arabia',
] as const;

export const DESTINATIONS: EditorialDestination[] = [
  // ────────────────────────── The Mediterranean ──────────────────────────
  {
    slug: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    region: 'The Mediterranean',
    tagline: 'Where the caldera catches fire at dusk',
    photoQuery: 'Santorini Greece caldera sunset white houses',
    galleryQueries: [
      'Santorini Greece caldera sunset',
      'Santorini Oia blue domes',
      'Santorini Greece cliffside terrace',
      'Santorini Greece aegean sea boat',
    ],
    toursCount: 7,
    fromPrice: 1450,
    intro:
      'A crescent of volcanic cliffs rising a thousand feet from the Aegean, Santorini is Greece distilled to its essentials — white villages balanced on the caldera rim, vineyards grown in black ash, and evenings that end the same way they have for centuries: everyone facing west, waiting for the sun to fall into the sea.',
    facts: { season: 'May – Oct', language: 'Greek', currency: 'Euro (€)', tripLength: '5–7 days' },
    vibes: ['Honeymoon', 'Beach', 'Food & wine', 'Relaxation'],
    estDailyCost: 240,
    highlights: [
      { title: 'The caldera at golden hour', blurb: 'Skip the Oia scrum — locals watch the sunset from the castle ruins at Akrotiri or a rim-side table in Imerovigli, where the light is identical and the crowd is not.', photoQuery: 'Santorini Imerovigli caldera sunset view', secret: false },
      { title: 'Wine grown in volcanic ash', blurb: 'Assyrtiko vines here are trained into ground-hugging baskets against the wind. The tasting rooms at Venetsanos hang right off the caldera cliff.', photoQuery: 'Santorini vineyard basket vines volcanic', secret: false },
      { title: 'The Fira → Oia rim walk', blurb: 'Three hours along the caldera edge through Firostefani and Imerovigli. Start at 7am with a spanakopita and you will have it nearly to yourself.', photoQuery: 'Santorini caldera trail walk white village', secret: true },
      { title: 'Ammoudi Bay tavernas', blurb: 'Descend the 300 steps below Oia to red-cliff docks where octopus dries on lines and you swim off the rocks between courses.', photoQuery: 'Ammoudi Bay Santorini taverna octopus harbor', secret: true },
    ],
    rating: 4.9,
    reviewCount: 214,
    ratingDist: [82, 13, 3, 1, 1],
    reviews: [
      { name: 'Elena M.', date: 'June 2026', rating: 5, text: 'The catamaran evening was worth the trip alone. Watching Oia light up from the water felt unreal.' },
      { name: 'James R.', date: 'May 2026', rating: 5, text: 'Perfectly paced — mornings were active, afternoons free. Our guide knew every quiet corner of Pyrgos.' },
      { name: 'Sofia K.', date: 'September 2025', rating: 4, text: 'Crowds in Oia are real, but the itinerary cleverly worked around them. The wine tasting in ash-soil vineyards was a highlight.' },
    ],
  },
  {
    slug: 'amalfi-coast',
    name: 'Amalfi Coast',
    country: 'Italy',
    region: 'The Mediterranean',
    tagline: 'La dolce vita, carved into a cliffside',
    photoQuery: 'Amalfi Coast Positano cliffside village colorful',
    galleryQueries: [
      'Positano Italy colorful cliff village',
      'Amalfi Coast lemon grove terrace',
      'Ravello Italy villa garden sea view',
      'Amalfi Italy coastal road vespa',
    ],
    toursCount: 9,
    fromPrice: 1780,
    intro:
      'Thirty miles of vertical Italy, where pastel villages spill down cliffs into a turquoise sea. Lemons grow the size of grapefruits, every hairpin turn reveals another postcard, and lunch is never less than two hours. The Amalfi Coast does not do understatement — and after a day here, neither will you.',
    facts: { season: 'Apr – Jun, Sep', language: 'Italian', currency: 'Euro (€)', tripLength: '5–8 days' },
    vibes: ['Honeymoon', 'Food & wine', 'Beach', 'Culture'],
    estDailyCost: 260,
    highlights: [
      { title: 'Path of the Gods at sunrise', blurb: 'The cliff trail from Bomerano to Nocelle floats 500 meters above the sea. At 6:30am it is silent, cool, and entirely yours.', photoQuery: 'Path of the Gods Amalfi cliff trail sea view', secret: false },
      { title: 'Ravello above the crowds', blurb: 'A thousand feet over the coast, Villa Rufolo hosts chamber concerts on a terrace Wagner once wandered. Evenings here are the coast at its most composed.', photoQuery: 'Ravello Villa Rufolo terrace garden concert', secret: false },
      { title: 'The Furore fjord', blurb: 'A slit in the cliffs where a fishing hamlet hides under the highway bridge. Boats slip in for a swim stop that most drivers pass without ever seeing.', photoQuery: 'Furore fjord Amalfi hidden beach bridge', secret: true },
      { title: 'Lemon-terrace lunches', blurb: 'Above Minori, farm families serve lunch under pergolas of sfusato lemons — the tour is the orchard, the menu is whatever was picked that morning.', photoQuery: 'Amalfi lemon grove pergola farm lunch', secret: true },
    ],
    rating: 4.8,
    reviewCount: 186,
    ratingDist: [76, 17, 4, 2, 1],
    reviews: [
      { name: 'Claire D.', date: 'May 2026', rating: 5, text: 'The Path of the Gods hike at sunrise, before the heat and the crowds — I think about it weekly.' },
      { name: 'Marco B.', date: 'September 2025', rating: 5, text: 'Boat day to the Li Galli islands was pure magic. Swimming in coves you cannot reach by road.' },
      { name: 'Anna W.', date: 'June 2026', rating: 4, text: 'Positano is busy in June, no way around it. But Ravello in the evening was serene and the villa concert unforgettable.' },
    ],
  },
  {
    slug: 'menorca',
    name: 'Menorca',
    country: 'Spain',
    region: 'The Mediterranean',
    tagline: 'The Balearics before anyone was looking',
    photoQuery: 'Menorca Spain turquoise cove beach cliffs',
    galleryQueries: [
      'Menorca cala turquoise cove',
      'Menorca Ciutadella old town harbor',
      'Menorca coastal path Cami de Cavalls',
      'Menorca Spain sailboat cove sunset',
    ],
    toursCount: 5,
    fromPrice: 1290,
    intro:
      'While its louder sisters filled with clubs and crowds, Menorca stayed quiet — a UNESCO biosphere of hidden calas, whitewashed fishing villages, and a 115-mile coastal path that circles the entire island. This is the Mediterranean as it was: slow mornings, gin at noon, and water so clear boats look like they float on air.',
    facts: { season: 'May – Oct', language: 'Spanish, Catalan', currency: 'Euro (€)', tripLength: '4–6 days' },
    vibes: ['Beach', 'Relaxation', 'Friends trip', 'Hiking'],
    estDailyCost: 190,
    highlights: [
      { title: 'The Camí de Cavalls', blurb: 'A 185km horse-patrol path rings the whole island. Walk any southern section and you fall into a rhythm: pine forest, white cala, swim, repeat.', photoQuery: 'Cami de Cavalls Menorca coastal path cala', secret: false },
      { title: 'Cala Turqueta before ten', blurb: 'The postcard cove earns its name, but only early. Anchor-light sand, water like glass, and gin from a thermos if you have been here before.', photoQuery: 'Cala Turqueta Menorca turquoise cove', secret: false },
      { title: 'Kayaking the north caves', blurb: 'The tramuntana coast hides sea caves you can paddle straight into — cathedral light, echoing drips, and not another boat in sight.', photoQuery: 'Menorca sea cave kayak north coast', secret: true },
      { title: 'Es Caló Blanc at dusk', blurb: 'A concrete swim platform in a fishing hamlet where locals bring wine, jump off the rocks, and stay until the light goes violet.', photoQuery: 'Menorca rocky swim cove sunset locals', secret: true },
    ],
    rating: 4.8,
    reviewCount: 97,
    ratingDist: [78, 16, 4, 1, 1],
    reviews: [
      { name: 'Tom H.', date: 'July 2026', rating: 5, text: 'Kayaked into caves with no other humans in sight. In July! In Europe! Still cannot believe it.' },
      { name: 'Lucia F.', date: 'June 2026', rating: 5, text: 'The slow pace is the point. Best swim spots of my life and a gin distillery tour that converted me.' },
      { name: 'Ben S.', date: 'September 2025', rating: 4, text: 'Quieter than expected in the best way. Wish we had one more day on the Cami de Cavalls.' },
    ],
  },

  // ────────────────────────── Southeast Asia ──────────────────────────
  {
    slug: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    region: 'Southeast Asia',
    tagline: 'An island that worships beauty daily',
    photoQuery: 'Bali rice terraces temple sunrise',
    galleryQueries: [
      'Bali Tegallalang rice terrace sunrise',
      'Bali temple gate Lempuyang',
      'Ubud jungle waterfall Bali',
      'Bali Uluwatu cliff temple ocean',
    ],
    toursCount: 11,
    fromPrice: 1150,
    intro:
      'On Bali, devotion is architecture. Offerings appear on every doorstep by dawn, temples crown every hill, and the island’s famous rice terraces are two thousand years of engineering disguised as art. Between the jungle spas of Ubud and the surf breaks of Uluwatu lies more variety than most countries manage.',
    facts: { season: 'Apr – Oct', language: 'Indonesian, Balinese', currency: 'Rupiah (Rp)', tripLength: '7–12 days' },
    vibes: ['Friends trip', 'Beach', 'Culture', 'Relaxation', 'Adventure'],
    estDailyCost: 110,
    highlights: [
      { title: 'Sidemen valley, the old Bali', blurb: 'An hour east of Ubud, rice terraces run unbroken to Mount Agung and homestay hosts still ask you in for coffee. This is the island before the feeds found it.', photoQuery: 'Sidemen valley Bali rice terraces Mount Agung', secret: false },
      { title: 'Uluwatu’s kecak fire dance', blurb: 'A hundred chanting voices, a clifftop amphitheater, and the sun falling into the Indian Ocean mid-performance. Arrive an hour early for the good stone seats.', photoQuery: 'Uluwatu kecak dance sunset cliff Bali', secret: false },
      { title: 'Dawn at Tirta Gangga', blurb: 'The water palace opens at 6am. For one hour the koi ponds and stepping stones belong to you and the offering-carriers.', photoQuery: 'Tirta Gangga water palace Bali dawn', secret: true },
      { title: 'Warung Babi Guling Ibu Oka rivals', blurb: 'Skip the famous name — the roadside babi guling stands outside Gianyar market serve the crispier, spicier version locals actually queue for.', photoQuery: 'Bali warung local food market babi guling', secret: true },
    ],
    rating: 4.8,
    reviewCount: 342,
    ratingDist: [75, 18, 4, 2, 1],
    reviews: [
      { name: 'Nina P.', date: 'August 2026', rating: 5, text: 'Sunrise at Lempuyang before the queues, then a private blessing ceremony. Organized to perfection.' },
      { name: 'David L.', date: 'July 2026', rating: 5, text: 'The Sidemen valley homestay was the highlight — rice fields to the horizon and the kindest hosts.' },
      { name: 'Rachel G.', date: 'May 2026', rating: 4, text: 'Traffic between regions eats time, but the itinerary anticipated it. Uluwatu kecak dance at sunset: go.' },
    ],
  },
  {
    slug: 'luang-prabang',
    name: 'Luang Prabang',
    country: 'Laos',
    region: 'Southeast Asia',
    tagline: 'Saffron robes and slow rivers',
    photoQuery: 'Luang Prabang Laos monks temple mekong',
    galleryQueries: [
      'Luang Prabang monks alms ceremony dawn',
      'Kuang Si waterfall turquoise Laos',
      'Luang Prabang Mekong river sunset boat',
      'Luang Prabang temple golden Laos',
    ],
    toursCount: 4,
    fromPrice: 980,
    intro:
      'At dawn in Luang Prabang, hundreds of monks walk silently through the mist to collect alms, as they have every morning for six hundred years. This UNESCO-protected peninsula where the Mekong meets the Khan is Southeast Asia’s most graceful town — French colonial villas, gilded temples, and nights that end early and well.',
    facts: { season: 'Nov – Mar', language: 'Lao', currency: 'Kip (₭)', tripLength: '3–5 days' },
    vibes: ['Culture', 'Relaxation', 'Food & wine'],
    estDailyCost: 90,
    highlights: [
      { title: 'Tak bat, done respectfully', blurb: 'The dawn alms procession is sacred, not a photo op. Kneel, keep distance, offer sticky rice bought from the morning market — and it becomes the most moving hour of your trip.', photoQuery: 'Luang Prabang monks alms dawn saffron', secret: false },
      { title: 'Kuang Si’s upper pools', blurb: 'Everyone swims the lower falls. Climb the muddy trail to the top and there is a quiet spring-fed pool above the cascade with a rope swing and no one on it.', photoQuery: 'Kuang Si waterfall upper pool jungle', secret: true },
      { title: 'Mekong gold at six', blurb: 'Slow boats drift upriver as the sun drops behind the mountains. A Beerlao on the deck of a converted rice barge is the town’s finest institution.', photoQuery: 'Mekong river sunset boat Luang Prabang', secret: false },
      { title: 'The storytelling house', blurb: 'Garavek theatre seats thirty. An old man with a khene pipe tells Lao legends in the dark — the best $8 in Southeast Asia.', photoQuery: 'Luang Prabang traditional theater lantern night', secret: true },
    ],
    rating: 4.9,
    reviewCount: 118,
    ratingDist: [85, 11, 2, 1, 1],
    reviews: [
      { name: 'Margot V.', date: 'January 2026', rating: 5, text: 'The alms ceremony moved me to tears. Our guide taught us how to participate respectfully, which mattered.' },
      { name: 'Ken T.', date: 'December 2025', rating: 5, text: 'Kuang Si falls look photoshopped in real life. Slow boat on the Mekong at golden hour — perfection.' },
      { name: 'Isabelle R.', date: 'February 2026', rating: 5, text: 'The gentlest, most soulful place I have visited in Asia. Do not skip the evening storytelling house.' },
    ],
  },
  {
    slug: 'ha-long-bay',
    name: 'Ha Long Bay',
    country: 'Vietnam',
    region: 'Southeast Asia',
    tagline: 'Two thousand islands, one emerald sea',
    photoQuery: 'Ha Long Bay Vietnam limestone karsts junk boat',
    galleryQueries: [
      'Ha Long Bay limestone karsts mist',
      'Ha Long Bay junk boat sail sunset',
      'Ha Long Bay kayak lagoon cave',
      'Lan Ha Bay floating village Vietnam',
    ],
    toursCount: 6,
    fromPrice: 1080,
    intro:
      'Legend says a dragon descended here, carving the bay with its tail — and standing on deck at dawn, mist threading between two thousand limestone towers, the legend feels like the more plausible explanation. Sleep aboard a traditional junk, kayak into hidden lagoons, and let the bay rearrange your sense of scale.',
    facts: { season: 'Oct – Apr', language: 'Vietnamese', currency: 'Dong (₫)', tripLength: '2–4 days' },
    vibes: ['Adventure', 'Friends trip', 'Relaxation'],
    estDailyCost: 120,
    highlights: [
      { title: 'Sail Lan Ha, not the main bay', blurb: 'The southern extension has the same karst drama with a tenth of the boats. Ask for routes through Lan Ha and you trade queues for empty lagoons.', photoQuery: 'Lan Ha Bay karsts empty lagoon boat', secret: true },
      { title: 'Kayak into Dark & Bright cave', blurb: 'Paddle a low tunnel through the rock and emerge in a sealed lagoon of green silence, monkeys in the cliffs above.', photoQuery: 'Ha Long kayak cave lagoon limestone', secret: false },
      { title: '5am on deck', blurb: 'Set an alarm. Mist threads the towers, the water goes to mercury, and for an hour the dragon legend feels like reporting.', photoQuery: 'Ha Long Bay dawn mist karst towers', secret: false },
      { title: 'Cua Van floating village', blurb: 'A sampan rowed by a fourth-generation fisherwoman winds between houses on rafts. Go with the coffee ladies at first light before tour hours.', photoQuery: 'Cua Van floating village sampan Vietnam', secret: true },
    ],
    rating: 4.7,
    reviewCount: 205,
    ratingDist: [70, 20, 6, 3, 1],
    reviews: [
      { name: 'Oliver S.', date: 'November 2025', rating: 5, text: 'Woke at 5am, went on deck alone, and watched the karsts appear out of the dark. Unforgettable.' },
      { name: 'Hana M.', date: 'March 2026', rating: 5, text: 'Lan Ha route = far fewer boats. Kayaking through the cave into a hidden lagoon was a childhood dream.' },
      { name: 'Peter J.', date: 'December 2025', rating: 4, text: 'The bay is majestic; just know you share it. Our boat was elegant and the crew superb.' },
    ],
  },

  // ────────────────────────── Patagonia & the Andes ──────────────────────────
  {
    slug: 'torres-del-paine',
    name: 'Torres del Paine',
    country: 'Chile',
    region: 'Patagonia & the Andes',
    tagline: 'Granite towers at the end of the world',
    photoQuery: 'Torres del Paine granite towers turquoise lake',
    galleryQueries: [
      'Torres del Paine towers sunrise red',
      'Torres del Paine guanaco steppe',
      'Grey Glacier Patagonia ice blue',
      'Torres del Paine Pehoe lake turquoise',
    ],
    toursCount: 5,
    fromPrice: 2650,
    intro:
      'There is weather, and then there is Patagonian weather — four seasons before lunch, winds that name themselves, and light so sharp it feels edited. Torres del Paine is the payoff: three granite towers over a turquoise lake, glaciers calving into grey water, and guanacos posing on the steppe like they know.',
    facts: { season: 'Nov – Mar', language: 'Spanish', currency: 'Peso (CLP)', tripLength: '5–8 days' },
    vibes: ['Hiking', 'Adventure', 'Wildlife'],
    estDailyCost: 320,
    highlights: [
      { title: 'Base of the Towers at first light', blurb: 'The final moraine scramble in the dark, then granite igniting red over the lake. The hardest sunrise you will ever earn, and the one you will describe forever.', photoQuery: 'Torres del Paine towers sunrise red granite', secret: false },
      { title: 'Puma country with a tracker', blurb: 'The steppe east of the park holds the densest puma population on Earth. Local trackers read scrapes and guanaco alarm calls like headlines.', photoQuery: 'puma Patagonia steppe wildlife tracking', secret: false },
      { title: 'Mirador Cuernos at wind-hour', blurb: 'Late afternoon, when the wind makes the lake smoke, the Cuernos turn violet above Nordenskjöld. Ten minutes off the road, and somehow always empty.', photoQuery: 'Cuernos del Paine lake wind Patagonia', secret: true },
      { title: 'Calafate sours at the refugio', blurb: 'The berry that names the region makes the pisco sour purple. Tradition says one sip guarantees your return to Patagonia. Order two.', photoQuery: 'calafate berry pisco sour Patagonia lodge', secret: true },
    ],
    rating: 4.9,
    reviewCount: 153,
    ratingDist: [86, 10, 2, 1, 1],
    reviews: [
      { name: 'Astrid N.', date: 'January 2026', rating: 5, text: 'The base-of-the-towers hike broke me and rebuilt me. Sunrise turned the granite blood-red. Worth every step.' },
      { name: 'Carlos M.', date: 'February 2026', rating: 5, text: 'Saw a puma on day two. Our tracker-guide was extraordinary. Refugios were warmer than expected.' },
      { name: 'Emily C.', date: 'December 2025', rating: 5, text: 'The wind is not a joke and neither is the beauty. Best organized trek I have ever done.' },
    ],
  },
  {
    slug: 'el-chalten',
    name: 'El Chaltén',
    country: 'Argentina',
    region: 'Patagonia & the Andes',
    tagline: 'Hike out your front door, under Fitz Roy',
    photoQuery: 'Fitz Roy El Chalten Patagonia mountain sunrise',
    galleryQueries: [
      'Fitz Roy sunrise pink Patagonia',
      'Laguna de los Tres turquoise Fitz Roy',
      'El Chalten village Patagonia mountains',
      'Cerro Torre glacier lake Patagonia',
    ],
    toursCount: 4,
    fromPrice: 2280,
    intro:
      'Argentina’s trekking capital is a village of two thousand people at the foot of one of Earth’s most dramatic skylines. No entrance fees, no shuttle buses — trails leave straight from the bakery. When Fitz Roy’s granite spear catches first light and turns rose-gold, the entire town is already on the trail watching.',
    facts: { season: 'Nov – Mar', language: 'Spanish', currency: 'Peso (ARS)', tripLength: '4–6 days' },
    vibes: ['Hiking', 'Adventure'],
    estDailyCost: 250,
    highlights: [
      { title: 'Laguna de los Tres', blurb: 'The full-day pilgrimage to Fitz Roy’s feet: forest, river flats, then a brutal final hour to a turquoise lake under a granite wall. The town bakery opens at 6 for a reason.', photoQuery: 'Laguna de los Tres Fitz Roy turquoise lake', secret: false },
      { title: 'Trailheads from the bakery door', blurb: 'No park gates, no shuttles. Buy two empanadas at La Wafleria, turn left, and you are on the Laguna Torre trail in eight minutes.', photoQuery: 'El Chalten village street Fitz Roy view', secret: false },
      { title: 'Loma del Pliegue Tumbado', blurb: 'The viewpoint nobody does: a half-day climb that frames Fitz Roy AND Cerro Torre in one panorama. Condors ride the ridge lift at your eye level.', photoQuery: 'Loma del Pliegue Tumbado panorama Fitz Roy Cerro Torre', secret: true },
      { title: 'The 4pm schnitzel rule', blurb: 'La Cervecería fills by five with trekkers off the trails. Arrive at four, order the milanesa and a pint of their bock, and watch the limping parade arrive.', photoQuery: 'El Chalten craft brewery mountain town', secret: true },
    ],
    rating: 4.9,
    reviewCount: 121,
    ratingDist: [84, 12, 2, 1, 1],
    reviews: [
      { name: 'Lukas B.', date: 'January 2026', rating: 5, text: 'Laguna de los Tres at dawn — the hardest and best morning of my year. The town’s craft beer helped after.' },
      { name: 'Maya R.', date: 'December 2025', rating: 5, text: 'Loved that everything is walkable. Empanadas, trailheads, glacier views. Repeat.' },
      { name: 'Jonas K.', date: 'February 2026', rating: 4, text: 'Weather canceled our Cerro Torre day, but the flexible itinerary swapped in a stunning alternative.' },
    ],
  },
  {
    slug: 'atacama',
    name: 'Atacama Desert',
    country: 'Chile',
    region: 'Patagonia & the Andes',
    tagline: 'Mars, with better wine and more stars',
    photoQuery: 'Atacama desert Chile salt flat flamingo volcano',
    galleryQueries: [
      'Atacama Valle de la Luna sunset',
      'Atacama salt flat flamingos volcano',
      'Atacama geysers El Tatio dawn steam',
      'Atacama desert night sky milky way',
    ],
    toursCount: 6,
    fromPrice: 1890,
    intro:
      'The driest place on Earth is also one of the strangest and most beautiful: salt lakes pink with flamingos, geysers erupting at dawn at 14,000 feet, valleys so lunar NASA tests rovers here. And at night — the clearest skies on the planet, where the Milky Way casts an actual shadow.',
    facts: { season: 'Mar – May, Sep – Nov', language: 'Spanish', currency: 'Peso (CLP)', tripLength: '4–5 days' },
    vibes: ['Adventure', 'Hiking', 'Wildlife'],
    estDailyCost: 280,
    highlights: [
      { title: 'The clearest sky on Earth', blurb: 'Zero humidity, 2,400 meters, no light for a hundred miles. Through a telescope here, Saturn’s rings look hand-drawn. Book the astronomy night first, everything else second.', photoQuery: 'Atacama night sky milky way telescope', secret: false },
      { title: 'El Tatio at daybreak', blurb: 'Eighty geysers steam against the dawn cold at 4,300 meters. The columns collapse as the sun warms the air — by nine it is over.', photoQuery: 'El Tatio geysers dawn steam Atacama', secret: false },
      { title: 'Vallecito’s hidden dunes', blurb: 'Everyone photographs Valle de la Luna. The dune field one valley over is just as lunar, free to enter, and empty enough to hear sand slide.', photoQuery: 'Atacama desert dunes empty valley', secret: true },
      { title: 'Toconao’s quince empanadas', blurb: 'The white-adobe village by the salt flat has a wood-oven bakery whose quince empanadas sell out by noon. Eat them in the shaded plaza with the church bells.', photoQuery: 'Toconao village adobe church Atacama', secret: true },
    ],
    rating: 4.8,
    reviewCount: 134,
    ratingDist: [79, 15, 4, 1, 1],
    reviews: [
      { name: 'Priya S.', date: 'April 2026', rating: 5, text: 'The astronomy night ruined all future stargazing for me. Saturn’s rings, with my own eyes.' },
      { name: 'Felix W.', date: 'October 2025', rating: 5, text: 'El Tatio geysers at -10°C at dawn, then hot springs. The contrast is the point. Bring layers!' },
      { name: 'Carmen O.', date: 'May 2026', rating: 4, text: 'Altitude is real — the itinerary’s gradual acclimatization plan was smart. Valle de la Luna sunset: speechless.' },
    ],
  },

  // ────────────────────────── Africa & Arabia ──────────────────────────
  {
    slug: 'marrakech',
    name: 'Marrakech',
    country: 'Morocco',
    region: 'Africa & Arabia',
    tagline: 'A thousand and one sensory overloads',
    photoQuery: 'Marrakech Morocco medina souk lanterns colorful',
    galleryQueries: [
      'Marrakech Jemaa el-Fnaa square dusk',
      'Marrakech riad courtyard pool tiles',
      'Marrakech souk spices lanterns',
      'Majorelle garden blue Marrakech',
    ],
    toursCount: 8,
    fromPrice: 1180,
    intro:
      'Marrakech does not ease you in. The medina is a labyrinth of spice pyramids, hammering coppersmiths, and mint tea poured from a height — then a riad door closes behind you and everything goes quiet: a courtyard, a fountain, orange trees. The city’s genius is this rhythm of chaos and calm, repeated daily for a thousand years.',
    facts: { season: 'Oct – Apr', language: 'Arabic, French', currency: 'Dirham (MAD)', tripLength: '3–5 days' },
    vibes: ['Culture', 'Food & wine', 'Friends trip', 'Adventure'],
    estDailyCost: 140,
    highlights: [
      { title: 'Jemaa el-Fnaa after dark', blurb: 'At dusk the square becomes a thousand-year-old festival: snail carts, gnawa drummers, storytellers. Eat at stall 31 where the grill smoke is thickest.', photoQuery: 'Jemaa el-Fnaa night market smoke Marrakech', secret: false },
      { title: 'The quiet of a riad', blurb: 'The medina’s genius is the door that closes. Behind it: a courtyard, a fountain, orange trees, silence. Choose your riad like you would a hotel room with a soul.', photoQuery: 'Marrakech riad courtyard fountain tiles', secret: false },
      { title: 'Le Jardin Secret’s tower', blurb: 'Everyone queues for Majorelle. This restored palace garden in the medina has an Islamic-geometry paradise garden and a tower view over the rooftops — usually shared with pigeons only.', photoQuery: 'Le Jardin Secret Marrakech garden tower', secret: true },
      { title: 'Amal, lunch that matters', blurb: 'A women’s training center in Gueliz serving Friday couscous that outclasses the palaces. Book a cooking class and your teacher becomes your friend.', photoQuery: 'Moroccan couscous tagine home cooking', secret: true },
    ],
    rating: 4.7,
    reviewCount: 228,
    ratingDist: [72, 19, 5, 3, 1],
    reviews: [
      { name: 'Zoe A.', date: 'November 2025', rating: 5, text: 'Our food walk through the night market — I still dream about the msemen. Guide handled the hustle graciously.' },
      { name: 'Henri L.', date: 'March 2026', rating: 5, text: 'The riad was a sanctuary. Day trip to the Atlas foothills balanced the medina intensity perfectly.' },
      { name: 'Grace N.', date: 'February 2026', rating: 4, text: 'Intense, yes. But learning to navigate the souks with a local changed everything. Majorelle early = essential.' },
    ],
  },
  {
    slug: 'zanzibar',
    name: 'Zanzibar',
    country: 'Tanzania',
    region: 'Africa & Arabia',
    tagline: 'Spice winds and sandbank swims',
    photoQuery: 'Zanzibar beach dhow turquoise sandbank',
    galleryQueries: [
      'Zanzibar dhow sailboat turquoise water',
      'Stone Town Zanzibar carved door alley',
      'Zanzibar sandbank picnic aerial',
      'Zanzibar spice farm vanilla clove',
    ],
    toursCount: 5,
    fromPrice: 1520,
    intro:
      'Zanzibar smells like cloves and salt. This is the island where Swahili, Arab, Indian, and Portuguese worlds met and married — wander Stone Town’s carved-door alleys in the morning, sail a dhow to a vanishing sandbank by afternoon, and eat grilled octopus under string lights as the muezzin and the tide call at once.',
    facts: { season: 'Jun – Oct', language: 'Swahili, English', currency: 'Shilling (TZS)', tripLength: '5–7 days' },
    vibes: ['Beach', 'Honeymoon', 'Culture', 'Relaxation'],
    estDailyCost: 180,
    highlights: [
      { title: 'A dhow to a vanishing island', blurb: 'Sail at morning tide to a sandbank that exists for six hours a day. Grilled lobster, an umbrella, and the Indian Ocean rising slowly around your lunch.', photoQuery: 'Zanzibar sandbank dhow lunch turquoise', secret: false },
      { title: 'Stone Town’s carved doors', blurb: 'Four centuries of Swahili, Arab, Indian and Portuguese lives are carved into these studded doors. Walk with a scholar; the alleys are an archive.', photoQuery: 'Stone Town Zanzibar carved door alley', secret: false },
      { title: 'Forodhani after the tourists eat', blurb: 'The night market’s first wave is for visitors. Return at 9:30 when families arrive — urojo soup, sugarcane juice pressed by bicycle, and honest prices.', photoQuery: 'Forodhani night market Zanzibar food stalls', secret: true },
      { title: 'The Rock’s low-tide walk', blurb: 'The famous restaurant sits on a tidal boulder — but the real move is the shoreline walk from Pingwe at low tide, seaweed farms strung like gardens underwater.', photoQuery: 'Zanzibar low tide seaweed farm shore walk', secret: true },
    ],
    rating: 4.7,
    reviewCount: 142,
    ratingDist: [71, 20, 5, 3, 1],
    reviews: [
      { name: 'Amara J.', date: 'July 2026', rating: 5, text: 'The sandbank lunch — just us, a chef, and the Indian Ocean on all sides. Core memory acquired.' },
      { name: 'Stefan R.', date: 'August 2026', rating: 5, text: 'Stone Town’s history walk was profound and honest. The spice farm tour smells like heaven.' },
      { name: 'Leila H.', date: 'September 2025', rating: 4, text: 'Tides change everything on the east coast — the itinerary planned swims around them intelligently.' },
    ],
  },
  {
    slug: 'wadi-rum',
    name: 'Wadi Rum',
    country: 'Jordan',
    region: 'Africa & Arabia',
    tagline: 'Sleep in the valley of the moon',
    photoQuery: 'Wadi Rum Jordan desert red rock camp',
    galleryQueries: [
      'Wadi Rum red desert rock arch',
      'Wadi Rum bedouin camp night stars',
      'Wadi Rum jeep desert sunset',
      'Wadi Rum camel caravan dunes',
    ],
    toursCount: 4,
    fromPrice: 1340,
    intro:
      'T.E. Lawrence called it “vast, echoing and God-like,” and Hollywood keeps casting it as Mars — but Wadi Rum’s best trick is silence. After the jeeps park and the sun drops behind the sandstone, you eat lamb cooked underground in a Bedouin camp, and the sky performs. No filter has ever done it justice.',
    facts: { season: 'Mar – May, Sep – Nov', language: 'Arabic', currency: 'Dinar (JOD)', tripLength: '2–3 days' },
    vibes: ['Adventure', 'Culture', 'Hiking'],
    estDailyCost: 200,
    highlights: [
      { title: 'The silence after the jeeps', blurb: 'Day tours leave by five. Stay the night and the desert exhales: sandstone goes ember-red, the wind stops, and the loudest thing is your own pulse.', photoQuery: 'Wadi Rum sunset red cliffs silence', secret: false },
      { title: 'Zarb, dinner from the earth', blurb: 'Lamb and vegetables buried over coals for hours, unearthed like treasure at a Bedouin camp. The reveal is theater; the eating is better.', photoQuery: 'Bedouin zarb dinner camp fire Wadi Rum', secret: false },
      { title: 'Jebel Burdah rock bridge', blurb: 'A guided scramble to a sandstone arch a hundred meters up. Half climbing, half hiking, all worth it for the summit photo your knees will remember.', photoQuery: 'Burdah rock bridge arch Wadi Rum climb', secret: true },
      { title: 'Lawrence’s spring at dawn', blurb: 'A short camel ride to a fig-shaded spring in the cliff face. Fill your tea from the source and watch the valley floor light up below.', photoQuery: 'Lawrence spring Wadi Rum cliff fig tree', secret: true },
    ],
    rating: 4.9,
    reviewCount: 167,
    ratingDist: [87, 9, 2, 1, 1],
    reviews: [
      { name: 'Noor K.', date: 'April 2026', rating: 5, text: 'Slept with the tent flap open facing the desert. Woke to sunrise on red cliffs. Transcendent.' },
      { name: 'Michael T.', date: 'October 2025', rating: 5, text: 'Our Bedouin hosts were the heart of it — the zarb dinner, the stories, the oud by the fire.' },
      { name: 'Julia P.', date: 'March 2026', rating: 5, text: 'Two nights minimum. The silence at 3am under the Milky Way is something I did not know I needed.' },
    ],
  },
];

export function destinationBySlug(slug: string): EditorialDestination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}

// Featured destination rotates daily.
export function featuredDestination(): EditorialDestination {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DESTINATIONS[dayOfYear % DESTINATIONS.length];
}

export function formatPrice(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}
