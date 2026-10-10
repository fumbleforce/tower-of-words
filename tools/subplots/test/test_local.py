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

if __name__=='__main__':unittest.main()
