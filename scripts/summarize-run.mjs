// Reduce repeated renderer metadata and rolling correction samples in handoff evidence.
// Full local originals remain under ignored raw/retained-summaries.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
const root = 'artifacts/build-0.2';
mkdirSync(`${root}/raw/retained-summaries`, {recursive:true});
const render = ({art, ...r}) => ({...r, art: art && Object.fromEntries(Object.entries(art).filter(([k])=> k !== 'bounds'))});
for (const name of ['final-solo','final-coop-lightweight','final-coop-standard','first-offer-solo','first-offer-coop','recorded-reaction','recorded-field','recorded-structure']) {
  const path=`${root}/${name}.json`, data=JSON.parse(readFileSync(path));
  copyFileSync(path, `${root}/raw/retained-summaries/${name}.json`);
  data.environment.render=render(data.environment.render);
  for(const m of data.measurements) m.render=render(m.render);
  for(const t of data.transport ?? []) {
    const values=t.presentation?.correctionDistances;
    if(values) {
      t.presentation.corrections={samples:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,max:values.length?Math.max(...values):null};
      delete t.presentation.correctionDistances;
    }
  }
  writeFileSync(path,JSON.stringify(data));
}
