const state = {
  speed: 18, angle: 45, gravity: 9.8, target: 26, time: 0, timeScale: 1,
  running: false, mode: "decompose", guideStep: 0, showComponents: true,
  showAcceleration: true, showStrobe: true, showCompare: true, dragging: false, samples: []
};

const refs = {
  canvas: document.getElementById("projectileCanvas"), positionChart: document.getElementById("positionChart"), secondaryChart: document.getElementById("secondaryChart"),
  sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")), routeSteps: Array.from(document.querySelectorAll(".route-step")),
  speedInput: document.getElementById("speedInput"), angleInput: document.getElementById("angleInput"), gravityInput: document.getElementById("gravityInput"), targetInput: document.getElementById("targetInput"), timeInput: document.getElementById("timeInput"), timeScaleInput: document.getElementById("timeScaleInput"),
  speedValue: document.getElementById("speedValue"), angleValue: document.getElementById("angleValue"), gravityValue: document.getElementById("gravityValue"), targetValue: document.getElementById("targetValue"), timeValue: document.getElementById("timeValue"), timeScaleValue: document.getElementById("timeScaleValue"),
  xMetric: document.getElementById("xMetric"), yMetric: document.getElementById("yMetric"), vxMetric: document.getElementById("vxMetric"), vyMetric: document.getElementById("vyMetric"), motionNature: document.getElementById("motionNature"), motionExplanation: document.getElementById("motionExplanation"),
  modeTitle: document.getElementById("modeTitle"), modeGoal: document.getElementById("modeGoal"), stateBadge: document.getElementById("stateBadge"), stageHint: document.getElementById("stageHint"), positionStatus: document.getElementById("positionStatus"), secondaryKicker: document.getElementById("secondaryKicker"), secondaryTitle: document.getElementById("secondaryTitle"), sampleStatus: document.getElementById("sampleStatus"),
  stepIndex: document.getElementById("stepIndex"), stepTitle: document.getElementById("stepTitle"), stepPrompt: document.getElementById("stepPrompt"), formulaReadout: document.getElementById("formulaReadout"), targetNote: document.getElementById("targetNote"),
  playButton: document.getElementById("playButton"), pauseButton: document.getElementById("pauseButton"), restartButton: document.getElementById("restartButton"), resetButton: document.getElementById("resetButton"), lowAngleButton: document.getElementById("lowAngleButton"), highAngleButton: document.getElementById("highAngleButton"), recordButton: document.getElementById("recordButton"), clearDataButton: document.getElementById("clearDataButton"),
  anglePresets: Array.from(document.querySelectorAll("[data-angle]")), planetButtons: Array.from(document.querySelectorAll("[data-gravity]")),
  showComponentsToggle: document.getElementById("showComponentsToggle"), showAccelerationToggle: document.getElementById("showAccelerationToggle"), showStrobeToggle: document.getElementById("showStrobeToggle"), showCompareToggle: document.getElementById("showCompareToggle"),
  guideButton: document.getElementById("guideButton"), guideDialog: document.getElementById("guideDialog"), stepButton: document.getElementById("stepButton"), focusButton: document.getElementById("focusButton"), fullscreenButton: document.getElementById("fullscreenButton")
};

const ctx = refs.canvas.getContext("2d"), positionCtx = refs.positionChart.getContext("2d"), secondaryCtx = refs.secondaryChart.getContext("2d");
const modes = {
  decompose: { title:"运动分解", goal:"曲线运动来自两个方向的独立演化", hint:"拖动发射矢量可同时改变速度与角度" },
  apex: { title:"最高点", goal:"最高点竖直速度为零，但物体并未静止", hint:"时间已定位到最高点" },
  range: { title:"射程优化", goal:"同速同高度时，45° 射程最大", hint:"改变角度，观察 R-θ 曲线" },
  predict: { title:"落点预测", goal:"同一目标通常对应一高一低两条弹道", hint:"设置目标距离并切换两组解析解" }
};
const guide = [
  { title:"分解初速度", prompt:"水平分量决定前进快慢，竖直分量决定上升时间和高度。" },
  { title:"独立计算", prompt:"水平方向没有加速度，竖直方向始终具有向下的重力加速度。" },
  { title:"合成运动", prompt:"同一时刻的 x、y 和 vx、vy 分别合成位置与瞬时速度。" }
];

function clamp(v,min,max){ return Math.min(max,Math.max(min,Number(v))); }
function fmt(v,d=2){ return Number(v).toFixed(d); }
function calculate(source=state){
  const speed=Math.max(.01,Number(source.speed)), angle=clamp(source.angle,.01,89.99), gravity=Math.max(.01,Number(source.gravity));
  const rad=angle*Math.PI/180, vx0=speed*Math.cos(rad), vy0=speed*Math.sin(rad);
  const apexTime=vy0/gravity, flightTime=2*apexTime, range=vx0*flightTime, maxHeight=vy0*vy0/(2*gravity);
  const t=clamp(source.time ?? 0,0,flightTime);
  return { speed,angle,gravity,vx0,vy0,apexTime,flightTime,range,maxHeight,t,x:vx0*t,y:Math.max(0,vy0*t-.5*gravity*t*t),vx:vx0,vy:vy0-gravity*t };
}
function targetSolutions(source=state){
  const speed=Math.max(.01,Number(source.speed)), gravity=Math.max(.01,Number(source.gravity)), target=Math.max(0,Number(source.target));
  const ratio=gravity*target/(speed*speed);
  if(ratio>1+1e-9) return {reachable:false,maxRange:speed*speed/gravity,low:null,high:null};
  const low=.5*Math.asin(clamp(ratio,-1,1))*180/Math.PI;
  return {reachable:true,maxRange:speed*speed/gravity,low,high:90-low};
}
function pointAt(t,source=state){ return calculate({...source,time:t}); }
function setCanvasSize(canvas,context){ const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(320,Math.round(r.width)),h=Math.max(180,Math.round(r.height)); if(canvas.width!==w*d||canvas.height!==h*d){canvas.width=w*d;canvas.height=h*d;} context.setTransform(d,0,0,d,0,0); return {width:w,height:h}; }
function arrow(c,x1,y1,x2,y2,color,label,width=3){ const a=Math.atan2(y2-y1,x2-x1); c.save();c.strokeStyle=color;c.fillStyle=color;c.lineWidth=width;c.lineCap="round";c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-10*Math.cos(a-.52),y2-10*Math.sin(a-.52));c.lineTo(x2-10*Math.cos(a+.52),y2-10*Math.sin(a+.52));c.closePath();c.fill();c.font="700 11px ui-monospace,monospace";c.textAlign=x2>=x1?"left":"right";c.fillText(label,x2+(x2>=x1?7:-7),y2-7);c.restore(); }

function sceneMap(width,height,d){
  const pad={l:46,r:25,t:28,b:42},xMax=Math.max(12,d.range*1.12,state.target*1.08),yMax=Math.max(5,d.maxHeight*1.35);
  return {x:v=>pad.l+v/xMax*(width-pad.l-pad.r),y:v=>height-pad.b-v/yMax*(height-pad.t-pad.b),pad,xMax,yMax};
}
function drawGrid(width,height,map){
  ctx.strokeStyle="rgba(216,222,217,.08)";ctx.lineWidth=1;ctx.fillStyle="#77817b";ctx.font="9px ui-monospace,monospace";
  for(let i=0;i<=5;i++){const x=map.pad.l+(width-map.pad.l-map.pad.r)*i/5,y=map.pad.t+(height-map.pad.t-map.pad.b)*i/5;ctx.beginPath();ctx.moveTo(x,map.pad.t);ctx.lineTo(x,height-map.pad.b);ctx.stroke();ctx.beginPath();ctx.moveTo(map.pad.l,y);ctx.lineTo(width-map.pad.r,y);ctx.stroke();ctx.textAlign="center";ctx.fillText(fmt(map.xMax*i/5,0),x,height-18);ctx.textAlign="right";ctx.fillText(fmt(map.yMax*(5-i)/5,0),map.pad.l-7,y+3);}
  ctx.fillStyle="#9ca69f";ctx.textAlign="right";ctx.fillText("x / m",width-9,height-18);ctx.textAlign="left";ctx.fillText("y / m",map.pad.l,14);
}
function traceTrajectory(map,d,angle,color,dashed=false){
  const alt=calculate({...state,angle,time:0});ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2.4;if(dashed)ctx.setLineDash([5,5]);ctx.beginPath();for(let i=0;i<=140;i++){const p=pointAt(alt.flightTime*i/140,{...state,angle});const x=map.x(p.x),y=map.y(p.y);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.restore();
}
function drawScene(){
  const {width,height}=setCanvasSize(refs.canvas,ctx),d=calculate(),map=sceneMap(width,height,d),p=pointAt(state.time);
  ctx.clearRect(0,0,width,height);ctx.fillStyle="#0c0f0e";ctx.fillRect(0,0,width,height);drawGrid(width,height,map);
  ctx.strokeStyle="#69736d";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(map.pad.l,map.y(0));ctx.lineTo(width-map.pad.r,map.y(0));ctx.stroke();
  if(state.showCompare&&(state.mode==="range"||state.mode==="predict")){ const comparison=state.mode==="predict"?targetSolutions():{reachable:true,low:90-state.angle,high:90-state.angle}; if(comparison.reachable){const a=state.mode==="predict"?(Math.abs(state.angle-comparison.low)<1?comparison.high:comparison.low):90-state.angle;if(Math.abs(a-state.angle)>.2)traceTrajectory(map,d,a,"rgba(181,140,229,.75)",true);} }
  traceTrajectory(map,d,state.angle,"#69d18e");
  if(state.showStrobe){ctx.fillStyle="rgba(100,199,217,.62)";for(let i=0;i<=10;i++){const q=pointAt(d.flightTime*i/10),x=map.x(q.x),y=map.y(q.y);ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();}}
  const apex=pointAt(d.apexTime),ax=map.x(apex.x),ay=map.y(apex.y);ctx.fillStyle="#f2b84b";ctx.beginPath();ctx.arc(ax,ay,4,0,Math.PI*2);ctx.fill();ctx.font="700 10px system-ui,sans-serif";ctx.textAlign="center";ctx.fillText("最高点 vy=0",ax,ay-12);
  if(state.mode==="predict"){ctx.strokeStyle="#b58ce5";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(map.x(state.target),map.y(0)-18);ctx.lineTo(map.x(state.target),map.y(0)+4);ctx.stroke();ctx.fillStyle="#b58ce5";ctx.fillText(`目标 ${fmt(state.target,1)} m`,map.x(state.target),map.y(0)-24);}
  const px=map.x(p.x),py=map.y(p.y);ctx.fillStyle="#ecebdd";ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
  const vectorScale=Math.min(4.5,width/180);if(state.showComponents){arrow(ctx,px,py,px+p.vx*vectorScale,py,"#64c7d9",`vx ${fmt(p.vx,1)}`);if(Math.abs(p.vy)>.03)arrow(ctx,px,py,px,py-p.vy*vectorScale,"#f2b84b",`vy ${fmt(p.vy,1)}`);arrow(ctx,px,py,px+p.vx*vectorScale,py-p.vy*vectorScale,"#69d18e","v",2);}
  if(state.showAcceleration)arrow(ctx,px+10,py+8,px+10,py+8+Math.min(54,state.gravity*4),"#ff7a68","g",3);
  if(state.time<.02){const ox=map.x(0),oy=map.y(0);ctx.strokeStyle="rgba(105,209,142,.2)";ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+d.vx0*vectorScale,oy-d.vy0*vectorScale);ctx.stroke();}
  ctx.fillStyle="#9ca69f";ctx.textAlign="left";ctx.font="10px ui-monospace,monospace";ctx.fillText(`R = ${fmt(d.range)} m   H = ${fmt(d.maxHeight)} m   T = ${fmt(d.flightTime)} s`,map.pad.l,height-4);
}

function axes(c,width,height,xMax,yMax,yMin,labels){const p={l:42,r:14,t:18,b:31},w=width-p.l-p.r,h=height-p.t-p.b;c.strokeStyle="rgba(216,222,217,.14)";c.fillStyle="#7f8a83";c.font="9px ui-monospace,monospace";for(let i=0;i<=4;i++){const x=p.l+w*i/4,y=p.t+h*i/4;c.beginPath();c.moveTo(x,p.t);c.lineTo(x,p.t+h);c.stroke();c.beginPath();c.moveTo(p.l,y);c.lineTo(p.l+w,y);c.stroke();c.textAlign="center";c.fillText(fmt(xMax*i/4,1),x,height-10);c.textAlign="right";c.fillText(fmt(yMax-(yMax-yMin)*i/4,1),p.l-6,y+3);}c.textAlign="left";c.fillText(labels.y,p.l,10);c.textAlign="right";c.fillText(labels.x,width-5,height-10);return{x:v=>p.l+v/xMax*w,y:v=>p.t+(yMax-v)/(yMax-yMin)*h};}
function plot(c,points,map,color){c.strokeStyle=color;c.lineWidth=2.2;c.beginPath();points.forEach((p,i)=>i?c.lineTo(map.x(p.x),map.y(p.y)):c.moveTo(map.x(p.x),map.y(p.y)));c.stroke();}
function drawPositionChart(){const {width,height}=setCanvasSize(refs.positionChart,positionCtx),d=calculate();positionCtx.clearRect(0,0,width,height);positionCtx.fillStyle="#111512";positionCtx.fillRect(0,0,width,height);const map=axes(positionCtx,width,height,d.flightTime,Math.max(d.range,d.maxHeight)*1.08,0,{x:"t / s",y:"x,y / m"}),xs=[],ys=[];for(let i=0;i<=100;i++){const p=pointAt(d.flightTime*i/100);xs.push({x:p.t,y:p.x});ys.push({x:p.t,y:p.y});}plot(positionCtx,xs,map,"#64c7d9");plot(positionCtx,ys,map,"#f2b84b");positionCtx.fillStyle="#64c7d9";positionCtx.fillText("x(t)",50,31);positionCtx.fillStyle="#f2b84b";positionCtx.fillText("y(t)",88,31);}
function drawSecondaryChart(){const {width,height}=setCanvasSize(refs.secondaryChart,secondaryCtx),d=calculate();secondaryCtx.clearRect(0,0,width,height);secondaryCtx.fillStyle="#111512";secondaryCtx.fillRect(0,0,width,height);
  if(state.mode==="range"||state.mode==="predict"){const maxR=d.speed*d.speed/d.gravity,map=axes(secondaryCtx,width,height,90,maxR*1.1,0,{x:"θ / °",y:"R / m"}),points=[];for(let a=0;a<=90;a++)points.push({x:a,y:d.speed*d.speed*Math.sin(2*a*Math.PI/180)/d.gravity});plot(secondaryCtx,points,map,"#69d18e");state.samples.forEach(s=>{secondaryCtx.fillStyle="#b58ce5";secondaryCtx.beginPath();secondaryCtx.arc(map.x(s.angle),map.y(s.range),3,0,Math.PI*2);secondaryCtx.fill();});secondaryCtx.fillStyle="#f2b84b";secondaryCtx.beginPath();secondaryCtx.arc(map.x(state.angle),map.y(d.range),5,0,Math.PI*2);secondaryCtx.fill();return;}
  const maxV=Math.max(d.speed,d.vy0)*1.15,map=axes(secondaryCtx,width,height,d.flightTime,maxV,-maxV,{x:"t / s",y:"v / (m/s)"}),vxs=[],vys=[];for(let i=0;i<=100;i++){const p=pointAt(d.flightTime*i/100);vxs.push({x:p.t,y:p.vx});vys.push({x:p.t,y:p.vy});}plot(secondaryCtx,vxs,map,"#64c7d9");plot(secondaryCtx,vys,map,"#f2b84b");}

function phaseInfo(d){if(d.t<.025)return{label:"发射时刻",nature:"初速度已分解",text:"vx 与 vy 从同一个初速度矢量分解得到",cls:""};if(Math.abs(d.t-d.apexTime)<.025)return{label:"最高点",nature:"vy = 0，v = vx",text:"物体仍以恒定水平速度向前运动",cls:"is-apex"};if(d.t>=d.flightTime-.025)return{label:"落地",nature:"y = 0",text:"竖直速度大小恢复为初始竖直分量",cls:"is-landed"};if(d.t<d.apexTime)return{label:"上升",nature:"上升 · 速率减小",text:`vx 保持不变，vy 每秒减少 ${fmt(d.gravity,1)} m/s`,cls:""};return{label:"下降",nature:"下降 · 速率增大",text:"vx 保持不变，vy 方向向下且绝对值增大",cls:"is-falling"};}
function setProgress(input){const p=(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100;input.style.setProperty("--range-progress",`${p}%`);}
function syncUI(){const d=calculate(),phase=phaseInfo(d),mode=modes[state.mode],task=guide[state.guideStep],solutions=targetSolutions();
  refs.speedValue.textContent=`${fmt(state.speed,1)} m/s`;refs.angleValue.textContent=`${fmt(state.angle,0)}°`;refs.gravityValue.textContent=`${fmt(state.gravity,1)} m/s²`;refs.targetValue.textContent=`${fmt(state.target,1)} m`;refs.timeValue.textContent=`t = ${fmt(state.time)} s`;refs.timeScaleValue.textContent=`${fmt(state.timeScale)}×`;
  refs.xMetric.textContent=`${fmt(d.x)} m`;refs.yMetric.textContent=`${fmt(d.y)} m`;refs.vxMetric.textContent=`${fmt(d.vx)} m/s`;refs.vyMetric.textContent=`${fmt(d.vy)} m/s`;refs.motionNature.textContent=phase.nature;refs.motionExplanation.textContent=phase.text;refs.stateBadge.textContent=phase.label;refs.stateBadge.className=`state-badge ${phase.cls}`.trim();
  refs.modeTitle.textContent=mode.title;refs.modeGoal.textContent=mode.goal;refs.stageHint.textContent=mode.hint;refs.positionStatus.textContent=`T = ${fmt(d.flightTime)} s`;refs.sampleStatus.textContent=`${state.samples.length} 个记录点`;refs.secondaryKicker.textContent=(state.mode==="range"||state.mode==="predict")?"RANGE RESPONSE":"VELOCITY HISTORY";refs.secondaryTitle.textContent=(state.mode==="range"||state.mode==="predict")?"射程 R – 发射角 θ":"vx(t) 与 vy(t)";
  refs.stepIndex.textContent=`0${state.guideStep+1}`;refs.stepTitle.textContent=task.title;refs.stepPrompt.textContent=task.prompt;refs.formulaReadout.textContent=state.mode==="range"?`R = ${fmt(d.range)} m，Rmax = ${fmt(d.speed*d.speed/d.gravity)} m`:state.mode==="predict"?(solutions.reachable?`θ低 = ${fmt(solutions.low,1)}°，θ高 = ${fmt(solutions.high,1)}°`:`D > Rmax = ${fmt(solutions.maxRange)} m`):`vx = ${fmt(d.vx)} m/s，vy = ${fmt(d.vy)} m/s`;
  refs.targetNote.textContent=solutions.reachable?`可达：低弹道 ${fmt(solutions.low,1)}°，高弹道 ${fmt(solutions.high,1)}°。`:`不可达：当前最大射程为 ${fmt(solutions.maxRange,1)} m。`;refs.lowAngleButton.disabled=!solutions.reachable;refs.highAngleButton.disabled=!solutions.reachable;
  refs.timeInput.max=d.flightTime;refs.timeInput.value=state.time;refs.playButton.textContent=state.running?"播放中…":"▶ 播放";refs.playButton.setAttribute("aria-pressed",String(state.running));
  refs.sceneTabs.forEach(b=>b.classList.toggle("is-active",b.dataset.mode===state.mode));refs.routeSteps.forEach((b,i)=>b.classList.toggle("is-active",i===state.guideStep));refs.anglePresets.forEach(b=>b.classList.toggle("is-active",Math.abs(Number(b.dataset.angle)-state.angle)<.1));refs.planetButtons.forEach(b=>b.classList.toggle("is-active",Math.abs(Number(b.dataset.gravity)-state.gravity)<.05));
  [refs.speedInput,refs.angleInput,refs.gravityInput,refs.targetInput,refs.timeInput,refs.timeScaleInput].forEach(setProgress);
}
function render(){drawScene();drawPositionChart();drawSecondaryChart();syncUI();}
function setState(patch){if(patch.speed!==undefined)state.speed=clamp(patch.speed,5,35);if(patch.angle!==undefined)state.angle=clamp(patch.angle,5,85);if(patch.gravity!==undefined)state.gravity=clamp(patch.gravity,1.6,16);if(patch.target!==undefined)state.target=clamp(patch.target,2,45);if(patch.timeScale!==undefined)state.timeScale=clamp(patch.timeScale,.25,2);if(patch.time!==undefined)state.time=clamp(patch.time,0,calculate({...state,...patch}).flightTime);if(patch.running!==undefined)state.running=Boolean(patch.running);refs.speedInput.value=state.speed;refs.angleInput.value=state.angle;refs.gravityInput.value=state.gravity;refs.targetInput.value=state.target;refs.timeScaleInput.value=state.timeScale;render();}
function setMode(mode){state.mode=mode;state.running=false;if(mode==="apex")state.time=calculate().apexTime;else if(mode==="range")state.time=0;else if(mode==="predict"){state.time=0;const s=targetSolutions();if(s.reachable)state.angle=s.low;}else state.time=0;refs.angleInput.value=state.angle;render();}
function record(){const d=calculate();state.samples.push({angle:state.angle,range:d.range,time:d.flightTime,height:d.maxHeight});if(state.samples.length>40)state.samples.shift();render();}

[[refs.speedInput,"speed"],[refs.angleInput,"angle"],[refs.gravityInput,"gravity"],[refs.targetInput,"target"],[refs.timeScaleInput,"timeScale"]].forEach(([input,key])=>input.addEventListener("input",()=>{state.running=false;state.time=0;setState({[key]:input.value});}));
refs.timeInput.addEventListener("input",()=>{state.running=false;setState({time:refs.timeInput.value});});refs.sceneTabs.forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));refs.routeSteps.forEach((b,i)=>b.addEventListener("click",()=>{state.guideStep=i;render();}));refs.anglePresets.forEach(b=>b.addEventListener("click",()=>{state.time=0;setState({angle:b.dataset.angle});}));refs.planetButtons.forEach(b=>b.addEventListener("click",()=>{state.time=0;setState({gravity:b.dataset.gravity});}));
refs.playButton.addEventListener("click",()=>{if(state.time>=calculate().flightTime-.01)state.time=0;state.running=true;render();});refs.pauseButton.addEventListener("click",()=>{state.running=false;render();});refs.restartButton.addEventListener("click",()=>{state.time=0;state.running=true;render();});refs.lowAngleButton.addEventListener("click",()=>{const s=targetSolutions();if(s.reachable)setState({angle:s.low,time:0});});refs.highAngleButton.addEventListener("click",()=>{const s=targetSolutions();if(s.reachable)setState({angle:s.high,time:0});});refs.recordButton.addEventListener("click",record);refs.clearDataButton.addEventListener("click",()=>{state.samples=[];render();});
refs.resetButton.addEventListener("click",()=>{Object.assign(state,{speed:18,angle:45,gravity:9.8,target:26,time:0,timeScale:1,running:false,mode:"decompose",guideStep:0,samples:[]});setState(state);});
[[refs.showComponentsToggle,"showComponents"],[refs.showAccelerationToggle,"showAcceleration"],[refs.showStrobeToggle,"showStrobe"],[refs.showCompareToggle,"showCompare"]].forEach(([input,key])=>input.addEventListener("change",()=>{state[key]=input.checked;render();}));
refs.guideButton.addEventListener("click",()=>refs.guideDialog.showModal());refs.stepButton.addEventListener("click",()=>{state.guideStep=(state.guideStep+1)%3;render();});refs.focusButton.addEventListener("click",()=>{const active=document.body.classList.toggle("focus-mode");refs.focusButton.setAttribute("aria-pressed",String(active));});refs.fullscreenButton.addEventListener("click",()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen());
function pointerToLaunch(event){const r=refs.canvas.getBoundingClientRect(),d=calculate(),map=sceneMap(r.width,r.height,d),ox=map.x(0),oy=map.y(0),dx=event.clientX-r.left-ox,dy=oy-(event.clientY-r.top),visual=Math.hypot(dx,dy),angle=Math.atan2(Math.max(0,dy),Math.max(1,dx))*180/Math.PI,speed=clamp(visual/4.5,5,35);state.running=false;state.time=0;setState({speed,angle});}
refs.canvas.addEventListener("pointerdown",e=>{state.dragging=true;refs.canvas.setPointerCapture(e.pointerId);pointerToLaunch(e);});refs.canvas.addEventListener("pointermove",e=>{if(state.dragging)pointerToLaunch(e);});refs.canvas.addEventListener("pointerup",e=>{state.dragging=false;refs.canvas.releasePointerCapture(e.pointerId);});refs.canvas.addEventListener("pointercancel",()=>{state.dragging=false;});window.addEventListener("resize",render);
let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(state.running){const d=calculate();state.time=Math.min(d.flightTime,state.time+dt*state.timeScale);if(state.time>=d.flightTime-.0001)state.running=false;render();}requestAnimationFrame(frame);}
window.projectileLab={calculate:s=>calculate({...state,...s}),targetSolutions:s=>targetSolutions({...state,...s}),pointAt:(t,s={})=>pointAt(t,{...state,...s}),getState:()=>({...state,samples:state.samples.map(x=>({...x}))}),setState,setMode,record};
render();requestAnimationFrame(frame);
