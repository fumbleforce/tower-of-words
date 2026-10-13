import source from '../research_lab.js';
import {interactions,place} from './shared.js';
export default place('research_lab',{...interactions(source,['talk:research_reader','talk:research_books','talk:research_archive','talk:research_side_seat','talk:research_end_seat','talk:research_table_seat','talk:research_window_seat']),arrivalGoal:false});
