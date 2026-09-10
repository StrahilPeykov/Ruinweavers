import {readFileSync,writeFileSync} from 'node:fs';
const [input,output]=process.argv.slice(2);
const data=JSON.parse(readFileSync(input,'utf8'));
const sum=(r,prefix)=>Object.entries(r).filter(([k])=>k.startsWith(prefix)).reduce((s,[,n])=>s+n,0);
data.rows=data.rows.map(r=>({
  scenario:r.scenario,encounter:r.encounter,mode:r.mode,name:r.name,count:r.count,upgrades:r.upgrades,result:r.result,seconds:r.seconds,damage:r.damage,
  casts:r.casts,switches:r.switches,reactions:r.reactions,
  usage:Object.fromEntries(Object.entries(r.outcomes).filter(([k])=>k.startsWith('upgrade:'))),
  fields:sum(r.outcomes,'field:'),staggerSeconds:sum(r.outcomes,'control:stagger-seconds:'),airborneSeconds:sum(r.outcomes,'control:airborne-seconds:'),
  projectileEvents:Object.fromEntries(Object.entries(r.outcomes).filter(([k])=>k.includes(':blocked')||k.includes(':deflected'))),
  peaks:r.peaks,
  enemyDamage:r.damageRoutes.filter(d=>d.recipient.startsWith('encounter-')).reduce((s,d)=>s+d.amount,0),
  collateral:r.damageRoutes.filter(d=>!d.recipient.startsWith('encounter-')),
}));
writeFileSync(output,JSON.stringify(data));
