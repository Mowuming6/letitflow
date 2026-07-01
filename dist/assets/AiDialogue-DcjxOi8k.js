import{_ as P,p as L,k as V,o as d,c as v,a as s,b as a,j as m,F as K,i as F,x as R,t as h,m as G,v as z,q as J,r as f,B as q,f as I,s as g}from"./index-BHeTXjc-.js";function Q(t,l,n){const y=l?`求问之事："${l}"`:"求问当前近况/综合运势";let o="";return t==="qian"?o=`【观音灵签结果】
签位：${n.title}
签诗：${n.poem}
诗意：${n.shiyi}
解曰：${n.jieyue}
本签精髓：${n.essence}
当前所选板块解说（${n.activeTabLabel}）：${n.tabContent}`:t==="liuyao"||t==="plum"?(o=`【${t==="liuyao"?"六爻金钱卦":"梅花易数"}结果】
本卦：${n.title}
卦辞/诗：${n.poem}
卦释义：${n.jiyi}`,n.hasChanging&&(o+=`
变卦：${n.changedTitle}
变卦诗文：${n.changedPoem}
变卦释义：${n.changedJiyi}`)):t==="tarot"?o=`【塔罗牌阵结果】
${n.map((i,c)=>`第${c+1}张牌：${i.name} (${i.orientation}) - 牌意关键字：${i.meaning}`).join(`
`)}`:t==="lenormand"?o=`【雷诺曼占卜结果】
${n.map((i,c)=>`第${c+1}张牌：${i.name} - 核心含义：${i.meaning}，修饰含义：${i.extended}`).join(`
`)}`:t==="dice"&&(o=`【骰子结果】
投出点数：${n.diceNum} 点
命运启示：${n.resultOption||n.diceAdvice}`),`请针对以下卦象/牌阵和求问，为我做一次深度的AI解读：
${y}
${o}`}const U={qian:t=>`✨ **观音大士垂慈，妙解玄机。**
你求问的「${t||"近况与综合运势"}」，此签妙在得“守得云开见月明”之象。
签诗中透露，你当下或许正面临某种两难的抉择或是暂时的停滞。莫要急躁，这正是“静心积蓄力量”的最佳契机。
本签精髓在于**「行止有度，顺应天时」**。在事业或求财方面，近期切忌盲目扩张，守住主业即是最大的赚取；感情上，若有波折，多用宽容与柔和去化解。静候一月，转机自然浮现。`,liuyao:t=>`☯️ **易理无常，乾坤既定。**
针对你所求的「${t||"综合卦象"}」，卦象预示着事情正处于**「阳极生阴，动而有变」**的微妙节点。
本卦代表大方向的根基稳固，但在细节执行中，动爻的产生说明外部环境或你的内心心态已经开始悄然转变。
变卦提示：**「柔顺利贞」**。此时不宜强出头，面对职场或人际关系，宜采取“合作共赢”和“顺水推舟”的策略。急于求成只会增加阻力，持之以恒、保持正念，终能逢凶化吉。`,plum:t=>`🌸 **易数心传，心动卦成。**
数字起卦，体用互参。针对「${t||"心中所问"}」：
此卦中**「体卦」**（代表你）力量充沛，说明你自身具备解决当前问题的全部资本与才华；**「用卦」**（代表所问之事）虽有克制，但通过变卦的调和，已经将冲突化为无形。
这代表你目前遇到的困难，实际上是一个包装成问题的**「机遇」**。只要你能跳出原有的思维框架，用全新的眼光审视，在未来两周内即可迎来豁然开朗的局面。`,tarot:t=>`🃏 **星辰指引，命运之轮悄然转动。**
在你求问的「${t||"人生课题"}」牌阵中：
过去、现在与未来的能量链条非常清晰。
你过去种下的因（或许是某种勇敢的冒险），在现在正呈现出一种沉淀与反思的张力。你可能感到些许压力，甚至在怀疑自己的决定。
但请注意，未来的指引牌代表着**「希望、疗愈与指引」**。这意味着当前的迷茫只是暂时的迷雾，你的内在直觉正在复苏，跟随那颗指引你的星，你会找到属于你的答案。`,lenormand:t=>`🎴 **雷诺曼法，直白显象。**
针对你求问的「${t||"具体事态"}」：
雷诺曼的意象非常落地，牌组组合明确指出：一件你等待已久的“消息”或“转机”，即将在近期经由某位关键人传递给你。
这里的牌面预示着**「稳步推进，收获在即」**。不要忽视生活中的小细节和社交场合中的偶遇，它们可能是开启你下一步幸运的钥匙。保持积极的社交频率，贵人就在你身边。`,dice:t=>`🎲 **六面玲珑，有求必应。**
你心中求问：「${t||"综合抉择"}」：
此次掷骰投出了点数。
骰子之神在告诉你：**「心存正念，行止有方」**。点数背后透露出的能量是极其平衡且富含张力的。
如果你在纠结两个选择，当前的倾向暗示着你应该抛开不必要的焦虑。大胆地迈出第一步。宇宙会将最合拍的资源吸引到你身边。专注当下的执行，结果一定会超出预期！`},E=["这是一个非常有慧根的提问。从卦象/牌阵的深层能量来看，你提到的这个细节正是问题的核心。我建议你...","命理并非一成不变，而是随着你当下的起心动念而在改变。关于你问的这个问题，其实潜意识已经在提示你：多关注内在的感受，而不是外界的杂音。","问得好！如果将刚刚占卜的结果与你现在的提问放在一起看，你会发现其实你正处于“蓄势待发”的状态。当下的阻碍其实是在帮你筛选不合拍的人或事。","结合前几次占卜的因果链条来看，这次的启示其实是上次占卜结果的延伸。宇宙/神明并不是让你立刻做出惊天动地的改变，而是让你先学会放手和接纳。","从玄学五行/精神维度的流转来看，你现在的纠结正是打破旧有模式的阵痛。如果你能尝试换一个视角（比如站在对方的角度，或者拉长到三年后的时间线），你会发现当下的纠结其实非常微不足道。"],W={key:0,class:"ai-trigger-panel"},X={key:0,class:"ai-prominent-row fade-in"},Y={key:1,class:"ai-chat-panel fade-in"},Z={class:"ai-panel-header"},D={class:"ai-header-title"},ee=["src"],se={class:"message-row ai"},te={class:"avatar-wrap"},ne=["src"],ae={key:0,class:"avatar-wrap"},ie=["src"],oe=["innerHTML"],le={class:"msg-time"},re={key:1,class:"avatar-wrap user-avatar"},ue={key:0,class:"message-row ai"},de={class:"avatar-wrap"},ve=["src"],ce={class:"bubble ai-bubble"},pe=["innerHTML"],me={key:1,class:"message-row ai"},be={class:"avatar-wrap"},fe=["src"],ge={key:0,class:"ai-inline-interpret-banner fade-in"},ye=["disabled"],$e={class:"ai-input-bar"},ke=["disabled"],Ae=["disabled"],Te={key:2,class:"ai-collapse-row fade-in"},Ie={__name:"AiDialogue",props:{pageType:{type:String,required:!0},question:{type:String,default:""},resultData:{type:[Object,Array],required:!0},hasResult:{type:Boolean,default:!1}},setup(t){const l=t,n=f(null),y=f(null),o=f(!1),p=f(""),i=f(!1),c=f(!1),A=f(""),$=I(()=>`/images/themes/${g.themeKey}/LOGO.png`),k=r=>{r.target.src="/images/LOGO.png"},S=I(()=>l.question?l.question.trim().charAt(0):"问"),H=I(()=>g.aiMessages||[]),T=f(!1);function w(r){return r?r.replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/✨/g,"✨").replace(/☯️/g,"☯️").replace(/🌸/g,"🌸").replace(/🃏/g,"🃏").replace(/🎴/g,"🎴"):""}function b(){q(()=>{y.value&&(y.value.scrollTop=y.value.scrollHeight)})}function C(){q(()=>{setTimeout(()=>{n.value&&n.value.scrollIntoView({behavior:"smooth",block:"start"})},150)})}function N(){o.value=!1}function O(){confirm("确定要清空与 AI 占卜师的所有对话历史吗？")&&g.clearAiHistory()}function j(){o.value=!0,C(),b()}function M(){o.value=!0,i.value=!0,T.value=!0,C(),b();const r=Q(l.pageType,l.question,l.resultData);console.log("Constructed Prompt for AI:",r);const e=U[l.pageType](l.question);setTimeout(()=>{i.value=!1,x(e,()=>{g.addAiMessage("ai",e,l.pageType,!0),b()})},1200)}function x(r,e){c.value=!0,A.value="";let u=0;const B=setInterval(()=>{u<r.length?(A.value+=r.charAt(u),u++,b()):(clearInterval(B),c.value=!1,A.value="",e&&e())},25)}function _(){if(!p.value.trim()||c.value||i.value)return;const r=p.value.trim();p.value="",g.addAiMessage("user",r,l.pageType),b(),i.value=!0,setTimeout(()=>{i.value=!1;const e=E[Math.floor(Math.random()*E.length)];x(e,()=>{g.addAiMessage("ai",e,l.pageType),b()})},1e3)}return L(()=>g.aiMessages.length,()=>{b()}),L(()=>l.hasResult,(r,e)=>{e===!0&&r===!1&&(o.value=!1,T.value=!1)}),V(()=>{o.value=!1,b()}),(r,e)=>(d(),v("div",{class:"ai-wrapper",ref_key:"aiSectionRef",ref:n},[o.value?m("",!0):(d(),v("div",W,[t.hasResult&&!T.value?(d(),v("div",X,[s("button",{class:"ai-action-btn btn-interpret",onClick:M},[...e[1]||(e[1]=[s("span",{class:"btn-icon"},"✨",-1),a(` AI 智能解读
        `,-1)])])])):m("",!0),e[2]||(e[2]=a()),s("div",{class:"ai-subtle-row fade-in"},[s("button",{class:"ai-subtle-expand-btn",onClick:j},`
          ▼ 展开 AI 对话
        `)])])),e[25]||(e[25]=a()),o.value?(d(),v("div",Y,[s("div",Z,[s("div",D,[s("img",{class:"ai-avatar-icon animate-spin-slow",src:$.value,onError:k},null,40,ee),e[3]||(e[3]=a()),e[4]||(e[4]=s("span",{class:"ai-header-name"},"AI 解读助手",-1))]),e[5]||(e[5]=a()),s("div",{class:"ai-header-actions"},[s("button",{class:"ai-clear-btn",onClick:O,title:"清空对话历史"},"🧹 清空历史")])]),e[22]||(e[22]=a()),s("div",{class:"ai-message-list",ref_key:"messageListRef",ref:y},[s("div",se,[s("div",te,[s("img",{class:"avatar",src:$.value,onError:k},null,40,ne)]),e[6]||(e[6]=a()),e[7]||(e[7]=s("div",{class:"bubble ai-bubble"},`
            你好，我是你的专属 AI 占卜助手。我已经感知到了你当下的起心动念。你可以点击上方按钮让我为你进行深度解读，或者直接在此处向我提问。
          `,-1))]),e[16]||(e[16]=a()),(d(!0),v(K,null,F(H.value,u=>(d(),v("div",{key:u.id,class:R(["message-row",u.sender])},[u.sender==="ai"?(d(),v("div",ae,[s("img",{class:"avatar",src:$.value,onError:k},null,40,ie)])):m("",!0),e[9]||(e[9]=a()),s("div",{class:R(["bubble",u.sender==="ai"?"ai-bubble":"user-bubble"])},[s("div",{class:"msg-content",innerHTML:w(u.text)},null,8,oe),e[8]||(e[8]=a()),s("div",le,h(u.timeStr.split(" ")[1]||u.timeStr),1)],2),e[10]||(e[10]=a()),u.sender==="user"?(d(),v("div",re,h(S.value),1)):m("",!0)],2))),128)),e[17]||(e[17]=a()),c.value?(d(),v("div",ue,[s("div",de,[s("img",{class:"avatar",src:$.value,onError:k},null,40,ve)]),e[13]||(e[13]=a()),s("div",ce,[s("div",{class:"msg-content",innerHTML:w(A.value)},null,8,pe),e[11]||(e[11]=a()),e[12]||(e[12]=s("span",{class:"cursor-blink"},"|",-1))])])):m("",!0),e[18]||(e[18]=a()),i.value?(d(),v("div",me,[s("div",be,[s("img",{class:"avatar",src:$.value,onError:k},null,40,fe)]),e[14]||(e[14]=a()),e[15]||(e[15]=s("div",{class:"bubble ai-bubble loading-bubble"},[s("div",{class:"dot-flashing"})],-1))])):m("",!0)],512),e[23]||(e[23]=a()),t.hasResult&&!T.value?(d(),v("div",ge,[e[19]||(e[19]=s("span",{class:"ai-banner-text"},"🔮 已求得新结果，需要进行深度解读吗？",-1)),e[20]||(e[20]=a()),s("button",{class:"mini-interpret-btn",onClick:M,disabled:i.value||c.value},`
          ✨ 智能解读
        `,8,ye)])):m("",!0),e[24]||(e[24]=a()),s("div",$e,[G(s("input",{class:"ai-input","onUpdate:modelValue":e[0]||(e[0]=u=>p.value=u),placeholder:"追问AI占卜师...（如：有什么需要注意的吗？）",onKeyup:J(_,["enter"]),disabled:c.value||i.value},null,40,ke),[[z,p.value]]),e[21]||(e[21]=a()),s("button",{class:"ai-send-btn",onClick:_,disabled:!p.value.trim()||c.value||i.value},`
          发送
        `,8,Ae)])])):m("",!0),e[26]||(e[26]=a()),o.value?(d(),v("div",Te,[s("button",{class:"ai-collapse-btn",onClick:N},`
        ▲ 收起 AI 对话
      `)])):m("",!0)],512))}},Me=P(Ie,[["__scopeId","data-v-652da61b"]]);export{Me as A};
