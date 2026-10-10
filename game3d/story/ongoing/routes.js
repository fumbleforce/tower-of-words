// Physical entrances and paths remain open after the introductory week.
export const ROUTES = {
  "train": {
    "gate": [
      "talk:station_exit",
      "zone:platform_exit"
    ]
  },
  "gate": {
    "train": [
      "talk:platform_way",
      "zone:platform_way"
    ],
    "forecourt": [
      "talk:forecourt_way",
      "zone:forecourt_way"
    ]
  },
  "forecourt": {
    "campus": ["talk:campus", "zone:campus_exit"],
    "shotengai": [
      "talk:shop_lane",
      "zone:shop_exit"
    ],
    "gate": [
      "talk:station_exit",
      "zone:station_exit"
    ],
    "office": [
      "talk:office_entrance",
      "zone:lift_front"
    ],
    "plaza": [
      "talk:plaza_lane",
      "zone:plaza_lane"
    ]
  },
  "office": {
    "forecourt": [
      "talk:lift"
    ]
  },
  "plaza": {
    "canteen": [
      "talk:canteen_door"
    ],
    "east_lane": [
      "talk:dorm_lane",
      "zone:dorm_exit"
    ],
    "shotengai": [
      "talk:shop_walk",
      "zone:shop_walk"
    ],
    "forecourt": [
      "talk:office_lane",
      "zone:office_lane"
    ]
  },
  "canteen": {
    "plaza": [
      "talk:canteen_exit"
    ]
  },
  "dorm_court": {
    "dorms": [
      "talk:stairs",
      "zone:passage"
    ],
    "east_lane": [
      "talk:street_gate",
      "zone:street_exit"
    ]
  },
  "dorms": {
    "dorm_court": [
      "talk:door_out",
      "zone:room_exit"
    ]
  },
  "east_lane": {
    "plaza": [
      "talk:plaza_lane",
      "zone:plaza_exit"
    ],
    "shotengai": [
      "talk:shop_street",
      "zone:shop_exit"
    ],
    "east_coast": [
      "talk:dorm_row",
      "zone:row_exit"
    ],
    "sports": [
      "talk:north_street",
      "zone:north_exit"
    ],
    "dorm_court": [
      "talk:dorm_gate",
      "zone:dorm_exit"
    ]
  },
  "east_coast": {
    "east_lane": [
      "talk:dorm_street",
      "zone:row_exit"
    ],
    "sports": [
      "talk:courts_walk",
      "zone:courts_exit"
    ],
    "dorm_commons": [
      "talk:commons"
    ]
  },
  "sports": {
    "east_lane": [
      "talk:north_street",
      "zone:north_exit"
    ],
    "east_coast": [
      "talk:onsen_path",
      "zone:east_exit"
    ],
    "gym": [
      "talk:gym"
    ],
    "pool": [
      "talk:pool"
    ],
    "office_quarter": [
      "talk:office_street",
      "zone:west_exit"
    ]
  },
  "pool": {
    "sports": [
      "talk:changing_room"
    ]
  },
  "gym": {
    "sports": [
      "talk:gym_door"
    ]
  },
  "bakery": { "shotengai": ["talk:bakery_exit"] },
  "konbini": { "shotengai": ["talk:konbini_exit"] },
  "shotengai": {
    "konbini": ["talk:store_door"],
    "bakery": ["talk:bakery_door"],
    "forecourt": [
      "talk:office_lane",
      "zone:office_exit"
    ],
    "plaza": [
      "talk:plaza_lane",
      "zone:plaza_exit"
    ],
    "karaoke": [
      "talk:karaoke"
    ],
    "izakaya": [
      "talk:izakaya"
    ]
  },
  "izakaya": {
    "shotengai": [
      "talk:izakaya_exit",
      "zone:izakaya_exit"
    ]
  },
  "karaoke": {
    "shotengai": [
      "talk:karaoke_door"
    ],
    "karaoke_booth": [
      "talk:karaoke_stairs"
    ]
  },
  "karaoke_booth": {
    "karaoke": [
      "talk:booth_door"
    ]
  },
  "dorm_commons": {
    "east_coast": [
      "talk:commons_door"
    ]
  },
  "office_quarter": {
    "campus": ["talk:campus_shed", "zone:campus_shed_exit", "talk:campus_quarter", "zone:campus_quarter_exit"],
    "sports": [
      "talk:sports_lane",
      "zone:east_exit"
    ],
    "harbour": [
      "talk:harbour",
      "zone:west_exit"
    ]
  },
  "ferry_terminal": {"harbour":["talk:ferry_exit"]},
  "harbour": {
    "ferry_terminal":["talk:ferry_terminal"],
    "campus": ["talk:campus", "zone:campus_exit"],
    "office_quarter": [
      "talk:office_street",
      "zone:east_exit"
    ],
    "works": [
      "talk:works_lane",
      "zone:lane_exit",
      "talk:works_street",
      "zone:street_exit"
    ]
  },
  "campus": {
    "forecourt": ["talk:forecourt", "zone:forecourt_exit"],
    "office_quarter": ["talk:office_quarter", "zone:office_quarter_exit", "talk:office_shed", "zone:office_shed_exit"],
    "harbour": ["talk:harbour", "zone:harbour_exit"],
    "print_shop": ["talk:print_shop"]
  },
  "print_shop": {
    "campus": ["talk:print_exit"]
  },
  "works": {
    "harbour": [
      "talk:harbour_lane",
      "zone:lane_exit",
      "talk:office_street",
      "zone:street_exit"
    ]
  }
};
export const TRIPS = Object.fromEntries(Object.entries(ROUTES).map(([place, ways]) => [place, Object.keys(ways)]));
