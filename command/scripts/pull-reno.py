from playwright.sync_api import sync_playwright
import json
U='https://script.google.com/a/macros/bluecoastbeachhotel.com/s/AKfycbzoBKnIsFfgx9af7kKMItxyaAuOrehS-l149g1VV23d_VVmoBt_RoqE2lQbdtYMjxNZ/exec'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    pg=b.new_page()
    pg.goto(U,timeout=90000); pg.wait_for_timeout(15000)
    for f in pg.frames:
        if 'googleusercontent' in f.url:
            try:
                r=f.evaluate("""()=>{ if(typeof overall!=='function') return null; var o=overall();
                 var c={}; S.data.items.forEach(i=>{c[i.status]=(c[i.status]||0)+1});
                 var st={}; S.data.areas.forEach(a=>{var s=areaStats(a); st[s.state]=(st[s.state]||0)+1});
                 return JSON.stringify({o:o,counts:c,areaStates:st,left:daysTo(S.data.settings.deadline),xmas:daysTo(S.data.settings.xmas),DONE:typeof DONE!=='undefined'?DONE:null, other:S.data.items.filter(isOther).length});}""")
                if r: print(r); break
            except Exception as e: print('err',e)
    b.close()
