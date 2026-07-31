(function () {
  const model = window.NuclearReactionModel;
  if (!model) throw new Error("NuclearReactionModel is required");

  const refs = {
    canvas: document.getElementById("reactionCanvas"),
    generationChart: document.getElementById("generationChart"),
    conditionChart: document.getElementById("conditionChart"),
    chainSection: document.getElementById("chainSection"),
    controlSection: document.getElementById("controlSection"),
    fusionSection: document.getElementById("fusionSection"),
    yieldInput: document.getElementById("yieldInput"),
    yieldValue: document.getElementById("yieldValue"),
    fissionProbabilityInput: document.getElementById("fissionProbabilityInput"),
    fissionProbabilityValue: document.getElementById("fissionProbabilityValue"),
    escapeInput: document.getElementById("escapeInput"),
    escapeValue: document.getElementById("escapeValue"),
    controlInput: document.getElementById("controlInput"),
    controlValue: document.getElementById("controlValue"),
    criticalNote: document.getElementById("criticalNote"),
    temperatureInput: document.getElementById("temperatureInput"),
    temperatureValue: document.getElementById("temperatureValue"),
    densityInput: document.getElementById("densityInput"),
    densityValue: document.getElementById("densityValue"),
    confinementInput: document.getElementById("confinementInput"),
    confinementValue: document.getElementById("confinementValue"),
    progressInput: document.getElementById("progressInput"),
    playbackValue: document.getElementById("playbackValue"),
    processMetric: document.getElementById("processMetric"),
    kMetric: document.getElementById("kMetric"),
    generationMetric: document.getElementById("generationMetric"),
    fissionMetric: document.getElementById("fissionMetric"),
    energyMetric: document.getElementById("energyMetric"),
    conditionMetric: document.getElementById("conditionMetric"),
    reactionNature: document.getElementById("reactionNature"),
    reactionExplanation: document.getElementById("reactionExplanation"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    generationChartTitle: document.getElementById("generationChartTitle"),
    generationChartStatus: document.getElementById("generationChartStatus"),
    conditionChartTitle: document.getElementById("conditionChartTitle"),
    conditionChartStatus: document.getElementById("conditionChartStatus"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaReadout: document.getElementById("formulaReadout"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    keyButton: document.getElementById("keyButton"),
    resetButton: document.getElementById("resetButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    showNeutronsToggle: document.getElementById("showNeutronsToggle"),
    showLossesToggle: document.getElementById("showLossesToggle"),
    showEnergyToggle: document.getElementById("showEnergyToggle"),
    showLabelsToggle: document.getElementById("showLabelsToggle"),
    showTheoryToggle: document.getElementById("showTheoryToggle"),
    sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")),
    routeSteps: Array.from(document.querySelectorAll(".route-step")),
    presetButtons: Array.from(document.querySelectorAll("[data-preset]")),
    rateButtons: Array.from(document.querySelectorAll("[data-rate]"))
  };

  const context = refs.canvas.getContext("2d");
  const generationContext = refs.generationChart.getContext("2d");
  const conditionContext = refs.conditionChart.getContext("2d");
  const COLORS = { cyan:"#67c6d8",green:"#7bd898",amber:"#f0b84d",red:"#ff776c",violet:"#b79ae6",cream:"#eef1e6",text:"#a6b0a9",muted:"#717b75" };
  const MODES = {
    fission:{title:"单次裂变",goal:"中子触发重核分裂，静质量差转化为碎片动能等释放能量",hint:"拖动过程，追踪入射中子、裂变碎片和三个新中子",key:"◎ 完成裂变"},
    chain:{title:"链式反应",goal:"每一代能进入下一代的有效中子数决定链反应衰减还是增长",hint:"改变中子产额、裂变概率和逃逸比例，观察逐代期望",key:"◎ 无控制吸收"},
    critical:{title:"临界控制",goal:"吸收与逃逸共同调节有效增殖系数，使反应保持、衰减或增长",hint:"拖动控制吸收率跨过临界点 k=1",key:"◎ 自动临界"},
    fusion:{title:"聚变条件",goal:"量子隧穿提供反应机会，高温之外还需要足够密度和约束时间",hint:"比较温度、密度和约束时间对相对机会指数的不同影响",key:"◎ D-T 参考态"}
  };
  const GUIDE = [
    {title:"先核对一次反应",prompt:"裂变 Q 值为正，为什么一块铀燃料不会立刻全部裂变？"},
    {title:"再追踪有效中子",prompt:"新产生的中子为什么不一定都能触发下一代裂变？"},
    {title:"最后比较聚变条件",prompt:"温度很高时为什么仍必须维持足够密度和约束时间？"}
  ];
  const state = {
    mode:"fission",neutronYield:2.5,fissionProbability:.65,escapeFraction:.15,controlAbsorption:.276,
    temperatureKeV:15,densityRatio:1,confinementS:1,progress:0,running:false,playbackRate:.5,guideStep:0,dragging:false,
    showNeutrons:true,showLosses:true,showEnergy:true,showLabels:true,showTheory:true
  };
  let frameCount = 0;

  function clamp(value,min,max){return Math.min(max,Math.max(min,Number(value)));}
  function fixed(value,digits=3){return Number(value).toFixed(digits).replace("-","−");}
  function chain(){return model.chainState(state);}
  function fusion(){return model.fusionState(state);}
  function activeGeneration(chainState=chain()){return Math.min(chainState.generationCount-1,Math.floor(state.progress*chainState.generationCount));}

  function canvasSize(canvas,ctx,minHeight=180){
    const rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2),width=Math.max(280,Math.round(rect.width)),height=Math.max(minHeight,Math.round(rect.height));
    if(canvas.width!==width*ratio||canvas.height!==height*ratio){canvas.width=width*ratio;canvas.height=height*ratio;}
    ctx.setTransform(ratio,0,0,ratio,0,0);return{width,height};
  }
  function line(ctx,x1,y1,x2,y2,color,width=1,dash=[]){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
  function label(ctx,value,x,y,color=COLORS.text,size=10,align="left",weight=500){ctx.fillStyle=color;ctx.font=`${weight} ${size}px ui-sans-serif,system-ui`;ctx.textAlign=align;ctx.fillText(value,x,y);}
  function arrow(ctx,x1,y1,x2,y2,color,width=1.7){const angle=Math.atan2(y2-y1,x2-x1);line(ctx,x1,y1,x2,y2,color,width);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-7*Math.cos(angle-.48),y2-7*Math.sin(angle-.48));ctx.lineTo(x2-7*Math.cos(angle+.48),y2-7*Math.sin(angle+.48));ctx.fill();}
  function dot(ctx,x,y,color,radius=4,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.restore();}
  function background(ctx,width,height,color="#090d0f"){ctx.fillStyle=color;ctx.fillRect(0,0,width,height);for(let x=0;x<width;x+=36)line(ctx,x,0,x,height,"rgba(238,241,230,.035)");for(let y=0;y<height;y+=36)line(ctx,0,y,width,y,"rgba(238,241,230,.035)");}
  function nucleonPosition(index,count,radius){const angle=index*2.3999632297,radial=radius*Math.sqrt((index+.5)/Math.max(1,count));return{x:Math.cos(angle)*radial,y:Math.sin(angle)*radial};}
  function drawNucleus(ctx,cx,cy,A,Z,radius,alpha=1){const count=Math.min(64,A);for(let i=0;i<count;i++){const p=nucleonPosition(i,count,radius),proton=i/count<Z/A;dot(ctx,cx+p.x,cy+p.y,proton?COLORS.red:COLORS.cyan,Math.max(2.1,radius/8),alpha);}if(A>64&&state.showLabels)label(ctx,`×${A}`,cx,cy+radius+16,COLORS.muted,8,"center");}
  function pulse(ctx,cx,cy,progress,count=8){if(!state.showEnergy||progress<=.1)return;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2+performance.now()/1500,distance=25+58*((progress+i/count)%1);line(ctx,cx+Math.cos(angle)*(distance-7),cy+Math.sin(angle)*(distance-7),cx+Math.cos(angle)*(distance+7),cy+Math.sin(angle)*(distance+7),COLORS.amber,2);}}

  function drawFission(width,height){
    const p=state.progress,cy=height*.5,cx=width*.52,incomingX=width*.08+(cx-width*.08)*Math.min(1,p/.38);
    if(state.showNeutrons){dot(context,incomingX,cy,COLORS.cyan,5);if(p<.38)line(context,width*.08,cy,incomingX,cy,"rgba(103,198,216,.45)",1,[4,3]);}
    if(p<.42){drawNucleus(context,cx,cy,235,92,54,1);if(state.showLabels)label(context,"²³⁵U",cx,cy-70,COLORS.cream,11,"center",800);}
    else{
      const q=clamp((p-.42)/.58,0,1),leftX=cx-108*q,rightX=cx+104*q;
      drawNucleus(context,leftX,cy-12*q,141,56,43,1);drawNucleus(context,rightX,cy+10*q,92,36,37,1);
      if(state.showLabels){label(context,"¹⁴¹Ba",leftX,cy-65,COLORS.red,9,"center",700);label(context,"⁹²Kr",rightX,cy-54,COLORS.violet,9,"center",700);}
      if(state.showNeutrons)for(let i=0;i<3;i++){const angle=(-.7+i*.7),distance=28+105*q;dot(context,cx+Math.cos(angle)*distance,cy+Math.sin(angle)*distance,COLORS.cyan,4);}
      pulse(context,cx,cy,q,10);
    }
    label(context,"代表性产物道 · A:236→236 · Z:92→92",width*.5,27,COLORS.text,9,"center",700);
    label(context,"碎片、中子尺寸与过程时间按教学可见性缩放",width-14,height-14,COLORS.muted,9,"right");
  }
  function statusColor(status){return status==="subcritical"?COLORS.cyan:status==="critical"?COLORS.green:COLORS.red;}
  function drawChain(width,height){
    const c=chain(),active=activeGeneration(c),left=34,right=width-28,top=42,bottom=height-42,columns=c.generationCount,dx=(right-left)/Math.max(1,columns-1),maxExpected=Math.max(1,...c.generations.map(g=>g.incomingNeutrons));
    for(let g=0;g<columns;g++){
      const item=c.generations[g],x=left+g*dx,visible=Math.min(18,Math.max(1,Math.round(item.incomingNeutrons))),spread=Math.min((bottom-top)*.7,20+Math.sqrt(visible)*18);
      line(context,x,top,x,bottom,"rgba(238,241,230,.05)");
      for(let i=0;i<visible;i++){const y=height*.5+(i-(visible-1)/2)*Math.min(16,spread/Math.max(1,visible-1));const alpha=g<=active?1:.2;dot(context,x,y,COLORS.cyan,3.7,alpha);if(g<columns-1&&state.showNeutrons){const nextY=height*.5+((i*1.7)%Math.max(1,visible)-(visible-1)/2)*10;line(context,x+4,y,x+dx-4,nextY,g<=active?"rgba(103,198,216,.28)":"rgba(103,198,216,.08)",1);}}
      if(state.showLabels){label(context,`g${g}`,x,bottom+16,COLORS.muted,8,"center");label(context,fixed(item.incomingNeutrons,item.incomingNeutrons<10?2:1),x,top-8,g===active?statusColor(c.status):COLORS.text,8,"center",g===active?800:500);}
      if(state.showLosses&&g===active){label(context,`有效率 ${fixed(c.productiveProbability*100,1)}%`,x,height-12,COLORS.amber,8,"center");}
    }
    label(context,`N_g = N₀·k^g · k=${fixed(c.kEffective,3)}`,width*.5,22,statusColor(c.status),10,"center",800);
    label(context,"点数为期望值的有限可视映射，不表示单个中子可预测",width-14,height-14,COLORS.muted,9,"right");
  }
  function drawCritical(width,height){
    const c=chain(),rodDepth=state.controlAbsorption/.8,core={x:width*.2,y:height*.18,w:width*.6,h:height*.64};
    context.fillStyle="rgba(103,198,216,.05)";context.fillRect(core.x,core.y,core.w,core.h);context.strokeStyle="rgba(103,198,216,.25)";context.strokeRect(core.x,core.y,core.w,core.h);
    for(let i=0;i<32;i++){const x=core.x+22+(i%8)*(core.w-44)/7,y=core.y+24+Math.floor(i/8)*(core.h-48)/3;drawNucleus(context,x,y,235,92,6.5,.65);}
    const rodCount=4;
    for(let i=0;i<rodCount;i++){const x=core.x+core.w*(i+1)/(rodCount+1),h=core.h*rodDepth;context.fillStyle="rgba(255,119,108,.72)";context.fillRect(x-6,core.y,12,h);if(state.showLabels)label(context,"吸收",x,core.y+h+13,COLORS.red,7,"center");}
    if(state.showNeutrons)for(let i=0;i<16;i++){const phase=(performance.now()/1400+i*.41)%1,x=core.x+core.w*((i*.618+phase*.3)%1),y=core.y+core.h*((i*.373+phase*.23)%1);dot(context,x,y,COLORS.cyan,3);if(state.showLosses&&i%5===0)line(context,x-8,y-8,x+8,y+8,COLORS.red,1);}
    const gaugeX=width*.87,gaugeTop=core.y,gaugeBottom=core.y+core.h,gaugeY=gaugeBottom-clamp(c.kEffective/1.7,0,1)*(gaugeBottom-gaugeTop);
    line(context,gaugeX,gaugeTop,gaugeX,gaugeBottom,"rgba(238,241,230,.25)",5);line(context,gaugeX-10,gaugeBottom-(gaugeBottom-gaugeTop)/1.7,gaugeX+10,gaugeBottom-(gaugeBottom-gaugeTop)/1.7,COLORS.green,2);dot(context,gaugeX,gaugeY,statusColor(c.status),7);
    label(context,"k",gaugeX,gaugeTop-13,COLORS.text,9,"center",700);label(context,fixed(c.kEffective,3),gaugeX,gaugeBottom+20,statusColor(c.status),10,"center",800);
    label(context,`控制吸收 ${fixed(state.controlAbsorption*100,1)}% · 逃逸 ${fixed(state.escapeFraction*100,1)}%`,width*.5,24,COLORS.text,9,"center",700);
    label(context,"几何、材料和中子输运被压缩为概率参数",width-14,height-14,COLORS.muted,9,"right");
  }
  function drawFusion(width,height){
    const f=fusion(),cx=width*.55,cy=height*.5,rx=Math.min(width*.28,180),ry=Math.min(height*.28,82);
    context.strokeStyle="rgba(183,154,230,.22)";context.lineWidth=22;context.beginPath();context.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);context.stroke();context.strokeStyle="rgba(103,198,216,.4)";context.lineWidth=1.5;for(let i=0;i<5;i++){context.beginPath();context.ellipse(cx,cy,rx-i*5,ry-i*2.4,0,0,Math.PI*2);context.stroke();}
    const particleCount=Math.round(10+state.densityRatio*8);
    for(let i=0;i<particleCount;i++){const angle=i/particleCount*Math.PI*2+performance.now()/1300*(.35+state.temperatureKeV/80),x=cx+Math.cos(angle)*rx,y=cy+Math.sin(angle)*ry;dot(context,x,y,i%2?COLORS.red:COLORS.cyan,3.3);}
    const approach=clamp(state.progress,0,1),leftX=width*.13+approach*55,rightX=width*.31-approach*55,approachY=height*.24;
    dot(context,leftX,approachY,COLORS.red,8);dot(context,rightX,approachY,COLORS.cyan,8);label(context,"D",leftX,approachY+3,"#111",7,"center",800);label(context,"T",rightX,approachY+3,"#111",7,"center",800);
    line(context,leftX+10,approachY,rightX-10,approachY,"rgba(255,119,108,.42)",1,[4,3]);
    if(approach>.76){const q=(approach-.76)/.24;dot(context,(leftX+rightX)/2,approachY,COLORS.amber,10,1-q*.2);pulse(context,(leftX+rightX)/2,approachY,q,7);}
    if(state.showLabels){label(context,`经典最近距离 ${fixed(f.closestApproachFm,1)} fm`,width*.22,approachY+28,COLORS.red,9,"center",700);label(context,`核力尺度约 ${fixed(f.nuclearContactFm,0)} fm`,width*.22,approachY+44,COLORS.muted,8,"center");}
    label(context,`kT=${fixed(f.temperatureKeV,1)} keV · T≈${fixed(f.temperatureK/1e6,0)} MK`,cx,28,COLORS.amber,10,"center",800);
    label(context,"环形磁场与粒子数量仅作约束概念示意",width-14,height-14,COLORS.muted,9,"right");
  }
  function drawScene(){const{width,height}=canvasSize(refs.canvas,context,260);background(context,width,height);if(state.mode==="fission")drawFission(width,height);if(state.mode==="chain")drawChain(width,height);if(state.mode==="critical")drawCritical(width,height);if(state.mode==="fusion")drawFusion(width,height);}

  function chartBackground(ctx,canvas){const size=canvasSize(canvas,ctx,180);background(ctx,size.width,size.height,"#111512");return size;}
  function axes(ctx,width,height,xMin,xMax,yMin,yMax,xLabel,yLabel){
    const p={l:46,r:16,t:20,b:32},x=v=>p.l+(v-xMin)/(xMax-xMin)*(width-p.l-p.r),y=v=>height-p.b-(v-yMin)/(yMax-yMin)*(height-p.t-p.b);
    line(ctx,p.l,p.t,p.l,height-p.b,"rgba(238,241,230,.28)");line(ctx,p.l,height-p.b,width-p.r,height-p.b,"rgba(238,241,230,.28)");
    for(let i=0;i<=4;i++){const xv=xMin+(xMax-xMin)*i/4,yv=yMin+(yMax-yMin)*i/4;line(ctx,x(xv),p.t,x(xv),height-p.b,"rgba(238,241,230,.05)");line(ctx,p.l,y(yv),width-p.r,y(yv),"rgba(238,241,230,.05)");label(ctx,fixed(xv,xMax<=10?1:0),x(xv),height-13,COLORS.muted,8,"center");label(ctx,fixed(yv,yMax<=2?2:1),p.l-6,y(yv)+3,COLORS.muted,8,"right");}
    label(ctx,xLabel,width-p.r,height-3,COLORS.muted,8,"right");label(ctx,yLabel,5,11,COLORS.muted,8);return{x,y,p};
  }
  function drawGenerationChart(){
    const{width,height}=chartBackground(generationContext,refs.generationChart);
    if(state.mode==="fission"){const e=model.fissionEvent(state.progress),x=28,w=width-56;generationContext.fillStyle="rgba(238,241,230,.08)";generationContext.fillRect(x,58,w,14);generationContext.fillStyle=COLORS.amber;generationContext.fillRect(x,58,w*e.progress,14);label(generationContext,"代表性 Q 值释放进度",x,45,COLORS.muted,8);label(generationContext,`${fixed(e.releasedEnergyMeV,3)} / ${fixed(e.qValueMeV,3)} MeV`,width-28,69,COLORS.amber,10,"right",800);label(generationContext,"A: 236 → 236",x,120,COLORS.cyan,10);label(generationContext,"Z: 92 → 92",x,145,COLORS.green,10);label(generationContext,"新中子: 3",x,170,COLORS.violet,10);return;}
    if(state.mode==="fusion"){const f=fusion(),parts=[{name:"相对反应性",value:Math.min(2,f.normalizedReactivity),color:COLORS.amber},{name:"密度平方",value:Math.min(2,f.densityRatio*f.densityRatio),color:COLORS.violet},{name:"约束时间",value:Math.min(2,f.confinementS),color:COLORS.cyan}];parts.forEach((part,i)=>{const y=48+i*48;generationContext.fillStyle="rgba(238,241,230,.07)";generationContext.fillRect(28,y,width-56,11);generationContext.fillStyle=part.color;generationContext.fillRect(28,y,(width-56)*part.value/2,11);label(generationContext,part.name,28,y-7,COLORS.muted,8);label(generationContext,fixed(part.value,2),width-28,y+9,part.color,9,"right",700);});return;}
    const c=chain(),max=Math.max(1,...c.generations.map(g=>g.incomingNeutrons))*1.1,frame=axes(generationContext,width,height,0,c.generationCount-1,0,max,"代 g","期望中子数"),active=activeGeneration(c);
    generationContext.strokeStyle=statusColor(c.status);generationContext.lineWidth=2;generationContext.beginPath();c.generations.forEach((g,i)=>{const x=frame.x(g.generation),y=frame.y(g.incomingNeutrons);if(i)generationContext.lineTo(x,y);else generationContext.moveTo(x,y);});generationContext.stroke();c.generations.forEach((g,i)=>dot(generationContext,frame.x(g.generation),frame.y(g.incomingNeutrons),i===active?COLORS.amber:statusColor(c.status),i===active?5:3));
  }
  function drawConditionChart(){
    const{width,height}=chartBackground(conditionContext,refs.conditionChart);
    if(state.mode==="fission"){const r=model.FISSION_REACTION,x=28,w=width-56,ratio=r.productMassU/r.reactantMassU;conditionContext.fillStyle=COLORS.cyan;conditionContext.fillRect(x,60,w,13);conditionContext.fillStyle=COLORS.green;conditionContext.fillRect(x,115,w*ratio,13);label(conditionContext,`反应前 ${fixed(r.reactantMassU,6)} u`,x,49,COLORS.cyan,9);label(conditionContext,`反应后 ${fixed(r.productMassU,6)} u`,x,104,COLORS.green,9);label(conditionContext,`Δm=${fixed(r.massDefectU,6)} u`,width-28,165,COLORS.amber,10,"right",800);return;}
    if(state.mode==="fusion"){
      const f=fusion(),profile=model.coulombProfile(),frame=axes(conditionContext,width,height,0,200,0,750,"r / fm","V / keV");
      if(state.showTheory){conditionContext.strokeStyle=COLORS.red;conditionContext.lineWidth=2;conditionContext.beginPath();profile.forEach((p,i)=>{const x=frame.x(p.radiusFm),y=frame.y(Math.min(750,p.potentialKeV));if(i)conditionContext.lineTo(x,y);else conditionContext.moveTo(x,y);});conditionContext.stroke();}
      line(conditionContext,frame.x(0),frame.y(f.temperatureKeV),frame.x(200),frame.y(f.temperatureKeV),COLORS.amber,2,[5,3]);line(conditionContext,frame.x(f.nuclearContactFm),frame.y(0),frame.x(f.nuclearContactFm),frame.y(750),COLORS.green,2);line(conditionContext,frame.x(f.closestApproachFm),frame.y(0),frame.x(f.closestApproachFm),frame.y(Math.min(750,f.temperatureKeV)),COLORS.cyan,2,[3,3]);label(conditionContext,"核力",frame.x(f.nuclearContactFm)+5,frame.y(690),COLORS.green,8);return;
    }
    const c=chain(),frame=axes(conditionContext,width,height,0,.8,0,1.6,"控制吸收率","k_eff");
    if(state.showTheory){conditionContext.strokeStyle=COLORS.violet;conditionContext.lineWidth=2;conditionContext.beginPath();for(let i=0;i<=80;i++){const control=i/100,k=model.chainState({...state,controlAbsorption:control}).kEffective,x=frame.x(control),y=frame.y(k);if(i)conditionContext.lineTo(x,y);else conditionContext.moveTo(x,y);}conditionContext.stroke();}
    line(conditionContext,frame.x(0),frame.y(1),frame.x(.8),frame.y(1),COLORS.green,1.5,[5,3]);dot(conditionContext,frame.x(state.controlAbsorption),frame.y(c.kEffective),statusColor(c.status),6);label(conditionContext,`临界 ${fixed(c.criticalControlAbsorption,3)}`,frame.x(c.criticalControlAbsorption),frame.y(1)+16,COLORS.green,8,"center");
  }
  function drawCharts(){drawGenerationChart();drawConditionChart();}

  function status(){
    if(state.mode==="fission"){const e=model.fissionEvent(state.progress);return{badge:`Q = ${fixed(e.qValueMeV,3)} MeV`,cls:"fission",nature:"Q>0 只说明反应放能",explanation:"能量上允许不等于反应会自动发生或持续"};}
    if(state.mode==="fusion"){const f=fusion();return{badge:`机会指数 ${fixed(f.opportunityIndex,2)}`,cls:"fusion",nature:f.condition==="insufficient"?"当前组合的反应机会偏低":f.condition==="enhanced"?"温度、密度与约束共同增强":"D-T 教学参考组合",explanation:`隧穿因子 ${f.tunnelingFactor.toExponential(2)}；经典最近距离仍为 ${fixed(f.closestApproachFm,1)} fm`};}
    const c=chain(),name=c.status==="subcritical"?"次临界":c.status==="critical"?"临界":"超临界";
    return{badge:`${name} · k=${fixed(c.kEffective,3)}`,cls:c.status,nature:c.status==="subcritical"?"逐代期望衰减":c.status==="critical"?"逐代期望保持":"逐代期望增长",explanation:`有效率 ${fixed(c.productiveProbability*100,1)}%，每代乘以 k=${fixed(c.kEffective,3)}`};
  }
  function rangeProgress(input){const min=Number(input.min),max=Number(input.max);input.style.setProperty("--range-progress",`${(Number(input.value)-min)/(max-min)*100}%`);}
  function render(){
    const c=chain(),f=fusion(),s=status(),mode=MODES[state.mode],generation=c.generations[activeGeneration(c)];
    refs.chainSection.hidden=state.mode==="fission"||state.mode==="fusion";refs.controlSection.hidden=state.mode!=="critical";refs.fusionSection.hidden=state.mode!=="fusion";
    refs.yieldInput.value=state.neutronYield;refs.yieldValue.textContent=fixed(state.neutronYield,2);refs.fissionProbabilityInput.value=state.fissionProbability;refs.fissionProbabilityValue.textContent=fixed(state.fissionProbability,2);refs.escapeInput.value=state.escapeFraction;refs.escapeValue.textContent=fixed(state.escapeFraction,2);refs.controlInput.value=state.controlAbsorption;refs.controlValue.textContent=fixed(state.controlAbsorption,3);refs.criticalNote.innerHTML=`临界吸收率 ${fixed(c.criticalControlAbsorption,3)}，使 k<sub>eff</sub>≈1`;
    refs.temperatureInput.value=state.temperatureKeV;refs.temperatureValue.textContent=`${fixed(state.temperatureKeV,1)} keV`;refs.densityInput.value=state.densityRatio;refs.densityValue.textContent=fixed(state.densityRatio,2);refs.confinementInput.value=state.confinementS;refs.confinementValue.textContent=`${fixed(state.confinementS,2)} s`;refs.progressInput.value=state.progress;refs.playbackValue.textContent=`${state.running?"运行中":"已暂停"} · ${fixed(state.progress*100,0)}%`;
    if(state.mode==="fission"){const e=model.fissionEvent(state.progress);refs.processMetric.textContent="²³⁵U 裂变";refs.kMetric.textContent="—";refs.generationMetric.textContent="单次事件";refs.fissionMetric.textContent=state.progress>=.42?"1.000":"0.000";refs.energyMetric.textContent=`${fixed(e.releasedEnergyMeV,3)} MeV`;refs.conditionMetric.textContent="已吸收中子";}
    else if(state.mode==="fusion"){refs.processMetric.textContent="D-T 聚变";refs.kMetric.textContent="—";refs.generationMetric.textContent="连续等离子体";refs.fissionMetric.textContent=`隧穿 ${f.tunnelingFactor.toExponential(2)}`;refs.energyMetric.textContent=`单次 ${fixed(f.qValueMeV,3)} MeV`;refs.conditionMetric.textContent=`指数 ${fixed(f.opportunityIndex,2)}`;}
    else{refs.processMetric.textContent=state.mode==="critical"?"临界控制":"裂变链反应";refs.kMetric.textContent=fixed(c.kEffective,3);refs.generationMetric.textContent=`g = ${generation.generation}`;refs.fissionMetric.textContent=fixed(generation.expectedFissions,3);refs.energyMetric.textContent=`${fixed(generation.cumulativeEnergyMeV,1)} MeV`;refs.conditionMetric.textContent=c.status==="subcritical"?"次临界":c.status==="critical"?"临界":"超临界";}
    refs.reactionNature.textContent=s.nature;refs.reactionExplanation.textContent=s.explanation;refs.modeTitle.textContent=mode.title;refs.modeGoal.textContent=mode.goal;refs.stateBadge.textContent=s.badge;refs.stateBadge.className=`state-badge is-${s.cls}`;refs.stageHint.textContent=mode.hint;
    if(state.mode==="fission"){refs.generationChartTitle.textContent="一次裂变能量账本";refs.generationChartStatus.textContent="A、Z 守恒";refs.conditionChartTitle.textContent="裂变前后静质量";refs.conditionChartStatus.textContent=`Q = ${fixed(model.FISSION_REACTION.qValueMeV,3)} MeV`;refs.formulaReadout.textContent=`Q = ${fixed(model.FISSION_REACTION.qValueMeV,3)} MeV`;}
    else if(state.mode==="fusion"){refs.generationChartTitle.textContent="聚变机会因素";refs.generationChartStatus.textContent=`相对指数 ${fixed(f.opportunityIndex,2)}`;refs.conditionChartTitle.textContent="库仑势垒与热能";refs.conditionChartStatus.textContent=`r_min = ${fixed(f.closestApproachFm,1)} fm`;refs.formulaReadout.textContent=`P_t≈exp(−√(E_G/E)) = ${f.tunnelingFactor.toExponential(2)}`;}
    else{refs.generationChartTitle.textContent="逐代期望中子数";refs.generationChartStatus.textContent=`N_g=N₀·${fixed(c.kEffective,3)}^g`;refs.conditionChartTitle.textContent="控制吸收率-k_eff";refs.conditionChartStatus.textContent=`临界 p_abs=${fixed(c.criticalControlAbsorption,3)}`;refs.formulaReadout.textContent=`k_eff = ${fixed(c.kEffective,3)}`;}
    refs.stepIndex.textContent=String(state.guideStep+1).padStart(2,"0");refs.stepTitle.textContent=GUIDE[state.guideStep].title;refs.stepPrompt.textContent=GUIDE[state.guideStep].prompt;refs.sceneTabs.forEach(b=>b.classList.toggle("is-active",b.dataset.mode===state.mode));refs.routeSteps.forEach((b,i)=>b.classList.toggle("is-active",i===state.guideStep));refs.rateButtons.forEach(b=>b.classList.toggle("is-active",Number(b.dataset.rate)===state.playbackRate));refs.keyButton.textContent=mode.key;refs.playButton.textContent=state.running?"▶ 运行中":"▶ 运行";refs.playButton.setAttribute("aria-pressed",String(state.running));
    [refs.yieldInput,refs.fissionProbabilityInput,refs.escapeInput,refs.controlInput,refs.temperatureInput,refs.densityInput,refs.confinementInput,refs.progressInput].forEach(rangeProgress);drawScene();drawCharts();
  }

  function setMode(name){if(!MODES[name])return;state.mode=name;state.progress=0;state.running=false;if(name==="chain")state.controlAbsorption=0;if(name==="critical")state.controlAbsorption=model.criticalControlAbsorption(state);render();}
  function reset(){Object.assign(state,{mode:"fission",neutronYield:2.5,fissionProbability:.65,escapeFraction:.15,controlAbsorption:.276,temperatureKeV:15,densityRatio:1,confinementS:1,progress:0,running:false,playbackRate:.5,guideStep:0,dragging:false,showNeutrons:true,showLosses:true,showEnergy:true,showLabels:true,showTheory:true});[refs.showNeutronsToggle,refs.showLossesToggle,refs.showEnergyToggle,refs.showLabelsToggle,refs.showTheoryToggle].forEach(x=>x.checked=true);render();}
  function setState(next={}){if(!next||typeof next!=="object")return;if(typeof next.mode==="string"&&MODES[next.mode])state.mode=next.mode;const ranges={neutronYield:[2,3],fissionProbability:[.2,.9],escapeFraction:[.05,.6],controlAbsorption:[0,.8],temperatureKeV:[1,40],densityRatio:[.2,3],confinementS:[.05,4],progress:[0,1]};Object.entries(ranges).forEach(([key,[min,max]])=>{if(Number.isFinite(Number(next[key])))state[key]=clamp(next[key],min,max);});if([.5,1].includes(Number(next.playbackRate)))state.playbackRate=Number(next.playbackRate);if(Number.isFinite(Number(next.guideStep)))state.guideStep=clamp(Math.round(Number(next.guideStep)),0,GUIDE.length-1);["showNeutrons","showLosses","showEnergy","showLabels","showTheory"].forEach(key=>{if(typeof next[key]==="boolean")state[key]=next[key];});state.running=false;state.dragging=false;[[refs.showNeutronsToggle,"showNeutrons"],[refs.showLossesToggle,"showLosses"],[refs.showEnergyToggle,"showEnergy"],[refs.showLabelsToggle,"showLabels"],[refs.showTheoryToggle,"showTheory"]].forEach(([input,key])=>input.checked=state[key]);render();}
  function inputHandler(ref,key){ref.addEventListener("input",()=>{state[key]=Number(ref.value);state.running=false;render();});}
  inputHandler(refs.yieldInput,"neutronYield");inputHandler(refs.fissionProbabilityInput,"fissionProbability");inputHandler(refs.escapeInput,"escapeFraction");inputHandler(refs.controlInput,"controlAbsorption");inputHandler(refs.temperatureInput,"temperatureKeV");inputHandler(refs.densityInput,"densityRatio");inputHandler(refs.confinementInput,"confinementS");inputHandler(refs.progressInput,"progress");
  refs.sceneTabs.forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));refs.routeSteps.forEach((b,i)=>b.addEventListener("click",()=>{state.guideStep=i;render();}));refs.rateButtons.forEach(b=>b.addEventListener("click",()=>{state.playbackRate=Number(b.dataset.rate);render();}));
  refs.presetButtons.forEach(b=>b.addEventListener("click",()=>{const p=b.dataset.preset;if(p==="subcritical")Object.assign(state,{mode:"critical",controlAbsorption:.6,progress:1});if(p==="critical")Object.assign(state,{mode:"critical",controlAbsorption:model.criticalControlAbsorption(state),progress:1});if(p==="supercritical")Object.assign(state,{mode:"critical",controlAbsorption:0,progress:1});if(p==="fusion")Object.assign(state,{mode:"fusion",temperatureKeV:15,densityRatio:1,confinementS:1,progress:1});state.running=false;render();}));
  refs.playButton.addEventListener("click",()=>{if(state.progress>=1)state.progress=0;state.running=true;render();});refs.pauseButton.addEventListener("click",()=>{state.running=false;render();});refs.keyButton.addEventListener("click",()=>{if(state.mode==="fission")state.progress=1;if(state.mode==="chain")state.controlAbsorption=0;if(state.mode==="critical")state.controlAbsorption=model.criticalControlAbsorption(state);if(state.mode==="fusion")Object.assign(state,{temperatureKeV:15,densityRatio:1,confinementS:1,progress:1});state.running=false;render();});refs.resetButton.addEventListener("click",reset);
  [[refs.showNeutronsToggle,"showNeutrons"],[refs.showLossesToggle,"showLosses"],[refs.showEnergyToggle,"showEnergy"],[refs.showLabelsToggle,"showLabels"],[refs.showTheoryToggle,"showTheory"]].forEach(([input,key])=>input.addEventListener("change",()=>{state[key]=input.checked;render();}));
  refs.guideButton.addEventListener("click",()=>refs.guideDialog.showModal());refs.stepButton.addEventListener("click",()=>{state.guideStep=(state.guideStep+1)%GUIDE.length;render();});refs.focusButton.addEventListener("click",()=>{const active=document.body.classList.toggle("focus-mode");refs.focusButton.setAttribute("aria-pressed",String(active));});refs.fullscreenButton.addEventListener("click",()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen());
  function pointerProgress(event){const rect=refs.canvas.getBoundingClientRect();state.progress=clamp((event.clientX-rect.left)/rect.width,0,1);state.running=false;render();}
  refs.canvas.addEventListener("pointerdown",e=>{state.dragging=true;refs.canvas.setPointerCapture(e.pointerId);pointerProgress(e);});refs.canvas.addEventListener("pointermove",e=>{if(state.dragging)pointerProgress(e);});refs.canvas.addEventListener("pointerup",e=>{state.dragging=false;if(refs.canvas.hasPointerCapture(e.pointerId))refs.canvas.releasePointerCapture(e.pointerId);});refs.canvas.addEventListener("pointercancel",()=>state.dragging=false);window.addEventListener("resize",render);
  let previous=performance.now();function frame(now){const dt=Math.min(.04,(now-previous)/1000);previous=now;if(state.running){state.progress+=dt*state.playbackRate*.5;if(state.progress>=1){state.progress=1;state.running=false;}frameCount++;drawScene();if(frameCount%3===0)render();}else if(state.mode==="critical"||state.mode==="fusion")drawScene();requestAnimationFrame(frame);}
  window.nuclearReactionLab={solveChain:(next={})=>model.chainState({...state,...next}),solveFusion:(next={})=>model.fusionState({...state,...next}),getState:()=>({...state}),setMode,setState,reset};
  render();requestAnimationFrame(frame);
})();
