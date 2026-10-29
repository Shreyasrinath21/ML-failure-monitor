// Dependency-free logistic regression. Features are standardized before fitting.
export const FEATURES = ['latency_ms', 'error_rate', 'cpu_pct', 'memory_pct', 'drift_score', 'request_rate'];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function makeTelemetry(rng = Math.random, n = 2000) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const stressed = rng() < 0.25;
    const latency_ms = clamp(85 + rng()*100 + (stressed ? 180 : 0) + (rng()-.5)*60, 20, 900);
    const error_rate = clamp(0.012 + rng()*.025 + (stressed ? .12 : 0) + (rng()-.5)*.02, 0, .5);
    const cpu_pct = clamp(38 + rng()*28 + (stressed ? 38 : 0) + (rng()-.5)*12, 1, 100);
    const memory_pct = clamp(48 + rng()*22 + (stressed ? 25 : 0) + (rng()-.5)*10, 1, 100);
    const drift_score = clamp(rng()*.18 + (stressed ? .3 : 0) + (rng()-.5)*.08, 0, 1);
    const request_rate = clamp(90 + rng()*70 + (stressed ? 75 : 0) + (rng()-.5)*40, 1, 500);
    const risk = -6.0 + latency_ms*.007 + error_rate*15 + cpu_pct*.025 + memory_pct*.018 + drift_score*4.0 + request_rate*.004;
    const probability = 1 / (1 + Math.exp(-risk));
    rows.push({ latency_ms, error_rate, cpu_pct, memory_pct, drift_score, request_rate, failure: +(rng() < probability) });
  }
  return rows;
}
export function fit(rows, epochs=900, lr=.08) {
  const means = FEATURES.map(k => rows.reduce((s,r)=>s+r[k],0)/rows.length);
  const scales = FEATURES.map((k,j)=>Math.sqrt(rows.reduce((s,r)=>s+(r[k]-means[j])**2,0)/rows.length)||1);
  const X = rows.map(r=>FEATURES.map((k,j)=>(r[k]-means[j])/scales[j]));
  let w = Array(FEATURES.length).fill(0), b=0;
  for(let epoch=0;epoch<epochs;epoch++){
    const gw=Array(w.length).fill(0); let gb=0;
    for(let i=0;i<rows.length;i++){
      const z=b+X[i].reduce((s,x,j)=>s+x*w[j],0), p=1/(1+Math.exp(-clamp(z,-30,30))), e=p-rows[i].failure;
      gb+=e; for(let j=0;j<w.length;j++)gw[j]+=e*X[i][j];
    }
    const rate=lr/rows.length;
    for(let j=0;j<w.length;j++) w[j]-=rate*(gw[j]+.02*w[j]);
    b-=rate*gb;
  }
  return { version:'1.0.0', trained_at:new Date().toISOString(), samples:rows.length, features:FEATURES, means, scales, weights:w, bias:b };
}
export function predict(model, input) {
  const z=model.bias+FEATURES.reduce((s,k,j)=>s+((input[k]-model.means[j])/model.scales[j])*model.weights[j],0);
  return 1/(1+Math.exp(-clamp(z,-30,30)));
}
