import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTelemetry,fit,predict,FEATURES} from '../src/model.js';
test('synthetic telemetry contains valid feature ranges and labels',()=>{const rows=makeTelemetry(()=>.5,20);assert.equal(rows.length,20);for(const r of rows){assert.ok(r.latency_ms>0);assert.ok(r.error_rate>=0&&r.error_rate<=.5);assert.ok(FEATURES.every(k=>Number.isFinite(r[k])));assert.ok([0,1].includes(r.failure));}});
test('trained classifier returns a probability and higher-risk signals increase score',()=>{let i=0;const rows=makeTelemetry(()=>{i=(i*9301+49297)%233280;return i/233280},1000),m=fit(rows,400);const low={latency_ms:80,error_rate:.005,cpu_pct:20,memory_pct:35,drift_score:0,request_rate:40},high={latency_ms:600,error_rate:.3,cpu_pct:98,memory_pct:98,drift_score:.9,request_rate:400};assert.ok(predict(m,low)>=0&&predict(m,low)<=1);assert.ok(predict(m,high)>predict(m,low));});
