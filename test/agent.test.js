import test from 'node:test';
import assert from 'node:assert/strict';
import {runIncidentAgent} from '../src/agent.js';

test('incident agent explains model signals and builds a drift-aware runbook without side effects',()=>{
  const model={version:'1.0.0',means:Array(6).fill(0),scales:Array(6).fill(1),weights:[2,1,.2,.2,1,0]};
  const prediction={id:'demo-1',model_version:'1.0.0',risk:'HIGH',probability:.91,input:{latency_ms:320,error_rate:.18,cpu_pct:88,memory_pct:80,drift_score:.6,request_rate:200}};
  const report=runIncidentAgent({prediction,model,drift:[{feature:'latency_ms',psi:.45,status:'HIGH'}],alerts:[{id:'a1',acknowledged:false}]});
  assert.equal(report.trace.length,5);assert.ok(report.drivers[0].contribution>0);assert.ok(report.plan.some(x=>x.title.includes('data shift')));assert.ok(report.plan.some(x=>x.title.includes('latency')));assert.match(report.guardrail,/does not alter/);
});
