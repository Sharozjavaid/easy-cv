import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseModel,loadLandmarker} from '../skills/easy-cv/assets/model-loader.mjs';
const row=(variant,extra={})=>({task:'pose',variant,inferenceP95Ms:15,actionAgeP95Ms:70,missRate:.05,falseActionsPerMinute:0,...extra});
test('starts with Pose Lite, detailed fingers require Hands',()=>{
  assert.equal(chooseModel().variant,'lite');assert.equal(chooseModel({needsFingers:true}).task,'hand');
});
test('upgrades only with acceptable quality and latency evidence',()=>{
  assert.equal(chooseModel({benchmarks:[row('lite',{missRate:.4}),row('full'),row('heavy')]}).variant,'full');
  assert.equal(chooseModel({benchmarks:[row('heavy'),row('lite')]}).variant,'lite');
  assert.throws(()=>chooseModel({benchmarks:[row('heavy',{inferenceP95Ms:60})]}),/No measured/);
});
test('no acceptable data is explicit; malformed or wrong-task measurements do not qualify',()=>{
  assert.throws(()=>chooseModel({benchmarks:[]}),/No measured/);
  assert.throws(()=>chooseModel({benchmarks:[row('lite',{missRate:NaN})]}),/No measured/);
  assert.throws(()=>chooseModel({needsFingers:true,benchmarks:[row('lite')]}),/No measured/);
});
function mock(failures=[]){
  const calls=[];let closed=0;
  const Task={createFromOptions:async(fileset,options)=>{calls.push(options);if(failures.includes(options.baseOptions.delegate))throw new Error(options.baseOptions.delegate);return {close(){closed++;}};}};
  return {vision:{FilesetResolver:{forVisionTasks:async path=>({path})},PoseLandmarker:Task,HandLandmarker:Task},calls,get closed(){return closed;}};
}
const args=m=>({vision:m.vision,wasmRoot:'./wasm',modelUrl:'./models/selected.task',selection:chooseModel()});
test('loads only selected model and GPU; exposes explicit disposal',async()=>{
  const m=mock();const task=await loadLandmarker(args(m));assert.equal(m.calls.length,1);
  assert.equal(m.calls[0].runningMode,'VIDEO');assert.equal(m.calls[0].numPoses,1);
  assert.equal(m.calls[0].baseOptions.modelAssetPath,'./models/selected.task');task.close();assert.equal(m.closed,1);
});
test('GPU failure falls back to CPU; both failures remain visible',async()=>{
  const m=mock(['GPU']);const t=await loadLandmarker(args(m));assert.equal(t.delegate,'CPU');assert.equal(m.calls.length,2);
  await assert.rejects(loadLandmarker(args(mock(['GPU','CPU']))),AggregateError);
});
test('Hands gets hand options and invalid selection fails before loading',async()=>{
  const m=mock();await loadLandmarker({...args(m),selection:chooseModel({needsFingers:true}),numTracks:2});
  assert.equal(m.calls[0].numHands,2);assert.equal(m.calls[0].numPoses,undefined);
  await assert.rejects(loadLandmarker({...args(m),selection:{task:'hand',variant:'heavy'}}),/Invalid/);
});
