import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).parents[1]))
spec=importlib.util.spec_from_file_location('subplot_local',Path(__file__).parents[1]/'local.py')
local=importlib.util.module_from_spec(spec);spec.loader.exec_module(local)

class LocalRecipes(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.source=self.root/'source.mjs';self.output=self.root/'derived.json'
        self.source.write_text("const s=(who,x)=>({who,x}); const scene={id:'hello',place:'office',day:2,show:'met',nodes:{start:[s('colleague','Hello')]}};export const SCENES=[scene];")
        self.output.write_text('{"prior":true}')
        self.build=self.root/'build.py';self.build.write_text("from pathlib import Path\nPath('derived.json').write_text('{\"rebuilt\":true}')\n")
        self.config=self.root/'config.json'
        self.settings={'root':str(self.root),'state':str(self.root/'state'),'sources':[{'key':'test','label':'Test','file':str(self.source),'outputs':[str(self.output)],'build':['python3',str(self.build)]}]}
        self.config.write_text(json.dumps(self.settings));self.id='local:test:hello:start'
    def call(self,action,**kw):return local.run(self.config,{'action':action,'id':self.id,**kw})
    def test_save_rebuilds_and_keeps_history(self):
        data=self.call('read');data['steps'][0]['text']='Good morning'
        result=self.call('save',**{k:v for k,v in data.items() if k!='id'})
        self.assertIn('Good morning',self.source.read_text())
        self.assertTrue(json.loads(self.output.read_text())['rebuilt'])
        self.assertEqual(len(result['history']),1)
    def test_failed_build_restores_source_and_outputs(self):
        self.build.write_text("from pathlib import Path\nPath('derived.json').write_text('partial')\nraise RuntimeError('failed')\n")
        before=self.source.read_text();data=self.call('read');data['steps'][0]['text']='Changed'
        with self.assertRaisesRegex(ValueError,'rebuild failed'):self.call('save',**{k:v for k,v in data.items() if k!='id'})
        self.assertEqual(self.source.read_text(),before);self.assertEqual(self.output.read_text(),'{"prior":true}')
    def test_failed_configured_check_restores_source_and_derived_output(self):
        before=self.source.read_text()
        self.settings['checks']=[['python3','-c','raise SystemExit(1)']]
        self.config.write_text(json.dumps(self.settings))
        data=self.call('read');data['steps'][0]['text']='Changed'
        with self.assertRaisesRegex(ValueError,'validation failed'):
            self.call('save',**{k:v for k,v in data.items() if k!='id'})
        self.assertEqual(self.source.read_text(),before)
        self.assertEqual(self.output.read_text(),'{"prior":true}')

    def test_stale_recipe_rejected(self):
        data=self.call('read');self.source.write_text(self.source.read_text()+'\n')
        with self.assertRaisesRegex(ValueError,'CONFLICT'):self.call('save',**{k:v for k,v in data.items() if k!='id'})
    def test_draft_leaves_recipe_unchanged(self):
        before=self.source.read_text();data=self.call('read');data['steps'][0]['text']='Draft'
        self.call('draft',**{k:v for k,v in data.items() if k!='id'});self.assertEqual(self.source.read_text(),before)

    def media_fixture(self):
        from PIL import Image
        outputs=self.root/'renders';outputs.mkdir();Image.new('RGB',(8,8),'blue').save(outputs/'selected.png')
        live=self.root/'live';live.mkdir();(live/'old.webp').write_bytes(b'old image')
        registry=self.root/'registry.json';registry.write_text('old registry')
        tools=self.root/'tools/assets';tools.mkdir(parents=True)
        (tools/'live.mjs').write_text("import fs from 'node:fs'; const [op,src,dest]=process.argv.slice(2);if(op==='promote')fs.copyFileSync(src,dest);else fs.unlinkSync(src);fs.writeFileSync('registry.json','new registry');")
        self.settings.update(imageOutputs=str(outputs),imageLive=str(live),generated=str(self.root/'generated'),round='test',extraBackups=[str(registry)])
        self.config.write_text(json.dumps(self.settings))
        self.source.write_text("const PICS={room:{file:'encounters/old.webp'}};const scene={id:'hello',nodes:{start:[pic('room'),s('colleague','Hello')]}};const SCENES=[scene];")
        return registry
    def selected(self):
        data=self.call('read');data['metadata']['image']={'file':'selected.png','slot':data['images'][0]['id']}
        return {k:v for k,v in data.items() if k!='id'}
    def test_failed_image_build_restores_registry_and_removes_new_live_file(self):
        registry=self.media_fixture();before=self.source.read_text()
        self.build.write_text("raise RuntimeError('failed')")
        with self.assertRaisesRegex(ValueError,'rebuild failed'):self.call('save',**self.selected())
        self.assertEqual(registry.read_text(),'old registry');self.assertEqual(self.source.read_text(),before)
        self.assertEqual([p.name for p in (self.root/'live').iterdir()],['old.webp'])
    def test_image_selection_and_revision_restore(self):
        self.media_fixture();saved=self.call('save',**self.selected())
        self.assertIn('editor-',saved['images'][0]['file'])
        prior=self.call('history',version=saved['history'][0]);prior['revision']=saved['revision'];prior['restoreVersion']=saved['history'][0]
        restored=self.call('save',**{k:v for k,v in prior.items() if k!='id'})
        self.assertEqual(restored['images'][0]['file'],'encounters/old.webp')
    def test_new_image_can_be_selected_after_restoring_a_revision(self):
        self.media_fixture();saved=self.call('save',**self.selected())
        prior=self.call('history',version=saved['history'][0]);prior['revision']=saved['revision'];prior['restoreVersion']=saved['history'][0]
        prior['metadata']['image']={'file':'selected.png','slot':prior['images'][0]['id']}
        restored=self.call('save',**{k:v for k,v in prior.items() if k!='id'})
        self.assertIn('editor-',restored['images'][0]['file'])

    def test_multiple_selected_images_are_applied_in_one_save(self):
        self.media_fixture()
        self.source.write_text("const scene={id:'hello',nodes:{start:[shot('encounters/a.webp'),shot('encounters/b.webp')]}};const SCENES=[scene];")
        data=self.call('read')
        data['metadata']['images']={slot['id']:{'file':'selected.png','slot':slot['id']} for slot in data['images']}
        result=self.call('save',**{k:v for k,v in data.items() if k!='id'})
        self.assertEqual(len(result['images']),2)
        self.assertTrue(all('editor-' in slot['file'] for slot in result['images']))

    def test_a_picture_beat_added_in_the_editor_gets_its_picked_render(self):
        self.media_fixture()
        self.source.write_text("const shot=(src,o={})=>({t:'shot',src,o});const n=x=>({t:'n',x});const scene={id:'hello',nodes:{start:[n('Hello')]}};const SCENES=[scene];")
        data=self.call('read')
        data['steps'].append({'shot':{},'newPicture':True,'imageSlot':'new:x'})
        with self.assertRaisesRegex(ValueError,'no picture yet'):self.call('save',**{k:v for k,v in data.items() if k!='id'})
        data['metadata']['images']={'new:x':{'file':'selected.png','slot':'new:x'},'new:gone':{'file':'selected.png','slot':'new:gone'}}
        result=self.call('save',**{k:v for k,v in data.items() if k!='id'})
        self.assertEqual(len(result['images']),1)
        self.assertIn('editor-',result['images'][0]['file'])
        self.assertIn("shot(\"encounters/editor-",self.source.read_text())
        # the beat keeps the id it was composed under
        self.assertEqual(result['images'][0]['id'],'new:x')
        self.assertEqual(result['metadata']['images']['new:x']['slot'],'new:x')
        self.assertNotIn('new:gone',result['metadata']['images'])

    def test_reorder_keeps_composition_and_pending_image_on_the_same_shot(self):
        self.media_fixture()
        self.source.write_text("const scene={id:'hello',nodes:{start:[shot('encounters/a.webp'),shot('encounters/b.webp')]}};const SCENES=[scene];")
        data=self.call('read');a,b=[i['id'] for i in data['images']]
        data['metadata']['compositions']={a:{'pose':'Seated','imageSlot':a},b:{'pose':'Walking','imageSlot':b}}
        data['metadata']['images']={a:{'file':'selected.png','slot':a}}
        data['steps'].reverse()
        result=self.call('save',**{k:v for k,v in data.items() if k!='id'})
        self.assertEqual(result['images'][0]['file'],'encounters/b.webp')
        self.assertIn('editor-',result['images'][1]['file'])
        self.assertEqual([i['id'] for i in result['images']],[b,a])
        self.assertEqual(result['metadata']['compositions'][a]['pose'],'Seated')
        self.assertEqual(result['metadata']['compositions'][b]['pose'],'Walking')
        self.assertTrue(result['metadata']['images'][a]['applied'])
        self.assertEqual(result['metadata']['images'][a]['slot'],a)

    def save(self,data):
        return self.call('save',**{k:v for k,v in data.items() if k!='id'})
    def test_shots_keep_their_ids_through_inserted_moved_and_deleted_beats(self):
        # renders are matched to a shot by the id they were made under (compose.imageSlot); it must not move to another shot
        self.media_fixture()
        self.source.write_text("const shot=(src,o={})=>({t:'shot',src,o});const n=x=>({t:'n',x});"
            "const scene={id:'hello',nodes:{start:[n('One'),shot('encounters/a.webp'),n('Two'),shot('encounters/b.webp'),shot('encounters/c.webp')]}};const SCENES=[scene];")
        data=self.call('read')
        made={i['file']:i['id'] for i in data['images']}  # what the history recorded for each shot
        ids=lambda r:{i['file']:i['id'] for i in r['images']}
        # a picture beat inserted before the first shot, with a render picked for it
        data['steps'].insert(1,{'shot':{},'newPicture':True,'imageSlot':'new:first'})
        data['metadata']['images']={'new:first':{'file':'selected.png','slot':'new:first'}}
        data=self.save(data)
        self.assertEqual({f:i for f,i in ids(data).items() if not f.startswith('encounters/editor-')},made)
        self.assertEqual(data['images'][0]['id'],'new:first')
        # moved: the last shot goes first
        data['steps'].insert(0,data['steps'].pop());data=self.save(data)
        self.assertEqual({f:i for f,i in ids(data).items() if not f.startswith('encounters/editor-')},made)
        self.assertEqual(data['images'][0]['file'],'encounters/c.webp')
        # deleted: a line and the shot of a.webp
        data['steps']=[s for s in data['steps'] if not (isinstance(s,dict) and (s.get('narration')=='One' or s.get('imageSlot')==made['encounters/a.webp']))]
        data=self.save(data)
        self.assertEqual(ids(data),{'encounters/c.webp':made['encounters/c.webp'],'encounters/b.webp':made['encounters/b.webp'],data['images'][1]['file']:'new:first'})
        # a new picture picked for b.webp's shot: the shot keeps its id, through the next read too
        b=made['encounters/b.webp'];(self.root/'renders/other.png').write_bytes((self.root/'renders/selected.png').read_bytes()+b'x')
        data['metadata']['images'][b]={'file':'other.png','slot':b};data=self.save(data)
        self.assertEqual([i['id'] for i in self.call('read')['images']],[made['encounters/c.webp'],'new:first',b])
        self.assertNotIn('encounters/b.webp',self.source.read_text())

    def test_place_based_ids_from_before_become_aliases_of_the_shot(self):
        self.media_fixture()
        self.source.write_text("const scene={id:'hello',nodes:{start:[shot('encounters/a.webp'),n('Two'),shot('encounters/b.webp')]}};const SCENES=[scene];")
        folder=self.root/'state'/local.hashlib.sha256(self.id.encode()).hexdigest();folder.mkdir(parents=True)
        (folder/'metadata.json').write_text(json.dumps({'compositions':{'image:1':{'pose':'Walking','imageSlot':'image:1'}}}))
        (folder/'draft.json').write_text(json.dumps({'steps':[{'imageSlot':'image:0'}],'metadata':{'images':{'image:1':{'slot':'image:1'}}}}))
        data=self.call('read');a,b=[i['id'] for i in data['images']]
        self.assertEqual([i['aliases'] for i in data['images']],[['image:0'],['image:1']])
        self.assertEqual(data['metadata']['compositions'],{b:{'pose':'Walking','imageSlot':b}})
        self.assertEqual(data['draft'],{'steps':[{'imageSlot':a}],'metadata':{'images':{b:{'slot':b}}}})
        # a beat inserted before both: the old ids stay with the shots they named
        data['steps'].insert(0,{'narration':'Before'});data=self.save(data)
        self.assertEqual([(i['id'],i['aliases']) for i in data['images']],[(a,['image:0']),(b,['image:1'])])
        self.assertEqual(data['metadata']['compositions'][b]['pose'],'Walking')

    def test_removed_shot_drops_legacy_selected_image(self):
        self.media_fixture()
        saved=self.call('save',**self.selected())
        saved['steps'].pop(0)
        result=self.call('save',**{k:v for k,v in saved.items() if k!='id'})
        self.assertNotIn('image',result['metadata'])

    def test_changed_voice_is_retired_and_removed_from_index(self):
        self.media_fixture();audio=self.root/'audio';audio.mkdir()
        (audio/'line.mp3').write_bytes(b'stale voice');(audio/'index.json').write_text('["line"]')
        manifest=self.root/'lines.json';manifest.write_text('{"lines":[{"id":"line","text":"old"}]}')
        self.settings['audioRoot']=str(audio)
        self.settings['extraBackups'].append(str(audio/'index.json'))
        self.settings['sources'][0]['voiceManifest']=str(manifest)
        self.settings['sources'][0]['outputs'].append(str(manifest))
        self.config.write_text(json.dumps(self.settings))
        self.build.write_text("from pathlib import Path\nPath('lines.json').write_text('{\"lines\":[{\"id\":\"line\",\"text\":\"new\"}]}')")
        data=self.call('read');result=self.call('save',**{k:v for k,v in data.items() if k!='id'})
        self.assertFalse((audio/'line.mp3').exists());self.assertEqual(json.loads((audio/'index.json').read_text()),[])
        self.assertEqual(len(result['warnings']),1)

class PictureRounds(unittest.TestCase):
    def test_round_found_by_an_identical_copy(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);rewards=root/'island/private/rewards';live=root/'island/private/game/encounters'
            (rewards/'peeks/bench-2/raw').mkdir(parents=True);(rewards/'peeks/other-1').mkdir(parents=True);live.mkdir(parents=True)
            (live/'bench-2.webp').write_bytes(b'picture');(rewards/'peeks/bench-2/raw/r1-1234.webp').write_bytes(b'picture')
            (rewards/'peeks/other-1/r1.webp').write_bytes(b'pictuRe')  # same size, other picture
            data={'images':[{'available':True,'url':'/island/private/game/encounters/bench-2.webp'},{'available':False,'url':'/island/private/game/x.webp'}]}
            self.assertEqual(local.picture_rounds(data,root,rewards),['island/private/rewards/peeks/bench-2'])

if __name__=='__main__':unittest.main()
