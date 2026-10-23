// Task choice is driven by information needed; variant choice uses measured data.
const variants={pose:['lite','full','heavy'],hand:['hand']};
export function chooseModel({needsFingers=false,benchmarks,inferenceBudgetMs=25,actionAgeBudgetMs=150,
  maxMissRate=.1,maxFalseActionsPerMinute=.1}={}) {
  const task=needsFingers?'hand':'pose';
  if(benchmarks===undefined)return {task,variant:variants[task][0],evidence:'initial-unbenchmarked'};
  if(!Array.isArray(benchmarks))throw new Error('benchmarks must be an array');
  for(const variant of variants[task]){
    const row=benchmarks.find(b=>b.task===task&&b.variant===variant&&
      [b.inferenceP95Ms,b.actionAgeP95Ms,b.missRate,b.falseActionsPerMinute].every(n=>Number.isFinite(n)&&n>=0)&&
      b.inferenceP95Ms<=inferenceBudgetMs&&b.actionAgeP95Ms<=actionAgeBudgetMs&&
      b.missRate<=Math.min(1,maxMissRate)&&b.falseActionsPerMinute<=maxFalseActionsPerMinute);
    if(row)return {task,variant,evidence:'supplied-benchmarks'};
  }
  throw new Error('No measured model meets the supplied quality and latency budgets');
}

// vision is the installed @mediapipe/tasks-vision module; paths come from the game's
// versioned asset manifest. Lazy: imports of this file do not fetch or start anything.
export async function loadLandmarker({vision,wasmRoot,modelUrl,selection,numTracks=1}) {
  if(!selection||!variants[selection.task]?.includes(selection.variant))throw new Error('Invalid model selection');
  if(typeof wasmRoot!=='string'||!wasmRoot||typeof modelUrl!=='string'||!modelUrl)throw new Error('Pinned WASM and model paths are required');
  if(!Number.isInteger(numTracks)||numTracks<1)throw new Error('numTracks must be a positive integer');
  const fileset=await vision.FilesetResolver.forVisionTasks(wasmRoot);
  const Task=selection.task==='hand'?vision.HandLandmarker:vision.PoseLandmarker;
  const errors=[];
  for(const delegate of ['GPU','CPU']){
    try {
      const options={baseOptions:{modelAssetPath:modelUrl,delegate},runningMode:'VIDEO',
        ...(selection.task==='hand'?{numHands:numTracks,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6}:
          {numPoses:numTracks,minPoseDetectionConfidence:.6,minPosePresenceConfidence:.6,minTrackingConfidence:.6,outputSegmentationMasks:false})};
      const landmarker=await Task.createFromOptions(fileset,options);
      return {landmarker,delegate,selection,close:()=>landmarker.close()};
    } catch(error){errors.push(error);}
  }
  throw new AggregateError(errors,'MediaPipe failed on both GPU and CPU; show an error and Retry');
}
