/**
 * AI 占卜助手 - 提示词与模拟回复配置
 * 你可以在此文件最上方自由修改 AI 角色设定 (DEFAULT_SYSTEM_PROMPT)
 */

export const DEFAULT_SYSTEM_PROMPT = `你是一位通晓古今中外玄学命理的AI占卜大师。你精通观音灵签、六爻金钱卦、梅花易数、塔罗牌和雷诺曼牌。
当用户向你提问并给出了占卜结果时，你需要结合占卜结果，运用专业的玄学知识（阴阳五行、卦象、牌意等），以温和、智慧、客观、带有神秘感且富有同理心的语气，为用户提供有深度且切中要害的解读。
记住，要始终将之前的对话历史作为上下文参考，让用户感觉到这是一次连续的灵性交流。`;

/**
 * 格式化不同占卜结果为 AI 解读提示词
 */
export function buildInterpretationPrompt(pageType, question, resultData) {
  const qText = question ? `求问之事："${question}"` : '求问当前近况/综合运势';

  let resultText = '';
  if (pageType === 'qian') {
    resultText = `【观音灵签结果】
签位：${resultData.title}
签诗：${resultData.poem}
诗意：${resultData.shiyi}
解曰：${resultData.jieyue}
本签精髓：${resultData.essence}
当前所选板块解说（${resultData.activeTabLabel}）：${resultData.tabContent}`;
  } else if (pageType === 'liuyao' || pageType === 'plum') {
    const typeName = pageType === 'liuyao' ? '六爻金钱卦' : '梅花易数';
    resultText = `【${typeName}结果】
本卦：${resultData.title}
卦辞/诗：${resultData.poem}
卦释义：${resultData.jiyi}`;
    if (resultData.hasChanging) {
      resultText += `\n变卦：${resultData.changedTitle}\n变卦诗文：${resultData.changedPoem}\n变卦释义：${resultData.changedJiyi}`;
    }
  } else if (pageType === 'tarot') {
    const cards = resultData.map((c, i) => `第${i+1}张牌：${c.name} (${c.orientation}) - 牌意关键字：${c.meaning}`).join('\n');
    resultText = `【塔罗牌阵结果】\n${cards}`;
  } else if (pageType === 'lenormand') {
    const cards = resultData.map((c, i) => `第${i+1}张牌：${c.name} - 核心含义：${c.meaning}，修饰含义：${c.extended}`).join('\n');
    resultText = `【雷诺曼占卜结果】\n${cards}`;
  } else if (pageType === 'dice') {
    resultText = `【骰子结果】
投出点数：${resultData.diceNum} 点
命运启示：${resultData.resultOption || resultData.diceAdvice}`;
  }

  return `请针对以下卦象/牌阵和求问，为我做一次深度的AI解读：
${qText}
${resultText}`;
}

/**
 * 高质量模拟 AI 解读回复数据
 */
export const MOCK_INTERPRETATIONS = {
  qian: (question) => `✨ **观音大士垂慈，妙解玄机。**
你求问的「${question || '近况与综合运势'}」，此签妙在得“守得云开见月明”之象。
签诗中透露，你当下或许正面临某种两难的抉择或是暂时的停滞。莫要急躁，这正是“静心积蓄力量”的最佳契机。
本签精髓在于**「行止有度，顺应天时」**。在事业或求财方面，近期切忌盲目扩张，守住主业即是最大的赚取；感情上，若有波折，多用宽容与柔和去化解。静候一月，转机自然浮现。`,

  liuyao: (question) => `☯️ **易理无常，乾坤既定。**
针对你所求的「${question || '综合卦象'}」，卦象预示着事情正处于**「阳极生阴，动而有变」**的微妙节点。
本卦代表大方向的根基稳固，但在细节执行中，动爻的产生说明外部环境或你的内心心态已经开始悄然转变。
变卦提示：**「柔顺利贞」**。此时不宜强出头，面对职场或人际关系，宜采取“合作共赢”和“顺水推舟”的策略。急于求成只会增加阻力，持之以恒、保持正念，终能逢凶化吉。`,

  plum: (question) => `🌸 **易数心传，心动卦成。**
数字起卦，体用互参。针对「${question || '心中所问'}」：
此卦中**「体卦」**（代表你）力量充沛，说明你自身具备解决当前问题的全部资本与才华；**「用卦」**（代表所问之事）虽有克制，但通过变卦的调和，已经将冲突化为无形。
这代表你目前遇到的困难，实际上是一个包装成问题的**「机遇」**。只要你能跳出原有的思维框架，用全新的眼光审视，在未来两周内即可迎来豁然开朗的局面。`,

  tarot: (question) => `🃏 **星辰指引，命运之轮悄然转动。**
在你求问的「${question || '人生课题'}」牌阵中：
过去、现在与未来的能量链条非常清晰。
你过去种下的因（或许是某种勇敢的冒险），在现在正呈现出一种沉淀与反思的张力。你可能感到些许压力，甚至在怀疑自己的决定。
但请注意，未来的指引牌代表着**「希望、疗愈与指引」**。这意味着当前的迷茫只是暂时的迷雾，你的内在直觉正在复苏，跟随那颗指引你的星，你会找到属于你的答案。`,

  lenormand: (question) => `🎴 **雷诺曼法，直白显象。**
针对你求问的「${question || '具体事态'}」：
雷诺曼的意象非常落地，牌组组合明确指出：一件你等待已久的“消息”或“转机”，即将在近期经由某位关键人传递给你。
这里的牌面预示着**「稳步推进，收获在即」**。不要忽视生活中的小细节和社交场合中的偶遇，它们可能是开启你下一步幸运的钥匙。保持积极的社交频率，贵人就在你身边。`,

  dice: (question) => `🎲 **六面玲珑，有求必应。**
你心中求问：「${question || '综合抉择'}」：
此次掷骰投出了点数。
骰子之神在告诉你：**「心存正念，行止有方」**。点数背后透露出的能量是极其平衡且富含张力的。
如果你在纠结两个选择，当前的倾向暗示着你应该抛开不必要的焦虑。大胆地迈出第一步。宇宙会将最合拍的资源吸引到你身边。专注当下的执行，结果一定会超出预期！`
};

/**
 * 随机的高质量 AI 追问回复模拟（用户后续提问时的逼真回复）
 */
export const MOCK_CHAT_REPLIES = [
  `这是一个非常有慧根的提问。从卦象/牌阵的深层能量来看，你提到的这个细节正是问题的核心。我建议你...`,
  `命理并非一成不变，而是随着你当下的起心动念而在改变。关于你问的这个问题，其实潜意识已经在提示你：多关注内在的感受，而不是外界的杂音。`,
  `问得好！如果将刚刚占卜的结果与你现在的提问放在一起看，你会发现其实你正处于“蓄势待发”的状态。当下的阻碍其实是在帮你筛选不合拍的人或事。`,
  `结合前几次占卜的因果链条来看，这次的启示其实是上次占卜结果的延伸。宇宙/神明并不是让你立刻做出惊天动地的改变，而是让你先学会放手和接纳。`,
  `从玄学五行/精神维度的流转来看，你现在的纠结正是打破旧有模式的阵痛。如果你能尝试换一个视角（比如站在对方的角度，或者拉长到三年后的时间线），你会发现当下的纠结其实非常微不足道。`
];
