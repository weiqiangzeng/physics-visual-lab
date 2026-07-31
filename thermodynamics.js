(function () {
  const M = window.ThermodynamicsModel;
  if (!M) throw new Error("ThermodynamicsModel is required");

  const state = {
    mode: "process",
    process: "isobaric",
    temperatureK: 300,
    pressureBar: 1,
    ratio: 1.5,
    gamma: 5 / 3,
    highPressureBar: 3,
    highVolumeL: 30,
    hotK: 600,
    coldK: 300,
    heatInputKJ: 1,
    requestedEfficiency: .3,
    progress: 0,
    running: false,
    guideStep: 0,
    showParticles: true,
    showFlow: true,
    showArea: true,
    showLimit: true,
    dragging: false,
  };
  const $ = (id) => document.getElementById(id);
  const R = {
    canvas: $("thermalCanvas"),
    pathChart: $("pathChart"),
    ledgerChart: $("ledgerChart"),
    sceneTabs: [...document.querySelectorAll(".scene-tab[data-mode]")],
    routeSteps: [...document.querySelectorAll(".route-step")],
    processButtons: [...document.querySelectorAll("[data-process]")],
    gammaButtons: [...document.querySelectorAll("[data-gamma]")],
    presets: [...document.querySelectorAll("[data-preset]")],
    processTypeSection: $("processTypeSection"),
    processSection: $("processSection"),
    cycleSection: $("cycleSection"),
    engineSection: $("engineSection"),
    temperatureInput: $("temperatureInput"),
    pressureInput: $("pressureInput"),
    ratioInput: $("ratioInput"),
    highPressureInput: $("highPressureInput"),
    highVolumeInput: $("highVolumeInput"),
    hotInput: $("hotInput"),
    coldInput: $("coldInput"),
    heatInput: $("heatInput"),
    efficiencyInput: $("efficiencyInput"),
    progressInput: $("progressInput"),
    temperatureValue: $("temperatureValue"),
    pressureValue: $("pressureValue"),
    ratioLabel: $("ratioLabel"),
    ratioValue: $("ratioValue"),
    gammaValue: $("gammaValue"),
    highPressureValue: $("highPressureValue"),
    highVolumeValue: $("highVolumeValue"),
    hotValue: $("hotValue"),
    coldValue: $("coldValue"),
    heatInputValue: $("heatInputValue"),
    efficiencyValue: $("efficiencyValue"),
    playbackValue: $("playbackValue"),
    modeTitle: $("modeTitle"),
    modeGoal: $("modeGoal"),
    stateBadge: $("stateBadge"),
    stageHint: $("stageHint"),
    metricLabels: [1, 2, 3, 4, 5, 6].map((n) => $("metric" + n + "Label")),
    metrics: [1, 2, 3, 4, 5, 6].map((n) => $("metric" + n)),
    thermalNature: $("thermalNature"),
    thermalExplanation: $("thermalExplanation"),
    pathTitle: $("pathTitle"),
    pathStatus: $("pathStatus"),
    ledgerTitle: $("ledgerTitle"),
    ledgerStatus: $("ledgerStatus"),
    stepIndex: $("stepIndex"),
    stepTitle: $("stepTitle"),
    stepPrompt: $("stepPrompt"),
    formulaReadout: $("formulaReadout"),
    playButton: $("playButton"),
    pauseButton: $("pauseButton"),
    keyButton: $("keyButton"),
    resetButton: $("resetButton"),
    guideButton: $("guideButton"),
    stepButton: $("stepButton"),
    focusButton: $("focusButton"),
    fullscreenButton: $("fullscreenButton"),
    guideDialog: $("guideDialog"),
    showParticlesToggle: $("showParticlesToggle"),
    showFlowToggle: $("showFlowToggle"),
    showAreaToggle: $("showAreaToggle"),
    showLimitToggle: $("showLimitToggle"),
  };
  const ctx = R.canvas.getContext("2d");
  const pctx = R.pathChart.getContext("2d");
  const lctx = R.ledgerChart.getContext("2d");
  const C = {
    bg: "#090d0f",
    grid: "rgba(223,229,223,.055)",
    cyan: "#65c7d8",
    green: "#79d597",
    amber: "#f1ba52",
    red: "#ff796f",
    violet: "#b69be5",
    white: "#dfe5df",
    muted: "#84908a",
  };
  const modes = {
    process: { title: "四类气体过程", goal: "在相同初态下比较约束条件怎样改变 Q、W 与 ΔU", hint: "拖动过程进度，对照活塞、p-V 路径与能量账本" },
    firstlaw: { title: "第一定律账本", goal: "用统一符号追踪吸热、对外做功和内能变化", hint: "切换过程，比较相同末态变化对应的热和功" },
    cycle: { title: "循环热机", goal: "完成顺时针循环，让 p-V 面积、净热量和净功一致", hint: "逐段推进 A→B→C→D→A，观察内能最终归零" },
    carnot: { title: "卡诺上限", goal: "热源温度决定任何热机都不能超过的理论效率", hint: "提高请求效率，观察何时跨过 ηC=1−Tc/Th" },
  };
  const processNames = { isochoric: "等容", isobaric: "等压", isothermal: "等温", adiabatic: "绝热" };
  const guide = [
    ["先固定符号", "气体吸热并同时膨胀做功时，内能变化等于哪两个量的组合？"],
    ["再追踪路径", "始末温度相同的两条路径，做功和吸热量一定相同吗？"],
    ["最后闭合循环", "气体回到初态后内能不变，热机输出的净功来自哪里？"],
  ];

  function fmt(value, digits = 2) { return Number(value).toFixed(digits); }
  function energyText(value) {
    if (Math.abs(value) < 1e-9) return "0 J";
    if (Math.abs(value) >= 1000) return `${value >= 0 ? "+" : "−"}${fmt(Math.abs(value) / 1000, 2)} kJ`;
    return `${value >= 0 ? "+" : "−"}${fmt(Math.abs(value), 1)} J`;
  }
  function size(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(300, Math.round(rect.width));
    const height = Math.max(170, Math.round(rect.height));
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }
  function grid(context, width, height) {
    context.fillStyle = C.bg;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = C.grid;
    context.lineWidth = 1;
    for (let x = 18; x < width; x += 42) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
    for (let y = 18; y < height; y += 42) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  }
  function text(context, value, x, y, color = C.white, font = "10px ui-monospace,monospace", align = "left") {
    context.fillStyle = color; context.font = font; context.textAlign = align; context.fillText(value, x, y);
  }
  function arrow(context, x1, y1, x2, y2, color, label = "") {
    const angle = Math.atan2(y2-y1,x2-x1);
    context.save(); context.strokeStyle=context.fillStyle=color; context.lineWidth=2.4;
    context.beginPath();context.moveTo(x1,y1);context.lineTo(x2,y2);context.stroke();
    context.beginPath();context.moveTo(x2,y2);context.lineTo(x2-8*Math.cos(angle-.48),y2-8*Math.sin(angle-.48));context.lineTo(x2-8*Math.cos(angle+.48),y2-8*Math.sin(angle+.48));context.fill();
    if(label)text(context,label,(x1+x2)/2,(y1+y2)/2-7,color,"700 10px ui-monospace,monospace","center");
    context.restore();
  }
  function processInput(ratio = state.ratio) {
    return { process:state.process,amountMol:1,initialTemperatureK:state.temperatureK,initialPressurePa:state.pressureBar*1e5,volumeRatio:ratio,gamma:state.gamma };
  }
  function partialProcess() {
    const ratio = 1 + (state.ratio - 1) * state.progress;
    return M.idealGasProcess(processInput(ratio));
  }
  function cycleState(cycle) {
    const scaled = Math.min(.999999, state.progress) * 4;
    const legIndex = Math.floor(scaled);
    const local = scaled - legIndex;
    const start = cycle.states[legIndex];
    const end = cycle.states[(legIndex + 1) % 4];
    const pressurePa = start.pressurePa + (end.pressurePa-start.pressurePa)*local;
    const volumeM3 = start.volumeM3 + (end.volumeM3-start.volumeM3)*local;
    let workByGasJ=0, internalEnergyChangeJ=0, heatIntoGasJ=0;
    for(let i=0;i<legIndex;i++){workByGasJ+=cycle.legs[i].workByGasJ;internalEnergyChangeJ+=cycle.legs[i].internalEnergyChangeJ;heatIntoGasJ+=cycle.legs[i].heatIntoGasJ;}
    workByGasJ+=cycle.legs[legIndex].workByGasJ*local;
    internalEnergyChangeJ+=cycle.legs[legIndex].internalEnergyChangeJ*local;
    heatIntoGasJ+=cycle.legs[legIndex].heatIntoGasJ*local;
    return {legIndex,local,pressurePa,volumeM3,temperatureK:pressurePa*volumeM3/M.GAS_CONSTANT,workByGasJ,internalEnergyChangeJ,heatIntoGasJ,from:start.name,to:end.name};
  }
  function current() {
    const fullProcess=M.idealGasProcess(processInput());
    const process=partialProcess();
    const cycle=M.rectangularCycle({pressureLowPa:1e5,pressureHighPa:state.highPressureBar*1e5,volumeLowM3:.01,volumeHighM3:state.highVolumeL/1000,gamma:state.gamma});
    const actual=M.actualEngine({hotTemperatureK:state.hotK,coldTemperatureK:Math.min(state.coldK,state.hotK),heatInputJ:state.heatInputKJ*1000,efficiency:state.requestedEfficiency});
    return {fullProcess,process,cycle,cycleState:cycleState(cycle),actual};
  }
  function processDescription(s) {
    const expanding = state.ratio>1.0001, compressing=state.ratio<.9999;
    const direction=expanding?"膨胀":compressing?"压缩":"无变化";
    const atStart=state.progress<.002;
    return {
      badge:`${processNames[state.process]}${direction}`,
      cls:state.process==="adiabatic"?"is-work":"is-heat",
      labels:["过程进度","气体温度 T","气体压强 p","吸收热量 Q","对外做功 W","内能变化 ΔU"],
      values:[fmt(state.progress*100,1)+"%",fmt(s.finalTemperatureK,1)+" K",fmt(s.finalPressurePa/1e5,3)+" bar",energyText(s.heatIntoGasJ),energyText(s.workByGasJ),energyText(s.internalEnergyChangeJ)],
      nature:atStart?"初态：尚未发生热量和功的传递":state.process==="isothermal"?"温度不变，吸收的热量全部转化为对外做功":state.process==="adiabatic"?"与外界无热交换，做功来自内能变化":`${processNames[state.process]}过程中热、功和内能按第一定律共同变化`,
      explanation:`残差 ΔU−(Q−W)=${Math.abs(s.firstLawResidualJ).toExponential(1)} J`,
      formula:state.process==="isothermal"?"ΔU=0 → Q=W":state.process==="adiabatic"?"Q=0 → ΔU=−W":"ΔU=Q−W",
      pathStatus:processNames[state.process]+"路径",
    };
  }
  function describe(q) {
    if(state.mode==="cycle"){
      const c=q.cycle,s=q.cycleState,complete=state.progress>.999;
      return {badge:complete?"循环闭合 · ΔU=0":`${s.from}→${s.to}`,cls:"is-cycle",labels:["当前路径","当前温度 T","累计吸热 Q","累计做功 W","循环净功","热机效率"],values:[complete?"回到 A · 100%":`${s.from}→${s.to} · ${fmt(s.local*100,0)}%`,fmt(s.temperatureK,1)+" K",energyText(s.heatIntoGasJ),energyText(s.workByGasJ),energyText(c.netWorkJ),fmt(c.efficiency*100,2)+"%"],nature:complete?"气体回到初态，循环内能变化为零":"沿顺时针循环推进，气体状态正在改变",explanation:`W净=${fmt(c.netWorkJ,1)} J，与 p-V 几何面积残差 ${Math.abs(c.netWorkJ-c.geometricAreaJ).toExponential(1)} J`,formula:"ΔU循环=0 → Q净=W净",pathTitle:"顺时针 p-V 循环",pathStatus:"面积=净功",ledgerTitle:"循环热量与功",ledgerStatus:`η=${fmt(c.efficiency*100,2)}%`};
    }
    if(state.mode==="carnot"){
      const a=q.actual,over=!a.physicallyAllowed;
      return {badge:over?"超过卡诺上限":"满足卡诺约束",cls:over?"is-warning":"is-limit",labels:["高温热源 Tₕ","低温热源 T꜀","输入热量 Qₕ","输出功 W","排出热量 Q꜀","卡诺上限 ηC"],values:[fmt(a.hotTemperatureK,0)+" K",fmt(a.coldTemperatureK,0)+" K",energyText(a.heatInputJ),energyText(a.workOutputJ),energyText(a.heatRejectedJ),fmt((1-a.coldTemperatureK/a.hotTemperatureK)*100,2)+"%"],nature:over?"请求效率超过相同热源温度允许的卡诺上限":"实际效率没有超过卡诺上限",explanation:over?`请求 ${fmt(a.requestedEfficiency*100,1)}%，物理输出按 ${fmt(a.efficiency*100,1)}% 上限截断`:`总熵变 ${a.totalEntropyChangeJK.toExponential(2)} J/K ≥ 0`,formula:"η≤ηC=1−Tc/Th",pathTitle:"热源温度与效率上限",pathStatus:`ηC=${fmt((1-a.coldTemperatureK/a.hotTemperatureK)*100,1)}%`,ledgerTitle:"热机能量流",ledgerStatus:"Qₕ=W+Q꜀"};
    }
    const d=processDescription(q.process);
    return {...d,pathTitle:"p-V 过程路径",ledgerTitle:state.mode==="firstlaw"?"第一定律符号账本":"Q、W 与 ΔU",ledgerStatus:"ΔU=Q−W"};
  }

  function particle(context,x,y,w,h,index,speed) {
    const px=x+10+((index*47+state.progress*speed*(index%2?1:-1)*97)%(Math.max(20,w-20))+(w-20))%(w-20);
    const py=y+10+((index*71+state.progress*speed*(index%3?1:-1)*83)%(Math.max(20,h-20))+(h-20))%(h-20);
    context.fillStyle=index%3===0?C.amber:C.cyan;context.beginPath();context.arc(px,py,2.4,0,Math.PI*2);context.fill();
    context.strokeStyle="rgba(223,229,223,.22)";context.beginPath();context.moveTo(px,py);context.lineTo(px+(index%2?5:-5)*speed/12,py+(index%3?3:-3)*speed/12);context.stroke();
  }
  function drawPiston(q,width,height,firstLawFocus=false) {
    const s=q.process;
    const baseV=q.fullProcess.initialVolumeM3;
    const ratio=s.finalVolumeM3/baseV;
    const chamberW=Math.min(width*.52,360);
    const chamberH=Math.min(height*.62,220);
    const x=width*.5-chamberW*.5;
    const bottom=height*.77;
    const gasH=Math.max(62,Math.min(chamberH,chamberH*(state.process==="isochoric"?1:.52*ratio)));
    const top=bottom-gasH;
    ctx.fillStyle=`rgba(255,121,111,${.05+.22*Math.min(1,s.finalTemperatureK/800)})`;ctx.fillRect(x,top,chamberW,gasH);
    ctx.strokeStyle="#657169";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,bottom-chamberH);ctx.lineTo(x,bottom);ctx.lineTo(x+chamberW,bottom);ctx.lineTo(x+chamberW,bottom-chamberH);ctx.stroke();
    ctx.strokeStyle=C.white;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x-5,top);ctx.lineTo(x+chamberW+5,top);ctx.stroke();
    ctx.strokeStyle="#657169";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+chamberW/2,top);ctx.lineTo(x+chamberW/2,top-46);ctx.stroke();
    if(state.showParticles){const speed=Math.sqrt(s.finalTemperatureK/300)*10;for(let i=0;i<30;i++)particle(ctx,x,top,chamberW,gasH,i,speed);}
    if(state.showFlow){
      const qRatio=Math.min(1,Math.abs(s.heatIntoGasJ)/Math.max(1,Math.abs(q.fullProcess.heatIntoGasJ)));
      const wRatio=Math.min(1,Math.abs(s.workByGasJ)/Math.max(1,Math.abs(q.fullProcess.workByGasJ)));
      if(Math.abs(s.heatIntoGasJ)>1){const incoming=s.heatIntoGasJ>0;arrow(ctx,x-70,incoming?bottom-35:bottom-70,x-10,incoming?bottom-70:bottom-35,s.heatIntoGasJ>0?C.red:C.cyan,`${s.heatIntoGasJ>0?"Q 入":"Q 出"} ${fmt(qRatio*100,0)}%`);}
      if(Math.abs(s.workByGasJ)>1){const outward=s.workByGasJ>0;arrow(ctx,x+chamberW/2,top-18,x+chamberW/2,top-(outward?75:-28),C.amber,`${outward?"W 出":"W 入"} ${fmt(wRatio*100,0)}%`);}
    }
    ctx.fillStyle=state.process==="adiabatic"?"#3e4742":s.heatIntoGasJ>=0?"rgba(255,121,111,.42)":"rgba(101,199,216,.42)";ctx.fillRect(x,bottom+8,chamberW,18);
    text(ctx,`${fmt(s.finalPressurePa/1e5,2)} bar · ${fmt(s.finalTemperatureK,0)} K`,x+chamberW/2,bottom-18,C.white,"700 11px ui-monospace,monospace","center");
    text(ctx,`${fmt(s.finalVolumeM3*1000,2)} L`,x+chamberW+18,top+18,C.cyan,"700 10px ui-monospace,monospace");
    if(firstLawFocus){
      const y=30;const boxW=Math.min(124,(width-48)/3-8);const start=width/2-(boxW*3+16)/2;
      [["Q",s.heatIntoGasJ,C.red],["W",s.workByGasJ,C.amber],["ΔU",s.internalEnergyChangeJ,C.violet]].forEach(([label,val,color],i)=>{const bx=start+i*(boxW+8);ctx.fillStyle="rgba(255,255,255,.045)";ctx.fillRect(bx,y,boxW,48);text(ctx,label,bx+10,y+17,color,"700 10px monospace");text(ctx,energyText(val),bx+boxW-8,y+34,C.white,"700 11px monospace","right");});
    }
  }
  function drawCycle(q,width,height) {
    const s=q.cycleState;
    const chamberW=Math.min(250,width*.42),chamberH=180,x=width*.18-chamberW*.5,bottom=height*.72;
    const volumeRatio=(s.volumeM3-.01)/Math.max(.001,q.cycle.volumeHighM3-.01);
    const gasH=70+volumeRatio*90,top=bottom-gasH;
    ctx.strokeStyle="#657169";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,bottom-chamberH);ctx.lineTo(x,bottom);ctx.lineTo(x+chamberW,bottom);ctx.lineTo(x+chamberW,bottom-chamberH);ctx.stroke();
    ctx.fillStyle=`rgba(255,121,111,${.08+.2*Math.min(1,s.temperatureK/1000)})`;ctx.fillRect(x,top,chamberW,gasH);
    ctx.strokeStyle=C.white;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x-4,top);ctx.lineTo(x+chamberW+4,top);ctx.stroke();
    if(state.showParticles)for(let i=0;i<20;i++)particle(ctx,x,top,chamberW,gasH,i,Math.sqrt(s.temperatureK/300)*10);
    const wheelX=width*.73,wheelY=height*.5,wheelR=Math.min(74,height*.23);
    ctx.strokeStyle=C.green;ctx.lineWidth=6;ctx.beginPath();ctx.arc(wheelX,wheelY,wheelR,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<6;i++){const a=state.progress*Math.PI*8+i*Math.PI/3;ctx.beginPath();ctx.moveTo(wheelX,wheelY);ctx.lineTo(wheelX+Math.cos(a)*wheelR,wheelY+Math.sin(a)*wheelR);ctx.stroke();}
    ctx.strokeStyle=C.white;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+chamberW/2,top);ctx.lineTo(wheelX-wheelR*Math.cos(state.progress*Math.PI*8),wheelY-wheelR*Math.sin(state.progress*Math.PI*8));ctx.stroke();
    if(state.showFlow){arrow(ctx,width*.42,height*.18,width*.58,height*.18,C.red,"Qₕ");arrow(ctx,width*.58,height*.82,width*.42,height*.82,C.cyan,"Q꜀");arrow(ctx,wheelX+wheelR+8,wheelY,wheelX+wheelR+70,wheelY,C.green,"W净");}
    text(ctx,`${s.from}→${s.to}`,width/2,28,C.white,"700 13px ui-monospace,monospace","center");
  }
  function drawCarnot(q,width,height) {
    const a=q.actual,cx=width/2,engineW=Math.min(180,width*.32),engineH=74;
    const hotY=38,coldY=height-38;
    ctx.fillStyle="rgba(255,121,111,.2)";ctx.strokeStyle=C.red;ctx.lineWidth=2;ctx.fillRect(cx-150,hotY-20,300,40);ctx.strokeRect(cx-150,hotY-20,300,40);
    text(ctx,`高温热源 ${fmt(a.hotTemperatureK,0)} K`,cx,hotY+5,C.red,"700 12px sans-serif","center");
    ctx.fillStyle="rgba(101,199,216,.18)";ctx.strokeStyle=C.cyan;ctx.fillRect(cx-150,coldY-20,300,40);ctx.strokeRect(cx-150,coldY-20,300,40);
    text(ctx,`低温热源 ${fmt(a.coldTemperatureK,0)} K`,cx,coldY+5,C.cyan,"700 12px sans-serif","center");
    const ey=height/2-engineH/2;ctx.fillStyle="rgba(182,155,229,.14)";ctx.strokeStyle=C.violet;ctx.lineWidth=3;ctx.fillRect(cx-engineW/2,ey,engineW,engineH);ctx.strokeRect(cx-engineW/2,ey,engineW,engineH);
    text(ctx,"HEAT ENGINE",cx,ey+35,C.violet,"700 11px ui-monospace,monospace","center");text(ctx,`η=${fmt(a.efficiency*100,1)}%`,cx,ey+62,C.white,"700 14px ui-monospace,monospace","center");
    if(state.showFlow){arrow(ctx,cx,hotY+25,cx,ey-8,C.red,`Qₕ ${fmt(a.heatInputJ/1000,2)} kJ`);arrow(ctx,cx,ey+engineH+8,cx,coldY-25,C.cyan,`Q꜀ ${fmt(a.heatRejectedJ/1000,2)} kJ`);arrow(ctx,cx+engineW/2+8,ey+engineH/2,cx+engineW/2+100,ey+engineH/2,C.green,`W ${fmt(a.workOutputJ/1000,2)} kJ`);}
    if(!a.physicallyAllowed){ctx.strokeStyle=C.red;ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.strokeRect(cx-engineW/2-8,ey-8,engineW+16,engineH+16);ctx.setLineDash([]);}
  }
  function drawMain(q) {
    const {width,height}=size(R.canvas,ctx);grid(ctx,width,height);
    if(state.mode==="cycle")drawCycle(q,width,height);else if(state.mode==="carnot")drawCarnot(q,width,height);else drawPiston(q,width,height,state.mode==="firstlaw");
  }
  function chartAxes(context,width,height,xLabel,yLabel){const left=42,right=width-16,top=18,bottom=height-30;context.strokeStyle="rgba(223,229,223,.28)";context.lineWidth=1;context.beginPath();context.moveTo(left,top);context.lineTo(left,bottom);context.lineTo(right,bottom);context.stroke();text(context,yLabel,9,14,C.muted);text(context,xLabel,right,height-10,C.muted,"9px monospace","right");return{left,right,top,bottom};}
  function pathPoints(process,steps=100){const points=[];for(let i=0;i<=steps;i++){const ratio=1+(state.ratio-1)*i/steps;const s=M.idealGasProcess(processInput(ratio));points.push({v:s.finalVolumeM3,p:s.finalPressurePa});}return points;}
  function drawPath(q) {
    const {width,height}=size(R.pathChart,pctx);grid(pctx,width,height);const a=chartAxes(pctx,width,height,state.mode==="carnot"?"Tc/Th":"V",state.mode==="carnot"?"ηC":"p");
    if(state.mode==="carnot"){
      const ratio=q.actual.coldTemperatureK/q.actual.hotTemperatureK;
      const x=(value)=>a.left+value*(a.right-a.left),y=(value)=>a.bottom-value*(a.bottom-a.top);
      if(state.showLimit){pctx.fillStyle="rgba(182,155,229,.1)";pctx.beginPath();pctx.moveTo(x(0),y(1));pctx.lineTo(x(1),y(0));pctx.lineTo(x(1),a.bottom);pctx.lineTo(x(0),a.bottom);pctx.closePath();pctx.fill();}
      pctx.strokeStyle=C.violet;pctx.lineWidth=2.5;pctx.beginPath();pctx.moveTo(x(0),y(1));pctx.lineTo(x(1),y(0));pctx.stroke();
      const px=x(ratio),py=y(1-ratio);pctx.fillStyle=C.white;pctx.beginPath();pctx.arc(px,py,5,0,Math.PI*2);pctx.fill();
      text(pctx,"ηC=1−Tc/Th",a.left+6,a.top+12,C.violet,"700 9px monospace");text(pctx,`${fmt(ratio,3)} → ${fmt((1-ratio)*100,1)}%`,a.right,a.top+12,C.white,"700 9px monospace","right");
      return;
    }
    let points,currentPoint;
    if(state.mode==="cycle"){
      const c=q.cycle;points=[...c.states.map(s=>({v:s.volumeM3,p:s.pressurePa})),{v:c.states[0].volumeM3,p:c.states[0].pressurePa}];currentPoint={v:q.cycleState.volumeM3,p:q.cycleState.pressurePa};
    }else{points=pathPoints(q.fullProcess);currentPoint={v:q.process.finalVolumeM3,p:q.process.finalPressurePa};}
    const all=[...points,currentPoint];const minV=Math.min(...all.map(x=>x.v))*.88,maxV=Math.max(...all.map(x=>x.v))*1.12,minP=Math.min(...all.map(x=>x.p))*.82,maxP=Math.max(...all.map(x=>x.p))*1.12;
    const xy=(pt)=>({x:a.left+(pt.v-minV)/(maxV-minV)*(a.right-a.left),y:a.bottom-(pt.p-minP)/(maxP-minP)*(a.bottom-a.top)});
    if(state.showArea&&state.mode==="cycle"){const mapped=points.map(xy);pctx.fillStyle="rgba(121,213,151,.14)";pctx.beginPath();mapped.forEach((pt,i)=>i?pctx.lineTo(pt.x,pt.y):pctx.moveTo(pt.x,pt.y));pctx.closePath();pctx.fill();}
    pctx.strokeStyle=state.mode==="cycle"?C.green:state.mode==="carnot"?C.violet:C.amber;pctx.lineWidth=2.5;pctx.beginPath();points.map(xy).forEach((pt,i)=>i?pctx.lineTo(pt.x,pt.y):pctx.moveTo(pt.x,pt.y));pctx.stroke();
    const cp=xy(currentPoint);pctx.fillStyle=C.white;pctx.beginPath();pctx.arc(cp.x,cp.y,5,0,Math.PI*2);pctx.fill();
    if(state.mode==="cycle")q.cycle.states.forEach(s=>{const pt=xy({v:s.volumeM3,p:s.pressurePa});text(pctx,s.name,pt.x+7,pt.y-6,C.white,"700 10px monospace");});
    text(pctx,`${fmt(currentPoint.v*1000,1)} L`,a.right,a.top+11,C.cyan,"700 9px monospace","right");text(pctx,`${fmt(currentPoint.p/1e5,2)} bar`,a.right,a.top+25,C.amber,"700 9px monospace","right");
  }
  function bar(context,x,y,w,label,value,max,color){const scale=Math.abs(value)/Math.max(max,1e-12);context.fillStyle="rgba(255,255,255,.07)";context.fillRect(x,y,w,22);context.fillStyle=color;context.fillRect(value>=0?x+w/2:x+w/2-w/2*scale,y,w/2*scale,22);context.strokeStyle="rgba(255,255,255,.25)";context.beginPath();context.moveTo(x+w/2,y-3);context.lineTo(x+w/2,y+25);context.stroke();text(context,label,x,y-5,color,"700 9px monospace");text(context,energyText(value),x+w,y-5,C.white,"700 9px monospace","right");}
  function drawLedger(q) {
    const {width,height}=size(R.ledgerChart,lctx);grid(lctx,width,height);
    if(state.mode==="carnot"){
      const a=q.actual,carnot=1-a.coldTemperatureK/a.hotTemperatureK,left=46,right=width-22,span=right-left;
      [["请求效率",a.requestedEfficiency,C.amber,50],["实际输出",a.efficiency,C.green,92],["卡诺上限",carnot,C.violet,134]].forEach(([label,val,color,y])=>{text(lctx,label,left,y-8,color,"700 9px sans-serif");lctx.fillStyle="rgba(255,255,255,.07)";lctx.fillRect(left,y,span,14);lctx.fillStyle=color;lctx.fillRect(left,y,span*Math.min(1,val),14);text(lctx,fmt(val*100,1)+"%",right,y-8,C.white,"700 9px monospace","right");});return;
    }
    if(state.mode==="cycle"){
      const c=q.cycle,max=Math.max(c.heatInputJ,c.heatRejectedJ,c.netWorkJ);const x=38,w=width-58;
      bar(lctx,x,54,w,"Qₕ 输入",c.heatInputJ,max,C.red);bar(lctx,x,104,w,"Q꜀ 排出",-c.heatRejectedJ,max,C.cyan);bar(lctx,x,154,w,"W 净输出",c.netWorkJ,max,C.green);return;
    }
    const s=q.process,max=Math.max(Math.abs(q.fullProcess.heatIntoGasJ),Math.abs(q.fullProcess.workByGasJ),Math.abs(q.fullProcess.internalEnergyChangeJ),1);const x=38,w=width-58;
    bar(lctx,x,54,w,"Q 吸热为正",s.heatIntoGasJ,max,C.red);bar(lctx,x,104,w,"W 对外做功为正",s.workByGasJ,max,C.amber);bar(lctx,x,154,w,"ΔU 内能变化",s.internalEnergyChangeJ,max,C.violet);
  }
  function updateReadouts(q) {
    const d=describe(q),mode=modes[state.mode];R.modeTitle.textContent=mode.title;R.modeGoal.textContent=mode.goal;R.stageHint.textContent=mode.hint;R.stateBadge.textContent=d.badge;R.stateBadge.className="state-badge "+d.cls;
    d.labels.forEach((v,i)=>R.metricLabels[i].textContent=v);d.values.forEach((v,i)=>R.metrics[i].textContent=v);R.thermalNature.textContent=d.nature;R.thermalExplanation.textContent=d.explanation;R.formulaReadout.textContent=d.formula;R.pathTitle.textContent=d.pathTitle;R.pathStatus.textContent=d.pathStatus;R.ledgerTitle.textContent=d.ledgerTitle;R.ledgerStatus.textContent=d.ledgerStatus;
    R.temperatureValue.textContent=fmt(state.temperatureK,0)+" K";R.pressureValue.textContent=fmt(state.pressureBar,2)+" bar";R.ratioLabel.innerHTML=state.process==="isochoric"?"末态温度比 <i>T₂/T₁</i>":"末态体积比 <i>V₂/V₁</i>";R.ratioValue.textContent=fmt(state.ratio,2);R.gammaValue.textContent=(state.gamma>1.5?"单原子":"双原子")+` · ${fmt(state.gamma,3)}`;R.highPressureValue.textContent=fmt(state.highPressureBar,2)+" bar";R.highVolumeValue.textContent=fmt(state.highVolumeL,1)+" L";R.hotValue.textContent=fmt(state.hotK,0)+" K";R.coldValue.textContent=fmt(state.coldK,0)+" K";R.heatInputValue.textContent=fmt(state.heatInputKJ,2)+" kJ";R.efficiencyValue.textContent=fmt(state.requestedEfficiency*100,1)+"%";R.playbackValue.textContent=`${state.running?"运行中":"已暂停"} · ${fmt(state.progress*100,0)}%`;R.progressInput.value=state.progress;
    const [title,prompt]=guide[state.guideStep];R.stepIndex.textContent=String(state.guideStep+1).padStart(2,"0");R.stepTitle.textContent=title;R.stepPrompt.textContent=prompt;
  }
  function setRangeFill(input){const min=Number(input.min),max=Number(input.max),value=Number(input.value);input.style.setProperty("--range-progress",`${(value-min)/(max-min)*100}%`);}
  function render(){const q=current();updateReadouts(q);drawMain(q);drawPath(q);drawLedger(q);document.querySelectorAll('input[type="range"]').forEach(setRangeFill);}
  function setMode(mode){if(!modes[mode])return;state.mode=mode;R.sceneTabs.forEach(t=>t.classList.toggle("is-active",t.dataset.mode===mode));R.processTypeSection.hidden=mode==="cycle"||mode==="carnot";R.processSection.hidden=mode==="cycle"||mode==="carnot";R.cycleSection.hidden=mode!=="cycle";R.engineSection.hidden=mode!=="carnot";render();}
  function syncInputs(){R.temperatureInput.value=state.temperatureK;R.pressureInput.value=state.pressureBar;R.ratioInput.value=state.ratio;R.highPressureInput.value=state.highPressureBar;R.highVolumeInput.value=state.highVolumeL;R.hotInput.value=state.hotK;R.coldInput.max=Math.max(200,state.hotK-10);if(state.coldK>=state.hotK)state.coldK=Math.max(200,state.hotK-10);R.coldInput.value=state.coldK;R.heatInput.value=state.heatInputKJ;R.efficiencyInput.value=state.requestedEfficiency;R.processButtons.forEach(b=>b.classList.toggle("is-active",b.dataset.process===state.process));R.gammaButtons.forEach(b=>b.classList.toggle("is-active",Math.abs(Number(b.dataset.gamma)-state.gamma)<.01));}
  function reset(){Object.assign(state,{mode:"process",process:"isobaric",temperatureK:300,pressureBar:1,ratio:1.5,gamma:5/3,highPressureBar:3,highVolumeL:30,hotK:600,coldK:300,heatInputKJ:1,requestedEfficiency:.3,progress:0,running:false,guideStep:0,showParticles:true,showFlow:true,showArea:true,showLimit:true,dragging:false});[[R.showParticlesToggle,"showParticles"],[R.showFlowToggle,"showFlow"],[R.showAreaToggle,"showArea"],[R.showLimitToggle,"showLimit"]].forEach(([input,key])=>input.checked=state[key]);R.routeSteps.forEach((x,j)=>x.classList.toggle("is-active",j===0));syncInputs();setMode("process");}
  function setState(next={}){
    if(!next||typeof next!=="object")return;
    const ranges={temperatureK:[200,800],pressureBar:[.5,4],ratio:[.4,2.5],highPressureBar:[1.2,6],highVolumeL:[12,50],hotK:[350,1000],coldK:[200,990],heatInputKJ:[.2,5],requestedEfficiency:[0,.8],progress:[0,1]};
    Object.entries(ranges).forEach(([key,[min,max]])=>{if(Number.isFinite(Number(next[key])))state[key]=Math.max(min,Math.min(max,Number(next[key])));});
    if(typeof next.mode==="string"&&modes[next.mode])state.mode=next.mode;
    if(typeof next.process==="string"&&processNames[next.process])state.process=next.process;
    if([1.4,5/3].some(value=>Math.abs(value-Number(next.gamma))<.01))state.gamma=Number(next.gamma);
    if(Number.isFinite(Number(next.guideStep)))state.guideStep=Math.max(0,Math.min(guide.length-1,Math.round(Number(next.guideStep))));
    ["showParticles","showFlow","showArea","showLimit"].forEach(key=>{if(typeof next[key]==="boolean")state[key]=next[key];});
    state.coldK=Math.min(state.coldK,state.hotK-10);state.running=false;state.dragging=false;
    [[R.showParticlesToggle,"showParticles"],[R.showFlowToggle,"showFlow"],[R.showAreaToggle,"showArea"],[R.showLimitToggle,"showLimit"]].forEach(([input,key])=>input.checked=state[key]);
    R.routeSteps.forEach((x,j)=>x.classList.toggle("is-active",state.guideStep===j));syncInputs();setMode(state.mode);
  }
  function bind(input,key,after){input.addEventListener("input",()=>{state[key]=Number(input.value);if(after)after();render();});}
  bind(R.temperatureInput,"temperatureK");bind(R.pressureInput,"pressureBar");bind(R.ratioInput,"ratio");bind(R.highPressureInput,"highPressureBar");bind(R.highVolumeInput,"highVolumeL");bind(R.hotInput,"hotK",syncInputs);bind(R.coldInput,"coldK");bind(R.heatInput,"heatInputKJ");bind(R.efficiencyInput,"requestedEfficiency");
  R.progressInput.addEventListener("input",()=>{state.progress=Number(R.progressInput.value);state.running=false;render();});
  R.sceneTabs.forEach(t=>t.addEventListener("click",()=>setMode(t.dataset.mode)));
  R.processButtons.forEach(b=>b.addEventListener("click",()=>{state.process=b.dataset.process;syncInputs();render();}));
  R.gammaButtons.forEach(b=>b.addEventListener("click",()=>{state.gamma=Number(b.dataset.gamma);syncInputs();render();}));
  R.routeSteps.forEach((b,i)=>b.addEventListener("click",()=>{state.guideStep=i;R.routeSteps.forEach((x,j)=>x.classList.toggle("is-active",i===j));render();}));
  R.presets.forEach(b=>b.addEventListener("click",()=>{if(b.dataset.preset==="isothermal"){setMode("process");state.process="isothermal";state.ratio=2;state.progress=1;}if(b.dataset.preset==="adiabatic"){setMode("firstlaw");state.process="adiabatic";state.ratio=2;state.progress=1;}if(b.dataset.preset==="cycle"){setMode("cycle");state.progress=1;}if(b.dataset.preset==="limit"){setMode("carnot");state.requestedEfficiency=1-state.coldK/state.hotK;state.progress=.5;}state.running=false;syncInputs();render();}));
  R.playButton.addEventListener("click",()=>{state.running=true;render();});R.pauseButton.addEventListener("click",()=>{state.running=false;render();});R.keyButton.addEventListener("click",()=>{const steps=state.mode==="cycle"?4:2;state.progress=(Math.floor(state.progress*steps+.001)+1)%steps/steps;state.running=false;render();});R.resetButton.addEventListener("click",reset);
  R.stepButton.addEventListener("click",()=>{state.guideStep=(state.guideStep+1)%guide.length;R.routeSteps.forEach((x,j)=>x.classList.toggle("is-active",state.guideStep===j));render();});R.guideButton.addEventListener("click",()=>R.guideDialog.showModal());R.focusButton.addEventListener("click",()=>{const on=document.body.classList.toggle("focus-mode");R.focusButton.setAttribute("aria-pressed",String(on));});R.fullscreenButton.addEventListener("click",()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();});
  [[R.showParticlesToggle,"showParticles"],[R.showFlowToggle,"showFlow"],[R.showAreaToggle,"showArea"],[R.showLimitToggle,"showLimit"]].forEach(([input,key])=>input.addEventListener("change",()=>{state[key]=input.checked;render();}));
  function pointerProgress(event){const rect=R.canvas.getBoundingClientRect();state.progress=Math.max(0,Math.min(.999,(event.clientX-rect.left)/rect.width));state.running=false;render();}
  R.canvas.addEventListener("pointerdown",e=>{state.dragging=true;R.canvas.setPointerCapture?.(e.pointerId);pointerProgress(e);});R.canvas.addEventListener("pointermove",e=>{if(state.dragging)pointerProgress(e);});R.canvas.addEventListener("pointerup",()=>state.dragging=false);R.canvas.addEventListener("pointercancel",()=>state.dragging=false);window.addEventListener("resize",render);
  window.thermodynamicsLab={
    idealGasProcess:M.idealGasProcess,
    rectangularCycle:M.rectangularCycle,
    carnotEngine:M.carnotEngine,
    actualEngine:M.actualEngine,
    calculate:()=>current(),
    getState:()=>({...state}),
    setMode,
    setState,
    reset,
  };
  let previous=performance.now();function frame(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;if(state.running){state.progress=(state.progress+dt*.14)%1;render();}requestAnimationFrame(frame);}syncInputs();setMode("process");requestAnimationFrame(frame);
})();
