"""Rebuild bundled educational data from the downloaded upstream snapshots.
Download kanji.json from davidluzgouveia/kanji-data and kanjivg master.zip first.
Only KANJIDIC fields are retained; WaniKani fields are deliberately excluded.
"""
import json, zipfile, gzip, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'dist'/'data'
OUT.mkdir(exist_ok=True)
raw=json.loads((ROOT/'scripts'/'kanji-source.json').read_text(encoding='utf-8'))
kanji=[dict(id=k,char=k,meanings=v['meanings'],on=v['readings_on'],kun=v['readings_kun'],grade=v['grade'],jlpt=v['jlpt_new'],strokes=v['strokes'],freq=v['freq']) for k,v in raw.items() if v['grade'] and v['grade']<=8]
official=ROOT/'scripts'/'kanjidic2.xml.gz'
if official.exists():
 xml=ET.fromstring(gzip.decompress(official.read_bytes()))
 kanji=[]
 for c in xml.findall('character'):
  grade=c.findtext('misc/grade')
  if not grade or int(grade)>8: continue
  char=c.findtext('literal');source=raw.get(char,{})
  readings=c.findall('reading_meaning/rmgroup/reading')
  kanji.append(dict(id=char,char=char,meanings=[m.text for m in c.findall('reading_meaning/rmgroup/meaning') if not m.get('m_lang')],on=[r.text for r in readings if r.get('r_type')=='ja_on'],kun=[r.text for r in readings if r.get('r_type')=='ja_kun'],grade=int(grade),jlpt=source.get('jlpt_new'),strokes=int(c.findtext('misc/stroke_count')),freq=int(c.findtext('misc/freq') or 9999)))
kanji.sort(key=lambda k:(k['grade'],k['freq'] or 9999))
rows=[('あいうえお','aiueo'.split()),('かきくけこ',['ka','ki','ku','ke','ko']),('さしすせそ',['sa','shi','su','se','so']),('たちつてと',['ta','chi','tsu','te','to']),('なにぬねの',['na','ni','nu','ne','no']),('はひふへほ',['ha','hi','fu','he','ho']),('まみむめも',['ma','mi','mu','me','mo']),('やゆよ',['ya','yu','yo']),('らりるれろ',['ra','ri','ru','re','ro']),('わをん',['wa','wo','n'])]
rows[0]=('あいうえお',['a','i','u','e','o'])
kana=[]
for chars,readings in rows:
 for c,r in zip(chars,readings):
  for char,kind in [(c,'hiragana'),(chr(ord(c)+96),'katakana')]:
   kana.append(dict(id=char,char=char,meanings=[r],on=[],kun=[c],reading=c,roman=r,kind=kind,grade=0,jlpt=None,strokes=0))
z=zipfile.ZipFile(ROOT/'scripts'/'kanjivg.zip')
strokes={}
for k in kanji+kana:
 name=f"kanjivg-master/kanji/{ord(k['char']):05x}.svg"
 try:
  tree=ET.fromstring(z.read(name))
  paths=[e.attrib['d'] for e in tree.iter('{http://www.w3.org/2000/svg}path') if 'd' in e.attrib]
  strokes[k['char']]=paths
  if k['strokes'] and k['strokes']!=len(paths): k['dictionaryStrokes']=k['strokes']
  k['strokes']=len(paths)
 except KeyError: pass
(OUT/'KANJIVG-LICENSE.txt').write_bytes(z.read('kanjivg-master/COPYING'))
vocab_text='''日本|にほん|Japan|Everyday
日本語|にほんご|Japanese language|Learning
学生|がくせい|student|Learning
先生|せんせい|teacher|Learning
学校|がっこう|school|Learning
大学|だいがく|university|Learning
本|ほん|book|Learning
名前|なまえ|name|Everyday
人|ひと|person|People
友達|ともだち|friend|People
家族|かぞく|family|People
母|はは|my mother|People
父|ちち|my father|People
子供|こども|child|People
女の人|おんなのひと|woman|People
男の人|おとこのひと|man|People
私|わたし|I; me|People
猫|ねこ|cat|Nature
犬|いぬ|dog|Nature
鳥|とり|bird|Nature
魚|さかな|fish|Food
水|みず|water|Food
お茶|おちゃ|tea|Food
ご飯|ごはん|rice; meal|Food
朝ご飯|あさごはん|breakfast|Food
昼ご飯|ひるごはん|lunch|Food
晩ご飯|ばんごはん|dinner|Food
肉|にく|meat|Food
野菜|やさい|vegetables|Food
果物|くだもの|fruit|Food
卵|たまご|egg|Food
牛乳|ぎゅうにゅう|milk|Food
パン|ぱん|bread|Food
りんご|りんご|apple|Food
コーヒー|こーひー|coffee|Food
食べる|たべる|to eat|Verbs
飲む|のむ|to drink|Verbs
見る|みる|to see; to watch|Verbs
聞く|きく|to hear; to listen|Verbs
読む|よむ|to read|Verbs
書く|かく|to write|Verbs
話す|はなす|to speak|Verbs
行く|いく|to go|Verbs
来る|くる|to come|Verbs
帰る|かえる|to return home|Verbs
買う|かう|to buy|Verbs
会う|あう|to meet|Verbs
寝る|ねる|to sleep|Verbs
起きる|おきる|to wake up|Verbs
勉強する|べんきょうする|to study|Learning
今日|きょう|today|Time
明日|あした|tomorrow|Time
昨日|きのう|yesterday|Time
毎日|まいにち|every day|Time
今|いま|now|Time
朝|あさ|morning|Time
昼|ひる|noon; daytime|Time
夜|よる|night|Time
時間|じかん|time; hours|Time
月曜日|げつようび|Monday|Time
火曜日|かようび|Tuesday|Time
水曜日|すいようび|Wednesday|Time
木曜日|もくようび|Thursday|Time
金曜日|きんようび|Friday|Time
土曜日|どようび|Saturday|Time
日曜日|にちようび|Sunday|Time
一|いち|one|Numbers
二|に|two|Numbers
三|さん|three|Numbers
四|よん|four|Numbers
五|ご|five|Numbers
六|ろく|six|Numbers
七|なな|seven|Numbers
八|はち|eight|Numbers
九|きゅう|nine|Numbers
十|じゅう|ten|Numbers
百|ひゃく|hundred|Numbers
千|せん|thousand|Numbers
円|えん|yen|Numbers
山|やま|mountain|Nature
川|かわ|river|Nature
海|うみ|sea|Nature
空|そら|sky|Nature
雨|あめ|rain|Nature
雪|ゆき|snow|Nature
花|はな|flower|Nature
木|き|tree|Nature
天気|てんき|weather|Nature
春|はる|spring|Nature
夏|なつ|summer|Nature
秋|あき|autumn|Nature
冬|ふゆ|winter|Nature
駅|えき|station|Places
電車|でんしゃ|train|Places
車|くるま|car|Places
自転車|じてんしゃ|bicycle|Places
家|いえ|house; home|Places
部屋|へや|room|Places
店|みせ|shop|Places
病院|びょういん|hospital|Places
図書館|としょかん|library|Places
公園|こうえん|park|Places
銀行|ぎんこう|bank|Places
右|みぎ|right|Places
左|ひだり|left|Places
上|うえ|above; up|Places
下|した|below; down|Places
中|なか|inside|Places
大きい|おおきい|big|Descriptions
小さい|ちいさい|small|Descriptions
新しい|あたらしい|new|Descriptions
古い|ふるい|old|Descriptions
高い|たかい|high; expensive|Descriptions
安い|やすい|inexpensive|Descriptions
長い|ながい|long|Descriptions
白い|しろい|white|Descriptions
黒い|くろい|black|Descriptions
赤い|あかい|red|Descriptions
青い|あおい|blue|Descriptions
おいしい|おいしい|delicious|Descriptions
ありがとう|ありがとう|thank you|Everyday
おはよう|おはよう|good morning|Everyday
こんにちは|こんにちは|hello|Everyday
こんばんは|こんばんは|good evening|Everyday
すみません|すみません|excuse me; sorry|Everyday
はい|はい|yes|Everyday
いいえ|いいえ|no|Everyday'''
vocab=[]
for line in vocab_text.splitlines():
 w,r,m,t=line.split('|');vocab.append(dict(id='v-'+w,char=w,reading=r,meanings=[m],topic=t,kind='vocab',on=[],kun=[]))
sentence_text='''私は学生です。|わたしはがくせいです。|I am a student.|学生|がくせい
毎日、日本語を勉強します。|まいにち、にほんごをべんきょうします。|I study Japanese every day.|日本語|にほんご
これは私の本です。|これはわたしのほんです。|This is my book.|本|ほん
学校に行きます。|がっこうにいきます。|I go to school.|学校|がっこう
先生の名前は何ですか。|せんせいのなまえはなんですか。|What is the teacher's name?|名前|なまえ
友達と話します。|ともだちとはなします。|I talk with a friend.|友達|ともだち
水を飲みます。|みずをのみます。|I drink water.|水|みず
朝ご飯を食べます。|あさごはんをたべます。|I eat breakfast.|朝ご飯|あさごはん
お茶を飲みませんか。|おちゃをのみませんか。|Would you like some tea?|お茶|おちゃ
このりんごはおいしいです。|このりんごはおいしいです。|This apple is delicious.|りんご|りんご
魚が好きです。|さかながすきです。|I like fish.|魚|さかな
毎朝、パンを食べます。|まいあさ、ぱんをたべます。|I eat bread every morning.|パン|ぱん
今日は月曜日です。|きょうはげつようびです。|Today is Monday.|月曜日|げつようび
明日、学校に行きます。|あした、がっこうにいきます。|Tomorrow I will go to school.|明日|あした
昨日、本を読みました。|きのう、ほんをよみました。|Yesterday I read a book.|昨日|きのう
夜、音楽を聞きます。|よる、おんがくをききます。|At night I listen to music.|夜|よる
今、何時ですか。|いま、なんじですか。|What time is it now?|今|いま
毎日、六時に起きます。|まいにち、ろくじにおきます。|I wake up at six every day.|毎日|まいにち
駅はどこですか。|えきはどこですか。|Where is the station?|駅|えき
電車で学校に行きます。|でんしゃでがっこうにいきます。|I go to school by train.|電車|でんしゃ
図書館で本を読みます。|としょかんでほんをよみます。|I read books at the library.|図書館|としょかん
公園で友達に会います。|こうえんでともだちにあいます。|I meet a friend at the park.|公園|こうえん
店で牛乳を買います。|みせでぎゅうにゅうをかいます。|I buy milk at a shop.|牛乳|ぎゅうにゅう
家に帰ります。|いえにかえります。|I return home.|家|いえ
右に曲がってください。|みぎにまがってください。|Please turn right.|右|みぎ
猫は机の下にいます。|ねこはつくえのしたにいます。|The cat is under the desk.|下|した
今日はいい天気です。|きょうはいいてんきです。|The weather is nice today.|天気|てんき
山が見えます。|やまがみえます。|I can see a mountain.|山|やま
川の水はきれいです。|かわのみずはきれいです。|The river water is clean.|川|かわ
春に花が咲きます。|はるにはながさきます。|Flowers bloom in spring.|春|はる
今日は雨です。|きょうはあめです。|It is rainy today.|雨|あめ
冬は寒いです。|ふゆはさむいです。|Winter is cold.|冬|ふゆ
あの犬は大きいです。|あのいぬはおおきいです。|That dog is big.|大きい|おおきい
新しい本を買いました。|あたらしいほんをかいました。|I bought a new book.|新しい|あたらしい
この部屋は小さいです。|このへやはちいさいです。|This room is small.|小さい|ちいさい
白い花が好きです。|しろいはながすきです。|I like white flowers.|白い|しろい
日本に行きたいです。|にほんにいきたいです。|I want to go to Japan.|日本|にほん
家族とご飯を食べます。|かぞくとごはんをたべます。|I eat a meal with my family.|家族|かぞく
母は先生です。|はははせんせいです。|My mother is a teacher.|母|はは
父は車で行きます。|ちちはくるまでいきます。|My father goes by car.|車|くるま'''
sentences=[]
for i,line in enumerate(sentence_text.splitlines()):
 text,reading,en,target,kana_reading=line.split('|');sentences.append(dict(id=f's-{i}',char=text,reading=reading,meanings=[en],target=target,targetReading=kana_reading,kind='sentence',on=[],kun=[]))
for name,value in [('kanji',kanji),('kana',kana),('strokes',strokes),('sentences',sentences)]:
 (OUT/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps(dict(kanji=len(kanji),kana=len(kana),vocabulary=len(vocab),sentences=len(sentences),stroke_sets=len(strokes),missing_strokes=[k['char'] for k in kanji+kana if k['char'] not in strokes])))
from runpy import run_path
run_path(str(ROOT/'scripts'/'build-vocab.py'))['build']()
