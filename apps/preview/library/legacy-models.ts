// Course-specific teaching adapters. Original 432 exercises/IDs stay unchanged.
// Every displayed relationship has an exact model and independent invariant tests.
export type ModelKind =
  | "place"
  | "round"
  | "angle"
  | "product"
  | "division"
  | "laws"
  | "quad"
  | "land"
  | "chart"
  | "units"
  | "animals"
  | "tree"
  | "period"
  | "reverse"
  | "drawers"
  | "age"
  | "pairs"
  | "sticks"
  | "decimal-product"
  | "decimal-division"
  | "equivalent"
  | "composite"
  | "volume"
  | "equation"
  | "coordinate"
  | "chance"
  | "factors"
  | "motion"
  | "digits"
  | "average"
  | "shear"
  | "work"
  | "sequence"
  | "fraction-product"
  | "fraction-division"
  | "ratio"
  | "percent"
  | "circle"
  | "sector"
  | "signed"
  | "cylinder"
  | "proportion"
  | "combinations"
  | "extreme"
  | "parity"
  | "speed"
  | "dice";
export type LessonModel = {
  id: string;
  kind: ModelKind;
  problem: string;
  action: string;
  min: number;
  max: number;
  initial: number;
  step: number;
  unit: string;
  connection: string;
};
const rows: [
  string,
  ModelKind,
  string,
  string,
  number,
  number,
  number,
  string,
  string,
][] = [
  [
    "g4-place-value",
    "place",
    "306040里，每一个数字表示多少？",
    "改变十位",
    0,
    0,
    0,
    "",
    "每向左一位，计数单位变成原来的10倍。",
  ],
  [
    "g4-round-estimate",
    "round",
    "把396估到整百，应该靠近哪一个百？",
    "在数轴上移动",
    350,
    450,
    396,
    "",
    "比较到两个相邻整百数的距离，再做四舍五入。",
  ],
  [
    "g4-angle-measure",
    "angle",
    "一根射线转过多少，才从锐角变成直角、钝角？",
    "转动射线",
    10,
    170,
    60,
    "°",
    "角的大小看转动的幅度，不看边画得多长。",
  ],
  [
    "g4-multi-multiply",
    "product",
    "6排、每排34个座位，怎样拆成两块来计算？",
    "改变个位",
    1,
    9,
    4,
    "个",
    "把34拆成30和4，两个小阵列合起来仍是同一个大阵列。",
  ],
  [
    "g4-two-digit-divide",
    "division",
    "100张卡，每21张装一盒，够几盒、还剩几张？",
    "增减卡片",
    85,
    125,
    100,
    "张",
    "被除数＝除数×商＋余数，余数必须比除数小。",
  ],
  [
    "g4-operation-laws",
    "laws",
    "25、17、13三个数，先合哪两个更方便？",
    "交换结合顺序",
    0,
    1,
    0,
    "",
    "分组改变，三个量和总量都不变；比较25+(17+13)和(25+17)+13。",
  ],
  [
    "g4-quad-area",
    "quad",
    "底8厘米、高4厘米的平行四边形怎样剪拼成一个长方形？梯形又怎样？",
    "改变高度",
    2,
    6,
    4,
    "厘米",
    "高是两条平行线之间的垂直距离，不能把斜边当作高。",
  ],
  [
    "g4-area-unit",
    "land",
    "边长100米的正方形，为什么是1公顷？",
    "切换土地尺度",
    0,
    1,
    0,
    "平方米",
    "长度扩大10倍，正方形面积扩大100倍。",
  ],
  [
    "g4-bar-chart",
    "chart",
    "阅读活动的人数怎样用条形图比较？每一格表示2人。",
    "改变第三组人数",
    2,
    12,
    6,
    "人",
    "柱子的高度与人数对应，纵轴有零点和统一刻度。",
  ],
  [
    "g4-measurement-conversion",
    "units",
    "同一袋米用千克和克记录，为什么数不同、质量相同？",
    "改变千克数",
    1,
    8,
    3,
    "千克",
    "换单位前先确定一个大单位里有多少个小单位。",
  ],
  [
    "g4-chicken-rabbit",
    "animals",
    "10只鸡兔共有多少只脚？每把一只鸡换成兔，脚怎样变？",
    "换成兔的数量",
    0,
    10,
    3,
    "只",
    "头的总数始终10；每换一只，脚增加2只。",
  ],
  [
    "g4-route-enumeration",
    "tree",
    "先选2条路之一，再选3条路之一，怎样列齐路线？",
    "改变第二段路线数",
    2,
    4,
    3,
    "条",
    "一次选第一段，再选第二段；有序对不重不漏。",
  ],
  [
    "g4-period-remainder",
    "period",
    "红黄蓝绿每4天循环，第几天回到红色？",
    "选择第几天",
    1,
    24,
    5,
    "天",
    "第1天是红色；用(天数−1)除以4的余数定位。",
  ],
  [
    "g4-working-backward",
    "reverse",
    "一个数先加18，再乘3，结果是90，起点是什么？",
    "改变最后结果",
    84,
    108,
    90,
    "",
    "从最后一步开始，先除3，再减18。",
  ],
  [
    "g4-pigeonhole",
    "drawers",
    "3种颜色，最不利地取球，至少几个保证有同色？",
    "放入球的数量",
    1,
    7,
    3,
    "个",
    "先每种各放1个，下一球无论什么颜色都会重复。",
  ],
  [
    "g4-age-invariant",
    "age",
    "哥哥12岁，妹妹8岁，几年后两人的年龄差还是4吗？",
    "一起增加年龄",
    0,
    20,
    0,
    "岁",
    "两人经过相同的时间；年龄差不变，年龄的倍数关系会变化。",
  ],
  [
    "g4-pairing-sums",
    "pairs",
    "1加到20，把两份相同数列首尾配对会怎样？",
    "改变最后的数",
    5,
    24,
    20,
    "",
    "两行对应的每一列都是n+1，两份总和是n(n+1)。",
  ],
  [
    "g4-matchstick-pattern",
    "sticks",
    "一排相邻正方形共用一条边，还需要几根火柴？",
    "增加正方形",
    1,
    8,
    3,
    "根",
    "第1个用4根，此后每添1个只增加3根。",
  ],
  [
    "g5-decimal-multiply",
    "decimal-product",
    "长2.4米、宽1.3米的地毯，面积怎样从小方格得到？",
    "改变长度的十分之一",
    11,
    35,
    24,
    "米",
    "边长0.1米的小方格，面积是0.01平方米，不是0.1平方米。",
  ],
  [
    "g5-decimal-divide",
    "decimal-division",
    "3.6米绳，每0.6米剪一段，可以分成几段？",
    "改变段数",
    2,
    9,
    6,
    "段",
    "把被除数和除数同时乘10，份数不变。",
  ],
  [
    "g5-fraction-equivalence",
    "equivalent",
    "同一张纸的1/2，细分以后为什么还能写成2/4、3/6？",
    "同时扩大分子分母",
    1,
    6,
    2,
    "份",
    "两条图带整体一样大；只增加分割，不改变涂色量。",
  ],
  [
    "g5-composite-area",
    "composite",
    "8×6长方形剪去宽3、高2的角，剩余面积怎样算？",
    "改变剪掉部分的高",
    1,
    4,
    2,
    "厘米",
    "把大长方形面积减去被剪掉的小长方形。",
  ],
  [
    "g5-cuboid-volume",
    "volume",
    "每层4×3个单位立方体，堆2层，一共多少个？",
    "增加层数",
    1,
    5,
    2,
    "层",
    "每个小方块是1立方厘米；一层的个数乘层数。",
  ],
  [
    "g5-equation-balance",
    "equation",
    "一个盒子和7个单位砝码共19，怎样保持平衡地求盒子？",
    "两边同时减去7",
    0,
    1,
    0,
    "",
    "等式两边减去同一个数；不是只改变未知数一边。",
  ],
  [
    "g5-coordinate",
    "coordinate",
    "从原点向右3格、向上2格，怎样用两个数说清位置？",
    "改变横坐标",
    1,
    5,
    3,
    "格",
    "先横后纵，(3,2)与(2,3)一般不是同一点。",
  ],
  [
    "g5-probability",
    "chance",
    "袋里红球和3个蓝球，摸到红球的可能性怎样比较？",
    "改变红球数量",
    1,
    6,
    2,
    "个",
    "每球被摸到的机会相同；红球数除以总球数。",
  ],
  [
    "g5-factors-primes",
    "factors",
    "24个小方块能排出哪些完整长方形？23个呢？",
    "切换24与23",
    0,
    1,
    0,
    "个",
    "每种整排的行数是因数；质数只有1和它本身两个因数。",
  ],
  [
    "g5-figure-motion",
    "motion",
    "一个L形平移或旋转后，位置、长度和面积分别怎样？",
    "选择平移距离",
    0,
    3,
    1,
    "格",
    "平移和旋转保持长度与面积，不把拉伸冒充平移。",
  ],
  [
    "g5-remainder-digit",
    "digits",
    "24□要同时是2和3的倍数，个位可以填什么？",
    "尝试个位数字",
    0,
    9,
    6,
    "",
    "能被2整除看个位；能被3整除看数位和。两条都要满足。",
  ],
  [
    "g5-counting-tree",
    "tree",
    "2个字母与3个数字各选一个，怎样列齐两位编码？",
    "改变数字选择数",
    2,
    4,
    3,
    "种",
    "字母的位置固定在前；每个字母分支都列出全部数字。",
  ],
  [
    "g5-average-optimization",
    "average",
    "6、8、10三杯水移多补少，平到同一高度是多少？",
    "改变第三杯水量",
    6,
    14,
    10,
    "毫升",
    "平分不改变总量；总量除以杯数，不是只取最高最低的中间。",
  ],
  [
    "g5-area-invariant",
    "shear",
    "平行四边形沿高剪开，平移一块后为什么面积不变？",
    "切换剪拼前后",
    0,
    1,
    0,
    "平方厘米",
    "每块的形状与面积未变，只有位置改变，没有重叠或缺口。",
  ],
  [
    "g5-work-rate",
    "work",
    "甲每小时6件、乙每小时4件，同时做2小时共完成多少？",
    "改变工作时间",
    1,
    5,
    2,
    "小时",
    "先把相同时间单位的效率相加，再乘时间。",
  ],
  [
    "g5-pigeonhole",
    "drawers",
    "5类徽章，至少取几枚一定有两枚同类？",
    "放入徽章数量",
    1,
    10,
    5,
    "枚",
    "先按最不利情况每类各1枚，再看第6枚。",
  ],
  [
    "g5-reverse-equation",
    "reverse",
    "一个数先加9，再乘4，得到84，怎样逆着还原？",
    "改变最后结果",
    80,
    104,
    84,
    "",
    "先撤销乘4，再撤销加9；顺序也要反过来。",
  ],
  [
    "g5-digit-pattern",
    "sequence",
    "2、5、8、11，每一步增加3，第n项怎样表示？",
    "选择第几项",
    1,
    12,
    5,
    "项",
    "第一项是2；到第n项只增加了n−1次3。",
  ],
  [
    "g6-fraction-multiply",
    "fraction-product",
    "一张纸的3/4里再取2/3，占整张纸的多少？",
    "改变第二次取的份数",
    1,
    3,
    2,
    "份",
    "同一个整体分成12小格，交叠的格数同时表示两个条件。",
  ],
  [
    "g6-fraction-divide",
    "fraction-division",
    "3/4米绳里含有几个1/8米？",
    "改变八分之一的个数",
    2,
    7,
    6,
    "段",
    "先统一到八分之一米；6个单位各组成一份。",
  ],
  [
    "g6-ratio",
    "ratio",
    "红蓝小珠按2∶3分，每一份都增加时，怎样保持这个比？",
    "改变每份的数量",
    1,
    6,
    4,
    "颗",
    "两种珠子的数量同时按同样倍数变化，比不变。",
  ],
  [
    "g6-percent",
    "percent",
    "把整体平均分100份，25%怎样对应分数与小数？",
    "改变涂色百分比",
    5,
    95,
    25,
    "%",
    "百分数的分母固定100，明确这个整体是什么。",
  ],
  [
    "g6-circle",
    "circle",
    "同心圆半径变了，直径、周长和面积怎样变？",
    "改变半径",
    1,
    5,
    3,
    "厘米",
    "直径是半径的2倍；周长随半径成比例，面积随半径平方变化。",
  ],
  [
    "g6-sector-data",
    "sector",
    "100人里25人选阅读，扇形角度为什么是90°？",
    "改变选择阅读的人数",
    10,
    90,
    25,
    "人",
    "完整圆表示100%，部分角度＝比例×360°。",
  ],
  [
    "g6-negative-number",
    "signed",
    "温度从−4℃上升，数轴上怎样越过0？",
    "移动温度",
    -6,
    6,
    -4,
    "℃",
    "负号表达低于参照零点的方向，不是把负数画到正数一侧。",
  ],
  [
    "g6-cylinder-volume",
    "cylinder",
    "底面积20平方厘米的圆柱，堆3厘米高，体积是多少？",
    "改变高度",
    1,
    6,
    3,
    "厘米",
    "每一厘米厚的一层都有同样底面积；底面积乘高。",
  ],
  [
    "g6-proportion",
    "proportion",
    "地图1厘米对应实地5千米，长度变成3厘米时怎样变化？",
    "改变图上厘米数",
    1,
    7,
    3,
    "厘米",
    "用同一比例尺，实地长度与图上长度的比保持5。",
  ],
  [
    "g6-algebra-model",
    "sticks",
    "n个相邻正方形的火柴数，为什么是3n+1？",
    "代入不同n",
    1,
    8,
    4,
    "根",
    "把每个新图形增加的3根与第一个额外的1根分开。",
  ],
  [
    "g6-combinatorics",
    "combinations",
    "4种颜色选2种，红蓝和蓝红算同一组时有几组？",
    "改变颜色种数",
    3,
    6,
    4,
    "种",
    "先列有序对，再把相反顺序的同一组配在一起，除以2。",
  ],
  [
    "g6-extreme-principle",
    "extreme",
    "周长固定12厘米，整数边长的长方形怎样围得面积最大？",
    "改变一条边",
    1,
    5,
    3,
    "厘米",
    "两条邻边和为6；比较1×5、2×4、3×3。",
  ],
  [
    "g6-parity-invariant",
    "parity",
    "17个点两两配对，怎样看见奇数多出来的1？",
    "增减点的数量",
    1,
    24,
    17,
    "个",
    "除以2的余数只能0或1，分别对应偶数和奇数。",
  ],
  [
    "g6-speed-ratio",
    "speed",
    "每小时6千米，走3小时，时间和路程怎样在图上对应？",
    "改变行走小时数",
    1,
    4,
    3,
    "小时",
    "速度的单位是千米/小时；相同时间走相同路程。",
  ],
  [
    "g6-geometry-transform",
    "motion",
    "同一个L形平移、旋转、翻折，什么改变、什么保持？",
    "改变平移格数",
    0,
    3,
    1,
    "格",
    "三类刚性变换都保持长度、角度与面积；对应点要一致。",
  ],
  [
    "g6-working-backward",
    "reverse",
    "一个数加8后乘2得到42，怎样从终点回到起点？",
    "改变最后结果",
    36,
    52,
    42,
    "",
    "终点÷2−8是起点；把起点再代回去核对。",
  ],
  [
    "g6-pigeonhole",
    "drawers",
    "生日按12个月分类，至少多少人保证有两人同月？",
    "改变人数",
    1,
    18,
    12,
    "人",
    "12人可以各在一个月；第13人一定落进已有的月份。",
  ],
  [
    "g6-probability-strategy",
    "dice",
    "两枚普通骰子，和为7的有多少种？所有结果有多少种？",
    "改变所求点数和",
    2,
    12,
    7,
    "",
    "(1,6)和(6,1)是不同结果；6×6共36种等可能的有序对。",
  ],
];
export const legacyModels: LessonModel[] = rows.map(
  ([id, kind, problem, action, min, max, initial, unit, connection]) => ({
    id,
    kind,
    problem,
    action,
    min,
    max,
    initial,
    step:
      kind === "reverse"
        ? id.startsWith("g4")
          ? 3
          : id.startsWith("g5")
            ? 4
            : 2
        : 1,
    unit,
    connection,
  }),
);
export const modelFor = (id: string) => {
  const m = legacyModels.find((x) => x.id === id);
  if (!m) throw Error("COURSE_SEMANTIC_MODEL_REQUIRED");
  return m;
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export const fraction = (n: number, d: number) => {
  const g = gcd(n, d);
  return d === g ? String(n / g) : `${n / g}/${d / g}`;
};
const dec = (n: number) => String(Number(n.toFixed(4)));
export function modelFacts(
  id: string,
  value: number,
  toggle = false,
  secondary = 2,
  rotation = false,
) {
  const m = modelFor(id);
  if (
    !Number.isInteger(value) ||
    value < m.min ||
    value > m.max ||
    (value - m.min) % m.step !== 0
  )
    throw Error("MODEL_PARAMETER_OUT_OF_RANGE");
  let a = value,
    b = 0,
    result = 0,
    formula = "",
    check = "",
    labels: string[] = [],
    unit = m.unit,
    parts: number[] = [];
  switch (m.kind) {
    case "place":
      a = 306040;
      result = a;
      formula = "300000＋6000＋40＝306040";
      check = "各位数字乘对应计数单位，重新组成原数。";
      break;
    case "round":
      a = value;
      b = Math.floor(a / 100) * 100;
      result = Math.floor((a + 50) / 100) * 100;
      formula = `${a}≈${result}（整百）`;
      check = `到${b}差${a - b}，到${b + 100}差${b + 100 - a}。`;
      break;
    case "angle":
      result = a;
      formula = `${a}°：${a < 90 ? "锐角" : a === 90 ? "直角" : "钝角"}`;
      check = "两射线的起点相同，弧线只标记这次转过的角。";
      break;
    case "product":
      a = 30 + value;
      b = 6;
      parts = [30, value];
      result = a * b;
      formula = `${a}×6＝30×6＋${value}×6＝${result}`;
      check = `${result}÷6＝${a}`;
      unit = "个";
      break;
    case "division":
      b = 21;
      result = Math.floor(a / b);
      parts = [result, a % b];
      formula = `${a}÷21＝${result}……${a % b}`;
      check = `21×${result}＋${a % b}＝${a}，${a % b}<21`;
      break;
    case "laws":
      parts = toggle ? [17, 25, 13] : [25, 17, 13];
      a = 25;
      b = 17;
      result = 55;
      formula = value
        ? `(${parts[0]}＋${parts[1]})＋${parts[2]}＝55`
        : `${parts[0]}＋(${parts[1]}＋${parts[2]})＝55`;
      check = "只改变分组，三个加数一个都没有增减。";
      break;
    case "quad":
      a = 8;
      b = value;
      result = (toggle ? 6 : 8) * b;
      formula = toggle
        ? `(8＋4)×${b}÷2＝${result}平方厘米`
        : `8×${b}＝${result}平方厘米`;
      check = toggle
        ? "复制一个全等梯形，拼成底12的平行四边形，再取一半。"
        : "沿高剪下的三角形平移到另一侧，不改变总面积。";
      unit = "平方厘米";
      break;
    case "land":
      a = value ? 1000 : 100;
      b = a;
      result = a * a;
      formula = value
        ? "1平方千米＝100公顷＝1000000平方米"
        : "1公顷＝10000平方米";
      check = `${a}米×${a}米＝${result}平方米；图中每个小格边长${a / 10}米。`;
      break;
    case "chart":
      parts = [5, 8, value];
      result = parts.reduce((x, y) => x + y, 0);
      formula = `三组共${result}人；最多${Math.max(...parts)}人`;
      check = "纵轴每一大格表示2人，半格表示1人。";
      break;
    case "units":
      result = value * 1000;
      formula = `${value}千克＝${result}克`;
      check = `${result}÷1000＝${value}，质量没有改变。`;
      break;
    case "animals":
      a = 10 - value;
      b = value;
      result = a * 2 + b * 4;
      formula = `${a}只鸡＋${b}只兔：${result}只脚`;
      check = `${a}＋${b}＝10；20＋2×${b}＝${result}`;
      break;
    case "tree":
      a = 2;
      b = value;
      result = a * b;
      labels = Array.from({ length: a }, (_, i) =>
        Array.from(
          { length: b },
          (_, j) => `${String.fromCharCode(65 + i)}${j + 1}`,
        ),
      ).flat();
      formula = `2×${b}＝${result}种`;
      check = `完整编码：${labels.join("、")}`;
      break;
    case "period":
      b = 4;
      result = (value - 1) % 4;
      labels = ["红", "黄", "蓝", "绿"];
      formula = `第${value}天是${labels[result]}色`;
      check = `(${value}−1)÷4：已经过${Math.floor((value - 1) / 4)}轮，再向前${result}格。`;
      break;
    case "reverse":
      b =
        id === "g4-working-backward"
          ? 18
          : id === "g5-reverse-equation"
            ? 9
            : 8;
      parts = [
        b,
        id === "g4-working-backward" ? 3 : id === "g5-reverse-equation" ? 4 : 2,
      ];
      result = value / parts[1] - b;
      formula = `${value}÷${parts[1]}−${b}＝${dec(result)}`;
      check = `(${dec(result)}＋${b})×${parts[1]}＝${value}`;
      break;
    case "drawers":
      b = id.startsWith("g4") ? 3 : id.startsWith("g5") ? 5 : 12;
      result = Math.ceil(value / b);
      parts = Array.from(
        { length: b },
        (_, i) => Math.floor(value / b) + (i < value % b ? 1 : 0),
      );
      formula = `${value}个分进${b}类，至少有一类不少于${result}个`;
      check = `保证同类至少2个，需要${b + 1}个；现在${value >= b + 1 ? "已保证" : "还不能保证"}。`;
      break;
    case "age":
      a = 12 + value;
      b = 8 + value;
      result = a - b;
      formula = `${a}−${b}＝${result}岁`;
      check = `(12＋${value})−(8＋${value})＝12−8`;
      break;
    case "pairs":
      result = (value * (value + 1)) / 2;
      formula = `1＋…＋${value}＝${value}×${value + 1}÷2＝${result}`;
      check = `两份同样的数列配对，共${value}列，每列${value + 1}。`;
      break;
    case "sticks":
      result = 3 * value + 1;
      formula = `4＋3×(${value}−1)＝3×${value}＋1＝${result}根`;
      check = `上下边${2 * value}根＋竖边${value + 1}根＝${result}`;
      break;
    case "decimal-product":
      a = value / 10;
      b = 1.3;
      result = (value * 13) / 100;
      formula = `${dec(a)}×1.3＝${dec(result)}平方米`;
      check = `${value}×13＝${value * 13}个0.01平方米的小格。`;
      unit = "平方米";
      break;
    case "decimal-division":
      b = 0.6;
      a = (value * 6) / 10;
      result = value;
      formula = `${dec(a)}÷0.6＝${value}段`;
      check = `${value}×0.6＝${dec(a)}米；同时乘10：${dec(a * 10)}÷6＝${value}`;
      break;
    case "equivalent":
      a = 1;
      b = 2;
      result = 0.5;
      formula = `1/2＝${value}/${2 * value}`;
      check = "上下两条图带相同长、相同整体，涂色比例都为一半。";
      break;
    case "composite":
      a = 8;
      b = 6;
      result = 48 - 3 * value;
      formula = `8×6−3×${value}＝${result}平方厘米`;
      check = `剩余${result}＋剪去${3 * value}＝48平方厘米`;
      unit = "平方厘米";
      break;
    case "volume":
      a = 4;
      b = 3;
      result = 12 * value;
      formula = `4×3×${value}＝${result}立方厘米`;
      check = `${value}层，每层12个1立方厘米小方块。`;
      unit = "立方厘米";
      break;
    case "equation":
      a = 7;
      b = 19;
      result = 12;
      formula = value ? "x＝12" : "x＋7＝19";
      check = value
        ? "两边都减7：19−7＝12。"
        : "下一步可以两边同减7；不能只拿走左边的砝码。";
      break;
    case "coordinate":
      a = value;
      if (!Number.isInteger(secondary) || secondary < 1 || secondary > 5)
        throw Error("COORDINATE_RANGE");
      b = secondary;
      result = value;
      formula = `A＝(${a},${b})`;
      check = `先从原点向右${a}格，再向上${b}格；交换顺序得到(${b},${a})，仅当两个数相同才重合。`;
      break;
    case "chance":
      a = value;
      b = 3;
      result = a / (a + b);
      formula = `摸到红球的可能性＝${fraction(a, a + b)}`;
      check = `红${a}＋蓝3＝${a + 3}球；每次摸后放回，结果可能不同。`;
      break;
    case "factors":
      a = value ? 23 : 24;
      parts = Array.from({ length: a }, (_, i) => i + 1).filter(
        (x) => a % x === 0,
      );
      result = parts.length;
      formula = `${a}的因数：${parts.join("、")}`;
      check = value
        ? "23只有1和23两个因数，是质数。"
        : "24有多种完整长方形排法，是合数。";
      break;
    case "motion":
      a = value;
      result = 6;
      formula = "面积始终6平方格";
      check = rotation
        ? "绕标记中心顺时针旋转90°，每条边和每个角都不变。"
        : toggle
          ? "沿竖直线翻折后，对应边等长、角相同。"
          : `整体向右平移${value}格，没有拉伸或剪掉任何部分。`;
      break;
    case "digits":
      a = 240 + value;
      result = Number(a % 2 === 0 && a % 3 === 0);
      labels = ["0", "6"];
      formula = `${a}：${result ? "同时满足" : "没有同时满足"}2和3的倍数条件`;
      check = `个位${value}${value % 2 ? "为奇数" : "为偶数"}；数位和${6 + value}${(6 + value) % 3 ? "不是" : "是"}3的倍数。所有可填数字：0、6。`;
      break;
    case "average":
      parts = [6, 8, value];
      a = 14 + value;
      b = 3;
      result = a / b;
      formula = `(6＋8＋${value})÷3＝${fraction(a, 3)}毫升`;
      check = `总量${a}毫升不变；平均值×3回到${a}毫升。`;
      break;
    case "shear":
      a = 8;
      b = 4;
      result = 32;
      formula = "8×4＝32平方厘米";
      check = value
        ? "三角形只平移到右侧，没有重叠或遗漏。"
        : "沿高划线，认清平移前的两块面积。";
      unit = "平方厘米";
      break;
    case "work":
      a = 6;
      b = 4;
      result = 10 * value;
      formula = `(6＋4)×${value}＝${result}件`;
      check = `甲${6 * value}件＋乙${4 * value}件＝${result}件；效率都按每小时。`;
      break;
    case "sequence":
      result = 2 + 3 * (value - 1);
      labels = Array.from({ length: Math.min(value, 6) }, (_, i) =>
        String(2 + 3 * i),
      );
      formula = `第${value}项＝2＋3×(${value}−1)＝${result}`;
      check = "第一项到第n项之间只有n−1段间隔。";
      break;
    case "fraction-product":
      a = 3;
      b = 4;
      result = value / 4;
      formula = `3/4×${value}/3＝${fraction(3 * value, 12)}`;
      check = `12个小格中，交叠${3 * value}格；整体始终是同一张纸。`;
      break;
    case "fraction-division":
      a = value;
      b = 8;
      result = value;
      formula = `${fraction(value, 8)}÷1/8＝${value}`;
      check = `${value}×1/8＝${fraction(value, 8)}米；数的是含有几份1/8米。`;
      break;
    case "ratio":
      a = 2 * value;
      b = 3 * value;
      result = a + b;
      formula = `${a}∶${b}＝2∶3，总数${result}颗`;
      check = `两种珠子都除以${value}，回到每份2和3。`;
      break;
    case "percent":
      a = value;
      b = 100;
      result = value / 100;
      formula = `${value}%＝${fraction(value, 100)}＝${dec(result)}`;
      check = `涂色${value}格＋空白${100 - value}格＝100格。`;
      break;
    case "circle":
      a = value;
      b = value * 2;
      result = value * value;
      formula = `直径${b}厘米；周长${2 * value}π厘米；面积${value * value}π平方厘米`;
      check = "π是圆周率；用π保留精确形式，不把3.14当成精确值。";
      break;
    case "sector":
      a = value;
      b = 100;
      result = (value * 360) / 100;
      formula = `${value}%×360°＝${dec(result)}°`;
      check = `阅读${value}%＋其他${100 - value}%＝100%；两块角度和360°。`;
      break;
    case "signed":
      result = value;
      formula = `${value}℃${value < 0 ? "低于" : value > 0 ? "高于" : "就是"}0℃${value === 0 ? "" : Math.abs(value) + "℃"}`;
      check = "0是参照点；向右表示温度升高，负数在左边。";
      break;
    case "cylinder":
      a = 20;
      b = value;
      result = 20 * value;
      formula = `20×${value}＝${result}立方厘米`;
      check = `底面积20平方厘米，重复${value}个1厘米厚的层。`;
      unit = "立方厘米";
      break;
    case "proportion":
      a = value;
      b = 5;
      result = 5 * value;
      formula = `图上${value}厘米 ↔ 实地${result}千米`;
      check = `${result}÷${value}＝5千米/厘米，比例尺不变。`;
      break;
    case "combinations":
      result = (value * (value - 1)) / 2;
      labels = [];
      for (let i = 0; i < value; i++)
        for (let j = i + 1; j < value; j++)
          labels.push(
            `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + j)}`,
          );
      formula = `${value}×(${value}−1)÷2＝${result}组`;
      check = `全部组合：${labels.join("、")}。AB和BA只记一次。`;
      break;
    case "extreme":
      a = value;
      b = 6 - value;
      result = a * b;
      formula = `周长2×(${a}＋${b})＝12，面积${result}平方厘米`;
      check = "整数边长1×5、2×4、3×3的面积分别5、8、9；正方形最大。";
      unit = "平方厘米";
      break;
    case "parity":
      b = 2;
      result = value % 2;
      parts = [Math.floor(value / 2), value % 2];
      formula = `${value}＝2×${parts[0]}＋${result}，是${result ? "奇数" : "偶数"}`;
      check = `两两配完，${result ? "还剩1个" : "没有剩余"}。`;
      break;
    case "speed":
      a = 6;
      b = value;
      result = 6 * value;
      formula = `6千米/小时×${value}小时＝${result}千米`;
      check = `${result}÷${value}＝6千米/小时，每小时路段相同长。`;
      break;
    case "dice":
      a = value;
      b = 36;
      labels = [];
      for (let i = 1; i <= 6; i++)
        for (let j = 1; j <= 6; j++)
          if (i + j === value) labels.push(`${i},${j}`);
      result = labels.length;
      formula = `和为${value}：${result}/36＝${fraction(result, 36)}`;
      check = `全部36种等可能结果；符合的有${labels.join("；")}。`;
      break;
  }
  return {
    kind: m.kind,
    a,
    b,
    result,
    formula,
    check,
    parts,
    labels,
    unit,
    value,
  };
}

// Sliders sometimes store a discrete mode or tenths, not the displayed unit.
export function modelControlValue(id: string, value: number) {
  const m = modelFor(id);
  if (m.kind === "decimal-product") return `${value / 10}米`;
  if (m.kind === "land")
    return value ? "边长1000米（1平方千米）" : "边长100米（1公顷）";
  if (m.kind === "shear")
    return value ? "已剪拼，面积仍32平方厘米" : "剪拼前，面积32平方厘米";
  if (m.kind === "factors") return `${value ? 23 : 24}个小方块`;
  if (m.kind === "sticks") return `${value}个正方形`;
  if (m.kind === "laws") return value ? "先合并左边两数" : "先合并右边两数";
  return `${value}${m.unit}`;
}
