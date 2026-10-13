import test from 'node:test';
import assert from 'node:assert/strict';
import {installResearch} from '../../js/reading-room/hook.js';
import {flags} from '../../js/narrative/state.js';
test('office availability and execution flags clear after leaving, outside Continue and absent schedule',async()=>{
 let available=true;const provider={ready:()=>({available,understood:available,notesRecognized:true}),act:async()=>true},game={hooks:{},place:{researchOffice:provider}};
 installResearch(game);await game.hooks.researchOffice({state:'available'});assert.equal(flags.research_mori_available,true);assert.equal(flags.research_mori_understood,true);
 game.place={name:'harbour'};await game.hooks.researchOffice({state:'available'});
 for(const key of ['research_mori_available','research_mori_understood','research_notes_recognized','research_office_ok','research_mori_return_ready'])assert.equal(flags[key],false,key);
 flags.research_mori_available=true;flags.research_mori_understood=true;await game.hooks.researchOffice({state:'available'});assert.equal(flags.research_mori_available,false);
 game.place={researchOffice:provider};available=false;await game.hooks.researchOffice({state:'available'});assert.equal(flags.research_mori_available,false);assert.equal(flags.research_mori_understood,false);
});
