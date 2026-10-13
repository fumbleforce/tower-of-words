import source from '../works.js';
import { interactions, place } from './shared.js';
export default place('works', {...interactions(source, ['talk:weather_station', 'talk:old_power_plant', 'talk:old_factory', 'talk:server_hall', 'talk:recycling_centre', 'talk:research_lab']), arrivalGoal: {do:'ongoingGoal', keepExisting:true}});
