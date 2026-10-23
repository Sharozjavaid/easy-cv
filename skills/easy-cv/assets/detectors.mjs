import {FrameGuard,measureSquat,distance,finitePoint} from './motion-core.mjs';

// Strict full-body example; thresholds need evaluation for the intended camera view.
// Baseline must come from an upright calibrated player in the same camera geometry.
export function createSquatDetector({baseline,enterDrop=.18,exitDrop=.08,downAngle=155,upAngle=165,confirmMs=80,...timing}={}) {
  if (!baseline || !finitePoint(baseline.hip) || !finitePoint(baseline.shoulder) ||
      !Number.isFinite(baseline.torso) || baseline.torso<=0 || !Number.isFinite(baseline.width)||baseline.width<=0)
    throw new Error('A valid upright baseline is required');
  if (!(enterDrop>exitDrop && exitDrop>=0 && downAngle<upAngle && confirmMs>=0)) throw new Error('Invalid squat thresholds');
  // Copy to prevent a caller from moving the standing anchor during an action.
  const base={...baseline,hip:{...baseline.hip},shoulder:{...baseline.shoulder}};
  const guard=new FrameGuard(timing);
  let phase='unknown',candidate=null,since=null;
  const clear=()=>{phase='unknown';candidate=null;since=null;};
  return {
    reset(){guard.reset();clear();},
    update(frame) {
      const check=guard.check(frame);
      if(check.reset)clear();
      if(!check.accept)return {phase,events:[],reason:check.reason};
      const m=measureSquat(frame.landmarks,frame.width,frame.height);
      if(!m){clear();return {phase,events:[],reason:'required-joints-unavailable'};}
      const depth=(m.hip.y-base.hip.y)/base.torso;
      const shoulderDrop=(m.shoulder.y-base.shoulder.y)/base.torso;
      const scale=m.width/base.width;
      if(scale<.65||scale>1.4||m.torso/base.torso<.55||m.torso/base.torso>1.45){
        clear();return {phase,events:[],reason:'recalibrate-scale',depth};
      }
      const upright=depth<exitDrop && Math.abs(shoulderDrop-depth)<.2 && m.knees.every(k=>k>upAngle);
      const down=depth>enterDrop && shoulderDrop>.08 && Math.abs(shoulderDrop-depth)<.3 && m.knees.every(k=>k<downAngle);
      const target=phase==='unknown'?(upright?'standing':null):phase==='standing'?(down?'down':null):(upright?'standing':null);
      const events=[];
      if(target===null){candidate=null;since=null;}
      else {
        if(candidate!==target){candidate=target;since=frame.capturedAtMs;}
        if(frame.capturedAtMs-since>=confirmMs){
          if(phase==='standing' && target==='down')events.push('squat-start');
          if(phase==='down' && target==='standing')events.push('squat-release','squat-rep');
          phase=target;candidate=null;since=null;
        }
      }
      return {phase,events,depth,reason:phase==='unknown'?'stand-to-arm':'tracked'};
    }
  };
}

// Input point + anchor are observed aspect-corrected image coordinates, not pixels
// mixed with normalized units. scale is a fixed calibrated shoulder width in that space.
export function createHandPathDetector({scale,minSpeed=1,minTravel=.20,maxSpeed=25,windowMs=180,...timing}={}) {
  if(!Number.isFinite(scale)||scale<=0)throw new Error('A calibrated body scale is required');
  const guard=new FrameGuard(timing);
  let history=[];
  return {
    reset(){guard.reset();history=[];},
    update(frame) {
      const check=guard.check(frame);
      if(check.reset)history=[];
      if(!check.accept)return {segment:null,reason:check.reason};
      if(frame.observed!==true || !finitePoint(frame.point)||!finitePoint(frame.anchor)){
        history=[];return {segment:null,reason:'observation-required'};
      }
      const p={point:{...frame.point},relative:{x:(frame.point.x-frame.anchor.x)/scale,y:(frame.point.y-frame.anchor.y)/scale},t:frame.capturedAtMs};
      const prev=history.at(-1);
      history=history.filter(s=>p.t-s.t<=windowMs);
      if(!prev){history=[p];return {segment:null,reason:'warming-up'};}
      const dt=(p.t-prev.t)/1000;
      const relativeSpeed=distance(p.relative,prev.relative)/dt;
      const imageSpeed=distance(p.point,prev.point)/scale/dt;
      if(relativeSpeed>maxSpeed||imageSpeed>maxSpeed){history=[];return {segment:null,reason:'implausible-speed'};}
      history.push(p);
      const first=history[0];
      const active=relativeSpeed>=minSpeed && imageSpeed>=minSpeed &&
        distance(p.relative,first.relative)>=minTravel && distance(p.point,first.point)/scale>=minTravel;
      return {segment:active?{from:{...prev.point},to:{...p.point},fromCapturedAtMs:prev.t,capturedAtMs:p.t}:null,
        reason:active?'moving':'slow-or-small',relativeSpeed,imageSpeed};
    }
  };
}
