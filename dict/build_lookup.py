# Build the app's reverse lookups (pinyin -> 汉字, English -> 汉字) from its own
# CC-CEDICT shards. Ranking: SUBTLEX-CH (film subtitles = everyday speech),
# HSK level, and words already in Sam's lessons.
#
#   python3 dict/build_lookup.py <repo> <repo>/dict   (needs: pip install wordfreq)
#
# subtlex.tsv and hsk.json are not in the repo. Get them with
#   npm pack hanzi hsk-words   (SUBTLEX-CH-WF in hanzi/lib/data, GBK -> iconv to
#   UTF-8; hsk-words db/hsk-words.sqlite -> {simplified: level} JSON)
# and put them next to this script. Re-run after big vocab.json changes so new
# lesson words win their English lookups.
import json,glob,math,re,collections,unicodedata,sys,os
from wordfreq import get_frequency_dict
REPO=sys.argv[1]; OUT=sys.argv[2]; HERE=os.path.dirname(os.path.abspath(__file__))
D={}
for f in sorted(glob.glob(REPO+'/dict/w*.json')): D.update(json.load(open(f)))
SUB={}
for line in open(HERE+'/subtlex.tsv',encoding='utf-8'):
    p=line.rstrip('\r\n').split('\t')
    if len(p)>3:
        try: SUB[p[0]]=float(p[2])
        except ValueError: pass
WF=get_frequency_dict('zh')
HSK=json.load(open(HERE+'/hsk.json'))
V=json.load(open(REPO+'/vocab.json'))
APP={w['hanzi'] for l in V['lessons'] for w in l.get('words',[]) if w.get('hanzi')}
BAD=re.compile(r'surname|variant of|used in |Taiwan pr|abbr\.|old name|archaic|classical|literary|dialect|Cantonese|place name|county|city in|province|transliteration|^see |slang|Internet|erhua|euphemism|vulgar|derog|honorific|onom',re.I)
def freq(w):
    if w in SUB: return math.log10(SUB[w])            # per million
    if w in WF: return math.log10(WF[w]*1e6)-0.7
    return -3.0
def senses(g):
    out=[]
    for s in g.rstrip('…').split(';'):
        s=re.sub(r'\([^)]*\)','',s).strip().lower()
        s=re.sub(r'^(to|a|an|the) ','',s).strip(' .!?')
        if s: out.append(s)
    return out
def normpy(p): return unicodedata.normalize('NFC',re.sub(r"[^a-zǜ-ͯ]",'',unicodedata.normalize('NFD',p.lower().replace('u:','ü'))))
def notone(k): return ''.join(c for c in unicodedata.normalize('NFD',k) if unicodedata.category(c)!='Mn').replace('ü','u')
# never offer these to a 7-year-old, whatever the ranking says
ADULT=re.compile(r'breast|sex|penis|vagin|genital|prostitut|whore|fuck|testic|scrot|anus|erotic|porn|nipple|masturb|intercourse|bitch|cunt|slut|condom|brothel|rape',re.I)
# a few everyday words where the dictionary ranking picks a near-miss
OVERRIDE={'teacher':'老师','milk':'牛奶','star':'星星','moon':'月亮','hot':'热','strong':'强壮',
  'grandpa':'爷爷','grandma':'奶奶','mom':'妈妈','mommy':'妈妈','dad':'爸爸','daddy':'爸爸',
  'wrestling':'摔跤','wrestle':'摔跤','scared':'害怕','afraid':'害怕','shoe':'鞋子','sock':'袜子',
  'grandfather':'爷爷','grandmother':'奶奶','baby':'宝宝','fast':'快','car':'汽车','rice':'米饭',
  'bird':'鸟','see you tomorrow':'明天见','thank you':'谢谢','good night':'晚安','good morning':'早上好',
  'jiu-jitsu':'柔术','jiujitsu':'柔术','lego':'乐高','tarantula':'捕鸟蛛',
  'inspire':'启发','inspired':'受到启发','inspiring':'鼓舞人心'}
MIN=-1.5   # weaker than this and the app treats it as "no confident match"
PY={};PT={};EN={}
def put(idx,k,w,sc):
    if k and sc>=MIN and (k not in idx or sc>idx[k][1]): idx[k]=(w,sc)
for w,(p,g) in D.items():
    if not re.fullmatch(r'[㐀-鿿]+',w): continue
    if ADULT.search(g): continue
    ss=senses(g)
    if not ss: continue
    base=freq(w)
    if BAD.search(g.split(';')[0]): base-=3
    if w in APP: base+=3
    lv=HSK.get(w)
    if lv: base+= 1.0 if lv<=3 else 0.5
    if len(w)>=2: base+=0.6   # 兔子 over 兔, 老虎 over 虎: the word a child says
    base-=0.25*min(len(ss)-1,4)  # specific words beat many-sense ones
    k=normpy(p)
    put(PY,k,w,base); put(PT,notone(k),w,base)
    for i,s in enumerate(ss[:3]):
        ws=s.split()
        if len(ws)>4: continue
        put(EN,s,w,base-0.8*i)
        # "older brother" also answers "brother"
        if len(ws)==2 and re.match(r'^(older|younger|elder|paternal|maternal|little|small)$',ws[0]):
            put(EN,ws[1],w,base-0.5*i-0.6)
# Sam's own lesson words win for their English, then the hand overrides
for l in V['lessons']:
    for x in l.get('words',[]):
        e=re.sub(r'^(to|a|an|the) ','',(x.get('en') or '').strip().lower()).strip(' .!?')
        if e and x.get('hanzi') and re.fullmatch(r'[\u3400-\u9fff]+',x['hanzi']): EN[e]=(x['hanzi'],99)
for e,w in OVERRIDE.items(): EN[e]=(w,100)
def shard(idx,name):
    by=collections.defaultdict(dict)
    for k,(w,sc) in idx.items():
        by[k[0] if 'a'<=k[0]<='z' else '_'][k]=w
    os.makedirs(OUT,exist_ok=True); tot=0
    for c,m in by.items():
        s=json.dumps(m,ensure_ascii=False,separators=(',',':'),sort_keys=True)
        open(f'{OUT}/{name}-{c}.json','w').write(s); tot+=len(s.encode())
    print(name,len(idx),'keys',tot//1024,'KB')
shard(PY,'py'); shard(PT,'pt'); shard(EN,'en')
