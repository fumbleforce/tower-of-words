import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installSenderHook, senderReady } from '../../js/investigations/sender/hook.js';
test('sender availability recomputes across office, other places and loaded outside saves', async () => {
  const space={},person=()=>({root:{visible:true,parent:space},_walk:false});
  const office={space,people:{mio:person(),mori:person()}},flags={d2_ticket_done:true};
  const game={hooks:{},place:office};
  office.sender={async act(){flags.sender_available=senderReady(office,flags,false);flags.sender_action_ok=flags.sender_available;}};
  installSenderHook(game,flags);
  await game.hooks.sender({action:'available'});assert.equal(flags.sender_available,true);
  game.place={name:'plaza'};await game.hooks.sender({action:'available'});assert.equal(flags.sender_available,false);assert.equal(flags.sender_action_ok,false);
  flags.sender_available=true;await game.hooks.sender({action:'available'});assert.equal(flags.sender_available,false,'outside save cannot retain office availability');
  game.place=office;office.people.mio.root.visible=false;await game.hooks.sender({action:'available'});assert.equal(flags.sender_available,false);
  office.people.mio.root.visible=true;office.people.mori._walk=true;assert.equal(senderReady(office,flags,false),false);
  office.people.mori._walk=false;office.people.mori.root.parent={};assert.equal(senderReady(office,flags,true),false);
  office.people.mori.root.parent=space;flags.d2_ticket_done=false;assert.equal(senderReady(office,flags,false),false);assert.equal(senderReady(office,flags,true),true);
});
