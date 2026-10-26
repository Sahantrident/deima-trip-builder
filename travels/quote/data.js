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

  airport: { name: "Bandaranaike International Airport (CMB)", lat: 7.1808, lon: 79.8841 },

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

  /* good: months (1–12) that are usually the best time to visit – a rough guide.
   * wiki: English Wikipedia article whose lead photo is shown (free licence, credited). img: Deima's own photo URL (takes priority).
   * activities: [name, interest, wiki article]; hotels: [name, style, wiki article or null, img or null] */
  places: [
    { id: "colombo", name: "Colombo", region: "West coast", lat: 6.9271, lon: 79.8612, wiki: "Colombo",
      tags: ["food", "culture"], good: [12,1,2,3,4],
      blurb: "The capital: markets, temples, colonial streets and a sunset walk on Galle Face Green.",
      activities: [["Colombo city tour","culture","Colombo"],["Gangaramaya Temple","pilgrim","Gangaramaya Temple"],["Pettah market walk","food","Jami Ul-Alfar Mosque"],["Galle Face Green at sunset","food","Galle Face Green"]],
      hotels: [] },
    { id: "negombo", name: "Negombo", region: "West coast", lat: 7.2083, lon: 79.8358, wiki: "Negombo",
      tags: ["beach", "food"], good: [12,1,2,3,4],
      blurb: "Beach town 20 minutes from the airport, handy for the first or last night.",
      activities: [["Lagoon boat ride","nature","Negombo Lagoon"],["Fish market visit","food","Negombo"],["Dutch canal tour","culture","Hamilton Canal"]],
      hotels: [] },
    { id: "wilpattu", name: "Wilpattu", region: "North-west", lat: 8.4560, lon: 80.0130, wiki: "Wilpattu National Park",
      tags: ["wildlife", "nature"], good: [2,3,4,5,6,7,8,9],
      blurb: "Sri Lanka's largest national park, known for leopards and quiet lakes.",
      activities: [["Wilpattu jeep safari","wildlife","Wilpattu National Park"],["Leopard and sloth bear spotting","wildlife","Sri Lankan leopard"]],
      hotels: [] },
    { id: "anuradhapura", name: "Anuradhapura", region: "Cultural Triangle", lat: 8.3114, lon: 80.4037, wiki: "Anuradhapura",
      tags: ["culture", "pilgrim"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "The first ancient capital: giant stupas, the sacred Bo tree and Mihintale nearby.",
      activities: [["Sacred city of Anuradhapura","culture","Ruwanwelisaya"],["Mihintale","pilgrim","Mihintale"],["Isurumuniya temple","pilgrim","Isurumuniya"],["Aukana Buddha statue","culture","Avukana Buddha statue"],["Ritigala forest monastery","nature","Ritigala"]],
      hotels: [["Ulagalla Resort","luxury",null],["The Sanctuary at Tissawewa","boutique",null],["Palm Garden Village","comfort",null]] },
    { id: "jaffna", name: "Jaffna", region: "North", lat: 9.6615, lon: 80.0255, wiki: "Jaffna",
      tags: ["culture", "food", "pilgrim"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Tamil culture, Hindu kovils, the Dutch fort and island-hopping in the far north.",
      activities: [["Nallur temple and Jaffna fort","pilgrim","Nallur Kandaswamy temple"],["Island hopping to Nainativu","nature","Nainativu"],["Jaffna food trail","food","Jaffna"]],
      hotels: [] },
    { id: "trincomalee", name: "Trincomalee", region: "East coast", lat: 8.5874, lon: 81.2152, wiki: "Trincomalee",
      tags: ["beach", "adventure", "pilgrim"], good: [5,6,7,8,9],
      blurb: "Calm east-coast bays, Pigeon Island and the clifftop Koneswaram temple.",
      activities: [["Pigeon Island snorkelling","adventure","Pigeon Island National Park"],["Koneswaram temple","pilgrim","Koneswaram Temple"],["Whale and dolphin watching","wildlife","Blue whale"]],
      hotels: [] },
    { id: "sigiriya", name: "Sigiriya", region: "Cultural Triangle", lat: 7.9570, lon: 80.7603, wiki: "Sigiriya",
      tags: ["culture", "nature", "adventure"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "The Lion Rock fortress, Pidurangala sunrise hike and village life around the lakes.",
      activities: [["Sigiriya Rock Fortress","culture","Sigiriya"],["Pidurangala Rock hike","nature","Pidurangala Vihara"],["Sigiriya frescoes and museum","culture","Sigiriya"],["Village tour and cooking demo","food","Sri Lankan cuisine"],["Ritigala forest monastery","nature","Ritigala"]],
      hotels: [["Jetwing Vil Uyana","luxury",null],["Water Garden Sigiriya","luxury",null],["Aliya Resort and Spa","premium",null],["Forest Rock Garden Resort","boutique",null],["Back of Beyond – Pidurangala","boutique",null],["Sigiriya Village","comfort",null],["Kassapa Lions Rock","comfort",null]] },
    { id: "minneriya", name: "Minneriya", region: "Cultural Triangle", lat: 8.0360, lon: 80.8900, wiki: "Minneriya National Park",
      tags: ["wildlife", "nature"], good: [6,7,8,9,10],
      blurb: "The famous elephant gathering on the shrinking lakes in the dry season.",
      activities: [["Minneriya jeep safari","wildlife","Minneriya National Park"],["Kaudulla jeep safari","wildlife","Kaudulla National Park"],["Hurulu Eco Park","wildlife","Habarana"]],
      hotels: [] },
    { id: "dambulla", name: "Dambulla", region: "Cultural Triangle", lat: 7.8567, lon: 80.6492, wiki: "Dambulla cave temple",
      tags: ["culture", "pilgrim"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Painted cave temples on a rock above the plains, close to Sigiriya.",
      activities: [["Dambulla Cave Temple","pilgrim","Dambulla cave temple"],["Nalanda Gedige","culture","Nalanda Gedige"],["Ibbankatuwa ancient tombs","culture","Ibbankatuwa Megalithic Tombs"]],
      hotels: [["Heritance Kandalama","premium","Heritance Kandalama"],["Amaya Lake","premium",null],["Kalundewa Retreat","boutique",null]] },
    { id: "polonnaruwa", name: "Polonnaruwa", region: "Cultural Triangle", lat: 7.9403, lon: 81.0188, wiki: "Polonnaruwa",
      tags: ["culture", "nature"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Medieval royal city best seen by bicycle, with the Gal Vihara rock Buddhas.",
      activities: [["Ancient city of Polonnaruwa","culture","Ancient City of Polonnaruwa"],["Cycling tour of the ruins","adventure","Polonnaruwa"],["Gal Vihara rock carvings","culture","Gal Vihara"]],
      hotels: [["Deer Park Hotel","premium",null]] },
    { id: "kandy", name: "Kandy", region: "Hill country", lat: 7.2906, lon: 80.6337, wiki: "Kandy",
      tags: ["culture", "pilgrim", "hills", "food"], good: [1,2,3,4,7,8,12],
      blurb: "The hill capital: Temple of the Tooth, Kandyan dancing and botanical gardens.",
      activities: [["Temple of the Tooth Relic","pilgrim","Temple of the Tooth"],["Peradeniya Botanical Garden","nature","Royal Botanical Gardens, Peradeniya"],["Kandyan dance show","culture","Kandyan dance"],["Spice garden visit","food","Cinnamon"],["Tea factory visit","hills","Tea production in Sri Lanka"]],
      hotels: [] },
    { id: "nuwaraeliya", name: "Nuwara Eliya", region: "Hill country", lat: 6.9497, lon: 80.7891, wiki: "Nuwara Eliya",
      tags: ["hills", "nature"], good: [1,2,3,4,5],
      blurb: "Cool tea country with colonial bungalows, Horton Plains and misty lakes.",
      activities: [["Horton Plains and World's End","nature","Horton Plains National Park"],["Pedro tea factory visit","hills","Tea production in Sri Lanka"],["Gregory Lake and Victoria Park","nature","Victoria Park, Nuwara Eliya"],["Tea plantation walk","hills","Ceylon tea"]],
      hotels: [] },
    { id: "ella", name: "Ella", region: "Hill country", lat: 6.8667, lon: 81.0466, wiki: "Ella, Sri Lanka",
      tags: ["hills", "nature", "adventure"], good: [1,2,3,4,5,6,7,8,9],
      blurb: "Hiking village with the Nine Arch Bridge and the famous hill-country train.",
      activities: [["Scenic train ride through tea country","hills","Main Line (Sri Lanka)"],["Nine Arch Bridge","culture","Nine Arch Bridge"],["Little Adam's Peak hike","nature","Ella, Sri Lanka"],["Ravana Falls","nature","Ravana Falls"],["Buduruwagala rock carvings","culture","Buduruwagala"]],
      hotels: [] },
    { id: "arugambay", name: "Arugam Bay", region: "East coast", lat: 6.8400, lon: 81.8360, wiki: "Arugam Bay",
      tags: ["beach", "adventure", "wildlife"], good: [5,6,7,8,9],
      blurb: "Laid-back surf bay on the east coast, close to Kumana and Lahugala.",
      activities: [["Surf lessons","adventure","Arugam Bay"],["Kumana National Park","wildlife","Kumana National Park"],["Lahugala elephants","wildlife","Sri Lankan elephant"]],
      hotels: [] },
    { id: "udawalawe", name: "Udawalawe", region: "South", lat: 6.4740, lon: 80.8987, wiki: "Udawalawe National Park",
      tags: ["wildlife"], good: [1,2,3,4,5,6,7,8,9,10,11,12],
      blurb: "Open grassland park with almost guaranteed elephant sightings.",
      activities: [["Udawalawe jeep safari","wildlife","Udawalawe National Park"],["Elephant Transit Home","wildlife","Sri Lankan elephant"]],
      hotels: [] },
    { id: "yala", name: "Yala", region: "South", lat: 6.3700, lon: 81.5200, wiki: "Yala National Park",
      tags: ["wildlife", "adventure", "pilgrim"], good: [1,2,3,4,5,6,7,8],
      blurb: "Leopard country, with Bundala's birdlife and the Kataragama shrine nearby.",
      activities: [["Yala jeep safari","wildlife","Yala National Park"],["Bundala bird safari","wildlife","Bundala National Park"],["Kataragama temple","pilgrim","Kataragama temple"]],
      hotels: [["Kirinda Beach Resort","comfort",null]] },
    { id: "bentota", name: "Bentota", region: "West coast", lat: 6.4210, lon: 79.9980, wiki: "Bentota",
      tags: ["beach", "wellness", "adventure"], good: [12,1,2,3,4],
      blurb: "Golden beaches, river safaris, water sports and Ayurveda resorts.",
      activities: [["Madu River boat safari","nature","Madu Ganga"],["Water sports","adventure","Bentota"],["Turtle hatchery at Kosgoda","wildlife","Sea turtle"],["Ayurveda treatment","wellness","Ayurveda"]],
      hotels: [] },
    { id: "galle", name: "Galle", region: "South coast", lat: 6.0267, lon: 80.2170, wiki: "Galle Fort",
      tags: ["culture", "beach", "food"], good: [12,1,2,3,4],
      blurb: "The walled Dutch fort town: boutique hotels, cafés and sea-view ramparts.",
      activities: [["Galle Fort walking tour","culture","Galle Fort"],["Galle lighthouse and ramparts","culture","Galle Lighthouse"],["Stilt fishermen at Koggala","culture","Koggala"],["Unawatuna beach","beach","Unawatuna"],["Cooking class","food","Sri Lankan cuisine"]],
      hotels: [["Amangalla","luxury","Amangalla"],["Galle Fort Hotel","luxury",null],["Kahanda Kanda","luxury",null],["The Fortress Resort and Spa, Koggala","premium",null],["Jetwing Lighthouse","premium",null],["Taru Villas – Rampart Street","boutique",null],["20 Middle Street","boutique",null],["Antic Galle Fort","comfort",null]] },
    { id: "mirissa", name: "Mirissa & Weligama", region: "South coast", lat: 5.9483, lon: 80.4716, wiki: "Mirissa",
      tags: ["beach", "adventure", "wildlife", "wellness"], good: [12,1,2,3,4],
      blurb: "Whale watching, surf schools and palm-lined bays on the south coast.",
      activities: [["Whale watching","wildlife","Blue whale"],["Surf lessons in Weligama","adventure","Weligama"],["Coconut Tree Hill","nature","Mirissa"],["Snorkelling","adventure","Coral reef"]],
      hotels: [["Weligama Bay Marriott Resort & Spa","premium",null],["Barberyn Beach Ayurveda Resort","premium",null],["The Beach House, Mirissa","boutique",null],["Malabar Hill, Weligama","boutique",null],["Number One Mirissa","comfort",null]] },
    { id: "tangalle", name: "Tangalle", region: "South coast", lat: 6.0241, lon: 80.7941, wiki: "Mulkirigala Raja Maha Vihara",
      tags: ["beach", "wellness", "culture"], good: [12,1,2,3,4],
      blurb: "Quiet, wide beaches, turtle nesting at Rekawa and the Mulkirigala rock temple.",
      activities: [["Rekawa turtle watching","wildlife","Green sea turtle"],["Mulkirigala rock temple","pilgrim","Mulkirigala Raja Maha Vihara"],["Hummanaya blowhole","nature","Hummanaya"]],
      hotels: [["Amanwella","luxury",null],["Anantara Peace Haven Tangalle","luxury",null],["The Tangalle Social","boutique",null],["Taru Villas – Mawella","boutique",null],["Back of Beyond – Kahandamodara","comfort",null]] }
  ]
};
