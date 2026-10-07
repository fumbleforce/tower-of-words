export default {
  "speakers": {
    "konbini_clerk": {
      "name": "Shop clerk"
    }
  },
  "start": "arrive",
  "on": {
    "talk:konbini_exit": "leave",
    "talk:fridge": "browse",
    "talk:konbini_clerk": [
      {
        "if": "konbini_phase == 'paid'",
        "node": "paid"
      },
      {
        "if": "konbini_phase == 'selected'",
        "node": "checkout"
      },
      {
        "node": "clerk"
      }
    ],
    "talk:konbini_seat": "window"
  },
  "nodes": {
    "arrive": [
      {
        "set": "konbini_visited"
      }
    ],
    "leave": [
      {
        "do": "trip",
        "to": "shotengai"
      }
    ],
    "clerk": [
      {
        "do": "konbiniShop",
        "state": "frame"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "konbini_clerk",
        "overheard": true,
        "emo": "polite",
        "voice": "konbini-welcome",
        "text": "いらっしゃいませ。かごはこちらです。"
      },
      {
        "choice": [
          {
            "text": "Choose groceries.",
            "go": "browse"
          },
          {
            "text": "Point to the window seat.",
            "go": "seat_ask"
          },
          {
            "text": "Keep looking.",
            "go": "end"
          }
        ]
      }
    ],
    "browse": [
      {
        "do": "konbiniShop",
        "state": "frame"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "konbini_phase == 'paid'",
        "then": [
          {
            "go": "paid"
          }
        ]
      },
      {
        "choice": [
          {
            "text": "Milk carton.",
            "go": "milk_menu"
          },
          {
            "text": "Salted rice ball.",
            "go": "riceball_menu"
          },
          {
            "text": "Milk tea.",
            "go": "tea_menu"
          },
          {
            "text": "Coffee.",
            "go": "coffee_menu"
          },
          {
            "if": "konbini_count > 0",
            "text": "Check out.",
            "go": "checkout"
          },
          {
            "if": "konbini_count > 0",
            "text": "Return the basket.",
            "go": "cancel"
          },
          {
            "text": "Keep looking.",
            "go": "end"
          }
        ]
      }
    ],
    "checkout": [
      {
        "do": "konbiniShop",
        "state": "frame"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "konbini_count == 0",
        "then": [
          {
            "go": "browse"
          }
        ]
      },
      {
        "say": "konbini_clerk",
        "overheard": true,
        "emo": "polite",
        "voice": "konbini-total",
        "text": "以上でよろしいですか。"
      },
      {
        "choice": [
          {
            "text": "Pay the total on the till.",
            "go": "pay"
          },
          {
            "text": "Keep browsing.",
            "go": "browse"
          },
          {
            "text": "Put everything back.",
            "go": "cancel"
          }
        ]
      }
    ],
    "pay": [
      {
        "do": "konbiniShop",
        "state": "pay"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "konbini_cant_pay",
        "then": [
          "> You don’t have enough yen.",
          {
            "go": "checkout"
          }
        ]
      },
      {
        "say": "konbini_clerk",
        "overheard": true,
        "emo": "polite",
        "voice": "konbini-bag",
        "text": "袋にお入れしますね。"
      },
      {
        "do": "konbiniShop",
        "state": "bag"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "konbini_clerk",
        "overheard": true,
        "emo": "warm",
        "voice": "konbini-thanks",
        "text": "ありがとうございます。"
      },
      {
        "go": "paid"
      }
    ],
    "paid": [
      {
        "choice": [
          {
            "text": "Take the bag.",
            "go": "take"
          },
          {
            "text": "Take the bag to the window seat.",
            "go": "take_seat"
          }
        ]
      }
    ],
    "take": [
      {
        "do": "konbiniShop",
        "state": "take"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "end"
      }
    ],
    "take_seat": [
      {
        "do": "konbiniShop",
        "state": "take"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "window"
      }
    ],
    "cancel": [
      {
        "do": "konbiniShop",
        "state": "cancel"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "end"
      }
    ],
    "seat_ask": [
      {
        "do": "gesture",
        "who": "eric",
        "kind": "point",
        "to": "window"
      },
      {
        "do": "gesture",
        "who": "konbini_clerk",
        "kind": "point",
        "to": "window"
      },
      {
        "say": "konbini_clerk",
        "overheard": true,
        "emo": "polite",
        "voice": "konbini-seat",
        "text": "はい、そちらでどうぞ。"
      },
      {
        "go": "window"
      }
    ],
    "window": [
      {
        "do": "konbiniShop",
        "state": "sit"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "choice": [
          {
            "if": "konbini_has_milk",
            "text": "Drink a milk carton.",
            "go": "consume_milk"
          },
          {
            "if": "konbini_has_riceball",
            "text": "Eat a rice ball.",
            "go": "consume_riceball"
          },
          {
            "text": "Sit for a while.",
            "go": "end"
          },
          {
            "text": "Get up.",
            "go": "stand"
          }
        ]
      }
    ],
    "stand": [
      {
        "do": "stand",
        "who": "eric"
      },
      {
        "go": "end"
      }
    ],
    "end": [
      {
        "do": "konbiniShop",
        "state": "end"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      }
    ],
    "milk_menu": [
      {
        "choice": [
          {
            "if": "!konbini_selected_milk && konbini_count < 3",
            "text": "Put it in the basket.",
            "go": "milk_add"
          },
          {
            "if": "konbini_selected_milk",
            "text": "Put it back.",
            "go": "milk_remove"
          },
          {
            "text": "Read the package.",
            "go": "milk_label"
          },
          {
            "text": "Back to the fridge.",
            "go": "browse"
          }
        ]
      }
    ],
    "milk_add": [
      {
        "do": "konbiniShop",
        "state": "add",
        "item": "milk"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ],
    "milk_remove": [
      {
        "do": "konbiniShop",
        "state": "remove",
        "item": "milk"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ],
    "milk_label": [
      {
        "do": "konbiniShop",
        "state": "inspect",
        "item": "milk"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "milk_menu"
      }
    ],
    "consume_milk": [
      {
        "do": "konbiniShop",
        "state": "prepareConsume",
        "item": "milk"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "do": "konbiniShop",
        "state": "consume"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "end"
      }
    ],
    "riceball_menu": [
      {
        "choice": [
          {
            "if": "!konbini_selected_riceball && konbini_count < 3",
            "text": "Put it in the basket.",
            "go": "riceball_add"
          },
          {
            "if": "konbini_selected_riceball",
            "text": "Put it back.",
            "go": "riceball_remove"
          },
          {
            "text": "Read the package.",
            "go": "riceball_label"
          },
          {
            "text": "Back to the fridge.",
            "go": "browse"
          }
        ]
      }
    ],
    "riceball_add": [
      {
        "do": "konbiniShop",
        "state": "add",
        "item": "riceball"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ],
    "riceball_remove": [
      {
        "do": "konbiniShop",
        "state": "remove",
        "item": "riceball"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ],
    "riceball_label": [
      {
        "do": "konbiniShop",
        "state": "inspect",
        "item": "riceball"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "riceball_menu"
      }
    ],
    "consume_riceball": [
      {
        "do": "konbiniShop",
        "state": "prepareConsume",
        "item": "riceball"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "do": "konbiniShop",
        "state": "consume"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "end"
      }
    ],
    "tea_menu": [
      {
        "choice": [
          {
            "if": "!konbini_selected_tea && konbini_count < 3",
            "text": "Put it in the basket.",
            "go": "tea_add"
          },
          {
            "if": "konbini_selected_tea",
            "text": "Put it back.",
            "go": "tea_remove"
          },
          {
            "text": "Back to the fridge.",
            "go": "browse"
          }
        ]
      }
    ],
    "tea_add": [
      {
        "do": "konbiniShop",
        "state": "add",
        "item": "tea"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ],
    "tea_remove": [
      {
        "do": "konbiniShop",
        "state": "remove",
        "item": "tea"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ],
    "coffee_menu": [
      {
        "choice": [
          {
            "if": "!konbini_selected_coffee && konbini_count < 3",
            "text": "Put it in the basket.",
            "go": "coffee_add"
          },
          {
            "if": "konbini_selected_coffee",
            "text": "Put it back.",
            "go": "coffee_remove"
          },
          {
            "text": "Back to the fridge.",
            "go": "browse"
          }
        ]
      }
    ],
    "coffee_add": [
      {
        "do": "konbiniShop",
        "state": "add",
        "item": "coffee"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ],
    "coffee_remove": [
      {
        "do": "konbiniShop",
        "state": "remove",
        "item": "coffee"
      },
      {
        "if": "!konbini_action_complete || place != 'konbini'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "browse"
      }
    ]
  }
};
