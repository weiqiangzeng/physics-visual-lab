(function () {
  const lessons = [
    "motion-graphs.html",
    "vertical-motion.html",
    "friction.html",
    "newton-laws.html",
    "interaction.html",
    "projectile.html",
    "circular.html",
    "circular-critical.html",
    "orbital.html",
    "work-propulsion.html",
    "mechanical-energy.html",
    "electric-field.html",
    "electrostatic-conductor.html",
    "capacitor.html",
    "ohm-law.html",
    "circuit-applications.html",
    "power-source.html",
    "magnetic-field.html",
    "charged-particle.html",
    "mass-spectrometer.html",
    "electromagnetic-induction.html",
    "alternating-current.html",
    "electromagnetic-oscillation.html",
    "collision.html",
    "oscillation.html",
    "resonance.html",
    "waves.html",
    "refraction.html",
    "lens.html",
    "double-slit.html",
    "ideal-gas.html",
    "matter-phase.html",
    "thermodynamics.html",
    "photoelectric.html",
    "bohr.html",
    "matter-wave.html",
    "radioactive-decay.html",
    "binding-energy.html",
    "nuclear-reaction.html",
  ];
  const lessonTasks = {
    "motion-graphs.html": [
      "切换匀速和匀变速，比较 \\(x-t\\) 图像的斜率。",
      "拖动同一时刻的竖线，对照 \\(x-t\\) 和 \\(v-t\\) 图像上的点。",
      "观察 \\(v-t\\) 图像与时间轴围成的面积，说明它为什么表示位移。",
    ],
    "vertical-motion.html": [
      "改变两个物体质量并同时释放，核对真空中高度、速度与落地时刻是否一致。",
      "暂停在最高点和返回原高度时刻，比较速度、加速度及同高度速率的对称关系。",
      "切换匀速参考系和空气阻力，区分坐标读数变化与真空模型适用边界。",
    ],
    "friction.html": [
      "逐渐增大外力，记录物体仍然静止时 \\(f_{\\text{静}}\\) 的变化。",
      "定位 \\(f_{\\mathrm{max}}\\)，判断何时开始发生相对滑动。",
      "改变质量或摩擦因数，比较 \\(f_{\\mathrm{max}}\\) 和 \\(f_{\\text{滑}}\\)。",
    ],
    "newton-laws.html": [
      "保持质量不变，改变 \\(F_{\\text{合}}\\)，观察加速度如何变化。",
      "保持合力不变，改变质量，比较相同时间内速度的变化。",
      "把 \\(F_{\\text{合}}\\) 调为零，判断物体可以保持什么运动状态。",
    ],
    "interaction.html": [
      "改变两力夹角，用分量和余弦定理核对合力大小与方向。",
      "拖动弹簧跨过弹性限度，区分胡克定律的计算结果与模型适用性。",
      "分别比较第三定律力对和连接体整体/隔离受力图，说明研究对象为何决定力的账本。",
    ],
    "projectile.html": [
      "定位最高点，确认 \\(v_y = 0\\) 但速度并不为 0。",
      "改变发射角，比较飞行时间和水平射程。",
      "用 \\(v_x\\)、\\(v_y\\) 说明水平方向和竖直方向为什么可以分开研究。",
    ],
    "circular.html": [
      "定位三个关键位置，确认速度沿切线、加速度指向圆心。",
      "改变线速度，观察 \\(a_c\\) 如何变化。",
      "改变半径，比较 \\(F_c\\)、周期和速度方向的变化。",
    ],
    "circular-critical.html": [
      "在平路转弯中逐步增大速度，区分实际静摩擦力和最大静摩擦力，并找到打滑临界。",
      "进入倾斜弯道，比较当前速度与无需摩擦的理想速度，判断摩擦沿坡方向。",
      "分别在竖直圆环顶部和拱桥顶部令 N=0，解释两个临界速度对应的不同运动结果。",
    ],
    "orbital.html": [
      "把轨道高度从近地轨道提高到同步轨道，比较圆轨道速度、周期、场强和比机械能。",
      "进入同步轨道场景，说明周期等于恒星日为什么还不足以保证卫星相对地面静止。",
      "完成 400 km 到同步轨道的霍曼转移，再改变切向速度跨过撞地、椭圆与逃逸边界。",
    ],
    "mechanical-energy.html": [
      "在自由下落场景定位能量平分时刻，核对动能与重力势能。",
      "进入粗糙斜面，比较机械能减少量和内能增加量。",
      "切换三种系统边界，分别写出物体、物体加地球、完整系统的能量方程。",
    ],
    "work-propulsion.html": [
      "把力与位移夹角依次调到 0°、90° 和大于 90°，核对功的正负与动能变化。",
      "比较平均功率与瞬时功率，说明做功多少和做功快慢为何不是同一物理量。",
      "用反冲动量账本和火箭质量流模型，区分动量守恒、推力、净加速度与理想速度增量。",
    ],
    "electric-field.html": [
      "改变试探电荷 q₀ 的大小和正负，比较场强 E、电场力 F 与电势能 U 哪些量会改变。",
      "分别定位偶极子中垂线和等量同号电荷中点，解释 V=0 但 E≠0、E=0 但 V≠0。",
      "比较直达与绕行两条路径，核对同一对端点间电场力做功和电势能变化。",
    ],
    "electrostatic-conductor.html": [
      "播放自由电荷重排，核对静电平衡时导体内部场强、表面切向场和导体电势。",
      "比较孤立中性球与接地球，说明两者的电势边界和导体净电荷为什么不同。",
      "移动探针跨过空腔、导体材料和外部区域，用高斯定律核对内外表面电荷账本。",
    ],
    "capacitor.html": [
      "保持接通电源并把板距加倍，核对 C、Q、E 和储能的变化比例。",
      "断开电源后重复板距变化，说明为什么 Q 和 E 不变而 U 与储能加倍。",
      "插入介质并检查电池功、外力功和电容器能量变化，最后定位空气击穿边界。",
    ],
    "ohm-law.html": [
      "保持电阻不变，改变电压，核对电流表读数与 \\(I=U/R\\)。",
      "保持电压不变，改变电阻，观察电流与电阻的反比例关系。",
      "切换小灯泡，比较非线性伏安曲线与定值电阻直线，并说明温度影响。",
    ],
    "circuit-applications.html": [
      "切换串联和并联，用 KVL/KCL 残差核对电压分配与电流分流。",
      "把额定 1000 W、220 V 负载降到半电压，比较实际功率和两小时电能。",
      "切换光敏与 NTC 热敏电阻，追踪输入量如何经电阻变化转成分压输出和阈值状态。",
    ],
    "power-source.html": [
      "改变负载电阻，逐项核对 ℰ=U+Ir 与 P源=P外+P内。",
      "在 U-I 特性线上读取开路截距和斜率，再用两个工作点反推电动势与内阻。",
      "比较 R=r、R≫r 和 R=0，区分最大输出功率、较高效率与短路危险。",
    ],
    "magnetic-field.html": [
      "反转直导线电流并沿径向移动探针，核对磁场方向和 \\(B\\propto I/r\\)。",
      "在双导线中比较同向与反向电流，分别寻找中点相消和相加的状态。",
      "沿线圈与螺线管轴线移动探针，比较中心场、边缘效应和 \\(B\\approx\\mu_0nI\\) 的适用范围。",
    ],
    "oscillation.html": [
      "定位端点和平衡位置，比较速度与加速度的大小。",
      "在时间图像和相位圆中追踪 \\(x\\)、\\(v\\)、\\(a\\) 的相位关系。",
      "改变质量或劲度系数，观察周期如何变化。",
    ],
    "resonance.html": [
      "从低频扫到高频，比较位移峰值频率与平均输入功率峰值频率。",
      "在 f=f₀ 处核对位移滞后驱动力 90°，并解释驱动力为何与速度近同相。",
      "增大阻尼比，记录峰值、半功率带宽和品质因数的同步变化。",
    ],
    "waves.html": [
      "分别观察入射波、反射波和合成波的传播方向。",
      "定位节点和腹部，比较它们的位移与振幅。",
      "改变波长，验证节点间距与波长的关系。",
    ],
    "charged-particle.html": [
      "比较仅电场和仅磁场，观察电场力与磁场力对运动的不同作用。",
      "进入配速法，把速度调到竖直合力接近 0。",
      "用 \\(v = v_{\\text{配}} + v_{\\text{余}}\\) 解释配速漂移与余速圆周运动。",
    ],
    "mass-spectrometer.html": [
      "改变入射速度，比较选择器出口偏移，确认装置只筛选而不主动调速。",
      "精确配平 qE 与 qvB 后进入分析场，用半圆半径反演粒子质量。",
      "比较两种同位素和不同电荷态，核对检测位置比、质量比与质荷比。",
    ],
    "electromagnetic-induction.html": [
      "让 N 极分别靠近和远离线圈，比较磁通变化率、感应电动势和电流方向。",
      "保持磁通变化量不变，改变变化时间，验证感应电动势由变化率决定。",
      "保持磁铁运动不变，切换开路与闭路，区分感应电动势、感应电流和能量转化。",
    ],
    "alternating-current.html": [
      "拖动发电机线圈相位，定位磁通量极值与电动势峰值，解释两者相差四分之一周期。",
      "用 220 V 等效直流比较正弦交流的热效应，再把变压器频率降为零观察稳态输出。",
      "固定输送功率与线路电阻，把输电电压从 10 kV 提高到 200 kV，比较电流、线损和效率。",
    ],
    "electromagnetic-oscillation.html": [
      "拖动 LC 相位到 0、1/4、1/2 和 3/4 周期，比较电荷、电流、电场能与磁场能。",
      "改变 L、C 和回路电阻，核对固有频率与阻尼能量包络，再用 Q 比较调谐带宽。",
      "把电磁波频率从无线电扫到可见光，核对 E、B、传播方向以及 c=fλ、E=cB。",
    ],
    "collision.html": [
      "分别进入弹性和完全非弹性场景，比较碰撞前后总动量与总动能。",
      "改变两车质量和初速度，预测碰后速度方向，再用读数核对。",
      "连续改变恢复系数 \\(e\\)，观察动能保留率如何变化。",
    ],
    "refraction.html": [
      "先确认入射角和折射角都是从法线量起，再比较两者大小。",
      "固定两种介质，改变入射角，观察折射角是否按斯涅尔定律变化。",
      "让光从高折射率介质射向低折射率介质，找到临界角并观察全反射。",
    ],
    "lens.html": [
      "拖动物体跨过 2f、f 和焦内区域，比较像的位置、大小和正倒。",
      "打开主光线，确认平行光线、过光心光线与焦点光线在像点会合。",
      "移动光屏到理论像距并记录数据，用倒数图检验薄透镜成像公式。",
    ],
    "double-slit.html": [
      "先定位中央亮纹，再寻找两侧相邻亮纹，比较它们的间距。",
      "每次只改变一个参数，观察波长、双缝间距和屏距对条纹的影响。",
      "在屏上选择亮纹和暗纹位置，用路程差解释相长与相消干涉。",
    ],
    "ideal-gas.html": [
      "拖动活塞改变体积，比较分子碰撞频率和宏观压强读数。",
      "切换 N₂ 与 He，核对相同 n、V、T 下压强相同而特征速率不同。",
      "完成等温、等容和等压过程，分别检查 pV、p/T 与 V/T 是否保持不变。",
    ],
    "matter-phase.html": [
      "改变温度、黏度和颗粒半径，用二维均方位移核对布朗扩散强弱。",
      "区分液体分子、悬浮颗粒和宏观物态，说明随机轨迹与统计规律为何能同时成立。",
      "跨过熔化与沸腾平台，核对有效吸热、环境损失、温度和相变比例的能量账本。",
    ],
    "thermodynamics.html": [
      "在相同初态下完成等容、等压、等温和绝热过程，用 ΔU=Q−W 核对每条能量账本。",
      "推进 A→B→C→D→A 顺时针循环，比较 p-V 围成面积、循环净热量和净功。",
      "改变冷热源温度与请求效率，找到卡诺上限并解释为什么热量不能全部转化为功。",
    ],
    "photoelectric.html": [
      "逐步增大波长跨过截止条件，观察光电子是否仍能逸出。",
      "保持频率不变只改变光强，比较最大初动能与饱和光电流。",
      "施加反向电压找到电流归零点，用遏止电压反推最大初动能。",
    ],
    "bohr.html": [
      "比较 n=1、n=2 与 n=3 的能量和玻尔半径，核对 Eₙ∝−1/n²、rₙ∝n²。",
      "选择 3→2、4→2 和 2→1 跃迁，比较光子能量、频率、波长与光谱系。",
      "在共振吸收中对比 656 nm 与 600 nm 入射光，说明为什么电子只吸收特定能量。",
    ],
    "matter-wave.html": [
      "保持速度相同，比较电子与质子的动量和德布罗意波长，再观察 30 m/s 棒球的波长尺度。",
      "把电子加速电压从 1000 V 提高到 4000 V，核对动量加倍、波长减半。",
      "在石墨两组晶面和单电子累积场景中，对照 Bragg 环半径、离散落点与径向统计分布。",
    ],
    "radioactive-decay.html": [
      "跟踪一个聚焦原子核，说明为什么只能给出存活概率而不能预测衰变时刻。",
      "切换三组随机样本，比较实际阶梯曲线与同一条指数期望曲线。",
      "在一个和两个半衰期读取剩余核数，再比较小样本与大样本的相对涨落。",
    ],
    "binding-energy.html": [
      "选择氘、氦-4 与铁-56，分别用原子质量法核对质量亏损、总结合能和平均结合能。",
      "比较铁-56、镍-62 与铀-235，说明为什么总结合能更大不等于每个核子束缚更强。",
      "切换氘氚聚变和铀-235 代表性裂变道，核对反应前后 A、Z 与 Q 值账本。",
    ],
    "nuclear-reaction.html": [
      "完成一次代表性铀-235 裂变，区分 Q>0、反应触发与链式反应持续三个不同判断。",
      "调节中子产额、有效裂变概率、逃逸率和吸收率，使 k_eff 依次进入次临界、临界和超临界。",
      "在 D-T 聚变场景分别改变离子温度、相对密度和约束时间，说明高温为什么不是唯一条件。",
    ],
  };
  const lessonPlans = {
    "motion-graphs.html": {
      goal: "建立 x-t、v-t 图像与运动状态之间的对应关系。",
      prerequisite:
        "位置可以用数轴表示，时间会不断向前推进；速度表示运动快慢，正负号可以表示方向。斜率和面积的含义不用提前背，实验会结合图像一步步看出来。",
      prompts: [
        "先隐藏图像，只看运动小车，让学生判断运动方向。",
        "显示 x-t 图像，追问某时刻曲线斜率对应哪个物理量。",
        "显示 v-t 图像，圈出面积并用位移解释正负。",
      ],
      takeaway:
        "\\(x-t\\) 图像的斜率表示速度，\\(v-t\\) 图像的斜率表示加速度，\\(v-t\\) 图像的有向面积表示位移。",
    },
    "vertical-motion.html": {
      goal: "用同一竖直坐标统一自由落体、竖直上抛、参考系变换和空气阻力边界。",
      prerequisite:
        "知道速度和加速度都有方向，重力始终竖直向下；本实验统一规定向上为正。",
      prompts: [
        "先改变两个物体质量并在真空中同时释放，让学生判断质量是否进入运动方程。",
        "暂停在最高点，分别追问速度和加速度，再推进到返回原高度比较速度方向。",
        "最后加入匀速参考系和空气阻力，要求学生说明哪些结论保持、哪些结论需要增加条件。",
      ],
      takeaway:
        "忽略空气阻力时竖直运动满足 \\(y=y_0+v_0t-\\tfrac12gt^2\\)、\\(v=v_0-gt\\)；最高点 \\(v=0\\) 但 \\(a=-g\\)，质量无关结论只属于真空近似。",
    },
    "friction.html": {
      goal: "区分静摩擦力的自适应性、最大静摩擦力和滑动摩擦力。",
      prerequisite:
        "知道力可以改变运动状态，物体静止时合力也可能为零；两种摩擦力的区别会通过外力变化直接观察。",
      prompts: [
        "先从零开始增大外力，让学生预测静摩擦力是否变化。",
        "暂停在临界点，比较外力、静摩擦力和最大静摩擦力。",
        "继续增大外力，观察滑动后摩擦力与加速度的变化。",
      ],
      takeaway:
        "静摩擦力由运动趋势决定且不超过最大值；滑动后 \\(f_{\\text{滑}} \\approx \\mu_k N\\)。",
    },
    "newton-laws.html": {
      goal: "建立合力、质量和加速度的定量关系。",
      prerequisite:
        "知道力会改变运动状态，质量不同的物体变化快慢可能不同；公式不必提前背，实验会直接比较。",
      prompts: [
        "先只看受力箭头，让学生指出合力方向。",
        "固定质量改变合力，观察 a-F 图像是否通过原点。",
        "把合力调为零，区分加速度为零和速度为零。",
      ],
      takeaway:
        "加速度由合外力和质量共同决定；\\(F_{\\text{合}} = 0\\) 时物体可以静止，也可以匀速直线运动。",
    },
    "interaction.html": {
      goal:
        "用研究对象、受力图、矢量投影和方程残差建立统一的力学建模流程。",
      prerequisite:
        "知道力有大小和方向，会使用牛顿第二定律；矢量合成、弹簧边界和系统内外力会在场景中逐步建立。",
      prompts: [
        "先固定两力大小只改变夹角，要求学生预测合力何时最大、何时最小。",
        "把弹簧拖过弹性限度，追问公式仍能给出数字是否代表模型仍然有效。",
        "对第三定律力对和连接体分别切换研究对象，核对哪些力可以在同一方程中抵消。",
      ],
      takeaway:
        "力按分量作矢量相加；胡克定律只在弹性限度内有效；第三定律力对作用在不同物体上；连接体整体方程消去内力，隔离方程用于求内力。",
    },
    "projectile.html": {
      goal: "建立速度分解和独立运动的观念。",
      prerequisite:
        "知道速度有大小和方向，会把一个速度分成水平、竖直两个方向；两个方向怎样共同决定轨迹，会在实验中展开。",
      prompts: [
        "先让学生预测最高点的速度，再暂停到最高点核对。",
        "固定发射速度，改变角度，比较飞行时间和射程。",
        "回到 vx、vy 读数，用分运动解释轨迹。",
      ],
      takeaway: "平抛或斜抛运动可以分解为水平方向和竖直方向的独立运动。",
    },
    "circular.html": {
      goal: "区分速度方向和加速度方向，理解向心加速度。",
      prerequisite:
        "知道速度方向改变也算速度改变；为什么需要指向圆心的加速度，会结合圆轨道和箭头观察。",
      prompts: [
        "暂停在不同位置，让学生分别指出速度和加速度方向。",
        "保持半径不变改变速度，观察向心加速度的变化。",
        "改变半径，讨论周期、向心力和运动快慢。",
      ],
      takeaway:
        "匀速圆周运动的速率可以不变，但速度方向持续改变，所以仍有加速度。",
    },
    "circular-critical.html": {
      goal:
        "把向心需求和真实力约束统一到径向受力账本，建立打滑、过顶和失去接触的临界判断。",
      prerequisite:
        "知道速度方向改变需要向心加速度，会画重力、支持力和摩擦力；不要求预先记忆各类临界速度。",
      prompts: [
        "先只画真实力，让学生在径向方向写出合力，不额外添加一支向心力。",
        "逐步增大速度，分别观察 f=μN 和 N=0 出现在哪类场景。",
        "对比圆环顶部与拱桥顶部的 N=0，追问物体下一瞬间为何一个恰好贴轨、一个离开路面。",
      ],
      takeaway:
        "圆周运动统一满足 \\(\\sum F_r=mv^2/r\\)；平路极限为 \\(v_{max}=\\sqrt{\\mu gr}\\)，内轨竖直圆环保持接触要求底速不小于 \\(\\sqrt{5gr}\\)，拱顶 \\(N=0\\) 时 \\(v=\\sqrt{gr}\\)。",
    },
    "orbital.html": {
      goal:
        "用万有引力、圆周运动和机械能统一解释圆轨道标度、同步条件、轨道转移与逃逸。",
      prerequisite:
        "知道向心加速度指向圆心，万有引力随距离平方减小，机械能包括动能和引力势能；不要求预先掌握轨道方程。",
      prompts: [
        "先只改变圆轨道高度，要求学生同时预测速度和周期的变化方向。",
        "在同步场景区分同步轨道与地球静止轨道，补充轨道平面和运行方向条件。",
        "用一次切向变速观察另一侧轨道高度变化，再用比机械能是否小于零判断轨道能否闭合。",
      ],
      takeaway:
        "圆轨道满足 \\(v_c=\\sqrt{\\mu/r}\\)、\\(T=2\\pi\\sqrt{r^3/\\mu}\\)、\\(\\varepsilon=-\\mu/(2r)\\)；切向变速同时改变能量和角动量，\\(v\\ge\\sqrt2v_c\\) 时二体总机械能不小于零。",
    },
    "mechanical-energy.html": {
      goal: "区分机械能守恒与总能量守恒，并理解系统边界对能量方程的影响。",
      prerequisite:
        "知道运动物体具有动能，位置或形变可以对应势能；各种能量怎样转化，会通过同一份实时账本核对。",
      prompts: [
        "先在自由下落中隐藏数值，让学生预测下降一半高度时动能和势能是否相等。",
        "加入摩擦后比较机械能曲线与内能曲线，追问减少的机械能去了哪里。",
        "保持运动过程不变，只切换系统边界，让学生解释能量方程为什么改变。",
      ],
      takeaway:
        "只有重力或弹力做功时机械能守恒；摩擦使机械能转化为内能，而包含所有相关物体的系统总能量仍守恒。",
    },
    "work-propulsion.html": {
      goal:
        "用功和功率描述能量转移，再用动量守恒与质量流解释反冲和火箭推进。",
      prerequisite:
        "知道力、位移、速度和动量的基本含义；变质量系统的推进关系会从系统边界逐步建立。",
      prompts: [
        "只改变力与位移夹角，让学生先判断功的符号，再预测动能变化。",
        "保持力和速度不变改变作用时间，追问瞬时功率是否随总功同步改变。",
        "比较反冲和持续喷气，要求学生说明哪一部分质量被纳入当前动量系统。",
      ],
      takeaway:
        "恒力功由沿位移方向的分量决定，合力功等于动能变化；功率描述能量转移速率；反冲与火箭推进都服从系统动量守恒，火箭还必须处理持续质量流出。",
    },
    "electric-field.html": {
      goal: "统一电场强度、电势、试探电荷受力和静电场能量关系。",
      prerequisite:
        "知道电荷之间存在相互作用，力有大小和方向；场强和电势的区别会通过同一空间探针逐步建立。",
      prompts: [
        "先把试探电荷调为零，追问空间中的电场和电势是否随之消失。",
        "定位偶极子与同号电荷的特殊点，比较矢量叠加和标量叠加。",
        "让探针沿两条不同路径到达同一终点，核对 W、ΔU 和路径形状。",
      ],
      takeaway:
        "电场强度是矢量且与试探电荷无关，电势是标量；静电场力做功满足 W=q(VA−VB)=−ΔU，并且只由端点决定。",
    },
    "electrostatic-conductor.html": {
      goal:
        "从自由电荷重排建立静电平衡条件，并区分孤立、接地、静电屏蔽和带电空腔的边界条件。",
      prerequisite:
        "知道电场会推动电荷移动，导体中存在可移动电荷，会使用场强、电势和高斯面描述静电状态。",
      prompts: [
        "从未平衡状态开始，要求学生预测电荷停止移动时导体内部场强和表面切向场。",
        "保持外部点电荷不变切换孤立与接地，追问电荷是否能够跨越系统边界。",
        "把高斯面依次放在空腔、导体材料和导体外部，逐区核对包围电荷与场强。",
      ],
      takeaway:
        "静电平衡导体内部 E=0 且为等势体；孤立中性导体总电荷保持为零，接地导体可与大地交换电荷；空腔内电荷在内表面感应等量异号电荷。",
    },
    "capacitor.html": {
      goal:
        "以连接状态为首要约束，统一解释平行板电容、介质极化、电荷电压响应和电场能量账本。",
      prerequisite:
        "知道电压、电荷、电场和能量的基本含义；不要求预先掌握改变结构时各量的比例关系。",
      prompts: [
        "先隐藏电荷和能量读数，只改变面积与板距，要求学生判断电容是否依赖带电状态。",
        "对同一次板距加倍分别选择接电源和断开电源，逐项比较 Q、U、E 和 W。",
        "缓慢插入介质，追问吸引介质的机械能来自哪里，并用三项能量账本核对。",
      ],
      takeaway:
        "平行板电容满足 C=ε₀κA/d；接电源时 U 固定，断开后 Q 固定。电容器能量变化等于电池功与外力功之和，击穿后理想绝缘模型失效。",
    },
    "ohm-law.html": {
      goal: "建立电压、电流和电阻的定量关系，并认识欧姆定律的适用条件。",
      prerequisite:
        "知道电流表示电荷定向移动，电压推动电荷运动，电阻会阻碍电流；三者的定量关系会用电表和图像核对。",
      prompts: [
        "先固定电阻逐步提高电压，让学生预测电流表读数和 I-U 图像形状。",
        "固定电压改变电阻，用多个工作点检验 I 与 R 是否成反比。",
        "切换到小灯泡，追问伏安曲线为什么弯曲以及哪个条件不再保持。",
      ],
      takeaway:
        "温度等条件不变时导体满足 \\(I=U/R\\)；小灯泡温度随功率升高，电阻不再恒定，因此伏安特性呈非线性。",
    },
    "circuit-applications.html": {
      goal:
        "从串并联拓扑出发，统一电表接法、支路分配、实际功率、电能累计和传感器测量电路。",
      prerequisite:
        "会使用欧姆定律，知道电流表和电压表测量不同物理量；功率与传感器输出会由实时账本建立。",
      prompts: [
        "保持电源不变切换串并联，要求学生分别指出相同的是电流还是电压。",
        "把实际电压减半，先预测恒阻负载功率是否也只减半，再用曲线核对。",
        "只改变传感器输入量，要求学生依次解释 R敏、分压电流和 Vout 的变化方向。",
      ],
      takeaway:
        "串联电流相同且电压分配，并联电压相同且电流分流；功率是能量转化速率，电能还取决于时间；传感器先改变电学参数，再由测量电路输出可用信号。",
    },
    "power-source.html": {
      goal:
        "用真实电源模型统一电动势、路端电压、内阻压降、功率分配和负载匹配。",
      prerequisite:
        "会使用欧姆定律和电功率关系，知道电池接入负载后形成闭合回路；内阻含义会在电压与能量账本中建立。",
      prompts: [
        "从开路逐步减小负载，让学生预测电流增大时端电压为什么下降。",
        "在 U-I 线上选择两个测量点，要求学生从截距和斜率识别 ℰ 与 r。",
        "扫描 R/r，同时比较输出功率和效率，追问为什么两条曲线的最优位置不同。",
      ],
      takeaway:
        "闭合电路满足 I=ℰ/(R+r)、U=ℰ−Ir；电源功率分为负载功率与内耗。R=r 时负载功率最大但效率仅为 50%，短路不是可持续工作状态。",
    },
    "magnetic-field.html": {
      goal: "从电流方向和几何结构建立磁场方向、大小与矢量叠加的统一图景。",
      prerequisite:
        "知道电流是电荷的定向移动，小磁针可以指示局部磁场方向；右手定则和磁场大小关系会在探针读数中逐步建立。",
      prompts: [
        "先只看直导线和小磁针，反转电流并要求学生预测磁针转向。",
        "把探针距离加倍，再把电流加倍，分别核对 B 的比例变化。",
        "进入双导线、圆形线圈和螺线管，要求学生先按分量预测，再读取合场与有限长度修正。",
      ],
      takeaway:
        "直导线磁场满足 \\(B=\\mu_0I/(2\\pi r)\\)，多个场源按矢量叠加；圆形线圈和螺线管通过匝数与几何结构集中磁场，有限长螺线管存在边缘效应。",
    },
    "oscillation.html": {
      goal: "建立位移、速度、加速度和能量的相位关系。",
      prerequisite:
        "知道物体会在平衡位置附近往复运动，周期表示重复一次所需的时间；位移、速度和加速度的关系会在相位图中展示。",
      prompts: [
        "先定位端点和平衡位置，让学生预测 v 和 a 的大小。",
        "拖动时间条，对照相位圆和时间图像。",
        "改变质量或劲度系数，观察周期变化并回到公式解释。",
      ],
      takeaway:
        "简谐运动中端点速度为零、加速度最大，平衡位置速度最大、加速度为零。",
    },
    "resonance.html": {
      goal:
        "用稳态幅频、相频、平均功率和瞬态衰减统一解释受迫振动与共振。",
      prerequisite:
        "知道简谐振动有由质量和劲度系数决定的固有频率，外界周期性驱动力可以持续输入能量。",
      prompts: [
        "保持系统参数不变做慢速扫频，要求学生分别标记位移振幅峰和平均功率峰。",
        "在低频、f₀ 和高频三个状态比较驱动力与位移的相位差。",
        "改变阻尼，要求学生同时预测峰高、带宽、Q 值和瞬态建立时间。",
      ],
      takeaway:
        "稳态受迫振动频率等于驱动频率；有阻尼时位移峰略低于 f₀，而平均吸收功率峰位于 f₀。阻尼增大使峰值降低、带宽增大、Q 值减小。",
    },
    "waves.html": {
      goal: "区分波的传播和介质质点的振动，理解叠加与驻波。",
      prerequisite:
        "知道波相遇后可以叠加，叠加后还会继续传播；相位相同或相反时图样如何变化，会用两列波观察。",
      prompts: [
        "分别显示两列波，让学生判断传播方向。",
        "切换合成波，寻找节点和腹部并比较振幅。",
        "改变波长，观察节点间距是否随之改变。",
      ],
      takeaway: "驻波由相向传播的波叠加形成，节点不振动，腹部振幅最大。",
    },
    "charged-particle.html": {
      goal: "比较电场力、磁场力和恒力，建立复合场中的受力分析。",
      prerequisite:
        "知道电场力和磁场力都可能改变带电粒子的运动；两种力什么时候能相互抵消，会跟踪粒子轨迹。",
      prompts: [
        "先比较仅电场和仅磁场，明确两种力对速率和方向的影响。",
        "进入配速法，先观察偏转，再寻找竖直合力接近零的速度。",
        "用 v = v配 + v余 解释漂移与圆周分运动。",
      ],
      takeaway: "复合场轨迹取决于各力的方向和大小，配速只消除特定方向的合力。",
    },
    "mass-spectrometer.html": {
      goal:
        "把正交场选速、纯磁场偏转和同位素检测峰串成完整的质荷比测量链。",
      prerequisite:
        "知道电场力和磁场力的方向规则，理解磁场力不做功；速度选择条件和质量反演会由轨迹与读数建立。",
      prompts: [
        "先显示一束不同速度粒子，要求学生判断通过狭缝的粒子是否被装置改变了速率。",
        "反转电荷并保持场方向，比较两种力和偏转方向是否同时反转。",
        "固定选速值和分析磁场，改变质量与电荷态，从检测位置反演 m/q。",
      ],
      takeaway:
        "正交场只让满足方向与 v=E/Bₛ 的粒子直线通过；进入纯磁分析场后 r=mv/(|q|Bₐ)。同速同电荷态下检测位置与质量成正比。",
    },
    "electromagnetic-induction.html": {
      goal: "从磁通量变化率建立法拉第定律，并用楞次定律判断感应电流方向。",
      prerequisite:
        "知道磁场有方向，线圈可以围成闭合回路；磁铁运动为什么产生电流，会从磁通量变化开始观察。",
      prompts: [
        "先把磁铁停在线圈附近，追问磁通量非零时为什么电动势仍为零。",
        "用相同磁通变化量设置快慢两种过程，比较电动势平台高度。",
        "切换开路与闭路，讨论外力做功、感应电流与焦耳热之间的关系。",
      ],
      takeaway:
        "感应电动势满足 \\(\\varepsilon=-N\\,d\\Phi/dt\\)；楞次定律决定感应场阻碍磁通变化，闭路时才形成持续电流。",
    },
    "alternating-current.html": {
      goal: "用波形、有效值和功率账本统一解释交流发电、理想变压和高压输电。",
      prerequisite:
        "知道磁通量变化可以产生感应电动势，电功率与电压、电流有关；有效值和输电损耗会在同一能量链中建立。",
      prompts: [
        "先暂停线圈在磁通极值和零点，要求学生用斜率预测电动势大小。",
        "比较正弦交流与等效直流的平均热功率，追问为什么周期平均电压为零仍会发热。",
        "先用匝数比完成升压，再固定输送功率扫描电压，用 I=P/U 和 P损=I²R 解释线损。",
      ],
      takeaway:
        "正弦交流满足 \\(U=U_m/\\sqrt2\\)；理想变压器满足 \\(U_2/U_1=N_2/N_1\\) 且功率守恒；固定输送功率时提高电压可按 \\(1/U^2\\) 降低线路损耗。",
    },
    "electromagnetic-oscillation.html": {
      goal: "用状态、能量和场传播三条证据链连接 LC 电磁振荡、调谐与电磁波。",
      prerequisite:
        "知道电容器储存电场能、通电线圈周围存在磁场；相位、固有频率和电磁波的关系会通过同步动画建立。",
      prompts: [
        "先暂停在电容器电压为零的时刻，让学生预测电流是否也为零，再用自感解释继续流动。",
        "改变 L、C 和 R，对照固有频率、理想总能量与真实衰减包络，区分频率变化和能量损耗。",
        "扫过调谐峰后进入电磁波场景，要求学生用右手系指出 E、B 和传播方向，并核对 c=fλ。",
      ],
      takeaway:
        "理想 LC 回路满足 \\(\\omega_0=1/\\sqrt{LC}\\) 且电场能、磁场能周期交换；真空电磁波满足 \\(E\\perp B\\perp k\\)、\\(c=f\\lambda\\) 和 \\(E=cB\\)。",
    },
    "collision.html": {
      goal: "区分动量守恒与动能守恒，并用恢复系数描述一维碰撞。",
      prerequisite:
        "知道动量由质量和速度共同决定，速度方向可用正负号表示；碰撞中的内力很大，但对两车组成的系统成对出现。",
      prompts: [
        "先隐藏碰后结果，让学生预测轻车撞重车后是否反弹。",
        "推进到碰撞后，分别求两车动量并核对总和。",
        "从 e=1 连续减小到 e=0，追问减少的机械能去了哪里。",
      ],
      takeaway:
        "外力冲量可忽略时系统总动量守恒；只有弹性碰撞还保持总动能，完全非弹性碰撞中两物体以共同速度运动。",
    },
    "refraction.html": {
      goal: "建立入射角、折射角、折射率和临界角之间的联系。",
      prerequisite:
        "知道光线改变传播介质后可能改变方向，角度从法线量起；折射率如何影响偏折，会通过光路和读数直接观察。",
      prompts: [
        "先看法线和两条光线，判断折射光线向法线靠近还是远离。",
        "固定折射率改变入射角，用读数核对斯涅尔定律。",
        "切换到高折射率介质射向低折射率介质，寻找临界角和全反射。",
      ],
      takeaway:
        "折射满足 \\(n_1\\sin\\theta_1=n_2\\sin\\theta_2\\)；只有从高折射率介质射向低折射率介质时才可能发生全反射。",
    },
    "lens.html": {
      goal: "用主光线和定量数据统一理解凸透镜成像规律。",
      prerequisite:
        "知道凸透镜有焦点和焦距，光屏只能承接真实会聚的光线；像的位置和性质会随物距连续变化。",
      prompts: [
        "先把物体放在 2f 外，要求学生预测像的位置、大小和正倒。",
        "拖动物体经过 2f 和 f，对照主光线交点与像距读数。",
        "让学生移动光屏获得最清晰成像，再用多组数据检验薄透镜公式。",
      ],
      takeaway:
        "薄透镜满足 \\(1/f=1/u+1/v\\)；物距跨过焦点时，像会由倒立实像转为正立虚像。",
    },
    "double-slit.html": {
      goal: "建立波长、双缝间距、屏距与条纹间距之间的定量关系。",
      prerequisite:
        "知道波可以叠加，光程差会造成相位差；亮纹和暗纹怎样由路程差决定，会通过屏上强度分布直接观察。",
      prompts: [
        "先找到中央亮纹，观察两侧亮纹是否近似对称。",
        "改变波长或屏距，比较相邻亮纹的距离。",
        "切换路程差观察，判断相长和相消干涉的条件。",
      ],
      takeaway:
        "双缝干涉条纹间距近似满足 \\(\\beta=\\lambda L/d\\)；暗纹处仍有光，只是两列光相消。",
    },
    "ideal-gas.html": {
      goal: "从分子碰撞和速率统计建立气体压强、温度与状态方程的统一图景。",
      prerequisite:
        "知道气体由大量不停运动的分子组成，压强、体积和温度可以描述气体状态。",
      prompts: [
        "先只看微观场景，让学生解释离散碰撞为什么能形成稳定压强。",
        "保持 n、V、T 不变切换气体种类，比较压强读数和速率分布。",
        "进入三个约束过程，要求学生先预测变化方向，再核对不变量图。",
      ],
      takeaway:
        "理想气体满足 \\(pV=nRT\\)；温度决定分子平均平动动能，等温、等容、等压过程分别保持 \\(pV\\)、\\(p/T\\)、\\(V/T\\) 不变。",
    },
    "matter-phase.html": {
      goal:
        "从微观热运动的统计描述连接到布朗扩散、宏观加热曲线和相变潜热。",
      prerequisite:
        "知道物质由不停运动的分子组成，物质吸热后可能升温或改变物态；统计关系会由轨迹和能量账本建立。",
      prompts: [
        "先比较分子和可见悬浮颗粒的尺度，要求学生指出布朗轨迹究竟属于谁。",
        "分别改变温度、黏度和颗粒半径，要求学生预测扩散系数和均方位移的变化方向。",
        "在 0°C 与 100°C 平台继续加热，追问温度不变时输入能量转移到了哪里。",
      ],
      takeaway:
        "温度反映大量分子热运动的统计强度；布朗运动是悬浮颗粒受分子不平衡碰撞的结果；相变平台继续吸收潜热，但温度可暂时保持不变。",
    },
    "thermodynamics.html": {
      goal: "区分状态量与过程量，用能量账本、循环面积和温度上限理解第一、第二定律。",
      prerequisite:
        "知道理想气体可用 p、V、T 描述状态，能量可以通过热传递和做功跨过系统边界；本实验会统一正负号。",
      prompts: [
        "先固定 Q>0 表示吸热、W>0 表示气体对外做功，再让学生预测四类过程的 ΔU。",
        "暂停顺时针循环每个转角，逐段判断吸热、放热和做功，最后核对 ΔU循环=0。",
        "逐步提高请求效率跨过卡诺线，要求学生用冷热源温度说明为什么越界状态不可实现。",
      ],
      takeaway:
        "采用气体对外做功为正时，第一定律为 \\(\\Delta U=Q-W\\)；循环净功等于顺时针 \\(p-V\\) 图面积，热机效率满足 \\(\\eta\\le1-T_c/T_h\\)。",
    },
    "photoelectric.html": {
      goal: "用光子能量和光电管测量统一解释截止频率、最大初动能与光电流。",
      prerequisite:
        "知道光的频率和强度是两个不同的量，电子从金属表面逸出需要克服一定能量。",
      prompts: [
        "先用强红光照射钠阴极，要求学生预测提高光强能否产生光电子。",
        "固定 400 nm 改变光强，比较光电子最大速率与饱和光电流。",
        "逐渐增加反向电压直到电流归零，再与爱因斯坦光电方程核对。",
      ],
      takeaway:
        "单个光子能量满足 \\(E=h\\nu\\)，最大初动能满足 \\(E_{k\\max}=h\\nu-W_0=eU_c\\)；光强主要影响光电子数量。",
    },
    "bohr.html": {
      goal: "用氢原子离散能级统一解释定态、共振吸收、发射跃迁和线状光谱。",
      prerequisite:
        "知道光子能量满足 E=hν，原子内部能量不能连续取任意值；具体能级关系会在实验中读取。",
      prompts: [
        "先只比较 n=1、n=2、n=3 的能量和半径，追问为什么能级越高间隔越密。",
        "完成 3→2 与 4→2 发射，要求学生用能级差先预测哪条谱线波长更短。",
        "固定初态 n=2，对比共振与失谐光子，说明光子没有被部分吸收。",
      ],
      takeaway:
        "氢原子能级满足 \\(E_n=-13.6/n^2\\,\\text{eV}\\)，跃迁光子满足 \\(h\\nu=|E_f-E_i|\\)；离散能级产生离散吸收与发射谱线。",
    },
    "matter-wave.html": {
      goal:
        "用德布罗意关系和电子衍射统一解释微观粒子的波动尺度、离散事件与统计图样。",
      prerequisite:
        "知道动量等于质量与速度的乘积，光能表现出波粒二象性；晶体具有接近原子尺度的周期结构。",
      prompts: [
        "先让电子和质子保持相同速度，要求学生用质量差预测哪一个波长更短。",
        "把加速电压提高到四倍，先预测电子动量与波长的倍数变化，再读取曲线。",
        "从一个、几十个到上千个电子逐步累积，区分单次局域落点和整体衍射分布。",
      ],
      takeaway:
        "物质波满足 \\(\\lambda=h/p\\)；非相对论电子经电压 U 加速后满足 \\(eU=p^2/2m\\)，晶体衍射环来自波长与晶格周期的相干条件。",
    },
    "radioactive-decay.html": {
      goal: "区分单个原子核衰变的随机性与大量原子核指数衰减的统计规律。",
      prerequisite:
        "知道单个微观事件可以带有随机性，大量独立事件能够形成较稳定的整体规律。",
      prompts: [
        "先聚焦一个原子核，让学生判断能否预测它在下一秒是否衰变。",
        "推进到一个半衰期，比较样本剩余数、期望剩余数和统计区间。",
        "保持 t/T₁/₂ 不变，把 N₀ 从 40 增至 320，比较绝对涨落和相对涨落。",
      ],
      takeaway:
        "放射性样本的期望剩余数满足 \\(N=N_0 2^{-t/T_{1/2}}\\)，活度满足 \\(A=\\lambda N\\)；半衰期是群体统计特征，不是单核固定寿命。",
    },
    "binding-energy.html": {
      goal:
        "用静质量差建立结合能与核反应 Q 值账本，并区分总结合能和平均结合能。",
      prerequisite:
        "知道原子核由质子和中子组成，质量与静能满足 E=mc²；不要求记忆具体核素质量。",
      prompts: [
        "先用氦-4 核对 Z 个氢原子加 N 个中子与原子质量之差，追问电子质量为何抵消。",
        "同时比较铁-56、镍-62 和铀-235 的总结合能与平均结合能，要求学生先判断哪一项反映平均束缚。",
        "切换聚变与裂变账本，核对反应两侧 A、Z 守恒，再由静质量差判断 Q 值正负。",
      ],
      takeaway:
        "质量亏损满足 \\(\\Delta m=Zm(^1\\mathrm H)+Nm_n-m_{atom}\\)，结合能满足 \\(E_b=\\Delta mc^2\\)；跨核素稳定性比较应使用 \\(E_b/A\\)，核反应 Q 值来自反应前后静质量差。",
    },
    "nuclear-reaction.html": {
      goal:
        "区分核反应放能、反应触发与过程持续三个层次，并用有效增殖系数和聚变条件建立可控的定量判断。",
      prerequisite:
        "知道核反应前后质量数、电荷数和总能量守恒，质量亏损可对应释放能量；不要求了解真实反应堆设计或等离子体工程。",
      prompts: [
        "先完成一次代表性裂变，追问 Q 值为正为什么不能保证整块燃料自行持续反应。",
        "逐项关闭逃逸与吸收通道，用 k_eff 的乘法账本判断每一代有效中子为何增长或衰减。",
        "进入 D-T 聚变条件图，保持两个参数不变只改变一个，区分温度、密度和约束时间的作用。",
      ],
      takeaway:
        "教学链式模型满足 \\(k_{eff}=\\nu p_f(1-p_{esc})(1-p_{abs})\\)，\\(k<1\\)、\\(k\\approx1\\)、\\(k>1\\) 分别对应期望衰减、保持和增长；聚变还需要同时提高穿透机会、粒子相遇机会和约束时间。",
    },
  };
  const curriculumSource = window.physicsCurriculum ||
    { books: [], models: [], categories: ["全部"], statusLabels: {} };
  const curriculum = window.physicsPlatformProtocol
    ? window.physicsPlatformProtocol.normalizeCurriculum(curriculumSource)
    : curriculumSource;
  const courseBooks = curriculum.books;
  const storageKey = "physics-visual-lab-progress-v1";
  const audienceStorageKey = "physics-visual-lab-audience-v1";
  const moduleStorageKey = "physics-visual-lab-module-v1";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isHome = currentPage === "index.html";
  const courseModules = [
    {
      id: "kinematics",
      title: "运动学与力学基础",
      description: "用坐标、时间、图像和误差理解运动描述。",
      chapterIds: ["required-1-1", "required-1-2"],
    },
    {
      id: "forces",
      title: "相互作用与牛顿运动定律",
      description: "从受力分析进入力、质量和加速度的动态关系。",
      chapterIds: ["required-1-3", "required-1-4"],
    },
    {
      id: "curved-motion",
      title: "曲线运动与万有引力",
      description: "把二维运动拆成分运动，并扩展到圆周和轨道。",
      chapterIds: ["required-2-5", "required-2-6", "required-2-7"],
    },
    {
      id: "energy",
      title: "功和机械能",
      description: "用功、动能和势能追踪能量转化。",
      chapterIds: ["required-2-8"],
    },
    {
      id: "electric-field",
      title: "电场与电荷",
      description: "聚焦电荷相互作用、电场、电势和静电器件。",
      chapterIds: ["required-3-9", "required-3-10"],
    },
    {
      id: "current",
      title: "恒定电流与电路",
      description: "联动电路图、器材、电表和数据图像。",
      chapterIds: ["required-3-11", "required-3-12"],
    },
    {
      id: "magnetic-field",
      title: "磁场与电磁感应",
      description: "观察磁场、磁力、粒子轨迹和感应电流。",
      chapterIds: [
        "required-3-13",
        "selective-2-1",
        "selective-2-2",
        "selective-2-3",
        "selective-2-4",
        "selective-2-5",
      ],
    },
    {
      id: "momentum",
      title: "动量与碰撞",
      description: "用守恒量理解短时间相互作用和碰撞。",
      chapterIds: ["selective-1-1"],
    },
    {
      id: "waves",
      title: "机械振动与机械波",
      description: "用相位、波形和传播过程统一振动与波。",
      chapterIds: ["selective-1-2", "selective-1-3"],
    },
    {
      id: "optics",
      title: "光学",
      description: "用可拖拽光路理解成像、干涉和衍射。",
      chapterIds: ["selective-1-4"],
    },
    {
      id: "thermal",
      title: "热学与气体",
      description: "连接宏观状态量、微观粒子运动和热力学过程。",
      chapterIds: ["selective-3-1", "selective-3-2", "selective-3-3"],
    },
    {
      id: "modern-physics",
      title: "原子物理与近代物理",
      description: "用统计和能级图像理解微观实验现象。",
      chapterIds: ["selective-3-4", "selective-3-5"],
    },
  ];
  let katexPromise = null;
  let mathTypesetRequest = 0;
  let controlValueObserver = null;

  function loadKaTeX() {
    if (window.renderMathInElement) return Promise.resolve();
    if (katexPromise) return katexPromise;
    katexPromise = new Promise((resolve) => {
      if (!document.querySelector("link[data-katex]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.dataset.katex = "true";
        link.href = "./vendor/katex/katex.min.css?v=0.17.0";
        document.head.appendChild(link);
      }
      const loadScript = (src, next) => {
        const script = document.createElement("script");
        script.async = true;
        script.src = src;
        script.addEventListener("load", next, { once: true });
        script.addEventListener("error", resolve, { once: true });
        document.head.appendChild(script);
      };
      loadScript("./vendor/katex/katex.min.js?v=0.17.0", () => {
        loadScript(
          "./vendor/katex/contrib/auto-render.min.js?v=0.17.0",
          resolve,
        );
      });
    });
    return katexPromise;
  }

  function typesetMath() {
    prepareControlValues();
    const targets = Array.from(document.querySelectorAll(
      ".task-panel, .guide-formula, .formula-panel, .critical-card, .equation-lines, .speed-match-formula, .equation-note, .label-math, .input-unit, .metric-name, .math-label, .speed-label, .label-row > strong, .metric-card > strong",
    )).filter((target) =>
      ["\\(", "\\[", "$$", "$"]
        .some((delimiter) => target.textContent.includes(delimiter))
    );
    if (!targets.length) return;
    const request = ++mathTypesetRequest;
    loadKaTeX().then(() => {
      if (request !== mathTypesetRequest || !window.renderMathInElement) {
        return null;
      }
      const latestTargets = Array.from(document.querySelectorAll(
        ".task-panel, .guide-formula, .formula-panel, .critical-card, .equation-lines, .speed-match-formula, .equation-note, .label-math, .input-unit, .metric-name, .math-label, .speed-label, .label-row > strong, .metric-card > strong",
      )).filter((target) =>
        ["\\(", "\\[", "$$", "$"]
          .some((delimiter) => target.textContent.includes(delimiter))
      );
      latestTargets.forEach((target) =>
        window.renderMathInElement(target, {
          delimiters: [
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false },
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
          ],
          throwOnError: false,
          ignoredTags: [
            "script",
            "noscript",
            "style",
            "textarea",
            "pre",
            "code",
          ],
          ignoredClasses: ["katex"],
        })
      );
    }).catch(() => {
      // Formula text remains readable if the local typesetter is unavailable.
    });
  }

  function controlValueToTex(rawValue) {
    const value = rawValue.trim();
    if (!/^[+\-−]?\d/.test(value)) return null;
    let tex = value
      .replace(/×\s*10\^(-?\d+)/g, "\\times 10^{$1}")
      .replace(/m\/s²/g, "\\mathrm{m/s^2}")
      .replace(/m\/s/g, "\\mathrm{m/s}")
      .replace(/N\/C/g, "\\mathrm{N/C}")
      .replace(/N\/m/g, "\\mathrm{N/m}")
      .replace(/μs/g, "\\mu\\mathrm{s}")
      .replace(/°/g, "{}^\\circ")
      .replace(/\b(kg|Hz|N|T|J|m|s|e)\b/g, "\\mathrm{$1}")
      .replace(/\s+/g, "\\,");
    return tex;
  }

  function prepareControlValues() {
    document.querySelectorAll(
      ".controls .label-row > strong, .controls .metric-card > strong",
    ).forEach((element) => {
      if (element.querySelector(".katex")) return;
      const tex = controlValueToTex(element.textContent);
      if (tex) element.innerHTML = `\\(${tex}\\)`;
    });
  }

  function observeControlValues() {
    const controls = document.querySelector(".controls");
    if (!controls || controlValueObserver || !window.MutationObserver) return;
    let queued = false;
    controlValueObserver = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        const node = record.target.nodeType === Node.ELEMENT_NODE
          ? record.target
          : record.target.parentElement;
        return node?.closest(".label-row > strong, .metric-card > strong");
      });
      if (!relevant || queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        typesetMath();
      });
    });
    controlValueObserver.observe(controls, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
  window.physicsTypesetMath = typesetMath;

  function readAudience() {
    try {
      return window.localStorage.getItem(audienceStorageKey) === "teacher"
        ? "teacher"
        : "student";
    } catch {
      return "student";
    }
  }

  function saveAudience(audience) {
    try {
      window.localStorage.setItem(audienceStorageKey, audience);
    } catch {
      // Audience mode is a preference, never a requirement for using an experiment.
    }
  }

  function readModule() {
    try {
      const stored = window.localStorage.getItem(moduleStorageKey);
      return courseModules.some((module) => module.id === stored)
        ? stored
        : courseModules[0].id;
    } catch {
      return courseModules[0].id;
    }
  }

  function saveModule(moduleId) {
    try {
      window.localStorage.setItem(moduleStorageKey, moduleId);
    } catch {
      // The course navigator remains usable when storage is unavailable.
    }
  }

  function applyAudience(audience) {
    document.body.dataset.audience = audience;
    const heroDescription = document.getElementById("heroDescription");
    if (heroDescription) {
      heroDescription.textContent = audience === "teacher"
        ? "用演示路线、关键问题和动态现象，组织一节看得见物理关系的新课。"
        : "用可调参数、动态轨迹和关键状态，把公式背后的物理关系看清楚。";
    }
    document.querySelectorAll(".task-body-head .task-note").forEach((note) => {
      note.textContent = audience === "teacher"
        ? "按演示路线组织观察，让学生先判断，再用读数和轨迹核对。"
        : "先观察现象，再用读数、图像和公式验证自己的判断。";
    });
    document.querySelectorAll("[data-audience]").forEach((control) => {
      control.classList.toggle("active", control.dataset.audience === audience);
      control.setAttribute(
        "aria-pressed",
        control.dataset.audience === audience ? "true" : "false",
      );
    });
    document.querySelectorAll("[data-audience-content]").forEach((content) => {
      const active = content.dataset.audienceContent === audience;
      content.hidden = !active;
      content.style.display = active ? "" : "none";
    });
    document.querySelectorAll(".task-summary").forEach((summary) => {
      const label = summary.querySelector("span");
      const count = summary.querySelector(".task-count");
      if (label) {
        label.textContent = audience === "teacher" ? "课堂演示" : "学习任务";
      }
      if (count) count.hidden = audience === "teacher";
    });
  }

  function renderCourseNavigation() {
    if (!isHome) return;
    const tabs = Array.from(document.querySelectorAll("[data-module]"));
    const title = document.getElementById("courseTitle");
    const description = document.getElementById("moduleDescription");
    const empty = document.getElementById("volumeEmpty");
    const modelCatalog = document.getElementById("modelCatalog");
    const lessonCards = Array.from(
      document.querySelectorAll("[data-lesson-card]"),
    );
    if (!tabs.length) return;

    const escapeHtml = (value) =>
      String(value || "").replace(/[&<>\"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[character]));
    const subjectClass = (category) => {
      if (/电磁|电场|电路|磁场/.test(category || "")) return "electromagnetism";
      if (/波|振动/.test(category || "")) return "waves";
      if (/光学/.test(category || "")) return "optics";
      return "mechanics";
    };
    const modelModules = (model) =>
      courseModules
        .filter((module) => (module.chapterIds || []).includes(model.chapterId))
        .map((module) => module.id);
    const modelCards = [];
    if (modelCatalog && !modelCatalog.dataset.rendered) {
      const plannedModels = (curriculum.models || []).filter((model) =>
        !model.lab
      );
      plannedModels.forEach((model) => {
        const modules = modelModules(model);
        if (!modules.length) return;
        const status = model.status === "open"
          ? "可视化实验已开放"
          : "模型内容已整理";
        const action = model.status === "open" && model.lab
          ? `./${model.lab}`
          : `./model.html?id=${encodeURIComponent(model.id)}`;
        const actionLabel = model.status === "open" && model.lab
          ? "进入实验"
          : "查看模型";
        const card = document.createElement("article");
        card.className = `model-card${
          model.status === "open" ? " is-open" : ""
        }`;
        card.dataset.modelCard = model.id;
        card.dataset.modules = modules.join(" ");
        card.innerHTML = `
          <div class="model-card-topline">
            <span class="chapter-tag">${escapeHtml(model.category)}</span>
            <span class="subject-tag ${subjectClass(model.category)}">${
          escapeHtml(model.category)
        }</span>
            <span class="model-status">${escapeHtml(status)}</span>
          </div>
          <h3>${escapeHtml(model.title)}</h3>
          <p>${escapeHtml(model.summary)}</p>
          <div class="model-card-meta">
            <span>核心关系：${
          escapeHtml((model.relations || []).slice(0, 2).join(" · "))
        }</span>
            <span>观察重点：${
          escapeHtml((model.explore || ["建立模型与现象的对应关系"])[0])
        }</span>
          </div>
          <a class="card-link" href="${action}">${actionLabel}<span aria-hidden="true">→</span></a>`;
        modelCatalog.append(card);
        modelCards.push(card);
      });
      modelCatalog.dataset.rendered = "true";
    } else if (modelCatalog) {
      modelCards.push(...modelCatalog.querySelectorAll("[data-model-card]"));
    }
    const cards = [...lessonCards, ...modelCards];

    tabs.forEach((tab) => {
      const module = courseModules.find((item) =>
        item.id === tab.dataset.module
      );
      if (!module || tab.querySelector(".module-count")) return;
      const count = cards.filter((card) =>
        (card.dataset.modules || "").split(/\s+/).includes(module.id)
      ).length;
      const countLabel = document.createElement("span");
      countLabel.className = "module-count";
      countLabel.textContent = `${count}`;
      countLabel.setAttribute("aria-label", `${count} 个目录条目`);
      tab.append(countLabel);
    });

    const selectModule = (moduleId) => {
      const module = courseModules.find((item) => item.id === moduleId) ||
        courseModules[0];
      const matchedCards = cards.filter((card) =>
        (card.dataset.modules || "").split(/\s+/).includes(module.id)
      );

      tabs.forEach((tab) => {
        const active = tab.dataset.module === module.id;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
      cards.forEach((card) => {
        card.hidden = !(card.dataset.modules || "").split(/\s+/).includes(
          module.id,
        );
      });
      if (title) title.textContent = module.title;
      if (description) description.textContent = module.description;
      if (empty) empty.hidden = matchedCards.length > 0;
      saveModule(module.id);
    };

    tabs.forEach((tab) =>
      tab.addEventListener("click", () => selectModule(tab.dataset.module))
    );
    selectModule(readModule());
  }

  const audience = readAudience();
  document.querySelectorAll("[data-audience]").forEach((control) => {
    control.addEventListener("click", () => {
      const nextAudience = control.dataset.audience;
      if (!nextAudience) return;
      saveAudience(nextAudience);
      applyAudience(nextAudience);
    });
  });
  applyAudience(audience);

  function readProgress() {
    try {
      const parsed = JSON.parse(
        window.localStorage.getItem(storageKey) || "{}",
      );
      if (!parsed || typeof parsed !== "object") {
        return { visited: {}, completed: {}, tasks: {}, lastVisited: "" };
      }
      const visited = parsed.visited && typeof parsed.visited === "object"
        ? parsed.visited
        : {};
      lessons.forEach((lesson) => {
        if (parsed[lesson]) visited[lesson] = true;
      });
      return {
        visited,
        completed: parsed.completed && typeof parsed.completed === "object"
          ? parsed.completed
          : {},
        tasks: parsed.tasks && typeof parsed.tasks === "object"
          ? parsed.tasks
          : {},
        lastVisited: lessons.includes(parsed.lastVisited)
          ? parsed.lastVisited
          : "",
      };
    } catch {
      return { visited: {}, completed: {}, tasks: {}, lastVisited: "" };
    }
  }

  function saveProgress(progress) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // Progress is helpful but should never block an experiment.
    }
  }

  const progress = readProgress();
  if (!isHome && lessons.includes(currentPage)) {
    progress.visited[currentPage] = true;
    progress.lastVisited = currentPage;
    saveProgress(progress);
  }

  document.querySelectorAll("[data-lesson-link]").forEach((link) => {
    link.addEventListener("click", () => {
      const lesson = link.dataset.lessonLink;
      if (!lesson || !lessons.includes(lesson)) return;
      const nextProgress = readProgress();
      nextProgress.visited[lesson] = true;
      nextProgress.lastVisited = lesson;
      saveProgress(nextProgress);
    });
  });

  if (isHome) {
    const completed = lessons.filter((lesson) =>
      progress.completed[lesson]
    ).length;
    const count = document.getElementById("progressCount");
    const fill = document.getElementById("progressFill");
    if (count) count.textContent = `${completed} / ${lessons.length}`;
    if (fill) fill.style.width = `${(completed / lessons.length) * 100}%`;

    const cards = Array.from(document.querySelectorAll("[data-lesson-card]"));
    const recentLink = document.getElementById("recentLessonLink");
    const recentNote = document.getElementById("recentLessonNote");
    const recentCard = cards.find((card) =>
      card.dataset.lessonCard === progress.lastVisited
    );
    if (recentLink && recentNote && recentCard) {
      const title = recentCard.querySelector("h3")?.textContent?.trim() ||
        progress.lastVisited;
      recentLink.href = `./${progress.lastVisited}`;
      recentLink.textContent = `继续：${title}`;
      recentLink.hidden = false;
      recentNote.textContent = "从上次离开的实验继续观察。";
    }

    cards.forEach((card) => {
      const lesson = card.dataset.lessonCard;
      const link = card.querySelector(".card-link");
      if (progress.visited[lesson]) {
        card.classList.add("visited");
        if (link) link.innerHTML = '再次进入<span aria-hidden="true">→</span>';
      }
      if (progress.completed[lesson]) card.classList.add("completed");
    });
    renderCourseNavigation();
    const catalogCards = Array.from(
      document.querySelectorAll("[data-lesson-card], [data-model-card]"),
    );
    const searchInput = document.getElementById("experimentSearch");
    const subjectFilter = document.getElementById("subjectFilter");
    const resultCount = document.getElementById("experimentResultCount");
    const catalogTitle = document.getElementById("courseTitle");
    const catalogDescription = document.getElementById("moduleDescription");
    const applyCatalogFilters = () => {
      const query = (searchInput?.value || "").trim().toLocaleLowerCase();
      const subject = subjectFilter?.value || "all";
      const activeModule =
        document.querySelector("[data-module].active")?.dataset.module ||
        readModule();
      const isSearching = query.length > 0;
      let visibleCount = 0;
      catalogCards.forEach((card) => {
        const matchesQuery = !query ||
          card.textContent.toLocaleLowerCase().includes(query);
        const matchesSubject = subject === "all" ||
          Boolean(card.querySelector(`.subject-tag.${subject}`));
        const matchesModule = isSearching ||
          (card.dataset.modules || "").split(/\s+/).includes(activeModule);
        const visible = matchesQuery && matchesSubject && matchesModule;
        card.hidden = !visible;
        card.classList.toggle("search-match", isSearching && visible);
        if (visible) visibleCount += 1;
      });
      document.querySelectorAll("[data-module]").forEach((tab) => {
        const moduleId = tab.dataset.module;
        const hasMatch = isSearching && catalogCards.some((card) => {
          const belongs = (card.dataset.modules || "").split(/\s+/).includes(
            moduleId,
          );
          const matchesText = card.textContent.toLocaleLowerCase().includes(
            query,
          );
          const matchesSubject = subject === "all" ||
            Boolean(card.querySelector(`.subject-tag.${subject}`));
          return belongs && matchesText && matchesSubject;
        });
        tab.classList.toggle("module-match", hasMatch);
      });
      if (catalogTitle && isSearching) catalogTitle.textContent = "搜索结果";
      if (catalogDescription && isSearching) {
        catalogDescription.textContent =
          `跨 ${courseModules.length} 个模型模块查找实验。`;
      }
      if (catalogTitle && !isSearching) {
        const active = courseModules.find((module) =>
          module.id === activeModule
        ) || courseModules[0];
        catalogTitle.textContent = active.title;
        if (catalogDescription) {
          catalogDescription.textContent = active.description;
        }
      }
      if (resultCount) resultCount.textContent = `${visibleCount} 个目录条目`;
      const empty = document.getElementById("volumeEmpty");
      if (empty) {
        empty.hidden = visibleCount > 0;
        empty.textContent = isSearching || subject !== "all"
          ? "没有符合条件的实验。"
          : "本模块暂未开放实验。";
      }
    };
    [searchInput, subjectFilter].filter(Boolean).forEach((control) =>
      control.addEventListener("input", applyCatalogFilters)
    );
    document.querySelectorAll("[data-module]").forEach((tab) =>
      tab.addEventListener("click", () =>
        window.requestAnimationFrame(applyCatalogFilters))
    );
    applyCatalogFilters();
    typesetMath();
    return;
  }

  function renderTaskPanel() {
    const tasks = lessonTasks[currentPage];
    const plan = lessonPlans[currentPage];
    const stage = document.querySelector(".stage");
    if (!tasks || !plan || !stage || document.querySelector(".task-panel")) {
      return;
    }

    const savedTasks = progress.tasks[currentPage] || [];
    const panel = document.createElement("details");
    panel.className = "task-panel";
    if (document.body.classList.contains("flagship-lab")) {
      panel.classList.add("flagship-task-panel");
    }
    panel.open = false;
    panel.innerHTML = `
     <summary class="task-summary">
       <span>学习任务</span>
        <span class="task-summary-note">完成三个关键观察</span>
       <strong class="task-count">0 / ${tasks.length}</strong>
     </summary>
     <div class="task-body">
        <div class="task-body-head">
          <p class="task-note">先观察现象，再用读数、图像和公式解释。</p>
          <div class="audience-switch" role="group" aria-label="学习方式">
            <span class="platform-kicker">学习方式</span>
            <div class="segmented-control">
              <button type="button" data-audience="student">学生自学</button>
              <button type="button" data-audience="teacher">教师演示</button>
            </div>
          </div>
        </div>
       <div class="lesson-meta">
          <div><span>本课目标</span><strong>${plan.goal}</strong></div>
          <div><span>开始前，你只需要知道</span><strong>${plan.prerequisite}</strong></div>
       </div>
       <div class="audience-content" data-audience-content="student">
         <div class="task-list"></div>
       </div>
       <div class="audience-content teacher-content" data-audience-content="teacher">
          <p class="task-note">按以下顺序组织演示，让学生先作出判断，再用读数和轨迹核对。</p>
          <ol class="teacher-prompts">${
      plan.prompts.map((prompt) => `<li>${prompt}</li>`).join("")
    }</ol>
          <div class="takeaway"><span>本课结论</span><strong>${plan.takeaway}</strong></div>
        </div>
      </div>`;

    const flagshipControls = document.body.classList.contains("flagship-lab")
      ? document.querySelector(".controls")
      : null;
    if (flagshipControls) {
      flagshipControls.append(panel);
    } else {
      const guide = stage.querySelector(".lesson-guide");
      const subtitle = stage.querySelector(".stage-subtitle");
      const anchor = guide || subtitle;
      if (anchor) anchor.insertAdjacentElement("afterend", panel);
      else stage.prepend(panel);
    }

    const list = panel.querySelector(".task-list");
    tasks.forEach((task, index) => {
      const id = `task-${currentPage.replace(/[^a-z0-9]+/gi, "-")}-${index}`;
      const item = document.createElement("label");
      item.className = "task-item";
      item.innerHTML = `<input type="checkbox" id="${id}" ${
        savedTasks[index] ? "checked" : ""
      } /><span>${task}</span>`;
      list.appendChild(item);
    });

    const updateTasks = () => {
      const checks = Array.from(panel.querySelectorAll("input[type=checkbox]"));
      const values = checks.map((input) => input.checked);
      const count = values.filter(Boolean).length;
      progress.tasks[currentPage] = values;
      progress.completed[currentPage] = count === tasks.length;
      saveProgress(progress);
      panel.querySelector(".task-count").textContent =
        `${count} / ${tasks.length}`;
      panel.classList.toggle("complete", count === tasks.length);
    };

    panel.querySelectorAll("input[type=checkbox]").forEach((input) =>
      input.addEventListener("change", updateTasks)
    );
    panel.querySelectorAll("[data-audience]").forEach((control) => {
      control.addEventListener("click", () => {
        const nextAudience = control.dataset.audience;
        if (!nextAudience) return;
        saveAudience(nextAudience);
        applyAudience(nextAudience);
      });
    });
    applyAudience(audience);
    updateTasks();
    typesetMath();
  }

  function moveActionsToCanvas() {
    const actions = document.querySelector(".actions");
    const canvasWrap = document.querySelector(".canvas-wrap");
    if (
      !actions || !canvasWrap || canvasWrap.querySelector(".canvas-action-dock")
    ) return;
    const buttons = Array.from(actions.querySelectorAll("button"));
    if (!buttons.length) return;
    const dock = document.createElement("div");
    dock.className = "canvas-action-dock";
    dock.setAttribute("role", "group");
    dock.setAttribute("aria-label", "画面控制");
    buttons.forEach((button) => dock.appendChild(button));
    canvasWrap.prepend(dock);
  }

  const actions = document.querySelector(".actions");
  if (actions && !actions.querySelector('a[href="./index.html"]')) {
    const link = document.createElement("a");
    link.className = "ghost-link directory-link";
    link.href = "./index.html";
    link.textContent = "实验目录";
    actions.prepend(link);
  }

  function renderCompletionToggle() {
    if (isHome || !actions || !lessons.includes(currentPage)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "completion-toggle";
    button.dataset.completionToggle = currentPage;

    const sync = () => {
      const complete = Boolean(progress.completed[currentPage]);
      button.classList.toggle("is-complete", complete);
      button.setAttribute("aria-pressed", complete ? "true" : "false");
      button.textContent = complete ? "✓ 已完成" : "○ 标记完成";
      button.title = complete ? "取消完成标记" : "将本实验标记为已完成";
    };

    button.addEventListener("click", () => {
      progress.completed[currentPage] = !progress.completed[currentPage];
      saveProgress(progress);
      sync();
    });
    sync();
    actions.append(button);
  }

  function renderExperimentNavigation() {
    if (isHome || !actions) return;
    const currentIndex = lessons.indexOf(currentPage);
    if (currentIndex < 0) return;
    [
      { index: currentIndex - 1, label: "上一个实验" },
      { index: currentIndex + 1, label: "下一个实验" },
    ].forEach(({ index, label }) => {
      const lesson = lessons[index];
      if (!lesson || actions.querySelector(`[data-lab-nav="${lesson}"]`)) {
        return;
      }
      const link = document.createElement("a");
      link.className = "lab-nav-link";
      link.dataset.labNav = lesson;
      link.href = `./${lesson}`;
      link.textContent = label;
      actions.append(link);
    });
    const breadcrumb = document.querySelector(".stage-breadcrumb");
    const heading = document.querySelector(".stage-head h1, .stage-head h2");
    if (breadcrumb && !breadcrumb.querySelector(".lab-context")) {
      const context = document.createElement("span");
      context.className = "lab-context";
      context.textContent = `全站 ${currentIndex + 1} / ${lessons.length}`;
      breadcrumb.append(context);
    } else if (heading && !document.querySelector(".lab-context")) {
      const context = document.createElement("span");
      context.className = "lab-context";
      context.textContent = `实验 ${currentIndex + 1} / ${lessons.length}`;
      heading.insertAdjacentElement("beforebegin", context);
    }
  }

  renderTaskPanel();
  renderCompletionToggle();
  renderExperimentNavigation();
  moveActionsToCanvas();
  observeControlValues();
  typesetMath();
})();
