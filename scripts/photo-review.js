'use strict';
const STORAGE_KEY = 'sommer2027-photo-review-v1';
const photoRoot = document.querySelector('#photos');
const filter = document.querySelector('#filter');
const search = document.querySelector('#search');
const summary = document.querySelector('#summary');
let entries = [];
let decisions = {};
try { decisions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { decisions = {}; }
const wrong = {
  'loire-boot':'Schlosszimmer statt Bootsfahrt',
  'blois':'Aufnahme aus Alluyes statt Blois',
  'boot':'Île de Sein statt Île de Ré',
  'abend-hafen':'Paris-Illustration statt Hafenrestaurant',
  'lepal-zoo':'King-Kong-Banner statt Tierpark',
  'chenonceau':'Nur Glockenturm statt repräsentativer Schlossansicht'
};
const uncertain = {
  'amboise-altstadt':'Leonardo-Statue statt Gesamtansicht der Altstadt',
  'amboise-markt':'Historische Zeichnung statt heutiger Markt',
  'caves':'Allgemeiner Amboise-Treffer; Höhlenkeller nicht belegt',
  'rivedoux':'Brücke statt Strand oder Dorf',
  'fort-pree':'Historische Darstellung statt aktueller Ansicht',
  '14juillet':'Feuerwerk aus Wissous, nicht am Ferienort',
  'lepal-parc':'Karussellmotiv; Parkzuordnung anhand der Quelle prüfen',
  'pal-pause':'Futterautomat statt ruhiger Tierbeobachtung',
  'vauban':'Festungsbezug anhand der Originalaufnahme bestätigen'
};
function score(e) {
  if (!e.photo) return {value:null,reason:'Noch kein Bildkandidat vorhanden. Recherche nötig.'};
  if (wrong[e.id]) return {value:8,reason:wrong[e.id]+'; laut vorhandener Katalogprüfung ungeeignet.'};
  if (uncertain[e.id]) return {value:48,reason:uncertain[e.id]+'. Bitte Bild und Originalseite prüfen.'};
  if (e.status === 'approved') return {value:94,reason:'Bereits redaktionell freigegeben. Bestehende Freigabe im Katalog.'};
  const title = (e.photo.title || '').toLowerCase();
  const query = (e.query || '').toLowerCase();
  const tokens = query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(x=>x.length>4);
  const normalized = title.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const matches = tokens.filter(t=>normalized.includes(t)).length;
  const value = Math.min(82,60+matches*7);
  return {value,reason:'Dateiname und Suchbegriff erscheinen plausibel ('+matches+' Treffer). Keine visuelle oder Lizenzprüfung; bitte Originalseite öffnen.'};
}
function el(tag,cls,text) {const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
function save() {localStorage.setItem(STORAGE_KEY,JSON.stringify(decisions));render();}
function render() {
  photoRoot.replaceChildren();
  const q=search.value.trim().toLowerCase();
  const visible=entries.filter(e=>{
    const d=decisions[e.id]?.decision;
    return (filter.value==='all'||filter.value==='pending'&&!d||filter.value==='decided'&&!!d||filter.value==='missing'&&!e.photo)
      &&(e.name.toLowerCase().includes(q)||e.id.toLowerCase().includes(q));
  });
  const counts=Object.values(decisions).reduce((n,d)=>(d?.decision==='approved'&&n.approved++,d?.decision==='rejected'&&n.rejected++,n),{approved:0,rejected:0});
  summary.textContent=entries.length+' Aktivitäten · '+counts.approved+' von dir bestätigt · '+counts.rejected+' abgelehnt · '+(entries.length-counts.approved-counts.rejected)+' offen';
  if(!visible.length)photoRoot.append(el('p','muted','Keine Einträge für diese Auswahl.'));
  for(const e of visible) {
    const card=el('article','photo-card');
    if(e.photo?.url) {
      const img=el('img');img.src=e.photo.url;img.alt=e.photo.title||e.name;img.loading='lazy';img.referrerPolicy='no-referrer';
      img.addEventListener('error',()=>{img.replaceWith(el('div','empty-image','Bild nicht ladbar – Originalquelle prüfen'));});
      card.append(img);
    } else card.append(el('div','empty-image','Noch kein Bild'));
    const inner=el('div','inner');
    inner.append(el('h2','',e.name));
    inner.append(el('div','muted','Katalog: '+e.status+' · '+e.id));
    const s=score(e);
    const sc=el('div','score '+(s.value===null?'':s.value>=75?'high':s.value>=45?'mid':'low'),s.value===null?'Kein Score':s.value+'/100');
    sc.append(el('small','', ' · Metadaten-Score'));inner.append(sc);
    inner.append(el('p','why',s.reason));
    if(e.photo){
      inner.append(el('p','details',(e.photo.author||'Autor unbekannt')+' · '+(e.photo.license||'Lizenz unbekannt')));
      const link=el('a','', 'Originalbild und Lizenz ansehen ↗');
      link.href=e.photo.source;link.target='_blank';link.rel='noopener noreferrer';inner.append(link);
    }
    const actions=el('div','actions');
    for(const [decision,label,cls] of [['approved','Bestätigen',''],['rejected','Ablehnen','reject'],['later','Später','later']]){
      const button=el('button',cls+(decisions[e.id]?.decision===decision?' selected':''),label);
      button.type='button';button.disabled=decision==='approved'&&!e.photo;
      button.setAttribute('aria-pressed',String(decisions[e.id]?.decision===decision));
      button.addEventListener('click',()=>{
        decisions[e.id]={decision,checkedAt:new Date().toISOString().slice(0,10),reviewer:'Manuelle Bildfreigabe',score:s.value,notes:s.reason};
        save();
      });
      actions.append(button);
    }
    inner.append(actions);card.append(inner);photoRoot.append(card);
  }
}
filter.addEventListener('change',render);
search.addEventListener('input',render);
document.querySelector('#reset').addEventListener('click',()=>{if(confirm('Alle lokalen Entscheidungen wirklich zurücksetzen?')){decisions={};save();}});
document.querySelector('#export').addEventListener('click',()=>{
  const payload={schema:'sommer2027-photo-decisions-v1',exportedAt:new Date().toISOString(),decisions:Object.entries(decisions).map(([id,d])=>({id,...d}))};
  const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='sommer2027-bildfreigaben.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
fetch('../ACTIVITY_PHOTOS.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(data=>{entries=data;render();}).catch(err=>{summary.textContent='Fehler beim Laden: '+err.message;});
