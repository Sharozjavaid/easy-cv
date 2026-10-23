import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameGuard,imagePoint,posePointValid,angleDegrees,segmentHitsCircle,toCanvas,measureSquat} from '../skills/easy-cv/assets/motion-core.mjs';
import {createSquatDetector,createHandPathDetector} from '../skills/easy-cv/assets/detectors.mjs';

function pose(down=false){
  const p=Array.from({length:33},()=>({x:.5,y:.2,visibility:1,presence:1}));
  for(const [i,x,y] of [[11,.4,down?.35:.2],[12,.6,down?.35:.2],[23,.43,down?.6:.45],[24,.57,down?.6:.45],
    [25,down?.34:.43,down?.70:.68],[26,down?.66:.57,down?.70:.68],[27,.43,.92],[28,.57,.92]])p[i]={x,y,visibility:1,presence:1};
  return p;
}
const frame=(t,landmarks=pose(),extra={})=>({landmarks,width:1000,height:1000,capturedAtMs:t,nowMs:t,key:'session:player',...extra});
const makeSquat=()=>createSquatDetector({baseline:measureSquat(pose(),1000,1000)});
function hold(squat,start,landmarks,duration=200,hz=30,extra={}){
  const events=[];for(let t=start;t<start+duration;t+=1000/hz)events.push(...squat.update(frame(t,landmarks,extra)).events);return events;
}

test('aspect correction preserves pixel geometry and mirrors only display',()=>{
  const a=imagePoint({x:.2,y:.4},1600,900),b=imagePoint({x:.4,y:.4},1600,900);
  assert.ok(Math.abs((b.x-a.x)-320/900)<1e-9);
  assert.equal(angleDegrees({x:0,y:1},{x:0,y:0},{x:1,y:0}),90);
  assert.equal(angleDegrees({x:0,y:0},{x:0,y:0},{x:1,y:0}),null);
  assert.deepEqual(toCanvas({x:.25,y:.5},{videoWidth:1600,videoHeight:900,canvasWidth:800,canvasHeight:450,mirror:true}),{x:600,y:225});
});
test('cover cropping and contain letterbox match centered image',()=>{
  const cfg={videoWidth:1600,videoHeight:900,canvasWidth:400,canvasHeight:400,mirror:false};
  assert.equal(toCanvas({x:0,y:0},{...cfg,fit:'contain'}).y,87.5);
  assert.ok(toCanvas({x:0,y:0},{...cfg,fit:'cover'}).x<0);
  assert.equal(imagePoint({x:1,y:1},0,100),null);
});
test('pose confidence fails closed, rejects NaN and out-of-frame points',()=>{
  assert.equal(posePointValid({x:.2,y:.2}),false);
  assert.equal(posePointValid({x:.2,y:.2,visibility:1,presence:.1}),false);
  assert.equal(posePointValid({x:NaN,y:.2,visibility:1}),false);
  assert.equal(posePointValid({x:1.1,y:.2,visibility:1}),false);
});
test('segment intersects a region between frames, rejects nearby miss',()=>{
  assert.equal(segmentHitsCircle({x:0,y:0},{x:10,y:0},{x:5,y:0},.5),true);
  assert.equal(segmentHitsCircle({x:0,y:0},{x:10,y:0},{x:5,y:2},.5),false);
  assert.equal(segmentHitsCircle({x:0,y:0},{x:0,y:0},{x:0,y:0},.5),true);
  assert.equal(segmentHitsCircle({x:NaN,y:0},{x:0,y:0},{x:0,y:0},.5),false);
});
test('frame guard rejects stale, future, duplicate, backward; identifies gap and session changes',()=>{
  const g=new FrameGuard();
  assert.equal(g.check(frame(100)).accept,true);
  assert.equal(g.check(frame(100)).accept,false);
  assert.equal(g.check(frame(90)).accept,false);
  assert.equal(g.check(frame(110,pose(),{nowMs:500})).accept,false);
  assert.equal(g.check(frame(600,pose(),{nowMs:500})).accept,false);
  assert.equal(g.check(frame(400)).reason,'tracking-gap');
  assert.equal(g.check(frame(10,pose(),{key:'new'})).reason,'identity-or-session-change');
});
for(const hz of [15,30,60])test(`squat produces one onset and rep at ${hz} Hz, no repeat while held`,()=>{
  const s=makeSquat();assert.deepEqual(hold(s,0,pose(),300,hz),[]);
  assert.deepEqual(hold(s,300,pose(true),600,hz),['squat-start']);
  assert.deepEqual(hold(s,900,pose(),300,hz),['squat-release','squat-rep']);
});
test('starting crouched does not arm; standing then squatting does',()=>{
  const s=makeSquat();assert.deepEqual(hold(s,0,pose(true),400),[]);
  assert.deepEqual(hold(s,400,pose(),400),[]);
  assert.deepEqual(hold(s,800,pose(true),400),['squat-start']);
});
test('lean without hip descent cannot trigger squat',()=>{
  const s=makeSquat();hold(s,0,pose());const lean=pose();lean[11].y=lean[12].y=.34;
  assert.deepEqual(hold(s,200,lean,400),[]);
});
test('brief dip, missing joints, and lost tracking cannot release or add a rep',()=>{
  const s=makeSquat();hold(s,0,pose());assert.deepEqual(s.update(frame(200,pose(true))).events,[]);
  assert.deepEqual(hold(s,230,pose(),200),[]);
  hold(s,450,pose(true));s.update(frame(650,null));
  assert.deepEqual(hold(s,680,pose(),400),[]);
});
test('long gap, reset, or changed player cancels a pending squat',()=>{
  for(const mode of ['gap','reset','player']){
    const s=makeSquat();hold(s,0,pose());hold(s,200,pose(true));
    if(mode==='reset')s.reset();
    assert.deepEqual(hold(s,mode==='gap'?1000:400,pose(),300,30,mode==='player'?{key:'other'}:{}),[]);
  }
});
test('invalid or stale input cancels pending progress',()=>{
  for(const extra of [{nowMs:1000},{capturedAtMs:150},{capturedAtMs:NaN}]){
    const s=makeSquat();hold(s,0,pose());hold(s,200,pose(true));s.update(frame(400,pose(),extra));
    assert.deepEqual(hold(s,500,pose(),300),[]);
  }
});
test('baseline is not mutable through the caller',()=>{
  const b=measureSquat(pose(),1000,1000);const s=createSquatDetector({baseline:b});b.hip.y=10;
  hold(s,0,pose());assert.deepEqual(hold(s,200,pose(true)),['squat-start']);
});
const handFrame=(t,x,extra={})=>({point:{x,y:.4},anchor:{x:.5,y:.2},observed:true,capturedAtMs:t,nowMs:t,key:'session:hand',...extra});
test('hand path requires actual image travel despite shoulder jitter',()=>{
  const s=createHandPathDetector({scale:.2});
  s.update(handFrame(0,.4));
  const result=s.update(handFrame(50,.4,{anchor:{x:.35,y:.2}}));
  assert.equal(result.segment,null);
});
test('deliberate hand movement emits path at original capture times',()=>{
  const s=createHandPathDetector({scale:.2});s.update(handFrame(0,.3));
  const {segment}=s.update(handFrame(50,.4));assert.deepEqual(segment.from,{x:.3,y:.4});
  assert.deepEqual(segment.to,{x:.4,y:.4});assert.equal(segment.capturedAtMs,50);
  assert.equal(segment.fromCapturedAtMs,0);
});
test('tracking loss, unobserved prediction, teleport and identity switches cannot connect a path',()=>{
  for(const mode of ['loss','prediction','spike','identity']){
    const s=createHandPathDetector({scale:.2});s.update(handFrame(0,.3));
    const middle=mode==='loss'?{point:null}:mode==='prediction'?{observed:false}:mode==='spike'?{point:{x:2,y:.4}}:{key:'other'};
    assert.equal(s.update(handFrame(40,.4,middle)).segment,null);
    if(mode!=='identity')assert.equal(s.update(handFrame(80,.5)).segment,null);
  }
});
test('slow or tiny motion emits no path and gaps never connect old points',()=>{
  const s=createHandPathDetector({scale:.2});s.update(handFrame(0,.3));
  assert.equal(s.update(handFrame(50,.301)).segment,null);
  assert.equal(s.update(handFrame(1000,.6)).segment,null);
});
