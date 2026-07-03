import { Platform } from 'react-native';

// Editorial serif for magazine-style display type.
export const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export interface Review {
  name: string;
  date: string;
  rating: number;
  text: string;
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
  rating: number;
  reviewCount: number;
  // Percentage distribution for 5★ → 1★
  ratingDist: [number, number, number, number, number];
  reviews: Review[];
}

export interface TourDay {
  title: string;
  activities: string[];
  meals: string;
  stay: string;
}

export interface TourAddOn {
  id: string;
  label: string;
  detail: string;
  price: number;
}

export interface Tour {
  slug: string;
  destinationSlug: string;
  title: string;
  subtitle: string;
  price: number;
  durationDays: number;
  groupSize: string;
  included: string[];
  addOns: TourAddOn[];
  days: TourDay[];
}

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

export const TOURS: Tour[] = [
  {
    slug: 'santorini-signature',
    destinationSlug: 'santorini',
    title: 'Caldera & Vine',
    subtitle: 'Villages, volcanic wine, and one perfect sail',
    price: 1450,
    durationDays: 5,
    groupSize: 'Max 10',
    included: ['4 nights cave-house hotel', 'Daily breakfast', 'Catamaran sunset sail', 'Wine tasting × 2', 'Local guide throughout'],
    addOns: [
      { id: 'photo', label: 'Golden-hour photo session', detail: '90 min with a local photographer in Oia', price: 140 },
      { id: 'cooking', label: 'Cycladic cooking class', detail: 'Tomato fritters, fava & wine on a family farm', price: 95 },
      { id: 'transfer', label: 'Private airport transfers', detail: 'Both directions', price: 60 },
    ],
    days: [
      { title: 'Arrival & the rim at dusk', activities: ['Check in above the caldera', 'Orientation walk through Fira', 'Sunset aperitivo on the rim'], meals: 'D', stay: 'Cave hotel, Fira' },
      { title: 'Oia the right way', activities: ['Dawn walk before the crowds', 'Maritime museum & castle point', 'Free afternoon & pool time'], meals: 'B', stay: 'Cave hotel, Fira' },
      { title: 'Ash-soil vineyards', activities: ['Santo Wines & Venetsanos tastings', 'Pyrgos village lunch', 'Ancient Akrotiri ruins'], meals: 'B · L', stay: 'Cave hotel, Fira' },
      { title: 'On the water', activities: ['Catamaran to the hot springs', 'Swim stops at Red & White beach', 'Sunset sail with dinner aboard'], meals: 'B · D', stay: 'Cave hotel, Fira' },
      { title: 'Slow morning, farewell', activities: ['Caldera-edge breakfast', 'Optional Imerovigli stroll'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'amalfi-signature',
    destinationSlug: 'amalfi-coast',
    title: 'Lemons & Ladders',
    subtitle: 'Cliff paths, boat coves, and long Italian lunches',
    price: 1780,
    durationDays: 6,
    groupSize: 'Max 12',
    included: ['5 nights sea-view hotel', 'Daily breakfast', 'Private boat day', 'Path of the Gods guided hike', 'Limoncello farm visit'],
    addOns: [
      { id: 'capri', label: 'Capri extension day', detail: 'Blue Grotto & Monte Solaro chairlift', price: 220 },
      { id: 'cooking', label: 'Pasta with a nonna', detail: 'Hands-on class in a Praiano home', price: 110 },
      { id: 'transfer', label: 'Private Naples transfers', detail: 'Both directions', price: 130 },
    ],
    days: [
      { title: 'Benvenuti a Positano', activities: ['Arrival & cliffside check-in', 'Passeggiata & spiaggia sunset'], meals: 'D', stay: 'Hotel, Positano' },
      { title: 'Path of the Gods', activities: ['Sunrise trailhead start', 'Nocelle lemon terrace break', 'Afternoon swim & rest'], meals: 'B · L', stay: 'Hotel, Positano' },
      { title: 'The coast by boat', activities: ['Private gozzo along the cliffs', 'Li Galli cove swims', 'Furore fjord photo stop'], meals: 'B · L', stay: 'Hotel, Positano' },
      { title: 'Amalfi & Ravello', activities: ['Duomo & paper museum', 'Villa Rufolo gardens', 'Evening chamber concert'], meals: 'B', stay: 'Hotel, Positano' },
      { title: 'Lemon farm & free time', activities: ['Limoncello tasting with the growers', 'Free afternoon — beach or boutiques'], meals: 'B · L', stay: 'Hotel, Positano' },
      { title: 'Arrivederci', activities: ['Slow breakfast, departure'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'menorca-signature',
    destinationSlug: 'menorca',
    title: 'The Quiet Balearic',
    subtitle: 'Hidden calas by kayak, foot, and sail',
    price: 1290,
    durationDays: 5,
    groupSize: 'Max 8',
    included: ['4 nights boutique agroturismo', 'Daily breakfast', 'Sea-kayak cave tour', 'Sunset sail', 'Camí de Cavalls guided sections'],
    addOns: [
      { id: 'gin', label: 'Xoriguer gin experience', detail: 'Distillery tour & pomada masterclass', price: 55 },
      { id: 'dive', label: 'Discover scuba dive', detail: 'Marine reserve intro dive, all gear', price: 120 },
      { id: 'transfer', label: 'Private airport transfers', detail: 'Both directions', price: 50 },
    ],
    days: [
      { title: 'Ciutadella evenings', activities: ['Check-in at the finca', 'Old-town wander & harbor dinner'], meals: 'D', stay: 'Agroturismo, near Ciutadella' },
      { title: 'South-coast calas', activities: ['Camí de Cavalls: Son Saura → Turqueta', 'Swim stops all day'], meals: 'B · picnic L', stay: 'Agroturismo' },
      { title: 'By kayak', activities: ['Paddle the north-coast caves', 'Cliff-jump (optional!)', 'Fornells fishing-village lunch'], meals: 'B · L', stay: 'Agroturismo' },
      { title: 'Island under sail', activities: ['Classic llaüt day sail', 'Sunset with pomada on deck'], meals: 'B · L', stay: 'Agroturismo' },
      { title: 'Market & farewell', activities: ['Ciutadella market breakfast', 'Departure'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'bali-signature',
    destinationSlug: 'bali',
    title: 'Temples & Terraces',
    subtitle: 'From Ubud’s jungle to Uluwatu’s cliffs',
    price: 1150,
    durationDays: 8,
    groupSize: 'Max 12',
    included: ['7 nights (jungle lodge + cliff resort)', 'Daily breakfast', 'Private driver-guide', 'Sunrise temple ceremony', 'Balinese massage × 1'],
    addOns: [
      { id: 'surf', label: 'Surf lessons × 2', detail: 'Beginner-friendly breaks with local coaches', price: 90 },
      { id: 'batur', label: 'Mt. Batur sunrise trek', detail: '2am start, volcanic sunrise, hot springs after', price: 75 },
      { id: 'spa', label: 'Half-day spa ritual', detail: 'Flower bath & traditional boreh wrap', price: 85 },
    ],
    days: [
      { title: 'Into the jungle', activities: ['Arrival, Ubud lodge check-in', 'Campuhan ridge sunset walk'], meals: 'D', stay: 'Jungle lodge, Ubud' },
      { title: 'Rice & water temples', activities: ['Tegallalang terraces early', 'Tirta Empul purification ritual', 'Craft villages loop'], meals: 'B · L', stay: 'Jungle lodge, Ubud' },
      { title: 'Sidemen valley', activities: ['Village walk among the paddies', 'Weaving house visit', 'Long slow lunch with a view'], meals: 'B · L', stay: 'Jungle lodge, Ubud' },
      { title: 'Waterfalls & spa', activities: ['Tibumana & Tukad Cepung falls', 'Afternoon massage', 'Ubud night market'], meals: 'B', stay: 'Jungle lodge, Ubud' },
      { title: 'Sunrise at the gates', activities: ['Lempuyang “Gates of Heaven” at dawn', 'Tirta Gangga water palace', 'Transfer south'], meals: 'B · L', stay: 'Cliff resort, Uluwatu' },
      { title: 'Cliffs & kecak', activities: ['Beach morning (Padang Padang)', 'Uluwatu temple at golden hour', 'Kecak fire dance'], meals: 'B', stay: 'Cliff resort, Uluwatu' },
      { title: 'Island time', activities: ['Free day — surf, spa, or sunbeds', 'Farewell seafood dinner on the sand'], meals: 'B · D', stay: 'Cliff resort, Uluwatu' },
      { title: 'Selamat jalan', activities: ['Departure transfers'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'luang-prabang-signature',
    destinationSlug: 'luang-prabang',
    title: 'Mekong Mornings',
    subtitle: 'Alms at dawn, waterfalls at noon, river gold at dusk',
    price: 980,
    durationDays: 4,
    groupSize: 'Max 10',
    included: ['3 nights heritage villa', 'Daily breakfast', 'Private Mekong sunset cruise', 'Kuang Si entrance & picnic', 'Alms ceremony briefing & offerings'],
    addOns: [
      { id: 'weaving', label: 'Silk-weaving workshop', detail: 'Half day at a village atelier', price: 45 },
      { id: 'caves', label: 'Pak Ou caves by boat', detail: 'Thousand-Buddha caves upriver', price: 60 },
      { id: 'baci', label: 'Private baci ceremony', detail: 'Traditional blessing with a village elder', price: 70 },
    ],
    days: [
      { title: 'Peninsula wandering', activities: ['Check-in, heritage-quarter walk', 'Mount Phousi at sunset', 'Night market graze'], meals: 'D', stay: 'Heritage villa' },
      { title: 'Dawn alms & waterfalls', activities: ['Tak bat ceremony at first light', 'Kuang Si turquoise pools & picnic', 'Bear rescue sanctuary'], meals: 'B · L', stay: 'Heritage villa' },
      { title: 'Temples & the river', activities: ['Wat Xieng Thong in the quiet hours', 'Artisan quarter visit', 'Golden-hour Mekong cruise'], meals: 'B', stay: 'Heritage villa' },
      { title: 'One last coffee', activities: ['Riverside café morning', 'Departure'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'ha-long-signature',
    destinationSlug: 'ha-long-bay',
    title: 'Karst & Current',
    subtitle: 'Two nights aboard among the limestone towers',
    price: 1080,
    durationDays: 3,
    groupSize: 'Max 16',
    included: ['2 nights premium junk cabin', 'All meals aboard', 'Kayak & lagoon excursions', 'Tai chi at sunrise', 'Hanoi transfers'],
    addOns: [
      { id: 'cabin', label: 'Ocean-view suite upgrade', detail: 'Private balcony cabin', price: 180 },
      { id: 'squid', label: 'Night squid fishing', detail: 'With the crew, from the stern', price: 25 },
      { id: 'hanoi', label: 'Hanoi old-quarter food walk', detail: 'Evening before embarkation', price: 55 },
    ],
    days: [
      { title: 'Set sail', activities: ['Hanoi pickup, boarding lunch', 'Cruise into Lan Ha bay', 'Kayak a hidden lagoon', 'Sundowners on the top deck'], meals: 'L · D', stay: 'Junk boat cabin' },
      { title: 'Deep in the bay', activities: ['Sunrise tai chi', 'Floating village by sampan', 'Beach & swim stop', 'Cooking demo & feast'], meals: 'B · L · D', stay: 'Junk boat cabin' },
      { title: 'Mist & farewell', activities: ['Dawn on deck', 'Surprise cave brunch', 'Return transfer to Hanoi'], meals: 'B · brunch', stay: '—' },
    ],
  },
  {
    slug: 'torres-signature',
    destinationSlug: 'torres-del-paine',
    title: 'The W, Softened',
    subtitle: 'The classic trek with warm beds and hot meals',
    price: 2650,
    durationDays: 6,
    groupSize: 'Max 8',
    included: ['5 nights refugio/lodge', 'All meals on trek', 'Certified mountain guides', 'Park fees & catamaran', 'Punta Arenas transfers'],
    addOns: [
      { id: 'glacier', label: 'Grey Glacier ice hike', detail: 'Crampons-on glacier walk with guides', price: 190 },
      { id: 'horseback', label: 'Estancia horseback day', detail: 'Ride with baqueanos, asado lunch', price: 160 },
      { id: 'single', label: 'Single room upgrade', detail: 'Where lodges allow', price: 240 },
    ],
    days: [
      { title: 'To the end of the world', activities: ['Punta Arenas pickup', 'Steppe drive — guanacos & condors', 'Lodge briefing & gear check'], meals: 'L · D', stay: 'Lodge, park edge' },
      { title: 'French Valley', activities: ['Catamaran across Pehoé', 'Hike into the valley amphitheater', 'Hanging-glacier lookout'], meals: 'B · L · D', stay: 'Refugio Cuernos' },
      { title: 'Lakes & wind', activities: ['Nordenskjöld shoreline trek', 'Wildlife tracking with guides'], meals: 'B · L · D', stay: 'Refugio Central' },
      { title: 'The Towers', activities: ['Pre-dawn start', 'Base-of-the-towers ascent', 'Celebratory dinner'], meals: 'B · L · D', stay: 'Refugio Central' },
      { title: 'Grey Glacier', activities: ['Boat to the glacier face', 'Icebergs & lookout walk'], meals: 'B · L · D', stay: 'Lodge, park edge' },
      { title: 'Homeward', activities: ['Slow morning, return transfer'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'chalten-signature',
    destinationSlug: 'el-chalten',
    title: 'Fitz Roy on Foot',
    subtitle: 'Day-hike the classics, sleep in town',
    price: 2280,
    durationDays: 5,
    groupSize: 'Max 10',
    included: ['4 nights boutique hosteria', 'Daily breakfast & trail lunches', 'Local trekking guides', 'El Calafate transfers', 'Farewell asado'],
    addOns: [
      { id: 'perito', label: 'Perito Moreno add-on day', detail: 'Boardwalks + optional mini-trek on the ice', price: 210 },
      { id: 'massage', label: 'Post-trek massage', detail: '60 min, because Laguna de los Tres', price: 70 },
      { id: 'single', label: 'Single room upgrade', detail: 'All four nights', price: 180 },
    ],
    days: [
      { title: 'Arrival under the spires', activities: ['Transfer from El Calafate', 'Sunset viewpoint warm-up walk', 'Craft-beer welcome'], meals: 'D', stay: 'Hosteria, El Chaltén' },
      { title: 'Laguna Capri', activities: ['Shake-out hike to Capri', 'Fitz Roy reflection views', 'Afternoon empanada workshop'], meals: 'B · L', stay: 'Hosteria' },
      { title: 'The big one', activities: ['Laguna de los Tres full day', 'Dawn start for summit light'], meals: 'B · L', stay: 'Hosteria' },
      { title: 'Cerro Torre', activities: ['Laguna Torre trail', 'Iceberg-laced lake & glacier views', 'Farewell asado night'], meals: 'B · L · D', stay: 'Hosteria' },
      { title: 'Departure', activities: ['Bakery run, transfer out'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'atacama-signature',
    destinationSlug: 'atacama',
    title: 'High & Dry',
    subtitle: 'Geysers, salt lakes, moon valleys, deep space',
    price: 1890,
    durationDays: 5,
    groupSize: 'Max 10',
    included: ['4 nights desert lodge', 'Daily breakfast', 'All excursions & park fees', 'Astronomy night with telescopes', 'Calama transfers'],
    addOns: [
      { id: 'sandboard', label: 'Sandboarding session', detail: 'Death Valley dunes, gear included', price: 65 },
      { id: 'hotair', label: 'Dawn balloon flight', detail: 'Sunrise over the salt flat', price: 320 },
      { id: 'spa', label: 'Puritama hot springs', detail: 'Private morning slot', price: 90 },
    ],
    days: [
      { title: 'Arrive & acclimatize', activities: ['Lodge check-in (2,400 m)', 'San Pedro village stroll', 'Early night — altitude is real'], meals: 'D', stay: 'Desert lodge' },
      { title: 'Valley of the Moon', activities: ['Salt caves & dune ridge', 'Sunset over the cordillera'], meals: 'B · picnic D', stay: 'Desert lodge' },
      { title: 'Salt lakes & flamingos', activities: ['Chaxa lagoon flamingo colonies', 'Toconao village', 'Altiplanic lagoons (4,200 m)'], meals: 'B · L', stay: 'Desert lodge' },
      { title: 'Geysers at dawn', activities: ['El Tatio field at first light', 'Hot-spring soak', 'Astronomy session after dark'], meals: 'B · L', stay: 'Desert lodge' },
      { title: 'Descent', activities: ['Slow breakfast, Calama transfer'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'marrakech-signature',
    destinationSlug: 'marrakech',
    title: 'Riad & Rhythm',
    subtitle: 'Souks, gardens, and an Atlas escape',
    price: 1180,
    durationDays: 4,
    groupSize: 'Max 10',
    included: ['3 nights courtyard riad', 'Daily breakfast', 'Medina food walk', 'Atlas foothills day with lunch', 'Hammam session'],
    addOns: [
      { id: 'cooking', label: 'Tagine masterclass', detail: 'Market shop + cook in a dada’s kitchen', price: 80 },
      { id: 'balloon', label: 'Dawn balloon over the palmeraie', detail: 'With Berber breakfast', price: 280 },
      { id: 'desert', label: 'Agafay desert dinner', detail: 'Sunset camp, music & fire', price: 120 },
    ],
    days: [
      { title: 'Into the labyrinth', activities: ['Riad check-in & mint tea', 'Guided medina orientation', 'Jemaa el-Fnaa at dusk'], meals: 'D', stay: 'Riad, medina' },
      { title: 'Souks & gardens', activities: ['Artisan quarters deep-dive', 'Majorelle & YSL museum', 'Rooftop sunset'], meals: 'B', stay: 'Riad, medina' },
      { title: 'Atlas air', activities: ['Imlil valley walk', 'Berber-home lunch', 'Evening hammam ritual'], meals: 'B · L', stay: 'Riad, medina' },
      { title: 'Slow farewell', activities: ['Courtyard breakfast', 'Last souk sweep, departure'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'zanzibar-signature',
    destinationSlug: 'zanzibar',
    title: 'Dhow & Door',
    subtitle: 'Stone Town stories and sandbank swims',
    price: 1520,
    durationDays: 6,
    groupSize: 'Max 10',
    included: ['5 nights (Stone Town + beach)', 'Daily breakfast', 'Dhow sandbank day with lunch', 'Spice farm tour', 'History walk with a local scholar'],
    addOns: [
      { id: 'snorkel', label: 'Mnemba atoll snorkel', detail: 'Boat day to the reef', price: 95 },
      { id: 'cooking', label: 'Swahili cooking class', detail: 'Market visit + family kitchen', price: 70 },
      { id: 'sunset', label: 'Private sunset dhow', detail: 'Just your group, drinks aboard', price: 130 },
    ],
    days: [
      { title: 'Karibu Stone Town', activities: ['Check-in old quarter', 'Twilight alleys & Forodhani grills'], meals: 'D', stay: 'Boutique hotel, Stone Town' },
      { title: 'History & spice', activities: ['Scholar-led history walk', 'Spice farm afternoon', 'Rooftop dinner'], meals: 'B · D', stay: 'Stone Town' },
      { title: 'The sandbank', activities: ['Dhow sail at morning tide', 'Vanishing-island seafood lunch', 'Snorkel the reef edge'], meals: 'B · L', stay: 'Stone Town' },
      { title: 'To the east coast', activities: ['Transfer to Paje', 'Tide-pool walk & kite-beach sunset'], meals: 'B', stay: 'Beach lodge, Paje' },
      { title: 'Ocean day', activities: ['Swim, SUP, or hammock', 'Seaweed-farm visit', 'Beach barbecue'], meals: 'B · D', stay: 'Beach lodge, Paje' },
      { title: 'Kwaheri', activities: ['Ocean breakfast, airport transfer'], meals: 'B', stay: '—' },
    ],
  },
  {
    slug: 'wadi-rum-signature',
    destinationSlug: 'wadi-rum',
    title: 'Valley of the Moon',
    subtitle: 'Jeeps, dunes, and a night under the Milky Way',
    price: 1340,
    durationDays: 3,
    groupSize: 'Max 8',
    included: ['2 nights luxury desert camp', 'All meals (incl. zarb dinner)', 'Full-day 4×4 with Bedouin guide', 'Sunrise camel ride', 'Amman/Aqaba transfers'],
    addOns: [
      { id: 'bubble', label: 'Stargazer bubble tent', detail: 'Transparent-dome upgrade, both nights', price: 260 },
      { id: 'climb', label: 'Jebel Burdah arch scramble', detail: 'Guided half-day rock bridge ascent', price: 110 },
      { id: 'petra', label: 'Petra day extension', detail: 'Full day with licensed guide', price: 190 },
    ],
    days: [
      { title: 'Into the red', activities: ['Desert transfer & camp check-in', 'Sunset from the dunes', 'Zarb dinner unearthed + fireside oud'], meals: 'L · D', stay: 'Luxury camp' },
      { title: 'Deep desert', activities: ['Full-day 4×4: arches, canyons, inscriptions', 'Tea with a Bedouin family', 'Night-sky session'], meals: 'B · L · D', stay: 'Luxury camp' },
      { title: 'Camelback dawn', activities: ['Sunrise camel ride', 'Slow breakfast, transfer out'], meals: 'B', stay: '—' },
    ],
  },
];

export function destinationBySlug(slug: string): EditorialDestination | undefined {
  return DESTINATIONS.find((d) => d.slug === slug);
}

export function tourForDestination(slug: string): Tour | undefined {
  return TOURS.find((t) => t.destinationSlug === slug);
}

export function tourBySlug(slug: string): Tour | undefined {
  return TOURS.find((t) => t.slug === slug);
}

// Featured destination rotates daily.
export function featuredDestination(): EditorialDestination {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DESTINATIONS[dayOfYear % DESTINATIONS.length];
}

export function formatPrice(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}
