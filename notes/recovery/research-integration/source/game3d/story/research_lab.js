// Physical completion guards keep cancellation from advancing dialogue.
export default {
  "speakers": {
    "research_reader": {
      "name": "Reader"
    }
  },
  "start": "arrive",
  "on": {
    "talk:research_exit": "leave",
    "talk:research_reader": "reader",
    "talk:research_books": "books",
    "talk:research_archive": "books",
    "talk:research_side_seat": "side_seat",
    "talk:research_end_seat": "end_seat",
    "talk:research_table_seat": "table_seat",
    "talk:research_window_seat": "window_seat"
  },
  "nodes": {
    "arrive": [],
    "leave": [{"do":"trip","to":"works"}],
    "end": [
      {
        "do": "research",
        "state": "release"
      },
      {
        "do": "save"
      }
    ],
    "books": [
      {
        "do": "research",
        "state": "available"
      },
      {
        "choice": [
          {
            "text": "Weather instruments · reading table",
            "go": "weather_table"
          },
          {
            "text": "Weather instruments · window chair",
            "go": "weather_window"
          },
          {
            "text": "Copier · reading table",
            "go": "copier_table"
          },
          {
            "text": "Copier · window chair",
            "go": "copier_window"
          },
          {
            "text": "Read the open book.",
            "go": "read",
            "if": "research_has_book"
          },
          {
            "text": "Put the book back.",
            "go": "put_back",
            "if": "research_has_book"
          },
          {
            "text": "Leave the books.",
            "go": "end"
          }
        ]
      }
    ],
    "read": [
      {
        "do": "research",
        "state": "read"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "put_back": [
      {
        "do": "research",
        "state": "putBack"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "reader": [
      {
        "do": "research",
        "state": "frameReader"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "if": "research_reader_met",
        "then": [
          {
            "go": "reader_menu"
          }
        ]
      },
      {"do":"research","state":"pointBooks"},
      {"if":"!research_action_ok || place != 'research_lab'","then":[{"end":true}]},
      {
        "say": "eric",
        "emo": "polite",
        "text": "Do you mind if I look at these?"
      },
      {"do":"research","state":"pointShelf"},
      {"if":"!research_action_ok || place != 'research_lab'","then":[{"end":true}]},
      {
        "say": "research_reader",
        "emo": "polite",
        "text": "どうぞ。読み終わったら、そこに戻してください。",
        "overheard": true
      },
      {
        "say": "eric",
        "emo": "warm",
        "text": "Thanks."
      },
      {
        "set": "research_reader_met"
      },
      {
        "go": "reader_menu"
      }
    ],
    "reader_menu": [
      {"do":"research","state":"readerRest"},
      {"if":"!research_action_ok || place != 'research_lab'","then":[{"end":true}]},
      {
        "choice": [
          {
            "text": "Point to the white box in the weather book.",
            "go": "reader_weather",
            "if": "research_weather_seen"
          },
          {
            "text": "Ask about the cover word.",
            "go": "reader_word",
            "if": "!know_shiryou"
          },
          {
            "text": "Show Mori’s copy.",
            "go": "reader_copy",
            "if": "found_research_mori_copy"
          },
          {
            "text": "Leave the reader to their notes.",
            "go": "reader_busy"
          }
        ]
      }
    ],
    "reader_busy": [
      {
        "say": "research_reader",
        "emo": "polite",
        "text": "すみません、ここだけ書いてしまいますね。",
        "overheard": true
      },
      {
        "say": "eric",
        "emo": "polite",
        "text": "Sure. Take your time."
      },
      {
        "go": "end"
      }
    ],
    "reader_weather": [
      {
        "do": "research",
        "state": "weatherPage"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "eric",
        "emo": "curious",
        "text": "Is that the rain gauge?"
      },
      {
        "do": "research",
        "state": "pointGauge"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "research_reader",
        "emo": "casual",
        "text": "雨量計は、こちらですね。",
        "overheard": true
      },
      {
        "say": "research_reader",
        "emo": "casual",
        "text": "小さく描きすぎて、見落としそうで。",
        "overheard": true
      },
      {"do":"research","state":"readerRest"},
      {"if":"!research_action_ok || place != 'research_lab'","then":[{"end":true}]},
      {
        "say": "eric",
        "emo": "curious",
        "text": "Oh, the little one."
      },
      {
        "go": "end"
      }
    ],
    "reader_word": [
      {
        "do": "research",
        "state": "cover"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "eric",
        "emo": "curious",
        "text": "What does this say?"
      },
      {
        "say": "research_reader",
        "emo": "slow",
        "text": "{shiryou}。",
        "slow": true
      },
      {
        "choice": [
          {
            "text": "Try saying it.",
            "go": "word_practice"
          },
          {
            "text": "Keep reading.",
            "go": "end"
          }
        ]
      }
    ],
    "word_practice": [
      {
        "do": "type",
        "word": "shiryou",
        "from": "research_reader",
        "prompt": "Try “reference material”."
      },
      {
        "go": "end"
      }
    ],
    "reader_copy": [
      {
        "do": "research",
        "state": "showCopy"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "say": "eric",
        "emo": "casual",
        "text": "Mori had a copy of this."
      },
      {
        "say": "research_reader",
        "emo": "casual",
        "text": "ああ、同じ図ですね。",
        "overheard": true
      },
      {
        "do": "research",
        "state": "markCopy"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "side_seat": [
      {
        "do": "research",
        "state": "sit",
        "seat": "research_side_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "end_seat": [
      {
        "do": "research",
        "state": "sit",
        "seat": "research_end_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "table_seat": [
      {
        "do": "research",
        "state": "sit",
        "seat": "research_table_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "window_seat": [
      {
        "do": "research",
        "state": "sit",
        "seat": "research_window_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "weather_table": [
      {
        "do": "research",
        "state": "select",
        "book": "weather",
        "seat": "research_table_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "weather_window": [
      {
        "do": "research",
        "state": "select",
        "book": "weather",
        "seat": "research_window_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "copier_table": [
      {
        "do": "research",
        "state": "select",
        "book": "copier",
        "seat": "research_table_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
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
    "copier_window": [
      {
        "do": "research",
        "state": "select",
        "book": "copier",
        "seat": "research_window_seat"
      },
      {
        "if": "!research_action_ok || place != 'research_lab'",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "go": "end"
      }
    ]
  }
};
