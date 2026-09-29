// Labels and registration IDs shared by place factories and structural checks.
export const PLACE_DETAILS = {
  "train": {
    "things": {
      "aoi": {
        "label": "Aoi",
        "kind": "person"
      },
      "kuroda": {
        "label": "Sleeping man",
        "kind": "person"
      },
      "reader": {
        "label": "Man with a book",
        "kind": "person small"
      },
      "music": {
        "label": "Girl with headphones",
        "kind": "person small"
      },
      "rei": {
        "label": "Woman with a laptop",
        "kind": "person"
      },
      "cup": {
        "label": "Coffee",
        "kind": "thing small"
      },
      "bun": {
        "label": "Woman with a bun",
        "kind": "person small"
      },
      "youth": {
        "label": "Young man",
        "kind": "person small"
      },
      "tama": {
        "label": "Cat",
        "verb": "Pet",
        "kind": "person small"
      },
      "doors": {
        "label": "Doors",
        "kind": "thing"
      },
      "door_l": {
        "label": "Doors",
        "kind": "thing"
      },
      "door_r": {
        "label": "Doors",
        "kind": "thing"
      },
      "plant": {
        "label": "Plant",
        "kind": "thing small"
      },
      "bags": {
        "label": "Bags",
        "kind": "thing small"
      },
      "rack": {
        "label": "Luggage rack",
        "kind": "thing small"
      },
      "straps": {
        "label": "Straps",
        "kind": "thing small"
      },
      "window": {
        "label": "Window",
        "kind": "thing small"
      },
      "poster": {
        "label": "Poster",
        "kind": "thing small"
      },
      "sign": {
        "label": "Station sign",
        "kind": "thing small"
      },
      "foodbag": {
        "label": "Her lunch bag",
        "verb": "Catch",
        "kind": "thing small"
      },
      "stander": {
        "label": "Man with a bag",
        "kind": "person small"
      },
      "platform": {
        "label": "Platform",
        "kind": "thing small"
      }
    },
    "spots": [
      "aisle",
      "door_l",
      "door_r",
      "by_aoi",
      "by_kuroda",
      "platform",
      "walkway",
      "plat_l",
      "plat_l2",
      "plat_hamada"
    ],
    "seats": [
      "seat_aoi",
      "seat_far_r",
      "seat_near_l",
      "seat_near_r",
      "seat_mio"
    ],
    "zones": [
      "door_zone",
      "free_seat"
    ],
    "people": [
      "kuroda",
      "aoi",
      "reader",
      "rei",
      "music",
      "stander",
      "bun",
      "youth",
      "tama"
    ],
    "hooks": [
      "announce",
      "arrive",
      "doorsOpen",
      "doorsClose",
      "chime",
      "doorsHold",
      "alight",
      "depart",
      "wake",
      "bag",
      "cup",
      "catTo"
    ]
  },
  "gate": {
    "things": {
      "guard": {
        "label": "Mr. Ishibashi",
        "kind": "person"
      },
      "kuroda": {
        "label": "Mr. Hamada",
        "kind": "person"
      },
      "aoi": {
        "label": "Aoi",
        "kind": "person"
      },
      "kuro": {
        "label": "Receptionist",
        "kind": "person"
      },
      "tama": {
        "label": "Tama",
        "verb": "Pet",
        "kind": "person small"
      },
      "reader_l": {
        "label": "Card reader",
        "kind": "thing"
      },
      "reader_r": {
        "label": "Card reader",
        "kind": "thing"
      },
      "gate": {
        "label": "Gate",
        "kind": "thing"
      },
      "desk": {
        "label": "Guard desk",
        "kind": "thing small"
      },
      "counter": {
        "label": "Visitor counter",
        "kind": "thing small"
      },
      "signin": {
        "label": "Visitor book",
        "kind": "thing small"
      },
      "lostfound": {
        "label": "Lost and found",
        "kind": "thing small"
      },
      "screen": {
        "label": "Notice screen",
        "kind": "thing small"
      },
      "kiosk": {
        "label": "Coffee machine",
        "kind": "thing small"
      },
      "bench_l": {
        "label": "Bench",
        "kind": "thing small"
      },
      "bench_r": {
        "label": "Bench",
        "kind": "thing small"
      },
      "poster_l": {
        "label": "Poster",
        "kind": "thing small"
      },
      "poster_r": {
        "label": "Poster",
        "kind": "thing small"
      },
      "lift": {
        "label": "Lift",
        "kind": "thing"
      },
      "entrance": {
        "label": "Entrance",
        "kind": "thing small"
      },
      "plant": {
        "label": "Plant",
        "kind": "thing small"
      },
      "bowl": {
        "label": "Tama's bowl",
        "kind": "thing small"
      }
    },
    "spots": [
      "entrance_in",
      "bench_l",
      "bench_r",
      "before_gate",
      "after_gate",
      "lift_front",
      "counter_front",
      "desk_front",
      "outside"
    ],
    "seats": [
      "bench_r",
      "bench_l"
    ],
    "zones": [
      "arch",
      "past_gate",
      "lift_front"
    ],
    "people": [
      "guard",
      "kuroda",
      "aoi",
      "kuro",
      "rei",
      "tama"
    ],
    "hooks": [
      "reader",
      "gate",
      "cardOk",
      "enter",
      "typing",
      "phone",
      "rush",
      "catTo",
      "newsletter",
      "liftOpen",
      "liftClose"
    ]
  },
  "office": {
    "things": {
      "emi": {
        "label": "Emi",
        "kind": "person"
      },
      "kenji": {
        "label": "Kenji",
        "kind": "person"
      },
      "rei": {
        "label": "Rei",
        "kind": "person"
      },
      "aoi": {
        "label": "Aoi",
        "kind": "person"
      },
      "mori": {
        "label": "Mr. Mori",
        "kind": "person"
      },
      "tama": {
        "label": "Cat",
        "verb": "Pet",
        "kind": "person small"
      },
      "covered": {
        "label": "Covered desk",
        "kind": "thing small"
      },
      "covered_monitor": {
        "label": "Covered monitor",
        "kind": "thing small"
      },
      "box_crowns": {
        "label": "Box",
        "kind": "thing small"
      },
      "cups": {
        "label": "Cups",
        "kind": "thing small"
      },
      "nameplate": {
        "label": "Nameplate",
        "kind": "thing small"
      },
      "my_desk": {
        "label": "Your desk",
        "kind": "thing"
      },
      "my_chair": {
        "label": "Your chair",
        "kind": "thing"
      },
      "lift": {
        "label": "Lift",
        "kind": "thing small"
      },
      "vending": {
        "label": "Vending machine",
        "kind": "thing small"
      },
      "bench": {
        "label": "Bench",
        "kind": "thing small"
      },
      "stairs": {
        "label": "Stairs",
        "kind": "thing small"
      },
      "office_door": {
        "label": "Office door",
        "kind": "thing small"
      },
      "inout_board": {
        "label": "In/out board",
        "kind": "thing small"
      },
      "clock": {
        "label": "Clock",
        "kind": "thing small"
      },
      "whiteboard": {
        "label": "Whiteboard",
        "kind": "thing small"
      },
      "calendar": {
        "label": "Calendar",
        "kind": "thing small"
      },
      "water_cooler": {
        "label": "Water cooler",
        "kind": "thing small"
      },
      "cabinets": {
        "label": "Cabinets",
        "kind": "thing small"
      },
      "fan": {
        "label": "Fan",
        "kind": "thing small"
      },
      "boxes": {
        "label": "Boxes",
        "kind": "thing small"
      },
      "chief_desk": {
        "label": "Mr. Mori's desk",
        "kind": "thing small"
      },
      "machine_door": {
        "label": "Machine room",
        "kind": "thing small"
      },
      "racks": {
        "label": "Server racks",
        "kind": "thing small"
      },
      "fire_exit": {
        "label": "Fire exit",
        "kind": "thing small"
      },
      "noticeboard": {
        "label": "Noticeboard",
        "kind": "thing small"
      },
      "extinguisher": {
        "label": "Extinguisher",
        "kind": "thing small"
      },
      "hydrant": {
        "label": "Hydrant",
        "kind": "thing small"
      },
      "copier": {
        "label": "Copier",
        "kind": "thing"
      },
      "fax": {
        "label": "Fax",
        "kind": "thing small"
      },
      "paper_shelf": {
        "label": "Paper shelf",
        "kind": "thing small"
      },
      "worktable": {
        "label": "Worktable",
        "kind": "thing small"
      },
      "coffee_machine": {
        "label": "Coffee machine",
        "kind": "thing"
      },
      "kettle": {
        "label": "Kettle",
        "kind": "thing small"
      },
      "fridge": {
        "label": "Fridge",
        "kind": "thing small"
      },
      "microwave": {
        "label": "Microwave",
        "kind": "thing small"
      },
      "kitchen_table": {
        "label": "Table",
        "kind": "thing small"
      },
      "toilet_m": {
        "label": "Men's toilet",
        "kind": "thing small"
      },
      "toilet_f": {
        "label": "Women's toilet",
        "kind": "thing small"
      },
      "plant": {
        "label": "Plant",
        "kind": "thing small"
      }
    },
    "spots": [
      "lift_out",
      "mori_greet",
      "lobby",
      "office_door",
      "my_seat",
      "emi_seat",
      "copier_front",
      "coffee_front",
      "corridor_w",
      "corridor_e",
      "machine_front",
      "kenji_desk"
    ],
    "seats": [
      "my_seat",
      "emi_seat",
      "mio_seat"
    ],
    "zones": [
      "office",
      "copy_room",
      "kitchen",
      "toilets",
      "machine_room",
      "corridor"
    ],
    "people": [
      "emi",
      "kenji",
      "mori",
      "aoi",
      "rei",
      "tama"
    ],
    "hooks": [
      "copier",
      "catTo",
      "chairRoll",
      "coffee",
      "kettle",
      "rackAlarm",
      "machineDoor",
      "vendingDrop",
      "clockStop",
      "fan",
      "liftOpen",
      "liftClose",
      "sitDown",
      "lunchSit",
      "lunchOver"
    ]
  }
};

export const SHARED_THINGS = { mio: { label: 'Mio', kind: 'person' } };
