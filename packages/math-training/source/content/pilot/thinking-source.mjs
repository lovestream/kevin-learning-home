// Only the 17 reviewed authored cards. No deferred cards.
export const thinkingCards=[
  {
    "id": "G3-U01-TH1",
    "unitId": "G3-U01",
    "title": "用两种观察补齐被挡住的信息",
    "layer": "本章提升",
    "parentLessonId": "G3-U01-B02",
    "conceptId": "reasoning.sufficient-evidence",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "1–5",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "基础已会观察不同方向；提升需要把两条信息合起来，而非只凭一张正面图猜。",
    "question": "用相同小正方体叠三堆：前排左、前排右、后排左各一堆，后排右空着。从正前方看，左列最高2块、右列最高1块；从右侧看，前排最高2块、后排最高1块。每堆至少1块，且上下竖直叠齐。三堆各有几块，一共几块？",
    "answer": "前左2、前右1、后左1，共4块。",
    "reason": "右列只有前右，所以前右为1。；后排只有后左，所以后左为1。；左列最高2，后左只有1，因此前左必须2；合计4。",
    "solutionSteps": [
      "右列只有前右，所以前右为1。",
      "后排只有后左，所以后左为1。",
      "左列最高2，后左只有1，因此前左必须2；合计4。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "先找只有一堆积木的列或排。照片上的最高高度，不是这一列所有方块的总数。"
      },
      {
        "level": 2,
        "text": "右列、后排各确定一堆后，再检查哪一堆同时影响正面左列和右侧前排。把三堆的高度逐个代回两张照片。"
      }
    ],
    "applicability": "观察按正对方向的最高堆高读图；题干已给每堆占一个地面格，不容许悬空或斜放。",
    "thinkingEvidence": "能说清每条信息排除了什么；不能只报4。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "77fba0d14f5c6feb022c37b7f8ef91849949c8149bbabd58497884133be69df9",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "77fba0d14f5c6feb022c37b7f8ef91849949c8149bbabd58497884133be69df9",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "能说清每条信息排除了什么；不能只报4。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-U01",
    "thinkingDomain": "reasoning.sufficient-evidence",
    "thinkingLabel": "信息是否足够",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-U02-TH1",
    "unitId": "G3-U02",
    "title": "括号为了解决不同的题意",
    "layer": "本章提升",
    "parentLessonId": "G3-U02-B03",
    "conceptId": "arithmetic.parentheses.model",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "6–19",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "从会先算括号，提升为根据目标选择括号范围，并区分是否等值。",
    "question": "把36−12÷3添一对括号，使结果变成8；数字和运算符号的位置都不能改。再说清：这是保持原式的值，还是把式子改成另一种运算顺序？请编一个关于贴纸的故事表示新式子。",
    "answer": "(36−12)÷3=8；原式32，值改变。例：36张贴纸送走12张，剩下平均给3人，每人8张。",
    "reason": "要得到8，先得到要平均分的24张。；用括号包住36−12，再除以3。；原式先除后减为32，与新式不是等值改写。",
    "solutionSteps": [
      "要得到8，先得到要平均分的24张。",
      "用括号包住36−12，再除以3。",
      "原式先除后减为32，与新式不是等值改写。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "故事里，平均分的是原来的卡片，还是送走后剩下的卡片？先圈出要作为一个整体的数量。"
      },
      {
        "level": 2,
        "text": "分别算加括号前和加括号后，把每一步对回故事。改变先后顺序不等于两道式子等值。"
      }
    ],
    "applicability": "只允许一对括号，不移动数字/符号；故事中36与12为张数，3为人数。",
    "thinkingEvidence": "能说明括号包住的量，并主动说出这题允许改变值。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "0b536038eaed0f2ecd4612adc43991670616bdf0f5603e4e6b7c6ada0e5f1fcc",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "0b536038eaed0f2ecd4612adc43991670616bdf0f5603e4e6b7c6ada0e5f1fcc",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "能说明括号包住的量，并主动说出这题允许改变值。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-U02",
    "thinkingDomain": "arithmetic.parentheses.model",
    "thinkingLabel": "括号与现实运算顺序",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-U03-TH1",
    "unitId": "G3-U03",
    "title": "两把没刻度的尺还能量吗",
    "layer": "本章提升",
    "parentLessonId": "G3-U03-B01",
    "conceptId": "reasoning.segment-compensation",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "20–30",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "从读尺两端差，拓展为借已知线段组合得到新长度。",
    "question": "只有两条硬纸条，长分别4厘米和7厘米，没有中间刻度。可以在纸上画直线、标纸条两端。怎样得到一段3厘米线段，再得到一段10厘米线段？不能凭眼睛估长度。",
    "answer": "先同起点对齐4和7，两个终点间3厘米；再把7厘米与复制出的3厘米首尾接起来得10厘米。",
    "reason": "相同起点使终点间距离为7−4=3。；把这3厘米用纸条或标记完整复制。；7+3=10，连接处不重叠也不留缝。",
    "solutionSteps": [
      "相同起点使终点间距离为7−4=3。",
      "把这3厘米用纸条或标记完整复制。",
      "7+3=10，连接处不重叠也不留缝。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "把两条纸带的起点对齐。两个终点之间的距离，表示长纸带比短纸带多出的部分。"
      },
      {
        "level": 2,
        "text": "先画出差的线段，再把它和长纸带首尾相接。接头不能重叠，也不能留下空隙。"
      }
    ],
    "applicability": "纸条不伸缩、始终沿同一直线；可转移端点，不能把厚度或歪斜当长度。",
    "thinkingEvidence": "解释为何取差与首尾相加能保证长度，而不是“看起来差不多”。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "82cc8ad037f2cc0951af25eed5ca45f691a807110701fbc2391d981e05908217",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "82cc8ad037f2cc0951af25eed5ca45f691a807110701fbc2391d981e05908217",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "解释为何取差与首尾相加能保证长度，而不是“看起来差不多”。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-U03",
    "thinkingDomain": "reasoning.segment-compensation",
    "thinkingLabel": "线段取差与补偿",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-UP01-TH1",
    "unitId": "G3-UP01",
    "title": "天平两边都有盒子怎么办",
    "layer": "本章提升",
    "parentLessonId": "G3-UP01-B02",
    "conceptId": "reasoning.equal-elimination",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "31–38",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "等量替换延伸为两边去掉同样的已知部分，保留相等关系。",
    "question": "天平平衡。左盘有3个质量相同的密封盒和20克砝码；右盘有2个同样密封盒和合计170克的砝码（其中能取出20克）。每个盒子总质量相同，不能打开。一个盒子重多少克？说清每次从两边拿走什么。",
    "answer": "一个盒子150克。",
    "reason": "两边同时拿走2个同样盒，仍平衡。；剩左边1盒加20克，右边170克。；再从两边同时去掉20克，1盒等于150克。",
    "solutionSteps": [
      "两边同时拿走2个同样盒，仍平衡。",
      "剩左边1盒加20克，右边170克。",
      "再从两边同时去掉20克，1盒等于150克。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "天平两盘同时拿走同样的东西，剩下的两边还一样重。只拿走一边的袋子会怎样？"
      },
      {
        "level": 2,
        "text": "先让两边共同的袋子消去，再让共同的砝码消去。剩下的袋子数量和砝码重量分别是什么？"
      }
    ],
    "applicability": "同样盒子指含内容物的总质量相同；本题用操作，不要求移项口诀。",
    "thinkingEvidence": "每一步指出两边等量减少；只在一边拿走物品不算合法消元。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "6689620fbac82f1defc5274c9c74ff98664b8d05a015de645a0acc46563f3dee",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "6689620fbac82f1defc5274c9c74ff98664b8d05a015de645a0acc46563f3dee",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "每一步指出两边等量减少；只在一边拿走物品不算合法消元。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-UP01",
    "thinkingDomain": "reasoning.equal-elimination",
    "thinkingLabel": "等量操作与消元",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-U04-TH1",
    "unitId": "G3-U04",
    "title": "十位看错，乘积差多少",
    "layer": "本章提升",
    "parentLessonId": "G3-U04-B01",
    "conceptId": "arithmetic.law.distribution",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "39–56",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "位值拆分不只服务算法，还能分析输入误差怎样累积。",
    "question": "算27×4时，小乐把27的十位2看成3，实际算了37×4。不重新算两个完整乘积，能知道错误结果比正确结果多多少吗？若只把个位7看成8呢？",
    "answer": "十位看错多40；个位看错多4。",
    "reason": "27变37，每组多10，4组共多40。；27变28，每组多1，4组共多4。；同样一个数字写大1，所在数位不同，影响也不同。",
    "solutionSteps": [
      "27变37，每组多10，4组共多40。",
      "27变28，每组多1，4组共多4。",
      "同样一个数字写大1，所在数位不同，影响也不同。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "十位的1代表10个一，不是1个一。看错一个数位，会让每组多多少？"
      },
      {
        "level": 2,
        "text": "先找每组多出的数量，再乘组数。可以用一个简单乘法验算，但不要把看错十位和个位混为一谈。"
      }
    ],
    "applicability": "只改变指定一位且乘数仍4；不是任何计算错误都能这样推断。",
    "thinkingEvidence": "用计数单位与重复组解释差值，不依赖两个结果相减。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "7a495bf2e32b2dbea70d10c0c60ef144ec212c2fda10cbb9815066c89a62ed3e",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "7a495bf2e32b2dbea70d10c0c60ef144ec212c2fda10cbb9815066c89a62ed3e",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "用计数单位与重复组解释差值，不依赖两个结果相减。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-U04",
    "thinkingDomain": "arithmetic.law.distribution",
    "thinkingLabel": "倍数变化与分配结构",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-UP02-TH1",
    "unitId": "G3-UP02",
    "title": "把编号连起来会发生什么",
    "layer": "本章提升",
    "parentLessonId": "G3-UP02-B01",
    "conceptId": "representation.code-ambiguity",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "57–60",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "从读字段到检测规则是否唯一，知道编码不能只看数字串。",
    "question": "图书编号直接把“架号”和“本号”连写，不用分隔符，位数也不固定。第1架第12本写112，第11架第2本也写112。请给出两种能消除这次歧义的新规则，并分别写这两个编号。",
    "answer": "例如加分隔符：1-12、11-2；或架号和本号各固定两位：01-12、11-02（固定四位也可0112、1102）。",
    "reason": "先指出不同对象得到相同编号。；分隔符明确字段边界。；固定字段长度也明确边界；规则需在允许编号范围内统一。",
    "solutionSteps": [
      "先指出不同对象得到相同编号。",
      "分隔符明确字段边界。",
      "固定字段长度也明确边界；规则需在允许编号范围内统一。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "同一串数字可能在哪两个位置分开？每一种分法都要符合架号、本号的范围。"
      },
      {
        "level": 2,
        "text": "分隔符标出字段边界；固定两位时，不足两位补0。试着把新编码还原，看是否只剩一种解释。"
      }
    ],
    "applicability": "固定两位方案限定架号、本号不超过99；不声称它适用无限数量。",
    "thinkingEvidence": "提出可执行规则并验证两个旧冲突确实分开。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "afd43d439c792486d5537e32db6740857bc334be623b23ccd9360e279f540dcc",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "afd43d439c792486d5537e32db6740857bc334be623b23ccd9360e279f540dcc",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "提出可执行规则并验证两个旧冲突确实分开。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-UP02",
    "thinkingDomain": "representation.code-ambiguity",
    "thinkingLabel": "编码的唯一性",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-U05-TH1",
    "unitId": "G3-U05",
    "title": "直角分成两份，大的一份一定钝吗",
    "layer": "本章提升",
    "parentLessonId": "G3-U05-B03",
    "conceptId": "reasoning.counterexample",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "61–72",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "从会分类转向判断相对大小与标准分类不是一件事。",
    "question": "用一条射线把一个直角内部划成两个非零角，其中左边的角比右边大。左边的角一定是钝角吗？不用量角器，用直角纸片说明。",
    "answer": "不是；两部分都小于整个直角，所以都是锐角。",
    "reason": "两个非零角都在直角内部，各自只占整个张口的一部分。；较大的那部分虽大于另一部分，仍小于直角。；“比较大”不等于“大于直角”。",
    "solutionSteps": [
      "两个非零角都在直角内部，各自只占整个张口的一部分。",
      "较大的那部分虽大于另一部分，仍小于直角。",
      "“比较大”不等于“大于直角”。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "“比另一个角大”和“比直角大”是不同的比较。先看整个角是直角，还是一条直线形成的角。"
      },
      {
        "level": 2,
        "text": "拿直角纸片作参照。一个直角内部的小角都小于直角；一条直线上两个角的大小关系要重新分析。"
      }
    ],
    "applicability": "分割射线严格在直角内部，两个部分非零；不提前要求角度数。",
    "thinkingEvidence": "给出标准参照，分清相对比较与分类条件。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "00c44dd097e82b4b0900cd48f29c6e635b0fc331822e558121174510f1fa5e9a",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "00c44dd097e82b4b0900cd48f29c6e635b0fc331822e558121174510f1fa5e9a",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "给出标准参照，分清相对比较与分类条件。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-U05",
    "thinkingDomain": "reasoning.counterexample",
    "thinkingLabel": "用参照检验推断",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-U06-TH1",
    "unitId": "G3-U06",
    "title": "分数不同，取出的长度能相同吗",
    "layer": "本章提升",
    "parentLessonId": "G3-U06-B05",
    "conceptId": "fraction.whole-versus-quantity",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "73–91",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "从知道分母与份数，提升到比较相对比例和实际量。",
    "question": "红绳长12厘米，取它的1/2；蓝绳长18厘米，取它的1/3。取下的长度相同吗？有人说1/2大于1/3，所以红绳一定取得更长，这句话哪里缺条件？",
    "answer": "都取6厘米；不能脱离两条绳原来的整体长度比较实际取出量。",
    "reason": "红绳12÷2=6。；蓝绳18÷3=6。；1/2与1/3作为数前者较大，但对应不同整体时实际长度不由分数本身 决定。",
    "solutionSteps": [
      "红绳12÷2=6。",
      "蓝绳18÷3=6。",
      "1/2与1/3作为数前者较大，但对应不同整体时实际长度不由分数本身 决定。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "先圈出每条带子各自的整体长度。整体不同，分数较大并不能保证取出的厘米数较大。"
      },
      {
        "level": 2,
        "text": "分别用整体长度除以平均份数，得到一份的实际长度。再比较同一种单位的实际量。"
      }
    ],
    "applicability": "明确比较实际长度；不否定1/2大于1/3这一数值关系。",
    "thinkingEvidence": "同时说清分数关系与厘米结果，避免“不同整体就不能比较分数数值”的新误解。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "d548acd920776347078fbde7f626a694dbfa96ac61dd06baa60b65cfc93d1fa3",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "d548acd920776347078fbde7f626a694dbfa96ac61dd06baa60b65cfc93d1fa3",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "同时说清分数关系与厘米结果，避免“不同整体就不能比较分数数值”的新误解。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-U06",
    "thinkingDomain": "fraction.whole-versus-quantity",
    "thinkingLabel": "整体、比例与实际量",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-U07-TH1",
    "unitId": "G3-U07",
    "title": "套餐加上预算条件，乘法还够吗",
    "layer": "本章提升",
    "parentLessonId": "G3-U07-B01",
    "conceptId": "reasoning.constrained-combinations",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-upper",
      "printedPages": "92–102",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "先完整搭配再根据真实条件筛选，知道乘法给的是未筛选总数。",
    "question": "面包有4元和6元两种，饮料有3元和5元两种。各选一种组成套餐，预算最多9元。有哪些可以买的套餐？价格恰好9元能不能选？",
    "answer": "4+3=7、4+5=9、6+3=9三种；6+5=11不行，恰好9元可以。",
    "reason": "列2×2表得4种完整搭配。；逐个求总价，按不超过9筛选。；两种同为9元的套餐内容不同，仍算不同搭配。",
    "solutionSteps": [
      "列2×2表得4种完整搭配。",
      "逐个求总价，按不超过9筛选。",
      "两种同为9元的套餐内容不同，仍算不同搭配。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "先固定一种点心，再配每一种饮品。总价相同的两份套餐，也可能是不同搭配。"
      },
      {
        "level": 2,
        "text": "用两行两列表找全，再逐格和预算比较。“最多”包括恰好等于预算的情况。"
      }
    ],
    "applicability": "不同品种只有各一种选择；按内容而非价格区分套餐。",
    "thinkingEvidence": "列全后筛选，并处理包含边界与同价不同组合。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "87b3880d05602983fcabdf2edfe0af6e9882fa1d261d818b4caaf8150d954eb5",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "87b3880d05602983fcabdf2edfe0af6e9882fa1d261d818b4caaf8150d954eb5",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "列全后筛选，并处理包含边界与同价不同组合。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-U07",
    "thinkingDomain": "reasoning.constrained-combinations",
    "thinkingLabel": "组合与条件筛选",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-L01-TH1",
    "unitId": "G3-L01",
    "title": "折两次后打一个孔",
    "layer": "本章提升",
    "parentLessonId": "G3-L01-B01",
    "conceptId": "geometry.symmetry-unfold",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "1–9",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "对折的镜像对应通过两次展开层层复制，不靠猜图案。",
    "question": "一张长方形纸先沿竖直中线对折，再沿水平中线对折，形成四层。用打孔器一次穿透四层，在离所有折痕和纸边都足够远处打一个小圆孔。完全展开后有几个孔？它们有什么对称关系？",
    "answer": "4个不同小孔；关于原竖直、水平中线都成对称对应。",
    "reason": "先展开第二次折叠，得到2孔。；再展开第一次折叠，每孔各有一个对应孔，共4。；孔不在折痕上且远离边，所以不合成一个或被剪成边缘缺口。",
    "solutionSteps": [
      "先展开第二次折叠，得到2孔。",
      "再展开第一次折叠，每孔各有一个对应孔，共4。",
      "孔不在折痕上且远离边，所以不合成一个或被剪成边缘缺口。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "打孔时穿透了几层？每次展开，会出现一个对应孔。注意孔有没有碰到折痕。"
      },
      {
        "level": 2,
        "text": "从最后一次折叠开始反向展开，每次画出对称位置。远离折痕的孔不会和自己的对应孔合并。"
      }
    ],
    "applicability": "小孔远离折痕，打透全部四层；若在折痕上，本答案不可直接套用。",
    "thinkingEvidence": "按展开过程追踪孔，不只背“折两次四个”。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "62d36817c260297e4d78f86b6fe2a1e926bc9d0de154adcacca1df386b307f63",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "62d36817c260297e4d78f86b6fe2a1e926bc9d0de154adcacca1df386b307f63",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "按展开过程追踪孔，不只背“折两次四个”。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-L01",
    "thinkingDomain": "geometry.symmetry-unfold",
    "thinkingLabel": "展开与对称",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-L02-TH1",
    "unitId": "G3-L02",
    "title": "有余数时，总数不只有一个答案",
    "layer": "本章提升",
    "parentLessonId": "G3-L02-B03",
    "conceptId": "reasoning.remainder-range",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "10–38",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "除法余数关系用于逆推所有可能总量，而非只做正向除法。",
    "question": "珠子每6颗装一满袋，最后余4颗。满袋至少3袋、最多5袋。珠子总数有哪些可能？要求找全，并说明为什么没有25颗。",
    "answer": "22、28、34颗；25除以6余1，不满足余4。",
    "reason": "满袋数只能3、4、5。；依次用袋数×6+4，得22、28、34。；其他总数不满足袋数范围或余数条件。",
    "solutionSteps": [
      "满袋数只能3、4、5。",
      "依次用袋数×6+4，得22、28、34。",
      "其他总数不满足袋数范围或余数条件。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "总数由满袋数×每袋颗数，再加余数组成。余数必须比每袋颗数小。"
      },
      {
        "level": 2,
        "text": "按允许的满袋数逐个列，不要只试一个数。检验数除以每袋颗数，商和余数都要符合条件。"
      }
    ],
    "applicability": "“至少3、最多5”均含边界，余4是颗数而非袋数。",
    "thinkingEvidence": "按商的范围列全，并代回检验余数。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "1a7260ecadf25bd49c8a90681c5c85c3a06694e07142fb4166999bd6ef8a1e6d",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "1a7260ecadf25bd49c8a90681c5c85c3a06694e07142fb4166999bd6ef8a1e6d",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "按商的范围列全，并代回检验余数。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-L02",
    "thinkingDomain": "reasoning.remainder-range",
    "thinkingLabel": "商的范围与余数",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-L03-TH1",
    "unitId": "G3-L03",
    "title": "同一根绳能围成几种长方形",
    "layer": "本章提升",
    "parentLessonId": "G3-L03-B02",
    "conceptId": "reasoning.fixed-sum-enumeration",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "39–51",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "周长固定转为长宽和固定，用有序枚举保证不重复。",
    "question": "用24厘米绳围成长方形，不计接头，边长都是正整数厘米，允许正方形。旋转后相同的图形只算一种。有哪些长和宽？怎样知道列全了？",
    "answer": "11和1、10和2、9和3、8和4、7和5、6和6，共6种。",
    "reason": "长加宽为24÷2=12。；从较短边1开始依次增加到6，另边为12减它。；短边超过6会把已有长宽交换，只是旋转重复。",
    "solutionSteps": [
      "长加宽为24÷2=12。",
      "从较短边1开始依次增加到6，另边为12减它。",
      "短边超过6会把已有长宽交换，只是旋转重复。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "周长的一半，是长加宽。不是每条边的长度。"
      },
      {
        "level": 2,
        "text": "把较短边从1开始逐个增加，另一条边相应减少。超过长宽相等后，只会重复交换方向的图形。"
      }
    ],
    "applicability": "只列正整数边长，允许正方形；若允许任意小数则不止6种。",
    "thinkingEvidence": "说清有限范围与去重规则，不把不完整列举说成所有。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "dfc7fc0024fb341c477cbd0ee4a2fbdf7760f09b2e3e0b9c4d82b413261b458f",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "dfc7fc0024fb341c477cbd0ee4a2fbdf7760f09b2e3e0b9c4d82b413261b458f",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "说清有限范围与去重规则，不把不完整列举说成所有。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-L03",
    "thinkingDomain": "reasoning.fixed-sum-enumeration",
    "thinkingLabel": "固定和与枚举",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-L04-TH1",
    "unitId": "G3-L04",
    "title": "沿对角线剪开，面积怎么办",
    "layer": "本章提升",
    "parentLessonId": "G3-L04-B02",
    "conceptId": "geometry.equal-area-decomposition",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "52–64",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "已经会长方形面积，用旋转重合与完整覆盖解释一半，不提前死记三角形公式。",
    "question": "长6厘米、宽4厘米的长方形纸，沿一条对角线剪成两块。两块能重合吗？每块面积多少？请用剪拼或转动解释，不直接背三角形面积公式。",
    "answer": "两块可以转动后重合，每块12平方厘米。",
    "reason": "长方形总面积6×4=24。；沿对角线分成的两块，转动其中一块可与另一块重合。；两块无重叠恰好组成原纸，所以等分24，各12。",
    "solutionSteps": [
      "长方形总面积6×4=24。",
      "沿对角线分成的两块，转动其中一块可与另一块重合。",
      "两块无重叠恰好组成原纸，所以等分24，各12。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "两块是否一样大，要看它们能否转动后完全重合，不是看哪块朝上。"
      },
      {
        "level": 2,
        "text": "把两块拼回原长方形，检查没有空隙和重叠。先算整个长方形，再按相等的两部分分。"
      }
    ],
    "applicability": "必须沿长方形对角线；任意一刀不一定等面积。",
    "thinkingEvidence": "先有等分依据再除2，不把“剪两块”直接当“平均分”。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "8c33bc97e612b50df39a48221b97dcf37798da95b59e1099440955b49e42cb07",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "8c33bc97e612b50df39a48221b97dcf37798da95b59e1099440955b49e42cb07",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "先有等分依据再除2，不把“剪两块”直接当“平均分”。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "diagram": {
      "path": "content/course-plan-v2/figures/g3-l04-th1.svg",
      "alt": "长6厘米、宽4厘米的长方形，从左下到右上画一条对角线，拟沿线剪开。",
      "display": "question",
      "kind": "authored-svg",
      "interactionSpec": "先显示静态条件图；允许圈画、标接头或写份数。提示层才显示重复次数/分解；不能把答案作为初始标注。",
      "fallback": "长6厘米、宽4厘米的长方形，从左下到右上画一条对角线，拟沿线剪开。",
      "status": "static_asset_ready_interaction_not_implemented"
    },
    "originUnit": "G3-L04",
    "thinkingDomain": "geometry.equal-area-decomposition",
    "thinkingLabel": "剪拼与面积守恒",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-L05-TH1",
    "unitId": "G3-L05",
    "title": "统计表空着的格子怎样补",
    "layer": "本章提升",
    "parentLessonId": "G3-L05-B01",
    "conceptId": "reasoning.table-constraints",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "65–76",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "统计不只读最大数，也要用行总数与已知量找缺项、交叉核对。",
    "question": "甲组8人、乙组10人，每人只选苹果或香蕉一种。甲选苹果3人，乙选苹果4人。两组各有多少人选香蕉？合起来香蕉是否比苹果多，多几人？请画表核对总人数。",
    "answer": "甲香蕉5人，乙香蕉6人；香蕉11、苹果7，香蕉多4人，总18人。",
    "reason": "每行用组人数减选苹果人数，得到5与6。；按列合计苹果7、香蕉11。；两列7+11=18与两组8+10=18一致，再求差4。",
    "solutionSteps": [
      "每行用组人数减选苹果人数，得到5与6。",
      "按列合计苹果7、香蕉11。",
      "两列7+11=18与两组8+10=18一致，再求差4。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "每一队的总人数由苹果和香蕉两类组成。一人只选一种，不能多算或漏算。"
      },
      {
        "level": 2,
        "text": "先按队求另一类人数，再按水果合并。行总数和列总数应相同；比较两类要减去的是哪两个数？"
      }
    ],
    "applicability": "两个选项覆盖全部人且互斥；允许多选时不能直接用减法补空格。",
    "thinkingEvidence": "利用行列约束推理，并主动查统计口径。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "2b008cfd73f52976f5c29e4e778ea971d53b8ee9e18be9d9f284dd90331ca0ee",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "2b008cfd73f52976f5c29e4e778ea971d53b8ee9e18be9d9f284dd90331ca0ee",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "利用行列约束推理，并主动查统计口径。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-L05",
    "thinkingDomain": "reasoning.table-constraints",
    "thinkingLabel": "统计表约束",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-LP01-TH1",
    "unitId": "G3-LP01",
    "title": "哪些星期会多出现一次",
    "layer": "本章提升",
    "parentLessonId": "G3-LP01-E01",
    "conceptId": "reasoning.period-remainder",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "77–85",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "7天周期进一步拆成完整周和余天，解释月历中数量差异。",
    "question": "某月有31天，1日是星期四。这个月哪些星期各出现5次，哪些各出现4次？不要逐个日期数31遍，说明完整周和余天怎样分。",
    "answer": "星期四、五、六各5次；星期日、一、二、三各4次。",
    "reason": "前28天是4个完整周，每个星期4次。；29、30、31日分别星期四、五、六。；余下3天给这三种星期各增加1次。",
    "solutionSteps": [
      "前28天是4个完整周，每个星期4次。",
      "29、30、31日分别星期四、五、六。",
      "余下3天给这三种星期各增加1次。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "完整的7天会让每个星期都出现一次。先把这个月分成完整周和剩余天。"
      },
      {
        "level": 2,
        "text": "剩余天从1日对应的星期开始依次排列，不是默认从星期一开始。验算七种星期的次数之和。"
      }
    ],
    "applicability": "月份恰有31天且1日周四；30天或起始星期不同需重排余天。",
    "thinkingEvidence": "用周期与余数解释所有星期次数，而不是只算某一天。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "2dfd0d8a88039a82049d9d1f0cebb530d7c56b36d085973a1c7fc6763fefabf3",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "2dfd0d8a88039a82049d9d1f0cebb530d7c56b36d085973a1c7fc6763fefabf3",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "用周期与余数解释所有星期次数，而不是只算某一天。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-LP01",
    "thinkingDomain": "reasoning.period-remainder",
    "thinkingLabel": "周期与余数",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-L06-TH1",
    "unitId": "G3-L06",
    "title": "正好花完4元，有不止一种买法",
    "layer": "本章提升",
    "parentLessonId": "G3-L06-B03",
    "conceptId": "reasoning.decimal-combinations",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "86–94",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "小数加减用于有限搭配与多解核对，不以同价误合并不同方案。",
    "question": "四种文具价格分别1.2元、1.8元、2.2元、2.8元。只能买两种不同文具，每种1件，正好花4元。所有买法是什么？先买哪件不影响组合。",
    "answer": "1.2元与2.8元；1.8元与2.2元，两种。",
    "reason": "先固定1.2，余款2.8正好有。；固定1.8，余款2.2正好有。；以后得到的是已有组合的反向，不重复算。",
    "solutionSteps": [
      "先固定1.2，余款2.8正好有。",
      "固定1.8，余款2.2正好有。",
      "以后得到的是已有组合的反向，不重复算。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "把价格都换成角，避免小数点影响列举。先固定第一件，再找它的互补价格。"
      },
      {
        "level": 2,
        "text": "两种不同礼物只能各买一件。把“甲+乙”和“乙+甲”合并，再检查总价是否恰好达到预算。"
      }
    ],
    "applicability": "必须两种不同文具且各一件；允许重复买同种时要另查条件。",
    "thinkingEvidence": "有序枚举、去重，准确处理一位小数。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "2cc8413bbb7bfaa07428fccca668ff603a470f60b69bdcdf05700ae3be2d089b",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "2cc8413bbb7bfaa07428fccca668ff603a470f60b69bdcdf05700ae3be2d089b",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "有序枚举、去重，准确处理一位小数。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-L06",
    "thinkingDomain": "reasoning.decimal-combinations",
    "thinkingLabel": "小数金额与不重复组合",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  },
  {
    "id": "G3-L07-TH1",
    "unitId": "G3-L07",
    "title": "两种都没选的人也要放进图里",
    "layer": "本章提升",
    "parentLessonId": "G3-L07-B01",
    "conceptId": "reasoning.inclusion-exclusion",
    "phase": "optional-thinking",
    "minutes": "8–12（可分次）",
    "source": {
      "sourceId": "G3-lower",
      "printedPages": "95–104",
      "kind": "original-extension",
      "note": "教材单元为知识锚点；本题原创。现已收到暑假专项，关联对照见summer-20days索引。"
    },
    "bridgeFromCore": "重叠问题加入圈外人数，先明确研究全班还是并集，避免把20直接当两类合计。",
    "question": "全班20人，喜欢游泳12人，喜欢画画10人，其中4人两种都不喜欢。两种都喜欢的有几人？只喜欢游泳、只喜欢画画分别几人？用四个互不重叠部分验回20。",
    "answer": "都喜欢6人；只游泳6人，只画画4人；都不喜欢4人。",
    "reason": "至少喜欢一种20−4=16人。；12+10把共同者多计一次，所以共同22−16=6。；只游泳12−6=6，只画画10−6=4；6+6+4+4=20。",
    "solutionSteps": [
      "至少喜欢一种20−4=16人。",
      "12+10把共同者多计一次，所以共同22−16=6。",
      "只游泳12−6=6，只画画10−6=4；6+6+4+4=20。"
    ],
    "hints": [
      {
        "level": 1,
        "text": "先减去两种都不喜欢的人，得到至少喜欢一种的人。两类人数相加，谁被数了两遍？"
      },
      {
        "level": 2,
        "text": "把人分成只喜欢左类、两类都喜欢、只喜欢右类、两类都不喜欢四区。每区互不重叠，合计应回到总人数。"
      }
    ],
    "applicability": "人数均指全班20人中的同一调查；两类可重叠，圈外也须计入全班。",
    "thinkingEvidence": "区分全体与并集，完成四区交叉验算。",
    "scoring": "adult_review",
    "entryRule": "完成相关基础后可选；方法工具箱引用本taskId，不复制题目/分数；不影响教材基础通关。",
    "selectionRule": "每次至多1题；先预测或尝试，再按需逐级提示；看过提示记帮助，完整解答后原题仅订正。",
    "audit": {
      "status": "auto_checked",
      "date": "2026-09-25",
      "checks": [
        "required_fields",
        "stable_id",
        "self_contained_prompt_screen",
        "answer_reason_present"
      ],
      "contentDigest": "b89f0646b46d42b23d9e9d63b35e662f635fc003111882291efa0541ab37ab51",
      "meaning": "仅自动结构筛查；不是数学语义全证明或人工确认。"
    },
    "editorReview": {
      "reviewerType": "AI",
      "status": "reviewed",
      "date": "2026-09-24",
      "contentDigest": "b89f0646b46d42b23d9e9d63b35e662f635fc003111882291efa0541ab37ab51",
      "scope": [
        "题意与所求量",
        "答案及理由",
        "基本边界与先修",
        "是否可独立抽题"
      ],
      "limitation": "AI教研复核仍可能遗漏；开放题参考示例不是所有可行答案集合。未发生具名教师审核或Kevin试学。"
    },
    "qualityContract": {
      "mustExplain": "区分全体与并集，完成四区交叉验算。",
      "avoid": "不能仅增大数字或多算几步就标成提升；不额外选择单位，不用奖励速度代替思路。",
      "answerUI": "单位由题干与输入框固定；等值单位表达可接受。图、题干同时显示，答案与关键分解另层按需显示。"
    },
    "originUnit": "G3-L07",
    "thinkingDomain": "reasoning.inclusion-exclusion",
    "thinkingLabel": "集合重叠与容斥",
    "classification": "本章直接提升",
    "releaseBucket": "direct",
    "publicationStatus": "guided-study",
    "releaseReason": "本章首张迁移卡已逐题整理；解释由家长核对。",
    "recommended": true,
    "contentVersion": "thinking.2026-10-08.1"
  }
];
