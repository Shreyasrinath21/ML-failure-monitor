import {trainModel} from './trainer.js';
const result=trainModel(),m=result.evaluation;
console.log(`Model ${result.model.version}: ${result.train_samples} train / ${result.test_samples} held-out synthetic rows. Test accuracy ${(100*m.accuracy).toFixed(1)}%, precision ${(100*m.precision).toFixed(1)}%, recall ${(100*m.recall).toFixed(1)}%, F1 ${(100*m.f1).toFixed(1)}%.`);
