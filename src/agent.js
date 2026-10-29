import {FEATURES} from './model.js';

const TITLES={latency_ms:'Latency',error_rate:'Error rate',cpu_pct:'CPU utilization',memory_pct:'Memory utilization',drift_score:'Input drift',request_rate:'Request volume'};

// A local tool-using incident agent: it gathers event, model, drift, and alert
// evidence, then chooses an ordered runbook. It never changes production state.
export function runIncidentAgent({prediction,model,drift,alerts}){
  const trace=[];
  const inspectEvent=()=>{const result={id:prediction.id,model_version:prediction.model_version||model.version,risk:prediction.risk,probability:prediction.probability,telemetry:prediction.input};trace.push({tool:'inspect_prediction',purpose:'Load the selected prediction and telemetry',result:`${result.risk} risk at ${(result.probability*100).toFixed(1)}%`});return result};
  const event=inspectEvent();
  const contributions=FEATURES.map((feature,i)=>({feature,label:TITLES[feature],value:event.telemetry[feature],baseline:model.means[i],contribution:((event.telemetry[feature]-model.means[i])/model.scales[i])*model.weights[i]})).sort((a,b)=>b.contribution-a.contribution);
  trace.push({tool:'explain_model_score',purpose:'Rank standardized feature contributions to the logistic regression score',result:`Largest positive driver: ${TITLES[contributions[0].feature]} (+${contributions[0].contribution.toFixed(2)} log-odds)`});
  const shifted=drift.filter(x=>x.psi!==null&&x.psi>=.1).sort((a,b)=>b.psi-a.psi);
  trace.push({tool:'inspect_feature_drift',purpose:'Check production features against training bins using PSI',result:shifted.length?`${shifted.length} feature(s) above PSI 0.10; highest ${TITLES[shifted[0].feature]} (${shifted[0].psi.toFixed(2)})`:'No monitored feature exceeds PSI 0.10'});
  const open=alerts.filter(a=>!a.acknowledged);
  trace.push({tool:'inspect_open_alerts',purpose:'Check unresolved alerts for relevant context',result:`${open.length} open alert(s)`});
  const top=contributions.filter(x=>x.contribution>0).slice(0,3),plan=[];
  if(event.risk==='HIGH')plan.push({priority:'NOW',title:'Validate the incident against service health',detail:'Compare the prediction timestamp with error rate, latency percentiles, and recent incident logs. Treat the score as a triage signal, not confirmation.'});
  if(top.some(x=>x.feature==='latency_ms')||event.telemetry.latency_ms>model.means[0]+model.scales[0])plan.push({priority:'NOW',title:'Trace the latency increase',detail:'Check request queues, dependency timings, and p95/p99 latency. Compare the affected endpoint with its normal baseline before changing capacity.'});
  if(top.some(x=>x.feature==='error_rate')||event.telemetry.error_rate>model.means[1]+model.scales[1])plan.push({priority:'HIGH',title:'Inspect recent errors',detail:'Group new errors by endpoint and deployment. Check upstream timeouts, retries, and recent release changes.'});
  if(top.some(x=>x.feature==='cpu_pct')||event.telemetry.cpu_pct>model.means[2]+model.scales[2])plan.push({priority:'HIGH',title:'Check compute saturation',detail:'Review worker utilization, queue depth, and autoscaling events. Confirm whether saturation is sustained before scaling.'});
  if(top.some(x=>x.feature==='memory_pct')||event.telemetry.memory_pct>model.means[3]+model.scales[3])plan.push({priority:'HIGH',title:'Check memory pressure',detail:'Inspect memory growth, garbage collection, and container limits. Look for a leak or an unusually large request payload.'});
  if(shifted.length)plan.push({priority:'HIGH',title:'Investigate production data shift',detail:`Start with ${TITLES[shifted[0].feature]} (PSI ${shifted[0].psi.toFixed(2)}). Validate schema, preprocessing, and upstream data sources; compare against the training window.`});
  if(!plan.length)plan.push({priority:'ROUTINE',title:'Monitor and collect an outcome label',detail:'The score is below the high-risk threshold and no strong drift signal is present. Review the next monitoring window and label this prediction when the outcome is known.'});
  if(open.length)plan.push({priority:'FOLLOW UP',title:'Review unresolved monitoring alerts',detail:`There are ${open.length} open alert(s). Acknowledge each only after its owner and follow-up are recorded.`});
  const severity=event.risk==='HIGH'?'Elevated':event.risk==='MEDIUM'?'Guarded':'Routine';
  const summary=`${severity} failure risk (${(event.probability*100).toFixed(1)}%). ${top.length?`Primary model signals: ${top.map(x=>TITLES[x.feature]).join(', ')}.`:'No feature has a strong positive contribution.'} ${shifted.length?`${shifted.length} feature distribution(s) also show drift.`:'No significant feature drift was detected.'}`;
  trace.push({tool:'build_investigation_plan',purpose:'Select and order safe runbook steps using model and monitoring evidence',result:`${plan.length} recommended step(s); no external action was taken`});
  return{agent:'ModelGuard Incident Triage Agent',mode:'local explainable tool workflow',created_at:new Date().toISOString(),prediction:event,summary,drivers:contributions,drift:shifted,open_alerts:open.slice(0,10),plan,trace,guardrail:'Recommendations only. The agent does not alter services, models, or alerts.'};
}
