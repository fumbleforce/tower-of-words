// The old works, walked from the supply yard up the works lane and along the yard, down the works street and along
// the research walk (docs/game/places.md). The factory's gates and the power plant's door are chained; the server
// hall and recycling centre remain shut. Research opens its built reading room. Down the lane goes back into the
// supply yard, down the street onto the office street.
export default {
  start: 'arrive',
  on: {
    'talk:harbour_lane': 'to_harbour',
    'zone:lane_exit': 'to_harbour',
    'talk:office_street': 'to_street',
    'zone:street_exit': 'to_street',
    'talk:old_power_plant': 'chained',
    'talk:old_factory': 'chained',
    'talk:server_hall': 'shut',
    'talk:recycling_centre': 'shut',
    'talk:weather_station':'weather',
    'talk:research_lab': 'to_research',
  },
  goal: { office_street: 'true' },
  nodes: {
    weather:[{choice:[
      {text:'Compare the retained diagram.',go:'weather_plan',if:'found_research_weather_plan || found_research_weather_shapes'},
      {text:'Look at the white box.',go:'weather_box'},
      {text:'Look at the small cylinder.',go:'weather_rain'},
      {text:'Look at the mast.',go:'weather_wind'},
      {text:'Step away.',go:'weather_end'},
    ]}],
    weather_plan:[{do:'researchWeather',state:'plan'},{go:'weather'}],
    weather_box:[{do:'researchWeather',state:'box'},{go:'weather'}],
    weather_rain:[{do:'researchWeather',state:'rain'},{go:'weather'}],
    weather_wind:[{do:'researchWeather',state:'wind'},{go:'weather'}],
    weather_end:[{do:'researchWeather',state:'release'}],
    arrive: [
      {
        if: 'going_home',
        then: [
          {
            do: 'goal',
            text: 'The dorms are back down the works street, east along the office street, past the gym and down the north street.',
          },
        ],
        else: [
          {
            do: 'goal',
            text: 'Head office is back down the works street and east along the office street, past the gym and the plaza. Take its lift down to B2.',
          },
        ],
      },
    ],
    chained: ['> It is chained shut.'],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_research: [{do:'trip',to:'research_lab'}],
    to_harbour: [{ do: 'trip', to: 'harbour' }],
    to_street: [{ do: 'trip', to: 'harbour' }],
  },
};
