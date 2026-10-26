/* Deima Trip Builder – demo data for Sri Lanka.
 * Activities come from the "Entrance Fee" sheet plus common excursions; hotel names from the
 * DBS rate sheets (Cultural Triangle, Galle Coast, South Coast). Hotel styles and the town each
 * hotel sits in were assigned for this demo and need Deima's check. No rates are shown to customers.
 * Places with no hotels listed show "Deima will suggest hotels" until Deima provides its lists.
 */
window.DEIMA_TRIP_DATA = {
  countries: [
    { id: "lk", name: "Sri Lanka", note: "Culture, wildlife, tea country and beaches", active: true },
    { id: "mv", name: "Maldives", note: "Coming soon", active: false },
    { id: "ae", name: "Dubai", note: "Coming soon", active: false },
    { id: "th", name: "Thailand", note: "Coming soon", active: false }
  ],

  airport: { name: "Bandaranaike International Airport (CMB)", lat: 7.18, lon: 79.88 },

  tripTypes: [
    { id: "holiday", label: "Holiday", interests: ["culture", "beach", "hills"] },
    { id: "honeymoon", label: "Honeymoon", interests: ["beach", "wellness", "hills"] },
    { id: "family", label: "Family", interests: ["wildlife", "beach", "culture"] },
    { id: "wildlife", label: "Wildlife", interests: ["wildlife", "nature"] },
    { id: "pilgrimage", label: "Pilgrimage", interests: ["pilgrim", "culture"] },
    { id: "adventure", label: "Adventure", interests: ["adventure", "nature"] }
  ],

  interests: [
    { id: "culture", label: "Culture & heritage", icon: "🏛️" },
    { id: "wildlife", label: "Wildlife & safari", icon: "🐘" },
    { id: "beach", label: "Beaches & ocean", icon: "🏖️" },
    { id: "hills", label: "Tea & hill country", icon: "🍃" },
    { id: "nature", label: "Nature & hiking", icon: "🥾" },
    { id: "adventure", label: "Adventure & surf", icon: "🏄" },
    { id: "wellness", label: "Wellness & Ayurveda", icon: "🧘" },
    { id: "food", label: "Food & local life", icon: "🍛" },
    { id: "pilgrim", label: "Temples & pilgrimage", icon: "🛕" }
  ],

  styles: [
    { id: "luxury", label: "Luxury", note: "Top resorts and heritage hotels" },
    { id: "premium", label: "Premium", note: "Well-known 4–5★ hotels" },
    { id: "boutique", label: "Boutique", note: "Small, characterful places" },
    { id: "comfort", label: "Comfort", note: "Good value, comfortable" },
    { id: "mix", label: "Mix it up", note: "Let Deima choose per stop" }
  ],

  paces: [
    { id: "relaxed", label: "Relaxed", nights: 3, note: "Fewer stops, longer stays" },
    { id: "balanced", label: "Balanced", nights: 2, note: "A good mix" },
    { id: "packed", label: "See it all", nights: 1, note: "More places, shorter stays" }
  ],

  meals: [
    { id: "BB", label: "Bed & breakfast" },
    { id: "HB", label: "Half board", note: "Breakfast + dinner" },
    { id: "FB", label: "Full board", note: "All three meals" },
    { id: "AI", label: "All inclusive", note: "Where the hotel offers it" }
  ],

  /* From the "Guide & trans rate" sheet: vehicle by group size */
  vehicles: [
    { max: 3, label: "Car" },
    { max: 6, label: "Van (flat roof)" },
    { max: 9, label: "Van (high roof)" },
    { max: 25, label: "Mini coach (25 seats)" },
    { max: 33, label: "Coach (33 seats)" },
    { max: 52, label: "Coach (45–52 seats)" }
  ],
  guideLanguages: ["English", "German", "French", "Spanish", "Italian", "Russian", "Chinese", "Japanese", "Hindi", "Arabic"],

  origins: [
    { name: "India", dial: "+91", cur: "INR" },
    { name: "United Kingdom", dial: "+44", cur: "GBP" },
    { name: "Germany", dial: "+49", cur: "EUR" },
    { name: "France", dial: "+33", cur: "EUR" },
    { name: "Italy", dial: "+39", cur: "EUR" },
    { name: "Netherlands", dial: "+31", cur: "EUR" },
    { name: "Spain", dial: "+34", cur: "EUR" },
    { name: "United States", dial: "+1", cur: "USD" },
    { name: "Canada", dial: "+1", cur: "CAD" },
    { name: "Australia", dial: "+61", cur: "AUD" },
    { name: "China", dial: "+86", cur: "CNY" },
    { name: "Japan", dial: "+81", cur: "JPY" },
    { name: "Russia", dial: "+7", cur: "RUB" },
    { name: "United Arab Emirates", dial: "+971", cur: "AED" },
    { name: "Saudi Arabia", dial: "+966", cur: "SAR" },
    { name: "Maldives", dial: "+960", cur: "MVR" },
    { name: "Singapore", dial: "+65", cur: "SGD" },
    { name: "Malaysia", dial: "+60", cur: "MYR" },
    { name: "Sri Lanka", dial: "+94", cur: "LKR" },
    { name: "Other", dial: "+", cur: "USD" }
  ],

  /* Rough coastline (lat, lon) for the drawn map */
  outline: [[9.83,80.23],[9.75,80.33],[9.62,80.43],[9.42,80.62],[9.27,80.82],[9.05,80.95],[8.80,81.08],[8.57,81.23],[8.35,81.38],[8.12,81.48],[7.92,81.56],[7.72,81.70],[7.45,81.82],[7.15,81.86],[6.85,81.84],[6.60,81.78],[6.45,81.66],[6.30,81.50],[6.21,81.33],[6.12,81.12],[6.05,80.92],[6.02,80.80],[5.95,80.62],[5.92,80.59],[5.94,80.47],[5.99,80.35],[6.03,80.22],[6.14,80.10],[6.30,80.03],[6.42,79.99],[6.58,79.96],[6.80,79.88],[6.93,79.84],[7.21,79.82],[7.58,79.79],[7.95,79.80],[8.23,79.72],[8.45,79.85],[8.65,79.92],[8.98,79.90],[9.10,80.02],[9.30,80.12],[9.48,80.12],[9.55,79.98],[9.68,79.92],[9.78,79.98],[9.82,80.10]],

  /* good: months (1–12) that are usually the best time to visit – a rough guide */
  places: [
    { id: "colombo", name: "Colombo", region: "West coast", lat: 6.93, lon: 79.85, label: "l",
      tags: ["food", "culture"], good: [12,1,2,3,4],
      blurb: "The capital: markets, temples, colonial streets and a sunset walk on Galle Face Green.",
      activities: [["Colombo city tour","culture"],["Gangaramaya Temple","pilgrim"],["Pettah market walk","food"],["Galle Face Green at sunset","food"]],
      hotels: [] },
    { id: "negombo", name: "Negombo", region: "West coast", lat: 7.21, lon: 79.84, label: "l",
      tags: ["beach", "food"], good: [12,1,2,3,4],
      blurb: "Beach town 20 minutes from the airport, handy for the first or last night.",
      activities: [["Lagoon boat ride","nature"],["Fish market visit","food"],["Dutch canal tour","culture"]],
      hotels: [] },
    { id: "wilpattu", name: "Wilpattu", region: "North-west", lat: 8.45, lon: 80.05, label: "l",
      tags: ["wildlife", "nature"], good: [2,3,4,5,6,7,8,9],
      blurb: "Sri Lanka's largest national park, known for leopards and quiet lakes.",
      activities: [["Wilpattu jeep safari","wildlife"],["Wilpattu National Park entry","wildlife"]],
      hotels: [] },
    { id: "anuradhapura", name: "Anuradhapura", region: "Cultural Triangle", lat: 8.31, lon: 80.40, label: "l",
      tags: ["culture", "pilgrim"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "The first ancient capital: giant stupas, the sacred Bo tree and Mihintale nearby.",
      activities: [["Sacred city of Anuradhapura","culture"],["Mihintale","pilgrim"],["Isurumuniya temple","pilgrim"],["Aukana Buddha statue","culture"],["Ritigala forest monastery","nature"]],
      hotels: [["Ulagalla Resort","luxury"],["The Sanctuary at Tissawewa","boutique"],["Palm Garden Village","comfort"]] },
    { id: "jaffna", name: "Jaffna", region: "North", lat: 9.66, lon: 80.02, label: "r",
      tags: ["culture", "food", "pilgrim"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Tamil culture, Hindu kovils, the Dutch fort and island-hopping in the far north.",
      activities: [["Jaffna fort and Nallur temple","culture"],["Island hopping","nature"],["Jaffna food trail","food"]],
      hotels: [] },
    { id: "trincomalee", name: "Trincomalee", region: "East coast", lat: 8.57, lon: 81.23, label: "r",
      tags: ["beach", "adventure", "pilgrim"], good: [5,6,7,8,9],
      blurb: "Calm east-coast bays, Pigeon Island and the clifftop Koneswaram temple.",
      activities: [["Pigeon Island snorkelling","adventure"],["Koneswaram temple","pilgrim"],["Whale and dolphin watching","wildlife"]],
      hotels: [] },
    { id: "sigiriya", name: "Sigiriya", region: "Cultural Triangle", lat: 7.96, lon: 80.76, label: "l",
      tags: ["culture", "nature", "adventure"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "The Lion Rock fortress, Pidurangala sunrise hike and village life around the lakes.",
      activities: [["Sigiriya Rock Fortress","culture"],["Pidurangala Rock hike","nature"],["Sigiriya Museum","culture"],["Village tour and cooking demo","food"],["Ritigala forest monastery","nature"]],
      hotels: [["Jetwing Vil Uyana","luxury"],["Water Garden Sigiriya","luxury"],["Aliya Resort and Spa","premium"],["Forest Rock Garden Resort","boutique"],["Sigiriya Village","comfort"],["Kassapa Lions Rock","comfort"],["Back of Beyond – Pidurangala","boutique"]] },
    { id: "minneriya", name: "Minneriya", region: "Cultural Triangle", lat: 8.03, lon: 80.90, label: "r",
      tags: ["wildlife", "nature"], good: [6,7,8,9,10],
      blurb: "The famous elephant gathering on the shrinking lakes in the dry season.",
      activities: [["Minneriya jeep safari","wildlife"],["Kaudulla jeep safari","wildlife"],["Hurulu Eco Park","wildlife"]],
      hotels: [] },
    { id: "dambulla", name: "Dambulla", region: "Cultural Triangle", lat: 7.86, lon: 80.65, label: "l",
      tags: ["culture", "pilgrim"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Painted cave temples on a rock above the plains, close to Sigiriya.",
      activities: [["Dambulla Cave Temple","pilgrim"],["Dambulla Museum","culture"],["Nalanda Gedige","culture"],["Ibbankatuwa ancient tombs","culture"]],
      hotels: [["Heritance Kandalama","premium"],["Amaya Lake","premium"],["Kalundewa Retreat","boutique"]] },
    { id: "polonnaruwa", name: "Polonnaruwa", region: "Cultural Triangle", lat: 7.94, lon: 81.00, label: "r",
      tags: ["culture", "nature"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Medieval royal city best seen by bicycle, with the Gal Vihara rock Buddhas.",
      activities: [["Ancient city of Polonnaruwa","culture"],["Cycling tour of the ruins","adventure"],["Gal Vihara rock carvings","culture"]],
      hotels: [["Deer Park Hotel","premium"]] },
    { id: "kandy", name: "Kandy", region: "Hill country", lat: 7.29, lon: 80.63, label: "l",
      tags: ["culture", "pilgrim", "hills", "food"], good: [1,2,3,4,7,8,12],
      blurb: "The hill capital: Temple of the Tooth, Kandyan dancing and botanical gardens.",
      activities: [["Temple of the Tooth Relic","pilgrim"],["Peradeniya Botanical Garden","nature"],["Kandyan dance show","culture"],["Spice garden visit","food"],["Tea factory visit","hills"]],
      hotels: [] },
    { id: "nuwaraeliya", name: "Nuwara Eliya", region: "Hill country", lat: 6.95, lon: 80.78, label: "l",
      tags: ["hills", "nature"], good: [1,2,3,4,5],
      blurb: "Cool tea country with colonial bungalows, Horton Plains and misty lakes.",
      activities: [["Horton Plains and World's End","nature"],["Pedro tea factory visit","hills"],["Gregory Lake","nature"],["Tea plantation walk","hills"]],
      hotels: [] },
    { id: "ella", name: "Ella", region: "Hill country", lat: 6.87, lon: 81.05, label: "r",
      tags: ["hills", "nature", "adventure"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Hiking village with the Nine Arch Bridge and the famous hill-country train.",
      activities: [["Scenic train ride through tea country","hills"],["Nine Arch Bridge","culture"],["Little Adam's Peak hike","nature"],["Ella Rock hike","adventure"],["Buduruwagala rock carvings","culture"]],
      hotels: [] },
    { id: "arugambay", name: "Arugam Bay", region: "East coast", lat: 6.84, lon: 81.83, label: "l",
      tags: ["beach", "adventure", "wildlife"], good: [5,6,7,8,9],
      blurb: "Laid-back surf bay on the east coast, close to Kumana and Lahugala.",
      activities: [["Surf lessons","adventure"],["Kumana National Park","wildlife"],["Lahugala elephants","wildlife"]],
      hotels: [] },
    { id: "udawalawe", name: "Udawalawe", region: "South", lat: 6.47, lon: 80.90, label: "l",
      tags: ["wildlife"], good: [1,2,3,4,5,6,7,8,9,10,11,12],
      blurb: "Open grassland park with almost guaranteed elephant sightings.",
      activities: [["Udawalawe jeep safari","wildlife"],["Elephant Transit Home","wildlife"]],
      hotels: [] },
    { id: "yala", name: "Yala", region: "South", lat: 6.37, lon: 81.40, label: "r",
      tags: ["wildlife", "adventure", "pilgrim"], good: [1,2,3,4,5,6,7,8],
      blurb: "Leopard country, with Bundala's birdlife and the Kataragama shrine nearby.",
      activities: [["Yala jeep safari","wildlife"],["Bundala bird safari","wildlife"],["Kataragama temple","pilgrim"]],
      hotels: [["Kirinda Beach Resort","comfort"]] },
    { id: "bentota", name: "Bentota", region: "West coast", lat: 6.42, lon: 80.00, label: "l",
      tags: ["beach", "wellness", "adventure"], good: [12,1,2,3,4],
      blurb: "Golden beaches, river safaris, water sports and Ayurveda resorts.",
      activities: [["Madu River boat safari","nature"],["Water sports","adventure"],["Turtle hatchery","wildlife"],["Ayurveda treatment","wellness"]],
      hotels: [] },
    { id: "galle", name: "Galle", region: "South coast", lat: 6.03, lon: 80.22, label: "l",
      tags: ["culture", "beach", "food"], good: [12,1,2,3,4],
      blurb: "The walled Dutch fort town: boutique hotels, cafés and sea-view ramparts.",
      activities: [["Galle Fort walking tour","culture"],["Maritime Museum","culture"],["Stilt fishermen at Koggala","culture"],["Turtle hatchery","wildlife"],["Cooking class","food"]],
      hotels: [["Amangalla","luxury"],["Galle Fort Hotel","luxury"],["Kahanda Kanda","luxury"],["The Fortress Resort and Spa, Koggala","premium"],["Jetwing Lighthouse","premium"],["Taru Villas – Rampart Street","boutique"],["20 Middle Street","boutique"],["Antic Galle Fort","comfort"]] },
    { id: "mirissa", name: "Mirissa & Weligama", region: "South coast", lat: 5.95, lon: 80.46, label: "l",
      tags: ["beach", "adventure", "wildlife", "wellness"], good: [12,1,2,3,4],
      blurb: "Whale watching, surf schools and palm-lined bays on the south coast.",
      activities: [["Whale watching","wildlife"],["Surf lessons in Weligama","adventure"],["Coconut Tree Hill","nature"],["Snorkelling","adventure"]],
      hotels: [["Weligama Bay Marriott Resort & Spa","premium"],["Barberyn Beach Ayurveda Resort","premium"],["The Beach House, Mirissa","boutique"],["Malabar Hill, Weligama","boutique"],["Number One Mirissa","comfort"]] },
    { id: "tangalle", name: "Tangalle", region: "South coast", lat: 6.02, lon: 80.79, label: "r",
      tags: ["beach", "wellness", "culture"], good: [12,1,2,3,4],
      blurb: "Quiet, wide beaches, turtle nesting at Rekawa and the Mulkirigala rock temple.",
      activities: [["Rekawa turtle watching","wildlife"],["Mulkirigala rock temple","pilgrim"],["Hummanaya blowhole","nature"]],
      hotels: [["Amanwella","luxury"],["Anantara Peace Haven Tangalle","luxury"],["The Tangalle Social","boutique"],["Taru Villas – Mawella","boutique"],["Back of Beyond – Kahandamodara","comfort"]] }
  ]
};
