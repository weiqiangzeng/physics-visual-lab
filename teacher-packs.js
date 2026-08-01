(function () {
  "use strict";

  const packs = [
    {
      lesson: "projectile.html", slug: "projectile", title: "抛体运动：从预测轨迹到分运动证据", module: "曲线运动", grade: "必修第二册", duration: 12, lessonUse: "新课探究",
      tags: ["力学", "分运动", "图像"], summary: "用同一状态连接轨迹、速度分量、加速度和等时频闪，建立正交分运动模型。",
      misconception: "轨迹弯曲并不意味着存在沿轨迹方向的合力；忽略阻力时加速度始终竖直向下。",
      objectives: ["区分速度、加速度与轨迹方向", "用分量方程解释最高点和射程", "说明水平初速度不改变竖直加速度"],
      sequence: [
        ["预测", 2, "斜抛到最高点时，速度和加速度是否都为零？", "先不播放，让学生画最高点的速度与加速度。", "保留方向判断，暂不公布答案。"],
        ["操作", 3, "拖动初速度方向，哪些量随角度改变？", "打开分量和等时频闪，比较 vx、vy 与完整轨迹。", "vx 恒定，vy 均匀变化。"],
        ["证据", 3, "等时频闪怎样证明两个方向规律不同？", "切到最高点并定位 vy=0。", "最高点仍有水平速度且 ay=-g。"],
        ["解释", 2, "为什么 45° 只在特定条件下给出最大射程？", "扫描发射角并比较射程曲线。", "同高、同速、无阻力时峰值在 45°。"],
        ["迁移", 2, "发射点与落地点不同高时结论还成立吗？", "先判断模型条件，再讨论变化。", "最大射程角依赖边界条件。"],
      ],
      presets: [
        ["components", "45° 分运动", "观察 vx 恒定与 vy 线性变化", { mode: "decompose", speed: 18, angle: 45, gravity: 9.8, target: 26, showComponents: true, showAcceleration: true, showStrobe: true }],
        ["apex", "最高点辨析", "速度不为零，加速度仍为 -g", { mode: "apex", speed: 20, angle: 60, gravity: 9.8, target: 26, showComponents: true, showAcceleration: true, showStrobe: true }],
        ["range", "射程角扫描", "核对互余角同射程与 45° 边界", { mode: "range", speed: 18, angle: 30, gravity: 9.8, target: 26, showComponents: true, showCompare: true }],
      ],
      questions: [["最高点的速度和加速度分别是什么状态？", "竖直分速度为零，水平分速度仍存在；加速度仍竖直向下。"], ["为什么水平分速度不变？", "忽略阻力时水平方向没有合力。"], ["30° 与 60° 为什么同射程？", "同速同高时射程与 sin(2θ) 成正比。"]],
      worksheet: ["画出最高点速度和加速度", "记录两组互余角的飞行时间与射程", "用分量方程解释观察结果", "写出 45° 结论的适用条件"],
      takeaway: "抛体轨迹由两个共享时间的独立分运动合成，受力决定加速度，不由轨迹外形决定。", boundary: "质点、匀强重力场、忽略空气阻力；45° 最大射程还要求同高起落。",
    },
    {
      lesson: "circular-critical.html", slug: "circular-critical", title: "圆周运动临界：真实力何时到达边界", module: "曲线运动", grade: "必修第二册", duration: 15, lessonUse: "难点突破",
      tags: ["力学", "圆周运动", "临界"], summary: "用平路、倾斜弯道、竖直圆环和拱桥统一训练径向方程与约束边界。",
      misconception: "向心力不是一种额外的力，而是所有真实力沿径向分量的合力。",
      objectives: ["先画真实力再列径向方程", "区分向心需求和可提供上限", "用 N=0 或 f=μN 定位临界"],
      sequence: [
        ["预测", 2, "汽车转弯时是否还受到一个独立的向心力？", "要求学生只画真实相互作用力。", "受力图只出现重力、支持力和摩擦。"],
        ["操作", 3, "增大速度时，需求与上限怎样变化？", "在平路场景连续增大速度。", "mv²/r 增大，而 μN 上限不随速度增大。"],
        ["证据", 4, "圆环顶部为什么用 N=0 判断刚好不断轨？", "拖到圆环顶部，比较真实力与径向需求。", "约束力不能为负，N=0 是接触边界。"],
        ["解释", 3, "倾斜弯道上摩擦方向为什么会改变？", "把速度扫过无摩擦理想速度。", "摩擦补偿径向分量不足或过量。"],
        ["迁移", 3, "拱桥顶部 N=0 后会发生什么？", "比较内轨圆环与外凸拱桥。", "同一等号对应不同几何约束后的运动。"],
      ],
      presets: [
        ["flat-limit", "平路打滑边界", "比较实际摩擦与最大静摩擦", { mode: "flat", mass: 1200, radius: 40, speed: 14.68, mu: 0.55, bank: 20, progress: 0, showForces: true, showRadial: true, showLimit: true, showTheory: true }],
        ["loop-top", "竖直圆环顶部", "观察 N 降到零的保持接触边界", { mode: "loop", mass: 70, radius: 8, speed: 19.8, mu: 0.55, bank: 20, progress: 1, showForces: true, showRadial: true, showLimit: true, showTrail: true }],
        ["hill-release", "拱桥失重", "速度达到 sqrt(gr) 时 N=0", { mode: "hill", mass: 1200, radius: 40, speed: 19.8, mu: 0.55, bank: 20, progress: 0.5, showForces: true, showRadial: true, showLimit: true }],
      ],
      questions: [["为什么不能把向心力画成第五个力？", "向心力是径向合力的角色，不是新的相互作用。"], ["N=0 为什么是接触边界？", "接触面只能推不能拉，支持力不能取负。"], ["平路临界速度与质量有关吗？", "质量在 mv²/r=μmg 中约去。"]],
      worksheet: ["只画真实力", "写出每个场景的径向正方向", "记录临界等号与速度", "比较圆环顶部和拱桥顶部的后续运动"],
      takeaway: "所有圆周临界都先写真实力的径向合力，再检查摩擦、支持力或张力的物理边界。", boundary: "质点、刚性轨道、给定摩擦因数；忽略轮胎形变、悬架、空气阻力和轨道粗糙变化。",
    },
    {
      lesson: "mechanical-energy.html", slug: "mechanical-energy", title: "机械能：守恒结论取决于系统边界", module: "功和机械能", grade: "必修第二册", duration: 15, lessonUse: "概念建构",
      tags: ["能量", "系统边界", "守恒"], summary: "把动能、重力势能、弹性势能和内能放进同一实时账本。",
      misconception: "存在摩擦不等于能量不守恒；它首先意味着机械能可能转化为内能。",
      objectives: ["区分机械能与系统总能量", "选择系统边界并写出能量方程", "用能量账本解释摩擦过程"],
      sequence: [["预测", 2, "下降一半高度时动能和势能一定相等吗？", "隐藏数值先作判断。", "相等还依赖初速度与零势能面。"], ["操作", 3, "加入摩擦后哪条能量曲线减少？", "比较光滑与粗糙斜面。", "机械能减少、内能增加。"], ["证据", 4, "总账是否闭合？", "逐项相加 K、Ug、Us 和内能。", "完整系统总能量保持恒定。"], ["解释", 3, "同一过程为何有不同方程？", "只切换系统边界。", "内外能量交换的口径改变。"], ["迁移", 3, "空气阻力做功应记在哪里？", "讨论物体、空气和地球的系统选择。", "是否守恒取决于系统包含哪些对象。"]],
      presets: [["gravity", "自由下落交换", "观察 K 与 Ug 的互换", { mode: "gravity", m: 2, position: 4, v0: 0, mu: 0.18, k: 32, boundary: "full", showVelocity: true, showForce: true, showFlow: true, showReference: true }], ["rough", "粗糙斜面", "机械能转化为内能", { mode: "rough", m: 2, position: 4, v0: 0, mu: 0.25, k: 32, boundary: "full", showVelocity: true, showForce: true, showFlow: true, showReference: true }], ["boundary", "系统边界对照", "保持过程不变，只改变记账口径", { mode: "boundary", m: 2, position: 4, v0: 0, mu: 0.18, k: 32, boundary: "object", showVelocity: true, showForce: true, showFlow: true, showReference: true }]],
      questions: [["有摩擦时总能量还守恒吗？", "完整封闭系统总能量仍守恒，机械能转化为内能。"], ["零势能面改变会影响运动吗？", "不会，只改变势能数值基准。"], ["为什么先选系统？", "系统边界决定某种能量是内部转化还是跨边界做功。"]],
      worksheet: ["列出系统中的能量类型", "记录粗糙过程机械能减少量", "核对内能增加量", "为同一过程写两种系统边界方程"], takeaway: "机械能守恒有条件，总能量守恒要在明确系统边界后核对完整账本。", boundary: "质点、恒定重力和理想弹簧；摩擦耗散简化为内能，不描述微观温升分布。",
    },
    {
      lesson: "electric-field.html", slug: "electric-field", title: "电场与电势：矢量场和标量势不能混用", module: "电场与电荷", grade: "必修第三册", duration: 15, lessonUse: "概念辨析",
      tags: ["电场", "电势", "叠加"], summary: "用空间探针统一读取场强、电势、试探电荷受力和电势能。",
      misconception: "E=0 不必然 V=0，V=0 也不必然 E=0；试探电荷不会创造原本不存在的场。",
      objectives: ["区分场强矢量和电势标量", "使用叠加原理判断特殊点", "用端点电势差解释静电场做功"],
      sequence: [["预测", 2, "把试探电荷调为零，电场是否消失？", "先隐藏场线作判断。", "E、V 由源电荷决定。"], ["操作", 3, "改变试探电荷正负，哪些量反向？", "拖动探针并改变 q0。", "F 与 U 改变，空间 E 与 V 不变。"], ["证据", 4, "能否找到 V=0 但 E≠0？", "定位偶极中垂线。", "标量电势相消，矢量场仍可同向叠加。"], ["解释", 3, "两条路径为何做功相同？", "比较直达与绕行。", "静电场是保守场，功只由端点决定。"], ["迁移", 3, "等势线上移动电荷，场强一定为零吗？", "沿等势线移动探针。", "电场可非零但与位移垂直，做功为零。"]],
      presets: [["single", "单电荷探针", "区分 E、F、V、U", { mode: "single", q1: 6, q2: -6, separation: 3, testCharge: 2, probeX: 2.4, probeY: 1.2, showFieldLines: true, showVectors: true, showEquipotential: true, showForce: true, showPotentialMap: true }], ["dipole", "偶极中垂线", "V=0 但 E 不为零", { mode: "superposition", q1: 6, q2: -6, separation: 3, testCharge: 2, probeX: 0, probeY: 2, showFieldLines: true, showVectors: true, showEquipotential: true, showForce: true }], ["same-sign", "同号电荷中点", "E=0 但 V 不为零", { mode: "potential", q1: 6, q2: 6, separation: 3, testCharge: 2, probeX: 0, probeY: 0, showFieldLines: true, showVectors: true, showEquipotential: true, showPotentialMap: true }]],
      questions: [["负试探电荷处的 E 会反向吗？", "不会，E 的定义方向不依赖试探电荷。"], ["E=0 的点电势一定为零吗？", "不一定，场强是矢量和，电势是标量和。"], ["等势线为何与电场线垂直？", "沿等势线移动电势差为零，电场不做功。"]], worksheet: ["记录一处 E、V、F、U", "寻找两类特殊零点", "比较两条路径的做功", "写出 E 与 V 的叠加方式"], takeaway: "场强描述单位正电荷受力，是矢量；电势描述单位电荷能量，是标量。", boundary: "点电荷和匀强场近似，忽略介质极化、辐射及试探电荷对源分布的扰动。",
    },
    {
      lesson: "charged-particle.html", slug: "charged-particle", title: "带电粒子：电场改变能量，磁场改变方向", module: "磁场与电磁感应", grade: "必修第三册", duration: 15, lessonUse: "模型对比",
      tags: ["洛伦兹力", "复合场", "配速"], summary: "并排比较纯电场、纯磁场、速度选择器和正交复合场轨迹。",
      misconception: "磁场力通常改变速度方向而不改变速率，不会持续给粒子增加动能。",
      objectives: ["比较电场力和磁场力做功特点", "判断电荷符号改变后的偏转", "建立 v=E/B 的速度选择条件"],
      sequence: [["预测", 2, "纯磁场中粒子会越跑越快吗？", "先画 F 与 v 的夹角。", "F始终垂直v，瞬时功率为零。"], ["操作", 3, "反转电荷会改变哪些方向？", "比较正负电荷轨迹。", "电场力、磁场力和偏转同时反向。"], ["证据", 4, "速度图如何区分纯电场和纯磁场？", "切换两个场景观察速率曲线。", "纯电场改变速率，纯磁场速率恒定。"], ["解释", 3, "什么粒子能直线通过选择器？", "调到 v=E/B。", "两力等大反向且速度方向正确。"], ["迁移", 3, "偏离配速后轨迹为什么不是简单抛物线？", "进入正交复合场。", "运动可分解为漂移和相对回旋。"]],
      presets: [["electric", "纯电场类平抛", "电场力做功并改变速率", { mode: "electric", charge: 1, mass: 1.5, electric: 3, magnetic: 0, speed: 4, angle: 0, showTrail: true, showVectors: true, showField: true, showDecomposition: true }], ["magnetic", "纯磁场圆周", "力垂直速度，速率不变", { mode: "magnetic", charge: 1, mass: 1.5, electric: 0, magnetic: 0.8, speed: 4, angle: 0, showTrail: true, showVectors: true, showField: true }], ["selector", "速度选择器", "配平 qE 与 qvB", { mode: "selector", charge: 1, mass: 1.5, electric: 8, magnetic: 0.8, speed: 1, angle: 0, showTrail: true, showVectors: true, showField: true, showDecomposition: true }]],
      questions: [["磁场为什么不改变速率？", "洛伦兹力始终垂直瞬时速度，做功为零。"], ["改变电荷正负后配速大小变吗？", "不变，两种力同时反向，E/B 不含电荷。"], ["v=E/B 就一定不偏转吗？", "还要求速度与场方向满足两力反向。"]], worksheet: ["画纯电场和纯磁场受力", "比较两种速率图", "计算一组配速", "说明配速条件的方向要求"], takeaway: "电场可改变粒子动能，磁场主要改变运动方向；正交场中只有满足方向与 v=E/B 的粒子不偏转。", boundary: "经典低速点粒子、匀强场，忽略辐射、碰撞、边缘场和空间电荷。",
    },
    {
      lesson: "electromagnetic-induction.html", slug: "electromagnetic-induction", title: "电磁感应：关键是磁通量的变化率", module: "磁场与电磁感应", grade: "选择性必修第二册", duration: 15, lessonUse: "规律探究",
      tags: ["磁通量", "法拉第定律", "楞次定律"], summary: "让磁铁运动、磁通曲线、电动势和感应电流由同一状态驱动。",
      misconception: "磁场强或磁通量大并不保证有感应电动势；必须观察磁通量是否随时间变化。",
      objectives: ["区分磁通量和磁通变化率", "用楞次定律判断方向", "解释闭路中的机械功与焦耳热"],
      sequence: [["预测", 2, "磁铁停在线圈旁边会持续有电流吗？", "固定磁铁在强场位置。", "磁通非零但变化率为零。"], ["操作", 3, "相同磁通变化量用时不同会怎样？", "比较快慢两种运动。", "时间更短时电动势峰值更大。"], ["证据", 4, "Φ 极值处 ε 为何为零？", "进入旋转线圈并拖动相位。", "ε 与 -dΦ/dt 同步，不与 Φ 本身同步。"], ["解释", 3, "楞次定律阻碍的是什么？", "比较靠近和远离。", "感应场阻碍磁通的变化，不总是反对外磁场。"], ["迁移", 3, "开路时是否完全没有感应现象？", "只切换开路和闭路。", "开路仍有电动势，但无持续电流和焦耳热。"]],
      presets: [["approach", "N 极靠近", "观察磁通增加与感应方向", { mode: "motion", field: 0.08, motion: 0.12, turns: 100, area: 100, resistance: 10, pole: 1, direction: 1, circuit: "closed", showField: true, showFlux: true, showInduced: true, showCarriers: true }], ["fast", "快速变化", "相同 ΔΦ、更大的变化率", { mode: "rate", field: 0.08, motion: 1.5, turns: 100, area: 100, resistance: 10, pole: 1, direction: 1, circuit: "closed", showField: true, showFlux: true, showInduced: true }], ["open", "开路对照", "有电动势但无持续电流", { mode: "circuit", field: 0.08, motion: 0.12, turns: 100, area: 100, resistance: 10, pole: 1, direction: 1, circuit: "open", showField: true, showFlux: true, showInduced: true, showCarriers: true }]],
      questions: [["磁通量最大时电动势也最大吗？", "不一定；电动势由磁通变化率决定。"], ["楞次定律是否总让感应场反向？", "不是，它阻碍磁通的变化，减少时会试图维持原方向。"], ["开路为什么还能测到电压？", "电荷分离建立端电势差，但无闭合路径形成持续电流。"]], worksheet: ["画出靠近与远离的磁通变化", "比较快慢过程的峰值", "判断两次感应电流方向", "解释开路与闭路的能量差异"], takeaway: "法拉第定律连接电动势与磁通变化率，楞次定律用能量守恒确定负号所代表的方向。", boundary: "小线圈、平滑轴向磁场和刚性回路近似，忽略自感、辐射与复杂边缘场。",
    },
    {
      lesson: "resonance.html", slug: "resonance", title: "受迫振动：峰值、相位和能量输入", module: "机械振动与机械波", grade: "选择性必修第一册", duration: 15, lessonUse: "图像分析",
      tags: ["共振", "相位", "阻尼"], summary: "把稳态幅频、相频、平均功率和瞬态衰减放入同一模型。",
      misconception: "受迫振动频率等于驱动频率；有阻尼时位移峰不一定严格位于无阻尼固有频率。",
      objectives: ["区分固有频率和驱动频率", "解释相位随频率的变化", "用带宽与 Q 值描述阻尼"],
      sequence: [["预测", 2, "改变驱动频率会改变系统固有频率吗？", "保持 m、k 不变先判断。", "固有频率不变，稳态响应频率随驱动。"], ["操作", 3, "位移峰和功率峰是否重合？", "慢速扫过共振区。", "有阻尼时位移峰略低，功率峰在 f0。"], ["证据", 4, "f=f0 时为何平均输入功率最大？", "同时观察相位与速度。", "位移滞后90°时速度近与驱动力同相。"], ["解释", 3, "阻尼增大为何峰变矮又变宽？", "比较多组阻尼。", "能量耗散加快，频率选择性下降。"], ["迁移", 3, "怎样减小建筑或机器共振风险？", "讨论改变固有频率、阻尼或驱动。", "避免频率接近或增加耗散。"]],
      presets: [["low", "低频近同相", "位移几乎跟随驱动力", { mode: "steady", mass: 1, spring: 39.4784, damping: 0.1, force: 1, frequency: 0.4, showForce: true, showPhase: true, showEnvelope: true, showPower: true }], ["power", "固有频率功率峰", "位移滞后约 90°", { mode: "sweep", mass: 1, spring: 39.4784, damping: 0.1, force: 1, frequency: 1, showForce: true, showPhase: true, showEnvelope: true, showPower: true }], ["damped", "高阻尼宽峰", "比较峰高、带宽和 Q", { mode: "damping", mass: 1, spring: 39.4784, damping: 0.8, force: 1, frequency: 1, showForce: true, showPhase: true, showEnvelope: true, showPower: true }]],
      questions: [["稳态受迫振动频率由谁决定？", "由驱动频率决定。"], ["为什么位移峰与功率峰可不重合？", "位移响应和能量吸收对应不同函数，有阻尼时峰位不同。"], ["Q 大意味着什么？", "共振峰高而窄，频率选择性强、阻尼较小。"]], worksheet: ["记录低频、共振、高频三处相位", "标出位移峰与功率峰", "比较两种阻尼的带宽", "提出一个避振方案"], takeaway: "共振要同时看幅值、相位和功率；阻尼控制峰高、带宽、Q 值和瞬态消失速度。", boundary: "线性弹簧、黏性阻尼和正弦驱动近似，忽略非线性、摩擦滞回与结构破坏。",
    },
    {
      lesson: "double-slit.html", slug: "double-slit", title: "双缝干涉：从路程差到单光子统计", module: "光学", grade: "选择性必修第一册", duration: 15, lessonUse: "宏微观统一",
      tags: ["干涉", "路程差", "光子统计"], summary: "连接双缝几何、强度曲线、参数规律和单光子落点累计。",
      misconception: "单个光子不是沿两条可观察的经典轨迹分裂；干涉表现为大量探测事件的概率分布。",
      objectives: ["用路程差判断亮暗", "验证 β≈λL/d", "区分单次探测和统计强度"],
      sequence: [["预测", 2, "波长变长时条纹会变密还是变疏？", "先固定 d、L 作比例判断。", "β 与 λ 正比。"], ["操作", 3, "亮纹与暗纹分别对应怎样的 Δr？", "拖动屏上探针。", "整数倍 λ 加强，半整数倍 λ 减弱。"], ["证据", 4, "三个参数怎样独立影响 β？", "每次只改变 λ、L 或 d。", "测量点与 β=λL/d 一致。"], ["解释", 3, "单个光子为何不能画成一条确定干涉轨迹？", "进入单光子场景并累计落点。", "单次落点随机，大量分布趋近强度曲线。"], ["迁移", 3, "获得路径信息后条纹为何减弱？", "开启路径标记作对照。", "路径可区分性破坏相干交叉项。"]],
      presets: [["spacing", "红光标准条纹", "测量中央附近条纹间距", { mode: "spacing", wavelength: 600, slit: 0.3, slitWidth: 0.06, screen: 1.2, cursorRatio: 0, showRays: true, showWaves: true, showEnvelope: true, showLabels: true, whichPath: false, photonRate: 20 }], ["path", "一级暗纹探针", "用 Δr/λ 判断相消", { mode: "path", wavelength: 600, slit: 0.3, slitWidth: 0.06, screen: 1.2, cursorRatio: 0.5, showRays: true, showWaves: true, showEnvelope: true, showLabels: true, whichPath: false }], ["photon", "单光子累计", "从离散事件形成统计条纹", { mode: "photon", wavelength: 600, slit: 0.3, slitWidth: 0.06, screen: 1.2, cursorRatio: 0, showRays: true, showWaves: true, showEnvelope: true, showLabels: true, whichPath: false, photonRate: 60 }]],
      questions: [["暗纹处是完全没有光子吗？", "单次事件仍可能出现，但长期概率密度在理想暗纹处趋近零。"], ["增大双缝间距为何条纹变密？", "同一屏上位置对应更大路程差，达到相邻级次所需位移更小。"], ["光子动画是实际可见轨迹吗？", "不是，是发射与探测事件的教学映射。"]], worksheet: ["预测三个参数的影响方向", "测量相邻三组亮纹间距", "记录一级暗纹的 Δr/λ", "比较少量和大量光子分布"], takeaway: "双缝几何决定相位差，强度是概率分布；单次探测离散，大量事件呈现稳定干涉条纹。", boundary: "单色相干光、远场与小角近似；光子飞行动画不表示可观测的经典路径。",
    },
    {
      lesson: "refraction.html", slug: "refraction", title: "折射与全反射：连续定律如何到达边界", module: "光学", grade: "选择性必修第一册", duration: 12, lessonUse: "规律与临界",
      tags: ["斯涅尔定律", "临界角", "全反射"], summary: "让拖动光路、角度读数、正弦图和状态切换保持一致。",
      misconception: "大入射角并不自动产生全反射；还必须从高折射率介质射向低折射率介质。",
      objectives: ["从法线正确测量角度", "用正弦关系验证折射定律", "说出全反射两个必要条件"],
      sequence: [["预测", 2, "空气进入玻璃时光线偏向还是远离法线？", "先标出法线再判断。", "进入高折射率介质时折射角更小。"], ["操作", 2, "交换传播方向后规律怎样变化？", "交换介质并拖动角度。", "高到低时折射角大于入射角。"], ["证据", 3, "临界角如何从图像和公式共同得到？", "调到折射光沿界面。", "sinθc=n2/n1，玻璃到空气约41.8°。"], ["解释", 3, "空气到玻璃为何再大角也不会全反射？", "保持大角交换介质。", "只有 n1>n2 才存在实数临界角。"], ["迁移", 2, "光纤为什么还需要合适入射角？", "把两个条件迁移到芯层界面。", "传播方向和角度必须共同满足全反射。"]],
      presets: [["air-glass", "空气到玻璃", "30° 入射约 19.47° 折射", { mode: "refraction", angle: 30, medium1: "air", medium2: "glass", wavelength: 650, showNormal: true, showAngles: true, showReflection: true, showCritical: true }], ["critical", "玻璃临界角", "折射光恰沿界面传播", { mode: "critical", angle: 41.81, medium1: "glass", medium2: "air", wavelength: 589, showNormal: true, showAngles: true, showReflection: true, showCritical: true }], ["total", "全反射", "高到低且超过临界角", { mode: "total", angle: 55, medium1: "glass", medium2: "air", wavelength: 532, showNormal: true, showAngles: true, showReflection: true, showCritical: true }]],
      questions: [["全反射需要哪两个条件？", "高折射率射向低折射率，且入射角大于临界角。"], ["临界状态下折射角是多少？", "90°，折射光恰沿界面。"], ["改变颜色为何可能改变临界角？", "介质折射率通常随波长变化。"]], worksheet: ["预测空气到玻璃的偏折方向", "记录 30° 入射的折射角", "测量玻璃到空气临界角", "写出大角但不会全反射的反例"], takeaway: "斯涅尔定律连续决定折射，临界角是折射解到达 90° 的边界，超过边界才进入全反射。", boundary: "均匀各向同性介质、平整界面和几何光学近似，不展开倏逝场与受抑全反射。",
    },
    {
      lesson: "ideal-gas.html", slug: "ideal-gas", title: "理想气体：从分子碰撞到 p-V-T 关系", module: "热学与气体", grade: "选择性必修第三册", duration: 15, lessonUse: "微观建模",
      tags: ["热学", "分子运动", "状态方程"], summary: "让粒子运动、碰撞脉冲、压强取样和状态过程由同一微观模型驱动。",
      misconception: "温度描述大量分子平动动能的统计尺度，不是某一个分子的固定速度。",
      objectives: ["从碰撞动量变化解释压强", "区分瞬时涨落与平均压强", "用微观图景解释三类状态过程"],
      sequence: [["预测", 2, "同一温度下每个分子速度都相同吗？", "先观察速度分布。", "分子速度有宽分布并不断因碰撞改变。"], ["操作", 3, "定容加热时微观上哪些量改变？", "比较粒子速度和碰壁频率。", "平均动能和单位时间动量传递增加。"], ["证据", 4, "瞬时压强为何涨落而宏观压强稳定？", "改变取样窗口。", "更多事件使相对涨落减小。"], ["解释", 3, "等温压缩为何提高压强？", "保持温度减小体积。", "速率尺度不变但碰壁更频繁。"], ["迁移", 3, "高压低温真实气体为何偏离？", "讨论分子体积和相互作用。", "理想模型的关键假设失效。"]],
      presets: [["micro", "微观碰撞", "观察速度分布与压强取样", { mode: "microscopic", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 0, playbackRate: 0.5, showVelocity: true, showTrails: true, showCollisions: true, showPressure: true, showSample: true }], ["heat", "定容升温", "速度和压强同步增大", { mode: "isochoric", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 1, playbackRate: 0.5, showVelocity: true, showTrails: true, showCollisions: true, showPressure: true, showSample: true }], ["compress", "等温压缩", "速度尺度不变、碰壁频率增大", { mode: "isothermal", amount: 0.1, baseVolume: 10, baseTemperature: 300, species: "nitrogen", progress: 1, playbackRate: 0.5, showVelocity: true, showTrails: true, showCollisions: true, showPressure: true, showSample: true }]],
      questions: [["温度升高是否意味着每个分子都加速？", "温度对应统计平均动能提高，单个分子速度仍不断变化。"], ["等温压缩为何压强增大？", "平均速率尺度不变，但单位时间单位面积碰撞更多。"], ["宏观压强为何比单次碰撞稳定？", "压强是大量碰撞在时间和面积上的统计平均。"]], worksheet: ["描述速度分布而非只记录一个分子", "比较定容升温前后平均动能与压强", "比较等温压缩前后碰壁频率", "写出理想气体两个微观假设"], takeaway: "宏观 p、V、T 是大量微观事件的统计描述，状态方程来自粒子数、速度尺度和碰撞频率共同作用。", boundary: "质点分子、弹性碰撞、除碰撞外无相互作用；高压低温真实气体会偏离。",
    },
  ];

  packs.forEach((pack) => {
    pack.sequence = pack.sequence.map(([phase, minutes, prompt, action, evidence]) => ({ phase, minutes, prompt, action, evidence }));
    pack.presets = pack.presets.map(([id, title, note, state]) => ({ id, title, note, state }));
    pack.questions = pack.questions.map(([prompt, answer]) => ({ prompt, answer }));
    pack.image = "./assets/teacher/" + pack.slug + ".jpg";
  });

  function validPack(pack) {
    return /^[a-z0-9-]+\.html$/.test(pack.lesson)
      && pack.sequence.length === 5 && pack.sequence.every((step) => step.phase && step.prompt && step.action && step.evidence)
      && pack.presets.length === 3 && pack.presets.every((preset) => preset.id && Object.keys(preset.state).length >= 4)
      && pack.questions.length === 3 && pack.objectives.length === 3 && pack.worksheet.length >= 4
      && pack.misconception && pack.takeaway && pack.boundary;
  }
  const invalid = packs.filter((pack) => !validPack(pack));
  if (invalid.length) throw new Error("Invalid teacher packs: " + invalid.map((pack) => pack.lesson).join(", "));

  const byLesson = Object.fromEntries(packs.map((pack) => [pack.lesson, pack]));
  window.physicsTeacherPacks = Object.freeze({
    version: 1,
    packs: Object.freeze(packs),
    byLesson: Object.freeze(byLesson),
    get(lesson) { return byLesson[lesson] || null; },
  });
})();
