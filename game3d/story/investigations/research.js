// Mori’s offer is remembered only after its actual spoken delivery, here or during day two.
export default {
  "on": {
    "ask:mori-papers-menu": "research_mori_menu",
    "ask:mori-papers": "research_mori_offer",
    "ask:mori-reference": "research_mori_understood"
  },
  "nodes": {
    "research_mori_menu": [
      { "do": "researchOffice", "state": "available" },
      { "if": "!research_mori_available", "then": [{ "go": "conversation_mori_travel" }] },
      { "choice": [
        { "text": "Ask about the papers on his desk.", "go": "research_mori_offer", "if": "!found_research_mori_copy" },
        { "text": "Ask for the reference material he mentioned.", "go": "research_mori_understood", "if": "research_mori_understood && !found_research_mori_copy" },
        { "text": "Talk about travel.", "go": "research_mori_travel" },
        { "text": "Leave him to his work.", "go": "research_mori_end" }
      ] }
    ],
    "research_mori_travel": [
      { "if": "research_mori_return_ready", "then": [{ "go": "conversation_mori" }] },
      { "go": "conversation_mori_travel" }
    ],
    "research_mori_offer": [
      { "if": "found_research_mori_copy", "then": [{ "go": "research_mori_menu" }] },
      {
        "do": "researchOffice",
        "state": "available"
      },
      {
        "if": "!research_mori_available",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "do": "researchOffice",
        "state": "desk"
      },
      {
        "if": "!research_office_ok",
        "then": [
          {
            "go": "research_mori_end"
          }
        ]
      },
      {
        "say": "eric",
        "emo": "polite",
        "text": "May I look through these?"
      },
      {
        "say": "mori",
        "emo": "polite",
        "text": "古い資料ですが、よかったら使ってください。",
        "overheard": true
      },
      {
        "do": "researchOffice",
        "state": "show"
      },
      {
        "if": "!research_office_ok",
        "then": [
          {
            "go": "research_mori_end"
          }
        ]
      },
      {
        "do": "researchOffice",
        "state": "available"
      },
      {
        "if": "research_mori_understood && !found_research_mori_copy",
        "then": [
          {
            "choice": [
              {
                "text": "Ask for a copy of the reference material.",
                "go": "research_mori_understood"
              },
              {
                "text": "Leave the papers.",
                "go": "research_mori_end"
              }
            ]
          }
        ]
      },
      {
        "go": "research_mori_end"
      }
    ],
    "research_mori_understood": [
      {
        "do": "researchOffice",
        "state": "available"
      },
      {
        "if": "!research_mori_understood || found_research_mori_copy",
        "then": [
          {
            "end": true
          }
        ]
      },
      {
        "do": "researchOffice",
        "state": "desk"
      },
      {
        "if": "!research_office_ok",
        "then": [
          {
            "go": "research_mori_end"
          }
        ]
      },
      {
        "say": "eric",
        "emo": "curious",
        "text": "Could I have a copy of the {shiryou} you mentioned?"
      },
      {
        "say": "mori",
        "emo": "warm",
        "text": "はい。こちらです。",
        "overheard": true
      },
      {
        "do": "researchOffice",
        "state": "showCopy"
      },
      {
        "if": "!research_office_ok",
        "then": [
          {
            "go": "research_mori_end"
          }
        ]
      },
      {
        "if": "research_notes_recognized",
        "then": [
          {
            "say": "eric",
            "emo": "quiet",
            "text": "So that’s the trouble Mio had with it."
          },
          {
            "say": "mori",
            "emo": "polite",
            "text": "ええ。何度も詰まりました。",
            "overheard": true
          }
        ],
        "else": [
          {
            "say": "eric",
            "emo": "curious",
            "text": "Did it jam again?"
          },
          {
            "say": "mori",
            "emo": "polite",
            "text": "紙は出ましたが、また詰まりましたので。",
            "overheard": true
          }
        ]
      },
      {
        "do": "researchOffice",
        "state": "point"
      },
      {
        "if": "!research_office_ok",
        "then": [
          {
            "go": "research_mori_end"
          }
        ]
      },
      {
        "say": "mori",
        "emo": "warm",
        "text": "どうぞ。",
        "voice": "mori-reference-dozo",
        "overheard": true
      },
      {
        "do": "researchOffice",
        "state": "handoff"
      },
      {
        "if": "!research_office_ok",
        "then": [
          {
            "go": "research_mori_end"
          }
        ]
      },
      { "say": "eric", "emo": "warm", "text": "Thanks." },
      {
        "go": "research_mori_end"
      }
    ],
    "research_mori_end": [
      {
        "do": "researchOffice",
        "state": "release"
      },
      {
        "do": "save"
      }
    ]
  }
};
