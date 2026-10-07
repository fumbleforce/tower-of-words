export default {
  "speakers": {
    "canteen_worker": {
      "name": "Canteen worker"
    },
    "canteen_shirt": {
      "name": "Diner in a shirt"
    },
    "canteen_cardigan": {
      "name": "Diner in a cardigan"
    },
    "canteen_polo": {
      "name": "Diner with a water cup"
    }
  },
  "start": "arrive",
  "on": {
    "talk:canteen_worker": "room_worker",
    "talk:canteen_exit": "to_plaza",
    "talk:canteen_seat_w": "sit_w",
    "talk:canteen_seat_e": "sit_e",
    "talk:canteen_shirt": "shirt_hello",
    "talk:canteen_cardigan": "cardigan_hello",
    "talk:canteen_polo": "polo_hello",
    "talk:canteen_water": "get_water",
    "talk:canteen_return": "return_tray",
    "talk:canteen_seat_shared": "sit_shared",
    "talk:canteen_collection": "collect_meal"
  },
  "nodes": {
    "room_worker": [
      {
        "do": "canteenDining",
        "state": "sync"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "do": "roomWorker",
        "state": "frame"
      },
      {
        "if": "evening_canteen_helped && !room_worker_thanked",
        "then": [
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "warm",
            "text": "あ、椅子を運んでくれた方ですね。ありがとうございました。"
          },
          {
            "do": "bow",
            "who": "canteen_worker",
            "depth": "small"
          },
          {
            "set": "room_worker_thanked"
          }
        ],
        "else": [
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "polite",
            "text": "はい、どうぞ。"
          }
        ]
      },
      {
        "choice": [
          {
            "text": "Collect my paid tray.",
            "go": "collect_meal",
            "if": "canteen_meal_phase == 'paid' || canteen_meal_phase == 'parked'"
          },
          {
            "text": "Order lunch.",
            "go": "meal_menu",
            "if": "canteen_service_open && !canteen_outstanding"
          },
          {
            "text": "Ask about meals.",
            "go": "meal_closed",
            "if": "!canteen_service_open"
          },
          {
            "text": "Get some water.",
            "go": "get_water"
          },
          {
            "text": "Point to the tray-return trolley.",
            "go": "room_trays"
          },
          {
            "text": "Ask about closing up.",
            "go": "room_closing"
          },
          {
            "text": "Leave her to it.",
            "go": "room_worker_end"
          }
        ]
      }
    ],
    "room_water": [
      {
        "do": "gesture",
        "who": "eric",
        "kind": "point",
        "to": "water"
      },
      {
        "do": "gesture",
        "who": "canteen_worker",
        "kind": "point",
        "to": "water"
      },
      {
        "do": "roomWorker",
        "state": "water"
      },
      {
        "say": "canteen_worker",
        "overheard": true,
        "emo": "polite",
        "text": "お水は、あちらです。コップは横にあります。"
      },
      {
        "say": "eric",
        "emo": "warm",
        "text": "Thank you."
      },
      {
        "go": "room_worker_end"
      }
    ],
    "room_trays": [
      {
        "do": "gesture",
        "who": "eric",
        "kind": "point",
        "to": "tray_return"
      },
      {
        "do": "gesture",
        "who": "canteen_worker",
        "kind": "point",
        "to": "tray_return"
      },
      {
        "if": "room_trays_seen",
        "then": [
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "warm",
            "text": "はい、そこです。ありがとうございます。"
          }
        ],
        "else": [
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "polite",
            "text": "はい、返却はこちらです。お箸は別にお願いします。"
          },
          {
            "do": "roomWorker",
            "state": "utensils"
          },
          {
            "set": "room_trays_seen"
          }
        ]
      },
      {
        "go": "room_worker_end"
      }
    ],
    "room_closing": [
      {
        "if": "period == 'lunch'",
        "then": [
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "apologetic",
            "text": "{sumimasen}、今ちょっと……。"
          },
          {
            "do": "roomWorker",
            "state": "wipe"
          },
          {
            "say": "eric",
            "emo": "warm",
            "text": "I’ll come back when it’s quieter."
          },
          {
            "go": "room_worker_end"
          }
        ]
      },
      {
        "if": "room_closing_seen",
        "then": [
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "warm",
            "text": "今日も、外の椅子が待ってます。"
          },
          {
            "do": "gesture",
            "who": "canteen_worker",
            "kind": "point",
            "to": "canteen_exit"
          }
        ],
        "else": [
          {
            "say": "eric",
            "emo": "curious",
            "text": "The chairs outside? You put them all away?"
          },
          {
            "do": "gesture",
            "who": "eric",
            "kind": "point",
            "to": "canteen_exit"
          },
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "tired",
            "text": "外の椅子？ ああ、毎日です。雨の日は、中も片付けないと。"
          },
          {
            "do": "gesture",
            "who": "canteen_worker",
            "kind": "nod"
          },
          {
            "set": "room_closing_seen"
          }
        ]
      },
      {
        "go": "room_worker_end"
      }
    ],
    "room_worker_end": [
      {
        "do": "cam",
        "back": true
      },
      {
        "do": "save"
      }
    ],
    "arrive": [
      {
        "do": "goal",
        "text": "Return to the fountain plaza."
      }
    ],
    "to_plaza": [
      {
        "do": "trip",
        "to": "plaza"
      }
    ],
    "sit_w": [
      {
        "do": "canteenDining",
        "state": "sit",
        "seat": "canteen_seat_w"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "meal_table"
      }
    ],
    "sit_e": [
      {
        "do": "canteenDining",
        "state": "sit",
        "seat": "canteen_seat_e"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "meal_table"
      }
    ],
    "meal_closed": [
      {
        "say": "canteen_worker",
        "overheard": true,
        "emo": "apologetic",
        "text": "お食事は、お昼だけなんです。お水はどうぞ。"
      },
      {
        "go": "dining_end"
      }
    ],
    "meal_menu": [
      {
        "do": "canteenDining",
        "state": "menu"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "know_sumimasen",
        "then": [
          {
            "say": "eric",
            "emo": "polite",
            "text": "{sumimasen}。"
          }
        ],
        "else": [
          {
            "say": "eric",
            "emo": "polite",
            "text": "Excuse me."
          }
        ]
      },
      {
        "say": "canteen_worker",
        "overheard": true,
        "emo": "polite",
        "text": "カレーと、野菜の定食です。"
      },
      {
        "choice": [
          {
            "text": "Curry rice.",
            "go": "choose_curry"
          },
          {
            "text": "Rice and vegetables.",
            "go": "choose_vegetables"
          },
          {
            "text": "Not now.",
            "go": "dining_end"
          }
        ]
      }
    ],
    "meal_confirm": [
      {
        "do": "canteenDining",
        "state": "price"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "know_tabetai",
        "then": [
          {
            "say": "eric",
            "emo": "warm",
            "text": "これ、{tabetai}です。"
          }
        ],
        "else": [
          {
            "say": "eric",
            "emo": "polite",
            "text": "This one, please."
          }
        ]
      },
      {
        "say": "canteen_worker",
        "overheard": true,
        "emo": "polite",
        "text": "はい。こちらでお願いします。"
      },
      {
        "choice": [
          {
            "text": "Pay the price on the till.",
            "go": "pay_meal"
          },
          {
            "text": "Not now.",
            "go": "cancel_order"
          }
        ]
      }
    ],
    "pay_meal": [
      {
        "do": "canteenDining",
        "state": "pay"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "!canteen_paid",
        "then": [
          {
            "say": "eric",
            "emo": "apologetic",
            "text": "Sorry, I haven’t got enough."
          },
          {
            "go": "cancel_order"
          }
        ]
      },
      {
        "go": "collect_meal"
      }
    ],
    "collect_meal": [
      {
        "do": "canteenDining",
        "state": "sync"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "canteen_meal_phase == 'paid' && canteen_delivered_id != canteen_order_id && (!canteen_service_open || !canteen_staff_present)",
        "then": [
          {
            "do": "canteenDining",
            "state": "pending"
          },
          {
            "if": "!canteen_dining_complete || place != 'canteen'",
            "then": [
              {
                "end": true
              }
            ]
          },
          {
            "say": "eric",
            "emo": "neutral",
            "text": "I’ve already paid. I’ll collect it at lunch."
          },
          {
            "go": "dining_end"
          }
        ]
      },
      {
        "do": "canteenDining",
        "state": "collect"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "canteen_staff_present",
        "then": [
          {
            "say": "canteen_worker",
            "overheard": true,
            "emo": "polite",
            "text": "お好きな席へどうぞ。"
          }
        ]
      },
      {
        "go": "choose_table"
      }
    ],
    "choose_table": [
      {
        "choice": [
          {
            "text": "Sit at the west end chair.",
            "go": "sit_w"
          },
          {
            "text": "Sit at the east end chair.",
            "go": "sit_e"
          },
          {
            "text": "Sit beside the diner.",
            "go": "sit_shared"
          },
          {
            "text": "Keep carrying the tray.",
            "go": "dining_end"
          }
        ]
      }
    ],
    "cancel_order": [
      {
        "do": "canteenDining",
        "state": "cancelOrder"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "dining_end"
      }
    ],
    "meal_table": [
      {
        "do": "canteenDining",
        "state": "sync"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "choice": [
          {
            "text": "Eat my meal.",
            "go": "eat_meal",
            "if": "canteen_meal_phase == 'table'"
          },
          {
            "text": "Talk with the diner.",
            "go": "shirt_hello",
            "if": "canteen_player_at_shared"
          },
          {
            "text": "Return my tray.",
            "go": "return_tray",
            "if": "canteen_meal_phase == 'table' || canteen_meal_phase == 'eaten'"
          },
          {
            "text": "Stay here.",
            "go": "dining_end"
          }
        ]
      }
    ],
    "eat_meal": [
      {
        "do": "canteenDining",
        "state": "eat"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "choice": [
          {
            "text": "{oishii}。",
            "go": "meal_good",
            "if": "know_oishii"
          },
          {
            "text": "Finish eating.",
            "go": "meal_table"
          }
        ]
      }
    ],
    "meal_good": [
      {
        "say": "eric",
        "emo": "warm",
        "text": "{oishii}。"
      },
      {
        "go": "meal_table"
      }
    ],
    "return_tray": [
      {
        "do": "canteenDining",
        "state": "returnTray"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "dining_end"
      }
    ],
    "get_water": [
      {
        "do": "canteenDining",
        "state": "water"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "dining_end"
      }
    ],
    "dining_end": [
      {
        "do": "canteenDining",
        "state": "release"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "do": "save"
      }
    ],
    "shirt_hello": [
      {
        "do": "canteenDining",
        "state": "frame",
        "who": "canteen_shirt"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "canteen_diner_busy",
        "then": [
          {
            "say": "canteen_shirt",
            "overheard": true,
            "emo": "apologetic",
            "text": "すみません、ちょっと。",
            "voice": "oh-pmcckb-canteen_shirt"
          },
          {
            "go": "dining_end"
          }
        ]
      },
      {
        "if": "!canteen_shirt_met",
        "then": [
          {
            "if": "!canteen_player_at_shared",
            "then": [
              {
                "do": "canteenDining",
                "state": "seatPoint"
              },
              {
                "if": "!canteen_dining_complete || place != 'canteen'",
                "then": [
                  {
                    "end": true
                  }
                ]
              },
              {
                "say": "eric",
                "emo": "curious",
                "text": "Is this seat free?"
              },
              {
                "do": "canteenDining",
                "state": "makeRoom",
                "who": "canteen_shirt"
              },
              {
                "if": "!canteen_dining_complete || place != 'canteen'",
                "then": [
                  {
                    "end": true
                  }
                ]
              },
              {
                "say": "canteen_shirt",
                "overheard": true,
                "emo": "warm",
                "text": "はい、どうぞ。",
                "voice": "oh-vjt3q4-canteen_shirt"
              }
            ],
            "else": [
              {
                "do": "gesture",
                "who": "canteen_shirt",
                "kind": "nod",
                "to": "eric"
              }
            ]
          },
          {
            "set": "canteen_shirt_met"
          }
        ],
        "else": [
          {
            "say": "canteen_shirt",
            "overheard": true,
            "emo": "warm",
            "text": "どうぞ。",
            "voice": "oh-qzwp7a-canteen_shirt"
          }
        ]
      },
      {
        "choice": [
          {
            "text": "Sit at the free chair.",
            "go": "sit_shared",
            "if": "!canteen_player_at_shared"
          },
          {
            "text": "Talk about the food.",
            "go": "shirt_food",
            "if": "canteen_curry_present"
          },
          {
            "text": "Ask about his break.",
            "go": "shirt_break"
          },
          {
            "text": "Leave him to his meal.",
            "go": "dining_end"
          }
        ]
      }
    ],
    "shirt_food": [
      {
        "do": "canteenDining",
        "state": "dishPoint",
        "who": "canteen_shirt"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "canteen_shirt",
        "overheard": true,
        "emo": "warm",
        "text": "あ、カレーにしたんですね。",
        "voice": "oh-53g34s-canteen_shirt"
      },
      {
        "say": "eric",
        "emo": "warm",
        "text": "Yes. Yours looks good too."
      },
      {
        "do": "canteenDining",
        "state": "ownDish",
        "who": "canteen_shirt"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "canteen_shirt",
        "overheard": true,
        "emo": "warm",
        "text": "こっちも、なかなかいいですよ。",
        "voice": "oh-5f83r7-canteen_shirt"
      },
      {
        "go": "dining_end"
      }
    ],
    "shirt_break": [
      {
        "do": "canteenDining",
        "state": "badgePoint"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "eric",
        "emo": "curious",
        "text": "On your break?"
      },
      {
        "say": "canteen_shirt",
        "overheard": true,
        "emo": "warm",
        "text": "ええ。午後は、機械の音がすごくて。",
        "voice": "oh-1bx2rf9-canteen_shirt"
      },
      {
        "do": "canteenDining",
        "state": "ownDish",
        "who": "canteen_shirt"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "canteen_shirt",
        "overheard": true,
        "emo": "warm",
        "text": "ここでは、ゆっくり食べたいんです。",
        "voice": "oh-9n7nsu-canteen_shirt"
      },
      {
        "say": "eric",
        "emo": "warm",
        "text": "I’ll let you eat."
      },
      {
        "go": "dining_end"
      }
    ],
    "cardigan_hello": [
      {
        "do": "canteenDining",
        "state": "frame",
        "who": "canteen_cardigan"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "canteen_diner_busy",
        "then": [
          {
            "say": "canteen_cardigan",
            "overheard": true,
            "emo": "apologetic",
            "text": "あ、少し待ってください。",
            "voice": "oh-1h5uekc-canteen_cardigan"
          },
          {
            "go": "dining_end"
          }
        ]
      },
      {
        "if": "!canteen_cardigan_met",
        "then": [
          {
            "do": "canteenDining",
            "state": "containerOpen"
          },
          {
            "if": "!canteen_dining_complete || place != 'canteen'",
            "then": [
              {
                "end": true
              }
            ]
          },
          {
            "say": "eric",
            "emo": "curious",
            "text": "You brought your own?"
          },
          {
            "say": "canteen_cardigan",
            "overheard": true,
            "emo": "warm",
            "text": "ご飯だけ、家から持ってきたんです。",
            "voice": "oh-1gh6mrn-canteen_cardigan"
          },
          {
            "do": "canteenDining",
            "state": "ownDish",
            "who": "canteen_cardigan"
          },
          {
            "if": "!canteen_dining_complete || place != 'canteen'",
            "then": [
              {
                "end": true
              }
            ]
          },
          {
            "say": "canteen_cardigan",
            "overheard": true,
            "emo": "warm",
            "text": "これ、{oishii}ですよ。",
            "voice": "oh-1gb104-canteen_cardigan"
          },
          {
            "say": "eric",
            "emo": "warm",
            "text": "Thanks."
          },
          {
            "set": "canteen_cardigan_met"
          }
        ],
        "else": [
          {
            "say": "canteen_cardigan",
            "overheard": true,
            "emo": "warm",
            "text": "こんにちは。",
            "voice": "oh-3q3h4y-canteen_cardigan"
          }
        ]
      },
      {
        "do": "canteenDining",
        "state": "sync"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "choice": [
          {
            "text": "Ask about the vegetables she recommended.",
            "go": "cardigan_recommendation",
            "if": "canteen_recommendation_ready"
          },
          {
            "text": "Ask about her lunch container.",
            "go": "cardigan_container"
          },
          {
            "text": "Let her eat.",
            "go": "dining_end"
          }
        ]
      }
    ],
    "cardigan_recommendation": [
      {
        "do": "canteenDining",
        "state": "recommendationPoint",
        "who": "canteen_cardigan"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "eric",
        "emo": "curious",
        "text": "{oishii}……this one?"
      },
      {
        "do": "canteenDining",
        "state": "displayPoint",
        "who": "canteen_cardigan"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "canteen_cardigan",
        "overheard": true,
        "emo": "warm",
        "text": "はい、これです。お昼に、カウンターで買えるんです。",
        "voice": "oh-c52c29-canteen_cardigan"
      },
      {
        "if": "canteen_service_open",
        "then": [
          {
            "say": "eric",
            "emo": "warm",
            "text": "I’ll try it."
          },
          {
            "choice": [
              {
                "text": "Order the vegetable set.",
                "go": "choose_vegetables",
                "if": "!canteen_outstanding"
              },
              {
                "text": "Leave her to her meal.",
                "go": "dining_end"
              }
            ]
          }
        ],
        "else": [
          {
            "say": "eric",
            "emo": "warm",
            "text": "I’ll try it at lunch."
          },
          {
            "go": "dining_end"
          }
        ]
      }
    ],
    "cardigan_container": [
      {
        "do": "canteenDining",
        "state": "containerPoint"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "eric",
        "emo": "curious",
        "text": "You do this every day?"
      },
      {
        "say": "canteen_cardigan",
        "overheard": true,
        "emo": "warm",
        "text": "家で炊いたご飯が好きなんです。おかずは、ここのほうが楽ですけど。",
        "voice": "oh-w6205w-canteen_cardigan"
      },
      {
        "do": "canteenDining",
        "state": "containerClose"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "dining_end"
      }
    ],
    "polo_hello": [
      {
        "do": "canteenDining",
        "state": "frame",
        "who": "canteen_polo"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "canteen_diner_busy",
        "then": [
          {
            "say": "canteen_polo",
            "overheard": true,
            "emo": "warm",
            "text": "どうも。",
            "voice": "oh-qzwngq-canteen_polo"
          },
          {
            "go": "dining_end"
          }
        ]
      },
      {
        "if": "!canteen_polo_met",
        "then": [
          {
            "do": "canteenDining",
            "state": "exitPoint"
          },
          {
            "if": "!canteen_dining_complete || place != 'canteen'",
            "then": [
              {
                "end": true
              }
            ]
          },
          {
            "say": "eric",
            "emo": "curious",
            "text": "You don’t sit outside?"
          },
          {
            "do": "canteenDining",
            "state": "exitPoint",
            "who": "canteen_polo"
          },
          {
            "if": "!canteen_dining_complete || place != 'canteen'",
            "then": [
              {
                "end": true
              }
            ]
          },
          {
            "say": "canteen_polo",
            "overheard": true,
            "emo": "warm",
            "text": "外は、風が強いので。",
            "voice": "oh-cy2v4x-canteen_polo"
          },
          {
            "do": "canteenDining",
            "state": "wrapper"
          },
          {
            "if": "!canteen_dining_complete || place != 'canteen'",
            "then": [
              {
                "end": true
              }
            ]
          },
          {
            "say": "canteen_polo",
            "overheard": true,
            "emo": "warm",
            "text": "ここは落ち着きます。",
            "voice": "oh-14y84xq-canteen_polo"
          },
          {
            "say": "eric",
            "emo": "warm",
            "text": "Fair enough."
          },
          {
            "set": "canteen_polo_met"
          }
        ],
        "else": [
          {
            "say": "canteen_polo",
            "overheard": true,
            "emo": "warm",
            "text": "どうも。",
            "voice": "oh-qzwngq-canteen_polo"
          }
        ]
      },
      {
        "choice": [
          {
            "text": "Mention helping with the terrace chairs.",
            "go": "polo_chairs",
            "if": "evening_canteen_helped"
          },
          {
            "text": "Leave him to his drink.",
            "go": "dining_end"
          }
        ]
      }
    ],
    "polo_chairs": [
      {
        "do": "canteenDining",
        "state": "exitPoint"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "eric",
        "emo": "warm",
        "text": "I helped put those chairs away."
      },
      {
        "say": "canteen_polo",
        "overheard": true,
        "emo": "warm",
        "text": "ああ、あの椅子。けっこう重いでしょう。",
        "voice": "oh-1li1h2a-canteen_polo"
      },
      {
        "go": "dining_end"
      }
    ],
    "choose_curry": [
      {
        "do": "canteenDining",
        "state": "select",
        "item": "curry"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "meal_confirm"
      }
    ],
    "choose_vegetables": [
      {
        "do": "canteenDining",
        "state": "select",
        "item": "vegetables"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "meal_confirm"
      }
    ],
    "sit_shared": [
      {
        "do": "canteenDining",
        "state": "sit",
        "seat": "canteen_seat_shared"
      },
      {
        "if": "!canteen_dining_complete || place != 'canteen'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "meal_table"
      }
    ]
  }
};
