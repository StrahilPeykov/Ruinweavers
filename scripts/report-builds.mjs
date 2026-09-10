import { readFileSync, writeFileSync } from 'node:fs';
const report=[];
for(const set of ['development','held-out']) {
  const data=JSON.parse(readFileSync(`artifacts/build-0.2/${set}-final-summary.json`));
  for(const mode of ['delayed-aim','exact-state'])
  for(const name of ['reaction','field','structure','basin-ember'])
  for(const count of name==='basin-ember'?[0]:[0,1,2,3]) {
    const a=data.rows.filter(x=>x.name===name&&x.count===count&&x.mode===mode);
    const mean=key=>+(a.reduce((sum,x)=>sum+x[key],0)/a.length).toFixed(2);
    const uses={};for(const row of a)for(const [key,n] of Object.entries(row.usage)) {
      const kind=key.split(':')[2];uses[kind]=(uses[kind]??0)+n;
    }
    report.push({set,mode,name,count,wins:a.filter(x=>x.result==='victory').length,cases:a.length,seconds:mean('seconds'),damage:mean('damage'),staggerSeconds:mean('staggerSeconds'),uses,peakPacket:Math.max(...a.map(x=>x.peaks.packet)),peakPending:Math.max(...a.map(x=>x.peaks.pending))});
  }
}
writeFileSync('artifacts/build-0.2/results.json',JSON.stringify(report,null,2));
console.table(report.filter(x=>x.mode==='delayed-aim').map(({uses,...r})=>({...r,uses:JSON.stringify(uses)})));
