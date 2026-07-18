export interface ProvinceData {
  name: string;
  majorCities: string[];
}

export const SOUTH_AFRICAN_PROVINCES: ProvinceData[] = [
  {
    name: 'Gauteng',
    majorCities: [
      'Johannesburg', 'Pretoria', 'Midrand', 'Sandton', 'Soweto', 'Kempton Park', 
      'Roodepoort', 'Centurion', 'Brakpan', 'Benoni', 'Vereeniging', 'Vanderbijlpark', 
      'Randburg', 'Springs', 'Germiston', 'Alberton', 'Krugersdorp', 'Heidelberg'
    ]
  },
  {
    name: 'Western Cape',
    majorCities: [
      'Cape Town', 'Stellenbosch', 'George', 'Knysna', 'Paarl', 'Mossel Bay', 
      'Oudtshoorn', 'Worcester', 'Hermanus', 'Saldanha', 'Wellington', 'Somerset West',
      'Bellville', 'Durbanville', 'Langebaan', 'Plettenberg Bay', 'Franschhoek'
    ]
  },
  {
    name: 'KwaZulu-Natal',
    majorCities: [
      'Durban', 'Pietermaritzburg', 'Newcastle', 'Richards Bay', 'Margate', 
      'Port Shepstone', 'Ladysmith', 'Empangeni', 'Ballito', 'Umhlanga', 'Vryheid',
      'Kloof', 'Hillcrest', 'Estcourt', 'Kokstad', 'St Lucia'
    ]
  },
  {
    name: 'Eastern Cape',
    majorCities: [
      'Gqeberha (Port Elizabeth)', 'East London', 'Makhanda (Grahamstown)', 'Mthatha', 
      'Kariega (Uitenhage)', 'Queenstown', 'Port Alfred', 'Graaff-Reinet', 'Jeffreys Bay',
      'Cradock', 'Aliwal North', 'St Francis Bay', 'Hogsback', 'Bizana'
    ]
  },
  {
    name: 'Free State',
    majorCities: [
      'Bloemfontein', 'Welkom', 'Sasolburg', 'Kroonstad', 'Bethlehem', 'Ficksburg', 
      'Harrismith', 'Parys', 'Clarens', 'Ladybrand', 'Phuthaditjhaba', 'Senekal'
    ]
  },
  {
    name: 'Mpumalanga',
    majorCities: [
      'Mbombela (Nelspruit)', 'Emalahleni (Witbank)', 'Secunda', 'Middelburg', 
      'Ermelo', 'Barberton', 'Lydenburg', 'White River', 'Sabie', 'Graskop',
      'Hazyview', 'Piet Retief', 'Belfast', 'Dullstroom'
    ]
  },
  {
    name: 'Limpopo',
    majorCities: [
      'Polokwane', 'Mokopane', 'Tzaneen', 'Thohoyandou', 'Bela-Bela (Warmbaths)', 
      'Lephalale (Ellisras)', 'Musina', 'Louis Trichardt', 'Phalaborwa', 'Modimolle',
      'Giyani', 'Burgersfort'
    ]
  },
  {
    name: 'North West',
    majorCities: [
      'Rustenburg', 'Mahikeng (Mafikeng)', 'Potchefstroom', 'Klerksdorp', 
      'Brits', 'Lichtenburg', 'Vryburg', 'Zeerust', 'Orkney', 'Hartbeespoort'
    ]
  },
  {
    name: 'Northern Cape',
    majorCities: [
      'Kimberley', 'Upington', 'Springbok', 'Kuruman', 'De Aar', 'Colesberg', 
      'Calvinia', 'Port Nolloth', 'Kakamas', 'Prieska', 'Sutherland', 'Kathu'
    ]
  }
];

export interface CategoryData {
  name: string;
  icon: string;
  subcategories: string[];
}

export const CLASSIFIED_CATEGORIES: CategoryData[] = [
  {
    name: 'Products',
    icon: 'ShoppingBag',
    subcategories: [
      'Electronics', 'Phones', 'Computers', 'Furniture', 'Appliances', 'Clothing', 
      'Tools', 'Machinery', 'Garden equipment', 'Farm equipment', 'Livestock', 
      'Food products', 'Building materials'
    ]
  },
  {
    name: 'Vehicles',
    icon: 'Car',
    subcategories: [
      'Cars', 'Motorcycles', 'Trucks', 'Bakkies', 'Farming vehicles', 'Trailers'
    ]
  },
  {
    name: 'Property',
    icon: 'Home',
    subcategories: [
      'Houses', 'Flats', 'Farms', 'Rentals', 'Commercial property'
    ]
  },
  {
    name: 'Services',
    icon: 'Wrench',
    subcategories: [
      'Plumbers', 'Electricians', 'Builders', 'Lawyers', 'Accountants', 'Mechanics', 
      'Garden services', 'Cleaning services', 'Security companies', 'IT services', 
      'Marketing companies', 'Construction companies'
    ]
  },
  {
    name: 'Business Directory',
    icon: 'Briefcase',
    subcategories: [
      'Restaurants', 'Shops', 'Accommodation', 'Tourism businesses'
    ]
  },
  {
    name: 'Tourism & Leisure',
    icon: 'Compass',
    subcategories: [
      'Holiday resorts', 'Guest houses', 'Hotels', 'Caravan parks', 'Camping sites', 
      'Game reserves', 'Parks', 'Hiking trails', 'Rest stops', 'Road trip locations'
    ]
  }
];

export const PRICING_PACKAGES = [
  {
    id: 'free',
    name: 'Free Listing',
    price: 0,
    priceLabel: 'R0',
    description: 'Perfect for quick peer-to-peer sales.',
    features: [
      'Active for 30 days',
      'Up to 5 images',
      'Standard search placement',
      'Normal search ranking'
    ],
    buttonText: 'Get Started'
  },
  {
    id: 'starter',
    name: 'Starter Boost',
    price: 29,
    priceLabel: 'R29 / month',
    description: 'Ideal to sell items fast.',
    features: [
      'Active for 45 days',
      'Up to 10 images',
      'Featured placement badge',
      'Higher search ranking',
      'Ad renewed automatically once'
    ],
    buttonText: 'Boost Now'
  },
  {
    id: 'business',
    name: 'Business Pro',
    price: 99,
    priceLabel: 'R99 / month',
    description: 'Great for local businesses & power sellers.',
    features: [
      'Active for 60 days',
      'Up to 15 images & 1 Video',
      'Priority search ranking',
      'Custom business profile link',
      'Priority support chat',
      'Include business logo on ad'
    ],
    buttonText: 'Go Business'
  },
  {
    id: 'premium',
    name: 'Premium Elite',
    price: 299,
    priceLabel: 'R299 / month',
    description: 'Maximum exposure for high-value properties, cars, or services.',
    features: [
      'Active for 90 days',
      'Unlimited images & 2 Videos',
      'Top search banner options',
      'Highest search priority',
      'Premium elite badge',
      'Included in newsletters',
      'Featured on homepage top slides'
    ],
    buttonText: 'Go Elite'
  }
];
