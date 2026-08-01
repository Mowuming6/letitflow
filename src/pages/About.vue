<template>
  <div class="container about-page" :style="themeStyle">
    <!-- 一张大卡片：左侧目录 / 右侧滚动内容 -->
    <div class="a-layout">

      <!-- 左侧目录 -->
      <nav class="a-toc">
        <div class="a-toc-sticky">
          <div v-for="s in sections" :key="s.id"
            class="a-toc-item"
            :class="{ active: activeSection === s.id }"
            @click="scrollTo(s.id)">
            <span class="a-toc-dot"></span>
            <span>{{ s.label }}</span>
          </div>
        </div>
      </nav>

      <!-- 右侧滚动内容区 -->
      <main class="a-main" ref="mainRef" @scroll.passive="onScroll">

        <!-- 标题 -->
        <div class="a-header">
          <img class="a-logo" :src="`/images/themes/${store.themeKey}/LOGO.png`" alt="LOGO" />
          <h1>关于「不必纠结 随天意」</h1>
          <div class="a-slogan">把纠结交给随机，把勇气留给自己</div>
        </div>

        <!-- 1. 简介 -->
        <section :id="sections[0].id" class="a-section">
          <h2>{{ sections[0].label }}</h2>
          <p>人生处处面临取舍，两难的权衡、摇摆的思绪，常常困住我们。</p>
          <p>「不必纠结 随天意」并非宣扬宿命、鼓吹迷信，而是一座兼具仪式感、沉浸感与科普价值的<strong>随机抉择与内心自省平台</strong>。我们汇集全球古今各类抉择、占卜工具，以仪式搭建情绪缓冲带，借随机作为心灵的镜子，帮助人们跳出无尽内耗，看见藏在心底的倾向。</p>
        </section>

        <!-- 2. 标识视觉设计 -->
        <section :id="sections[1].id" class="a-section">
          <h2>{{ sections[1].label }}</h2>
          <p>网站核心视觉主体是一枚<strong>立体骰子</strong>。骰子自古便是人类最原始的随机工具，代表不确定性、概率与偶然；骰子中心点化为眼睛，寓意所有随机讯号本质都是内心的投射——所谓天意，实则是自我觉知的窗口。整体造型传递顺其自然、看淡取舍的淡然洒脱。</p>

          <div class="a-divider">两条星轨 · 串联东西方抉择文明</div>

          <div class="a-dual">
            <div class="a-dual-item east">
              <h4>外环星轨 · 乾隆通宝</h4>
              <p>一阴一阳两两相对，象征东方玄学体系。涵盖金钱卦、梅花易数、观音灵签、圣杯、转盘等根植华夏的传统择占方式，蕴含阴阳相生、观象知意的东方思想。</p>
            </div>
            <div class="a-dual-item west">
              <h4>内环星轨 · 秘仪卡牌</h4>
              <p>融合日月、星辰、全视之眼经典符号，代表西方神秘学体系。涵盖塔罗、雷诺曼、答案之书等西式抉择工具。</p>
            </div>
          </div>

          <p class="a-center">两条轨道循环交织、彼此相融。</p>

          <p>平台设置<span v-for="(t, i) in themeList" :key="t.name">
            <span class="a-tl-dot" :style="{ background: t.color }"></span>{{ t.name }}<span v-if="i < themeList.length - 1">、</span>
          </span>六大独立视觉主题，不同主题下骰子、古币、卡牌 3D 模型将会适配专属视觉风格，带来层次丰富、风格迥异的沉浸式体验。</p>
        </section>

        <!-- 3. 平台功能 -->
        <section :id="sections[2].id" class="a-section">
          <h2>{{ sections[2].label }}</h2>
          <div class="a-tools">
            <span class="a-tool" v-for="tool in tools" :key="tool">{{ tool }}</span>
          </div>
          <p>为还原真实线下体验，每一项交互参照现实传统流程精心打磨：高精度 3D 模型完整模拟<strong>摇卦、抛币、洗牌、翻书、抽牌</strong>的动态流程，包含建模、音效、震动反馈，摒弃生硬静态文字界面，保留传统仪式独有的氛围感。</p>

          <div class="a-fblock">
            <h4>手势识别交互系统</h4>
            <p>依靠自然手势操控各类道具，复刻亲手摇骰、抽牌、起卦的真实动作，消除电子屏幕的割裂感，打造充满想象力的沉浸式互动体验。</p>
          </div>
          <div class="a-fblock">
            <h4>全球占卜文明 3D 地球可视化</h4>
            <p>依托整理的文明史料，在立体地球之上展示不同国家、不同时代诞生的抉择与占卜习俗。从殷商甲骨、两河流域占星、古埃及占梦，到玛雅占星、北欧卢恩符文…… 直观呈现世界各地先民面对抉择时，探索 “随机” 的共同历程。在实用工具之外，增添科普价值，让大家看见：寻求随机指引，是贯穿全人类文明的共同习惯。</p>
          </div>
        </section>

        <!-- 4. AI 解读 -->
        <section :id="sections[3].id" class="a-section">
          <h2>{{ sections[3].label }}</h2>
          <div class="a-ai-count">每日 10 次智能解读</div>
          <ul class="a-ai-list">
            <li>严格规避封建迷信，不渲染宿命论、不制造焦虑恐慌</li>
            <li>客观中立，提供清晰、正向、具备现实参考意义的分析</li>
            <li>不预言既定未来，引导使用者梳理情绪、正视内心的摇摆</li>
          </ul>
          <p class="a-center">骰子、钱币、卡牌只是思考的契机，解读文字只是一面镜子——<strong>最终的方向，永远由你定义。</strong></p>
        </section>

        <!-- 5. 初心 -->
        <section :id="sections[4].id" class="a-section a-finale">
          <h2>{{ sections[4].label }}</h2>
          <p>天意从来不会替任何人做出最终决定。</p>
          <p>骰子滚动、钱币起落、卡牌翻开——所有随机仪式，只是化解选择内耗的媒介。当你静下心走完整套仪式，答案早已存在于你的心中。</p>
          <div class="a-finale-quote">随机只是引子，看淡取舍、坦然抉择、勇敢奔赴前路的人，永远是你自己。</div>
        </section>

        <!-- 6. 反馈 -->
        <section :id="sections[5].id" class="a-section">
          <h2>{{ sections[5].label }}</h2>
          <p>如果您有任何建议、意见或发现了问题，欢迎告诉我们：</p>
          <a class="a-fb-btn" :href="feedbackUrl" target="_blank" rel="noopener noreferrer">提交反馈 / 联系我们</a>
        </section>

      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { store } from '../store'
import { THEMES } from '../theme'

const themeStyle = computed(() => store.getThemeStyle())
const feedbackUrl = 'https://v.wjx.cn/vm/wZ4CBhK.aspx'
const mainRef = ref(null)

const sections = [
  { id: 'intro', label: '简介' },
  { id: 'visual', label: '标识视觉设计' },
  { id: 'features', label: '平台功能' },
  { id: 'ai', label: 'AI 解读理念' },
  { id: 'heart', label: '我们的初心' },
  { id: 'feedback', label: '网站反馈' },
]
const tools = ['骰子', '硬币', '幸运转盘', '圣杯', '观音灵签', '梅花易数', '金钱卦', '塔罗牌', '雷诺曼', '答案之书']

const themeList = computed(() =>
  Object.entries(THEMES).map(([k, t]) => ({ name: t.name, color: t.primary }))
)

const activeSection = ref('intro')

function onScroll() {
  const el = mainRef.value; if (!el) return
  const st = el.scrollTop + 40
  const secs = el.querySelectorAll('section')
  for (let i = secs.length - 1; i >= 0; i--) {
    if (secs[i].offsetTop <= st) { activeSection.value = secs[i].id; return }
  }
  activeSection.value = 'intro'
}

function scrollTo(id) {
  activeSection.value = id
  const el = document.getElementById(id)
  const main = mainRef.value
  if (!el || !main) return
  main.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
}
</script>

<style scoped>
/* ═══ 页面级居中（卡片在页面垂直水平居中） ═══ */
.about-page {
  display: flex !important;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  min-height: 100vh;
  overflow: hidden !important;
}

/* ═══ 大卡片容器（固定高度，内部滚动） ═══ */
.a-layout {
  display: flex;
  height: calc(100vh - 48px);  /* 固定高度，上下留白一致 */
  max-width: 960px;
  width: calc(100% - 20px);
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 2px 20px rgba(0,0,0,0.06);
}

/* ═══ 左侧目录 ═══ */
.a-toc {
  width: 146px; flex-shrink: 0;
  border-right: 1px solid rgba(0,0,0,0.06);
  background: rgba(0,0,0,0.015);
  overflow-y: auto;
}
.a-toc-sticky {
  position: sticky; top: 0;
  padding: 18px 8px 18px 12px;
}
.a-toc-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px;
  font-size: 13px; color: #888;
  cursor: pointer; transition: all .18s;
  line-height: 1.3;
}
.a-toc-item:hover { color: var(--primary); background: var(--primary-light); }
.a-toc-item.active {
  color: var(--primary); font-weight: 700;
  background: var(--primary-light);
}
.a-toc-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; flex-shrink: 0;
  opacity: 0.35; transition: opacity .18s;
}
.a-toc-item.active .a-toc-dot { opacity: 1; }

/* ═══ 右侧滚动内容 ═══ */
.a-main {
  flex: 1; overflow-y: auto;
  padding: 24px 26px 32px;
  scroll-behavior: smooth;
}

/* ═══ 头部 ═══ */
.a-header { text-align: center; margin-bottom: 26px; }
.a-logo { width: 50px; height: 50px; margin-bottom: 8px; }
.a-header h1 { font-size: 19px; color: #1A1A2E; margin: 0; font-weight: 800; }
.a-slogan { margin-top: 5px; font-size: 13px; color: var(--primary); letter-spacing: 1px; }

/* ═══ 段落（替代原 a-card，统一在卡片内） ═══ */
.a-section {
  margin-bottom: 22px;
  line-height: 1.78;
  font-size: 14px;
  color: #4a4a4a;
  scroll-margin-top: 12px;
}
.a-section h2 {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--primary);
  padding-bottom: 7px;
  border-bottom: 1px solid var(--primary-light);
}
.a-section p { margin: 7px 0; }
.a-section strong { color: var(--primary); font-weight: 700; }
.a-center { text-align: center; }

/* ═══ 分隔线 ═══ */
.a-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 16px 0 12px; font-size: 13px;
  font-weight: 700; color: var(--primary);
}
.a-divider::before, .a-divider::after {
  content: ''; flex: 1; height: 1px;
  background: var(--primary-light);
}

/* ═══ 东西方双栏 ═══ */
.a-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 6px 0; }
.a-dual-item {
  padding: 14px; border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.06);
}
.a-dual-item.east { background: var(--primary-light); }
.a-dual-item.west { background: var(--primary-light); }
.a-dual-item h4 { margin: 0 0 5px; font-size: 14px; color: var(--primary); }
.a-dual-item p { margin: 0; font-size: 13px; color: #666; }

/* ═══ 主题色标（内嵌于文字中的圆点） ═══ */
.a-tl-dot { display: inline-block; width: 13px; height: 13px; border-radius: 50%; vertical-align: -2px; margin-right: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }

/* ═══ 工具标签 ═══ */
.a-tools { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.a-tool {
  padding: 3px 10px; border-radius: 12px; font-size: 12px;
  font-weight: 600;
  background: var(--primary-light); color: var(--primary);
}

/* ═══ 特性块 ═══ */
.a-fblock {
  margin: 10px 0; padding: 11px 14px;
  border-left: 3px solid var(--primary);
  background: #fafafa; border-radius: 0 8px 8px 0;
}
.a-fblock h4 { margin: 0 0 3px; font-size: 14px; color: var(--primary); }
.a-fblock p { margin: 0; font-size: 13px; color: #5a5a5a; }

/* ═══ AI ═══ */
.a-ai-count {
  display: inline-block;
  padding: 4px 14px; border-radius: 14px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff; font-weight: 700; font-size: 13px;
  margin-bottom: 8px;
}
.a-ai-list { margin: 6px 0; padding-left: 1.2em; }
.a-ai-list li { margin: 4px 0; font-size: 13.5px; }

/* ═══ 初心 ═══ */
.a-finale-quote {
  margin-top: 12px; padding: 14px;
  border-left: 3px solid var(--primary);
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.07), transparent);
  border-radius: 0 8px 8px 0;
  font-size: 15px; font-weight: 700; color: var(--primary);
  text-align: center; line-height: 1.7;
}

/* ═══ 反馈 ═══ */
.a-fb-btn {
  display: inline-block; margin-top: 8px;
  padding: 10px 22px; border-radius: 20px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff; font-weight: 700; text-decoration: none;
  font-size: 14px; transition: all .15s;
}
.a-fb-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(var(--primary-rgb), 0.3); }

/* ═══════════ 黑夜模式 ═══════════ */
.app-shell.dark .a-layout {
  background: rgba(26, 26, 40, 0.70) !important;
  border-color: rgba(255,255,255,0.06) !important;
  box-shadow: 0 2px 20px rgba(0,0,0,0.2) !important;
}

.app-shell.dark .a-toc {
  border-right-color: rgba(255,255,255,0.05);
  border-bottom-color: rgba(255,255,255,0.05);
  background: rgba(0,0,0,0.2);
}
.app-shell.dark .a-toc-item { color: #777; }
.app-shell.dark .a-toc-item:hover { color: var(--primary-light); background: rgba(255,255,255,0.04); }
.app-shell.dark .a-toc-item.active {
  color: var(--primary-light); background: rgba(255,255,255,0.06);
}

.app-shell.dark .a-header h1 { color: #ddd !important; }
.app-shell.dark .a-slogan { color: var(--primary-light) !important; }

.app-shell.dark .a-section { color: #c0c0ce !important; }
.app-shell.dark .a-section strong { color: var(--primary-light) !important; }
.app-shell.dark .a-section h2 {
  color: var(--primary-light) !important;
  border-bottom-color: rgba(255,255,255,0.08) !important;
}

.app-shell.dark .a-dual-item.east { background: #25294C; }
.app-shell.dark .a-dual-item.west { background: #25294C; }
.app-shell.dark .a-dual-item h4 { color: var(--primary-light) !important; }
.app-shell.dark .a-dual-item p { color: #a0a0b0 !important; }

.app-shell.dark .a-divider::before,
.app-shell.dark .a-divider::after { background: rgba(255,255,255,0.08); }

.app-shell.dark .a-fblock { background: #25294C !important; }
.app-shell.dark .a-fblock h4 { color: var(--primary-light) !important; }
.app-shell.dark .a-fblock p { color: #a0a0b0 !important; }

.app-shell.dark .a-tool {
  background: rgba(255,255,255,0.06) !important;
  color: var(--primary-light) !important;
}

.app-shell.dark .a-finale-quote {
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.12), transparent) !important;
  color: var(--primary-light) !important;
}

/* ═══════════ 移动端 ═══════════ */
@media (max-width: 767px) {
  .about-page { padding: 0 !important; }
  .a-layout {
    flex-direction: column;
    height: calc(100vh - 32px);
    width: calc(100% - 12px);
  }
  .a-toc {
    width: 100%; flex-shrink: 0;
    border-right: none;
    border-bottom: 1px solid rgba(0,0,0,0.06);
  }
  .a-toc-sticky {
    display: flex; gap: 2px;
    padding: 6px 8px; overflow-x: auto;
  }
  .a-toc-sticky::-webkit-scrollbar { display: none; }
  .a-toc-item {
    flex-shrink: 0; white-space: nowrap;
    padding: 5px 10px; font-size: 12px;
  }
  .a-toc-dot { display: none; }
  .a-main { padding: 14px 12px 28px; }
}
</style>
