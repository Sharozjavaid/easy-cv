// Original reference helpers. All geometry must use one consistent space.
export const LM = Object.freeze({leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,
  leftWrist:15,rightWrist:16,leftHip:23,rightHip:24,leftKnee:25,rightKnee:26,leftAnkle:27,rightAnkle:28});
export const finitePoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
export const midpoint = (a,b) => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
export function imagePoint(p, width, height) {
  if (!finitePoint(p) || !(width>0) || !(height>0) || !Number.isFinite(width+height)) return null;
  return {x:p.x*width/height,y:p.y};
}
export function posePointValid(p, minConfidence=.6) {
  return finitePoint(p) && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1 &&
    Number.isFinite(p.visibility) && p.visibility>=minConfidence &&
    (p.presence===undefined || Number.isFinite(p.presence) && p.presence>=minConfidence);
}
export function angleDegrees(a,b,c) {
  if (![a,b,c].every(finitePoint)) return null;
  const u={x:a.x-b.x,y:a.y-b.y},v={x:c.x-b.x,y:c.y-b.y};
  const den=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);
  if (den<1e-9) return null;
  return Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/den)))*180/Math.PI;
}
export function measureSquat(landmarks,width,height,minConfidence=.6) {
  const ids=[11,12,23,24,25,26,27,28];
  if (!ids.every(i=>posePointValid(landmarks?.[i],minConfidence))) return null;
  const points=Object.fromEntries(ids.map(i=>[i,imagePoint(landmarks[i],width,height)]));
  if (!Object.values(points).every(finitePoint)) return null;
  const shoulder=midpoint(points[11],points[12]),hip=midpoint(points[23],points[24]);
  const torso=distance(shoulder,hip),bodyWidth=distance(points[11],points[12]);
  const knees=[angleDegrees(points[23],points[25],points[27]),angleDegrees(points[24],points[26],points[28])];
  if (torso<.08 || bodyWidth<.04 || shoulder.y>=hip.y || knees.some(k=>k===null)) return null;
  return {shoulder,hip,torso,width:bodyWidth,knees};
}
export function segmentHitsCircle(a,b,c,radius) {
  if (![a,b,c].every(finitePoint) || !Number.isFinite(radius) || radius<0) return false;
  const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
  const t=den===0?0:Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.y-a.y)*dy)/den));
  return Math.hypot(a.x+t*dx-c.x,a.y+t*dy-c.y)<=radius;
}
export function toCanvas(p,{videoWidth,videoHeight,canvasWidth,canvasHeight,mirror=true,fit='cover'}) {
  if (!finitePoint(p) || ![videoWidth,videoHeight,canvasWidth,canvasHeight].every(n=>Number.isFinite(n)&&n>0)) return null;
  if (!['cover','contain'].includes(fit)) throw new Error('fit must be cover or contain');
  const scale=(fit==='cover'?Math.max:Math.min)(canvasWidth/videoWidth,canvasHeight/videoHeight);
  const w=videoWidth*scale,h=videoHeight*scale;
  return {x:(canvasWidth-w)/2+(mirror?1-p.x:p.x)*w,y:(canvasHeight-h)/2+p.y*h};
}
// CapturedAt and now must share a monotonic clock. Key includes session + player identity.
export class FrameGuard {
  constructor({maxAgeMs=150,maxGapMs=250}={}) {this.maxAgeMs=maxAgeMs;this.maxGapMs=maxGapMs;this.reset();}
  reset(){this.last=null;this.key=null;}
  check({capturedAtMs,nowMs,key}) {
    if (!Number.isFinite(capturedAtMs)||!Number.isFinite(nowMs)||capturedAtMs>nowMs||nowMs-capturedAtMs>this.maxAgeMs)
      return {accept:false,reset:true,reason:'stale-or-invalid-time'};
    const changed=key!==this.key;
    if (!changed && this.last!==null && capturedAtMs<=this.last)
      return {accept:false,reset:true,reason:'non-increasing-time'};
    const gap=!changed && this.last!==null && capturedAtMs-this.last>this.maxGapMs;
    const first=this.last===null;
    this.key=key;this.last=capturedAtMs;
    return {accept:true,reset:changed||gap||first,reason:changed?'identity-or-session-change':gap?'tracking-gap':'fresh'};
  }
}
