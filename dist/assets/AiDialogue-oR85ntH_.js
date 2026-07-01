import{_ as j,p as P,k as V,o as c,c as p,a as s,b as n,j as y,F as B,i as K,x,t as L,m as F,v as G,q as z,f as I,r as b,B as S,s as g}from"./index-Dd-B0XWT.js";function J(a,r,t){const f=r?`求问之事："${r}"`:"求问当前近况/综合运势";let u="";return a==="qian"?u=`【观音灵签结果】
签位：${t.title}
签诗：${t.poem}
诗意：${t.shiyi}
解曰：${t.jieyue}
本签精髓：${t.essence}
当前所选板块解说（${t.activeTabLabel}）：${t.tabContent}`:a==="liuyao"||a==="plum"?(u=`【${a==="liuyao"?"六爻金钱卦":"梅花易数"}结果】
本卦：${t.title}
卦辞/诗：${t.poem}
卦释义：${t.jiyi}`,t.hasChanging&&(u+=`
变卦：${t.changedTitle}
变卦诗文：${t.changedPoem}
变卦释义：${t.changedJiyi}`)):a==="tarot"?u=`【塔罗牌阵结果】
${t.map((i,d)=>`第${d+1}张牌：${i.name} (${i.orientation}) - 牌意关键字：${i.meaning}`).join(`
`)}`:a==="lenormand"&&(u=`【雷诺曼占卜结果】
${t.map((i,d)=>`第${d+1}张牌：${i.name} - 核心含义：${i.meaning}，修饰含义：${i.extended}`).join(`
`)}`),`请针对以下卦象/牌阵和求问，为我做一次深度的AI解读：
${f}
${u}`}const Q={qian:a=>`✨ **观音大士垂慈，妙解玄机。**
你求问的「${a||"近况与综合运势"}」，此签妙在得“守得云开见月明”之象。
签诗中透露，你当下或许正面临某种两难的抉择或是暂时的停滞。莫要急躁，这正是“静心积蓄力量”的最佳契机。
本签精髓在于**「行止有度，顺应天时」**。在事业或求财方面，近期切忌盲目扩张，守住主业即是最大的赚取；感情上，若有波折，多用宽容与柔和去化解。静候一月，转机自然浮现。`,liuyao:a=>`☯️ **易理无常，乾坤既定。**
针对你所求的「${a||"综合卦象"}」，卦象预示着事情正处于**「阳极生阴，动而有变」**的微妙节点。
本卦代表大方向的根基稳固，但在细节执行中，动爻的产生说明外部环境或你的内心心态已经开始悄然转变。
变卦提示：**「柔顺利贞」**。此时不宜强出头，面对职场或人际关系，宜采取“合作共赢”和“顺水推舟”的策略。急于求成只会增加阻力，持之以恒、保持正念，终能逢凶化吉。`,plum:a=>`🌸 **易数心传，心动卦成。**
数字起卦，体用互参。针对「${a||"心中所问"}」：
此卦中**「体卦」**（代表你）力量充沛，说明你自身具备解决当前问题的全部资本与才华；**「用卦」**（代表所问之事）虽有克制，但通过变卦的调和，已经将冲突化为无形。
这代表你目前遇到的困难，实际上是一个包装成问题的**「机遇」**。只要你能跳出原有的思维框架，用全新的眼光审视，在未来两周内即可迎来豁然开朗的局面。`,tarot:a=>`🃏 **星辰指引，命运之轮悄然转动。**
在你求问的「${a||"人生课题"}」牌阵中：
过去、现在与未来的能量链条非常清晰。
你过去种下的因（或许是某种勇敢的冒险），在现在正呈现出一种沉淀与反思的张力。你可能感到些许压力，甚至在怀疑自己的决定。
但请注意，未来的指引牌代表着**「希望、疗愈与指引」**。这意味着当前的迷茫只是暂时的迷雾，你的内在直觉正在复苏，跟随那颗指引你的星，你会找到属于你的答案。`,lenormand:a=>`🎴 **雷诺曼法，直白显象。**
针对你求问的「${a||"具体事态"}」：
雷诺曼的意象非常落地，牌组组合明确指出：一件你等待已久的“消息”或“转机”，即将在近期经由某位关键人传递给你。
这里的牌面预示着**「稳步推进，收获在即」**。不要忽视生活中的小细节和社交场合中的偶遇，它们可能是开启你下一步幸运的钥匙。保持积极的社交频率，贵人就在你身边。`},q=["这是一个非常有慧根的提问。从卦象/牌阵的深层能量来看，你提到的这个细节正是问题的核心。我建议你...","命理并非一成不变，而是随着你当下的起心动念而在改变。关于你问的这个问题，其实潜意识已经在提示你：多关注内在的感受，而不是外界的杂音。","问得好！如果将刚刚占卜的结果与你现在的提问放在一起看，你会发现其实你正处于“蓄势待发”的状态。当下的阻碍其实是在帮你筛选不合拍的人或事。","结合前几次占卜的因果链条来看，这次的启示其实是上次占卜结果的延伸。宇宙/神明并不是让你立刻做出惊天动地的改变，而是让你先学会放手和接纳。","从玄学五行/精神维度的流转来看，你现在的纠结正是打破旧有模式的阵痛。如果你能尝试换一个视角（比如站在对方的角度，或者拉长到三年后的时间线），你会发现当下的纠结其实非常微不足道。"],U={key:0,class:"ai-trigger-row fade-in"},W={key:1,class:"ai-chat-panel fade-in"},X={class:"ai-panel-header"},Y={class:"ai-header-title"},Z=["src"],D={class:"message-row ai"},ee={class:"avatar-wrap"},se=["src"],te={key:0,class:"avatar-wrap"},ne=["src"],ae=["innerHTML"],ie={class:"msg-time"},oe={key:1,class:"avatar-wrap user-avatar"},re={key:0,class:"message-row ai"},le={class:"avatar-wrap"},ue=["src"],de={class:"bubble ai-bubble"},ve=["innerHTML"],ce={key:1,class:"message-row ai"},pe={class:"avatar-wrap"},me=["src"],ge={class:"ai-input-bar"},be=["disabled"],fe=["disabled"],ye={__name:"AiDialogue",props:{pageType:{type:String,required:!0},question:{type:String,default:""},resultData:{type:[Object,Array],required:!0}},setup(a){const r=a,t=b(null),f=b(null),u=b(!1),v=b(""),i=b(!1),d=b(!1),A=b(""),$=I(()=>`/images/themes/${g.themeKey}/LOGO.png`),T=o=>{o.target.src="/images/LOGO.png"},E=I(()=>r.question?r.question.trim().charAt(0):"问"),h=I(()=>g.aiMessages||[]),k=I(()=>g.aiMessages.some(o=>o.pageType===r.pageType&&o.isInterpretation));function w(o){return o?o.replace(/\n/g,"<br>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/✨/g,"✨").replace(/☯️/g,"☯️").replace(/🌸/g,"🌸").replace(/🃏/g,"🃏").replace(/🎴/g,"🎴"):""}function m(){S(()=>{f.value&&(f.value.scrollTop=f.value.scrollHeight)})}function M(){S(()=>{setTimeout(()=>{t.value&&t.value.scrollIntoView({behavior:"smooth",block:"start"})},150)})}function H(){confirm("确定要清空与 AI 占卜师的所有对话历史吗？")&&g.clearAiHistory()}function N(){u.value=!0,M(),m()}function O(){u.value=!0,i.value=!0,M(),m();const o=J(r.pageType,r.question,r.resultData);console.log("Constructed Prompt for AI:",o);const e=Q[r.pageType](r.question);setTimeout(()=>{i.value=!1,_(e,()=>{g.addAiMessage("ai",e,r.pageType,!0),m()})},1200)}function _(o,e){d.value=!0,A.value="";let l=0;const R=setInterval(()=>{l<o.length?(A.value+=o.charAt(l),l++,m()):(clearInterval(R),d.value=!1,A.value="",e&&e())},25)}function C(){if(!v.value.trim()||d.value||i.value)return;const o=v.value.trim();v.value="",g.addAiMessage("user",o,r.pageType),m(),i.value=!0,setTimeout(()=>{i.value=!1;const e=q[Math.floor(Math.random()*q.length)];_(e,()=>{g.addAiMessage("ai",e,r.pageType),m()})},1e3)}return P(()=>g.aiMessages.length,()=>{m()}),V(()=>{k.value&&(u.value=!0),m()}),(o,e)=>(c(),p("div",{class:"ai-wrapper",ref_key:"aiSectionRef",ref:t},[!u.value&&!k.value?(c(),p("div",U,[s("button",{class:"ai-action-btn btn-interpret",onClick:O},[...e[1]||(e[1]=[s("span",{class:"btn-icon"},"✨",-1),n(` AI 智能解读
      `,-1)])]),e[3]||(e[3]=n()),s("button",{class:"ai-action-btn btn-chat",onClick:N},[...e[2]||(e[2]=[s("span",{class:"btn-icon"},"💬",-1),n(` 与 AI 交流
      `,-1)])])])):y("",!0),e[23]||(e[23]=n()),u.value||k.value?(c(),p("div",W,[s("div",X,[s("div",Y,[s("img",{class:"ai-avatar-icon animate-spin-slow",src:$.value,onError:T},null,40,Z),e[4]||(e[4]=n()),e[5]||(e[5]=s("span",{class:"ai-header-name"},"AI 命运之书",-1))]),e[6]||(e[6]=n()),s("div",{class:"ai-header-actions"},[s("button",{class:"ai-clear-btn",onClick:H,title:"清空对话历史"},"🧹 清空历史")])]),e[21]||(e[21]=n()),s("div",{class:"ai-message-list",ref_key:"messageListRef",ref:f},[s("div",D,[s("div",ee,[s("img",{class:"avatar",src:$.value,onError:T},null,40,se)]),e[7]||(e[7]=n()),e[8]||(e[8]=s("div",{class:"bubble ai-bubble"},`
            你好，我是你的专属 AI 占卜助手。我已经感知到了你当下的起心动念。你可以点击上方按钮让我为你进行深度解读，或者直接在此处向我提问。
          `,-1))]),e[17]||(e[17]=n()),(c(!0),p(B,null,K(h.value,l=>(c(),p("div",{key:l.id,class:x(["message-row",l.sender])},[l.sender==="ai"?(c(),p("div",te,[s("img",{class:"avatar",src:$.value,onError:T},null,40,ne)])):y("",!0),e[10]||(e[10]=n()),s("div",{class:x(["bubble",l.sender==="ai"?"ai-bubble":"user-bubble"])},[s("div",{class:"msg-content",innerHTML:w(l.text)},null,8,ae),e[9]||(e[9]=n()),s("div",ie,L(l.timeStr.split(" ")[1]||l.timeStr),1)],2),e[11]||(e[11]=n()),l.sender==="user"?(c(),p("div",oe,L(E.value),1)):y("",!0)],2))),128)),e[18]||(e[18]=n()),d.value?(c(),p("div",re,[s("div",le,[s("img",{class:"avatar",src:$.value,onError:T},null,40,ue)]),e[14]||(e[14]=n()),s("div",de,[s("div",{class:"msg-content",innerHTML:w(A.value)},null,8,ve),e[12]||(e[12]=n()),e[13]||(e[13]=s("span",{class:"cursor-blink"},"|",-1))])])):y("",!0),e[19]||(e[19]=n()),i.value?(c(),p("div",ce,[s("div",pe,[s("img",{class:"avatar",src:$.value,onError:T},null,40,me)]),e[15]||(e[15]=n()),e[16]||(e[16]=s("div",{class:"bubble ai-bubble loading-bubble"},[s("div",{class:"dot-flashing"})],-1))])):y("",!0)],512),e[22]||(e[22]=n()),s("div",ge,[F(s("input",{class:"ai-input","onUpdate:modelValue":e[0]||(e[0]=l=>v.value=l),placeholder:"追问AI占卜师...（如：有什么需要注意的吗？）",onKeyup:z(C,["enter"]),disabled:d.value||i.value},null,40,be),[[G,v.value]]),e[20]||(e[20]=n()),s("button",{class:"ai-send-btn",onClick:C,disabled:!v.value.trim()||d.value||i.value},`
          发送
        `,8,fe)])])):y("",!0)],512))}},Ae=j(ye,[["__scopeId","data-v-4250d7f5"]]);export{Ae as A};
