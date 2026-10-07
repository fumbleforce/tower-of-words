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
  "shotengai": {
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
    "sports": [
      "talk:sports_lane",
      "zone:east_exit"
    ],
    "harbour": [
      "talk:harbour",
      "zone:west_exit"
    ]
  },
  "harbour": {
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
