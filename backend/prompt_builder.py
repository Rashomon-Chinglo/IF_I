"""Prompt assembly utilities."""

from .models import LifeInfo

GENDER_TEXT = {
    "male": "男",
    "female": "女",
    "other": "其他",
}

RELATIONSHIP_TEXT = {
    "single": "单身",
    "dating": "恋爱中",
    "married": "已婚",
    "complicated": "感情复杂",
}

JOB_TEXT = {
    "stable": "铁饭碗/大厂",
    "moderate": "普通稳定工作",
    "freelance": "自由职业",
    "unstable": "工作动荡",
}

HOUSING_TEXT = {
    "owned": "有房",
    "renting": "租房",
    "living_with_parents": "和父母住",
}

LIFESTYLE_TEXT = {
    "regular": "规律养生",
    "balanced": "比较平衡",
    "chaotic": "熬夜随性",
}

IF_DIRECTION_BY_TYPE = {
    "稳定型": """
这个人的现实生活非常稳定顺遂，因此你要为TA生成一个【刺激、跌宕起伏、充满冒险】的IF线人生：
- 可能是毅然辞职创业、去偏远地区定居、成为极地探险家或职业极限运动员
- 生活充满不确定性，甚至可能经历过倾家荡产的情节，但也有常人难以企及的高光时刻
- 强调"打破常规"和"不安分"的灵魂
""",
    "中间型": """
这个人的现实生活比较平衡稳定，在平凡中寻求平衡。因此你要为TA生成一个【纯粹、极致、专注于某种小众热爱】的IF线人生：
- 可能是为了某种艺术追求（如古琴修复、观星、独立代码项目）而放弃主流社交
- 活得像个"隐士"或"极客"，在某个细分领域达到了顶峰
- 生活简单但精神世界极其丰盈，甚至显得有些"怪癖"
- 强调"极致的自我实现"和"纯粹的热爱"
""",
    "漂泊型": """
这个人的现实生活比较动荡不安、压力大。因此你要为TA生成一个【平庸、安稳、极具烟火气】和他的人生理想有关的IF线人生：
- 不要写什么大成就，尽量选择平常的职业，例如基层公务员，电网基层，基层医生，或者普通律师等平淡稳定的职业，但要部分参考他的理想，比如理想是金融大鳄，那么可以写他是银行柜员
- 生活极其规律，每天的主要话题是菜价、天气和今晚吃什么。
- 强调那种“一眼看到头”的安心感，没有波澜，只有小确幸（如：在阳台修剪盆栽、在楼下相熟的早餐店喝豆浆）。
- 关键词：【平庸的幸福】、【无事发生】、【极致的治愈】
""",
}


def build_prompt(info: LifeInfo, life_type: str, score: int) -> str:
    """Build the full LLM prompt."""

    gender_text = GENDER_TEXT.get(info.gender, "")
    relationship_text = RELATIONSHIP_TEXT.get(info.relationship, "")
    kids_text = "有孩子" if info.hasKids == "yes" else "没有孩子"
    job_text = JOB_TEXT.get(info.jobStability, "")
    housing_text = HOUSING_TEXT.get(info.housing, "")
    lifestyle_text = LIFESTYLE_TEXT.get(info.lifestyle, "")
    if_direction = IF_DIRECTION_BY_TYPE.get(life_type, IF_DIRECTION_BY_TYPE["漂泊型"])
    dream_hint = f"\n\n用户曾经想过但没实现的梦想：{info.dream}" if info.dream else ""

    return f"""请完全沉浸在那个平行时空里，以一个隐形记录者或老友的视角，用极具真实感、生活气息的笔触，讲述{info.nickname}（你）在那里的真实人生。

## 核心原则：绝对真实感
1. **严禁使用假设性语言**：绝对不要出现“如果当初...”、“在平行宇宙里...”、“假设你...”等破坏沉浸感的词句。
2. **直接陈述事实**：把这段人生当作唯一发生的真实历史来写。直接描述你的生活状态、职业、家庭 details。
3. **细节决定成败**：根据用户信息可以适当添加一些生活细节，但不要过度描述。

## 特殊规则：名人/历史人物检测
如果用户的昵称（{info.nickname}）是一个广为人知的历史人物、明星或名流，请按以下要求大幅增强故事的沉浸感：
1. **多点触达**：不要只抓一个主要的转折点。请在故事中自然地“路过”该人物真实生平中的多个关键年份、地点或次要事件。这些细节应当作为背景淡淡地流露，像是平行时空里真实存在的锚点。
2. **名句改编**：请在故事中委婉地穿插 1-2 句该人物最著名的金句，但要根据当前的平行宇宙境遇进行巧妙的改编或重构，使其读起来既熟悉又新鲜，完全契合当前的 IF 线现状。
3. **性格存留**：即便是在虚构的 IF 线上，也要保留该人物的核心性格精髓（如苏轼的旷达、拿破仑的雄心），让读者感觉到“这确实是那个人的另一种可能”。
4. **即使是名人，叙述语气也要保持亲切、生动，像在对老朋友说话。**

## 用户当前世界线的信息
（注意：这只是参考，你需要根据这些信息推导出一个全新的、自洽的另一条人生轨迹）

- 昵称：{info.nickname}
- 年龄：{info.age}岁
- 性别：{gender_text}
- 所在城市：{info.city}
- 感情状态：{relationship_text}，{kids_text}
- 职业：{info.occupation}
- 工作稳定性：{job_text}
- 住房情况：{housing_text}
- 生活节奏：{lifestyle_text}
- 生活描述：{info.lifeDesc}{dream_hint}

## 用户的人生类型分析

当前世界线类型：{life_type}（稳定指数：{score}/100）

{if_direction}

## 输出要求

请为 {info.nickname} 生成一段极具代入感的人生故事：

1. **开头**：直接切入当下的一个具体生活场景（例如清晨的闹钟、深夜的加班、某次旅行的途中）。让读者瞬间置身于那个时空中。
2. **中间**：自然地穿插过去几年的关键经历（如何选择了这份工作、如何遇见了那个人），像回忆往事一样自然流露。
3. **结尾**：定格在此时此刻的一个画面，留有余韵。

要求：
- 全程使用第二人称“你”
- 文风要细腻、扎实，拒绝空洞的形容词
- 故事要符合中国社会背景，接地气
- 控制在 400-600 字
- 语气可以是温暖的、调侃的或深沉的，但必须是“真实”的

直接输出故事内容，不要有任何前缀说明。"""
