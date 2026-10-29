# ModelGuard: Intelligent ML Model Failure Prediction and Monitoring System

Semester end MLOps project: an end-to-end, locally runnable dashboard and REST API that predicts whether an ML-backed service will fail in the next hour using service telemetry, then records predictions, raises risk/drift alerts, and collects feedback to estimate observed accuracy.

## What is included

- Synthetic, labeled telemetry generator (latency, error rate, CPU, memory, input drift, request volume).
- Logistic regression trainer implemented in plain JavaScript; model artifacts are versioned JSON (`data/model.json`).
- HTTP prediction API and interactive dashboard with risk trend, feature monitoring, and alert feed.
- Drift simulation to create a shifted production batch and show monitoring alerts.
- Prediction history and feedback persisted locally in `data/monitoring.json`.
- Multi-page operations console with overview, predictions, data drift, alerts, model evaluation, and settings/API reference.
- Local AI incident triage agent that uses model explanations, drift checks, and open-alert review to assemble a transparent investigation plan.
- Project-specific shield/network/pulse logo in the dashboard and favicon.
- CSV batch scoring with per-batch downloadable results and optional ground-truth ingestion.
- Feedback-trained candidate models with held-out comparisons, explicit promotion, and model rollback.
- Outcome calibration (Brier score and reliability buckets), repeated PSI drift scans, incident owners/notes/status, and an opt-in scheduled telemetry monitor.
- PSI-based drift detection, alert acknowledgement, filterable prediction history, CSV export, and configurable risk bands.
- Tests for synthetic data and model scoring.
- Held-out evaluation (accuracy, precision, recall, F1, confusion matrix) in `data/evaluation.json` and reproducible CSV telemetry in `data/telemetry.csv`.
- Dockerfile and GitHub Actions CI workflow.

## Requirements and run

Install Node.js 20 or newer. This version intentionally has no external npm dependencies.

```powershell
npm test
npm run train
npm start
```

Open <http://localhost:3000>. Click **Run prediction** to score the example telemetry. Click **Simulate drift** to generate a shifted batch and alert. **Reset demo** clears the local monitoring history. You can also start without running the trainer: the server trains and writes a starter model if `data/model.json` is missing.

## REST API

`GET /api/health` reports service status and model version. `GET /api/metrics` returns KPIs, PSI drift history, incidents, batches, calibration and recent predictions. `GET /api/model` returns held-out evaluation and registry details. `GET /api/export/predictions.csv` exports prediction history. `POST /api/predict` accepts JSON and returns a risk score. `POST /api/batch/score` accepts `{"rows":[...]}` with up to 5,000 telemetry rows; `/api/export/batch/<id>.csv` downloads its results. `POST /api/agent/triage` accepts `{"prediction_id":"<id>"}` and returns the explainable incident report and tool trace. Example prediction:

```json
{"latency_ms":420,"error_rate":0.12,"cpu_pct":91,"memory_pct":83,"drift_score":0.45,"request_rate":220}
```

`POST /api/simulate?count=120` creates up to 500 shifted telemetry events. `POST /api/feedback` accepts `{"id":"<prediction id>","failure":true}` to record an observed label and update calibration. After 20 labeled rows, `POST /api/retrain/feedback` creates a candidate; `POST /api/models/<version>/promote` promotes it, and `POST /api/models/rollback` with a version restores a previous model. `POST /api/incidents/<id>/update` stores owner, notes, and status. `POST /api/monitoring/config` turns scheduled local telemetry scoring on or off (disabled by default). `POST /api/drift/snapshot` records a PSI scan; a sustained drift alert requires three consecutive high-PSI scans. `POST /api/settings` accepts `{"low":0.35,"high":0.65}`. `POST /api/reset` clears monitoring records while preserving model, risk bands, and scheduler configuration.

## Model and monitoring design

The model standardizes six numerical features, fits logistic regression with gradient descent, and emits a probability. The training script makes an 80/20 train/test split and writes held-out accuracy, precision, recall, F1, and confusion matrix. Risk bands default to LOW (<35%), MEDIUM (35-65%), and HIGH (>=65%); they are configurable in Settings. HIGH scores produce alerts. Feature drift uses the Population Stability Index (PSI) across training quantile bins; the simulation intentionally raises latency/error/drift to demonstrate a distribution shift. Production accuracy is only shown after feedback labels arrive.

The incident agent runs locally without an external AI key. It uses four inspectable tools: load the prediction, explain logistic regression feature contributions, check PSI drift, and review open alerts. It then selects relevant runbook steps. The agent provides recommendations only and does not mutate services or monitoring records.

### Container run

```powershell
docker build -t modelguard .
docker run --rm -p 3000:3000 -v "${PWD}/data:/app/data" modelguard
```

## Suggested project report and viva outline

1. Problem statement, motivation, and objectives.
2. Data schema, synthetic generation assumptions, and class balance.
3. Logistic regression, standardization, loss/gradient descent, and threshold selection.
4. Serving architecture: dashboard → HTTP API → model → local monitoring store.
5. Monitoring: risk thresholds, feature drift indicators, alert lifecycle, and feedback metrics.
6. Demonstration: baseline score, high-risk score, drift simulation, API call, reset.
7. Results and limitations: synthetic data is suitable for demonstrating the MLOps lifecycle, not validating real incidents. A production study needs representative labeled incident data, calibration, robust drift statistics, authentication, durable storage, and alert delivery.

## Architecture

```text
Synthetic telemetry ──> Trainer ──> model.json
                                │
Dashboard ──HTTP──> Node API ──> Logistic regression
                         │      ├─ risk score + threshold alert
                         └──────┴─ monitoring.json ──> metrics/feedback
```
