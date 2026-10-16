"""External generation history tests use temporary data and never invoke a provider."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch

TMP = tempfile.TemporaryDirectory()
os.environ.setdefault('IMAGEGEN_ROOT', TMP.name)
os.environ.setdefault('IMAGEGEN_PORT', '18772')
sys.path.insert(0, str(Path(__file__).parent))
import store, server, external, privacy, image_actions
from PIL import Image


class ExternalHistory(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for key, value in {'ROOT': self.root, 'OUTPUTS': self.root/'outputs', 'THUMBS': self.root/'thumbs',
                           'LOG': self.root/'log.jsonl', 'OFF_LIMITS': self.root/'protected', 'REPO': self.root}.items():
            p = patch.object(store, key, str(value)); p.start(); self.addCleanup(p.stop)
        p = patch.object(privacy, 'FILE', str(self.root/'private.json'));p.start();self.addCleanup(p.stop)
        for name, color in [('original.png', 'blue'), ('first.png', 'red'), ('second.png', 'green')]:
            Image.new('RGB', (42, 31), color).save(self.root/name)
        self.receipt = dict(import_id='tool-call-output-1', engine='image_gen.imagegen', prompt='Exact prompt.\nWith a second line.',
                            output=str(self.root/'original.png'), at='2026-10-15T20:30:00+00:00', rating='safe',
                            references=[str(self.root/'second.png'), str(self.root/'first.png')],
                            requested={'prompt':'Exact prompt.\nWith a second line.', 'transparent_background':False,
                                       'referenced_image_paths':[str(self.root/'second.png'),str(self.root/'first.png')]},
                            observed={'provider_output':'tool-output.png'}, owner='codex', round='fixture')

    def test_lossless_ordered_import_and_idempotent_rating_preservation(self):
        row = external.import_render(self.receipt)
        self.assertEqual(row['n'], 1)
        self.assertEqual((Path(store.OUTPUTS)/row['file']).read_bytes(), (self.root/'original.png').read_bytes())
        self.assertEqual([r['path'] for r in row['provenance']['references']], self.receipt['references'])
        for ref in row['provenance']['references']:
            self.assertEqual(hashlib.sha256((Path(store.OUTPUTS)/ref['file']).read_bytes()).hexdigest(),ref['sha256'])
        self.assertEqual(row['provenance']['requested'], self.receipt['requested'])
        self.assertEqual((row['w'], row['h']), (42,31))
        for key in ('seed','model_file','cfg','steps','sampler','scheduler'):
            self.assertIsNone(row[key])
        store.log_update(row['id'], {'star':True,'note':'Keep this note'})
        again = external.import_render(self.receipt)
        self.assertTrue(again['star']);self.assertEqual(again['note'],'Keep this note')
        self.assertEqual(len(store.log_read()),1)
        with self.assertRaisesRegex(ValueError,'different generation evidence'):
            external.import_render(dict(self.receipt,observed={'changed':True}))

    def test_parallel_import_uses_one_number(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            rows = list(pool.map(external.import_render, [self.receipt]*6))
        self.assertEqual([r['n'] for r in rows],[1]*6)
        self.assertEqual(len(store.log_read()),1)

    def test_cross_process_import_is_idempotent(self):
        receipt = self.root/'receipt.json';receipt.write_text(json.dumps(self.receipt))
        env = {**os.environ,'IMAGEGEN_ROOT':str(self.root)}
        children = [subprocess.Popen([sys.executable,str(Path(external.__file__)),str(receipt)],env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE) for _ in range(2)]
        for child in children:
            out,err = child.communicate(timeout=20)
            self.assertEqual(child.returncode,0,err.decode())
            self.assertEqual(json.loads(out)['n'],1)
        self.assertEqual(len(store.log_read()),1)

    def test_missing_generation_time_is_labelled_not_fabricated(self):
        receipt = dict(self.receipt);receipt.pop('at')
        row = external.import_render(receipt)
        self.assertIsNone(row['provenance']['generated_at'])
        self.assertEqual(row['provenance']['timestamp_source'],'not_recorded')
        self.assertEqual(row['at'],row['imported_at'])
        self.assertEqual(external.import_render(receipt)['id'],row['id'])

    def test_a_round_of_the_private_rewards_area_makes_its_record_private(self):
        public = external.import_render(dict(self.receipt, import_id='round-public-1', round='fixture'))
        self.assertFalse(public['private'])
        marketing = external.import_render(dict(self.receipt, import_id='round-marketing-1', round='marketing/motifs-2'))
        self.assertTrue(marketing['private'])
        self.assertEqual(marketing['round'], 'marketing/motifs-2')
        self.assertEqual(len(server.history({}, private=False)), 1)
        self.assertEqual(len(server.history({}, private=True)), 2)

    def test_private_round_names_follow_the_layout(self):
        self.assertTrue(privacy.is_private_round('marketing/motifs-2'))
        self.assertTrue(privacy.is_private_round('skimpy/aoi-3/round-1'))
        for name in ('fixture', 'marketing', '', None):
            self.assertFalse(privacy.is_private_round(name), name)

    def test_protected_paths_and_symlinks_are_rejected_before_reading(self):
        protected = self.root/'protected'
        with self.assertRaisesRegex(ValueError,'Protected'):
            external.import_render(dict(self.receipt,output=str(protected/'never-open.png')))
        link = self.root/'link.png';link.symlink_to(protected/'never-open.png')
        with self.assertRaisesRegex(ValueError,'Symlink'):
            external.import_render(dict(self.receipt,output=str(link)))

    def test_private_alias_to_public_file_and_symlink_directory_are_refused(self):
        directory = self.root/'island/private/rewards/library/fixture-1'
        directory.mkdir(parents=True)
        alias = directory/'alias.png';alias.symlink_to(self.root/'original.png')
        with self.assertRaisesRegex(ValueError,'Symlink'):
            external.import_render(dict(self.receipt,output=str(alias)))
        alias_dir = self.root/'linked-directory';alias_dir.symlink_to(self.root,target_is_directory=True)
        with self.assertRaisesRegex(ValueError,'Symlink'):
            external.import_render(dict(self.receipt,output=str(alias_dir/'original.png')))
        with self.assertRaisesRegex(ValueError,'Symlink'):
            external.import_render(dict(self.receipt,references=[str(alias)],requested={}))
        self.assertEqual(store.log_read(),[])

    def test_private_reference_makes_entire_record_private_and_files_guarded(self):
        directory = self.root/'island/private/rewards';directory.mkdir(parents=True)
        ref = directory/'ref.png';ref.write_bytes((self.root/'first.png').read_bytes())
        row = external.import_render(dict(self.receipt,references=[str(ref)],requested={}))
        self.assertTrue(privacy.is_private_render(row))
        self.assertEqual(server.history({},private=False),[])
        self.assertEqual(len(server.history({},private=True)),1)
        names,ids = server.private_files()
        self.assertIn(row['provenance']['references'][0]['file'],names)
        self.assertIn(row['file'],names);self.assertIn(row['id'],ids)
        with self.assertRaisesRegex(ValueError,'private mode'):
            image_actions.selected_image(row['id'])
        selected,_ = image_actions.selected_image(row['id'],private=True)
        self.assertEqual(selected['provenance'],row['provenance'])

    def test_existing_configured_private_paths_apply_to_references(self):
        directory = self.root/'art/restricted';directory.mkdir(parents=True)
        ref = directory/'ref.png';ref.write_bytes((self.root/'first.png').read_bytes())
        (self.root/'private.json').write_text(json.dumps({'render':{'paths':['art/restricted/']}}))
        row = external.import_render(dict(self.receipt,references=[str(ref)],requested={}))
        self.assertTrue(privacy.is_private_render(row))
        self.assertEqual(server.history({},private=False),[])

    def test_http_history_original_and_private_reference_visibility(self):
        row = external.import_render(dict(self.receipt,private=True))
        nav = self.root/'private-nav.js';nav.write_text('')
        with patch.object(server,'PRIVATE_NAV',str(nav)), patch.dict(os.environ,{'SUBPLOTS_PUBLIC_ONLY':'0'}):
            srv = ThreadingHTTPServer(('127.0.0.1',0),server.H)
            thread = threading.Thread(target=srv.serve_forever);thread.start()
            try:
                base = f'http://127.0.0.1:{srv.server_port}'
                self.assertEqual(json.load(urllib.request.urlopen(base+'/api/history')),[])
                for file in [row['file'],row['provenance']['references'][0]['file'], 'alias/%2e%2e/'+row['provenance']['references'][0]['file']]:
                    with self.assertRaises(urllib.error.HTTPError) as raised:
                        urllib.request.urlopen(base+'/out/'+file)
                    self.assertEqual(raised.exception.code,404)
                    raised.exception.close()
                    req = urllib.request.Request(base+'/out/'+file,headers={'Cookie':'amakawa_mode=private'})
                    with urllib.request.urlopen(req) as response:
                        self.assertEqual(response.status,200)
                request = urllib.request.Request(base+'/api/render/'+row['id'],headers={'Cookie':'amakawa_mode=private'})
                with urllib.request.urlopen(request) as response:
                    self.assertEqual(json.load(response)['provenance'],row['provenance'])
            finally:
                srv.shutdown();thread.join();srv.server_close()

    def test_partial_bytes_stage_outside_served_roots_and_cleanup_on_error(self):
        target = Path(store.OUTPUTS)/'private.png'
        def fail_before_publish(src,dst):
            self.assertEqual(Path(src).parent,self.root/'.import-staging')
            self.assertFalse(target.exists())
            self.assertFalse(Path(str(target)+'.tmp').exists())
            raise OSError('Injected publication failure')
        with patch.object(store.os,'replace',side_effect=fail_before_publish), self.assertRaisesRegex(OSError,'Injected'):
            store._atomic_write_bytes(str(target),b'private bytes')
        self.assertEqual(list((self.root/'.import-staging').iterdir()),[])
        self.assertFalse(target.exists())

    def test_fully_decodes_before_record_or_copy(self):
        source = self.root/'truncated.jpg'
        Image.new('RGB',(64,64),'blue').save(source)
        source.write_bytes(source.read_bytes()[:-50])
        with self.assertRaises(OSError):
            external.import_render(dict(self.receipt,output=str(source),rating='nsfw'))
        self.assertEqual(store.log_read(),[])
        self.assertFalse(Path(store.OUTPUTS).exists())

    def test_private_metadata_precedes_publication_and_failed_import_recovers(self):
        def fail_after_read_check(src, rel):
            row = store.log_read()[0]
            self.assertEqual(row['status'],'importing')
            files = [row['file'],row['provenance']['references'][0]['file']]
            self.assertTrue(all((Path(store.OUTPUTS)/f).is_file() for f in files))
            # Another process has its own Python locks and sees the durable privacy guard.
            code = "import json,sys;sys.path.insert(0,sys.argv[1]);import server,store;h=object.__new__(server.H);h._private=lambda:False;codes=[];h._send=lambda code,*args,**kwargs:codes.append(code);[h._file(store.OUTPUTS,f,check=True) for f in json.loads(sys.argv[2])];print(json.dumps(codes))"
            result = subprocess.check_output([sys.executable,'-c',code,str(Path(server.__file__).parent),json.dumps(files)],
                                             env={**os.environ,'IMAGEGEN_ROOT':str(self.root),'IMAGEGEN_PORT':'18772'},text=True)
            self.assertEqual(json.loads(result),[404,404])
            target = Path(store.THUMBS)/row['thumb'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b'partial')
            raise OSError('Injected thumbnail failure')
        with patch.object(store,'make_thumb',side_effect=fail_after_read_check), self.assertRaisesRegex(OSError,'Injected'):
            external.import_render(dict(self.receipt,rating='nsfw'))
        failed = store.log_read()[0]
        self.assertEqual(failed['status'],'failed')
        self.assertFalse((Path(store.OUTPUTS)/failed['file']).exists())
        self.assertFalse((Path(store.THUMBS)/failed['thumb']).exists())
        self.assertTrue(all(not (Path(store.OUTPUTS)/r['file']).exists() for r in failed['provenance']['references']))
        store.log_update(failed['id'],{'note':'Keep my note'})
        recovered = external.import_render(dict(self.receipt,rating='nsfw'))
        self.assertEqual(recovered['status'],'done')
        self.assertEqual(recovered['n'],failed['n'])
        self.assertEqual(recovered['note'],'Keep my note')
        self.assertEqual(len(store.log_read()),1)

    def test_history_and_render_lookup_keep_exact_provenance(self):
        row = external.import_render(self.receipt)
        grouped = server.history({},private=True)[0]
        self.assertEqual(grouped['provenance'],row['provenance'])
        self.assertEqual(grouped['renders'][0]['provenance'],row['provenance'])
        selected,_ = image_actions.selected_image(row['id'])
        self.assertEqual(selected['provenance'],row['provenance'])
        later = external.import_render(dict(self.receipt,import_id='call-2',at='2026-10-15T20:31:00Z'))
        first = server.history({'pictures':'1','limit':1},private=True)[0]
        self.assertEqual(first['renders'][0]['id'],later['id'])
        rest = server.history({'pictures':'1','limit':1,'before':first['at'],'before_run':first['run_id'],'before_n':first['last_n']},private=True)
        self.assertEqual(rest[0]['renders'][0]['id'],row['id'])

    def test_fresh_and_history_local_settings_match(self):
        job = dict(id='local',run_id='local-run',idx=1,status='done',seed=13,model_file='local.safetensors',file='fixture.png',
                   w=1152,h=896,steps=27,cfg=0,sampler='dpmpp_2m',scheduler='karras',at='2026-10-15T20:30:00Z',rating='safe',
                   positive='Local exact',negative='Local negative',presets={'style':{'id':'style','v':3}},
                   compose={'override':{'positive':'Local exact','negative':'Local negative'}},
                   ipa={'ref':'first.png','strength':0.35},start={'image':'second.png','denoise':0.6},
                   loras=[{'file':'lora.safetensors','weight':0.4}],control={'file':'guide.safetensors','strength':0.5},huefix=[])
        store.log_append(server.log_entry(job))
        with patch.object(server,'_exists',return_value=True):
            history = server.history({},private=True)[0]
        fresh = server.public_job(job)
        for key in ('steps','cfg','sampler','scheduler','compose','ipa','start','loras','control','huefix'):
            self.assertEqual(fresh[key],history['renders'][0][key],key)
        self.assertEqual(fresh['presets'],history['presets'])


if __name__ == '__main__':
    unittest.main()
