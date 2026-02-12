#!/usr/bin/env python3
# Expands/removes placeholder nodes like "10个子主题，例如：..." in `题型知识点标签.json`.
# Goal: tag tree shows real selectable nodes, not doc-like placeholder rows.

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


PLACEHOLDER_RE = re.compile(r"^\s*(\d+)\s*个子(主题|项)")


def is_placeholder_title(title: str) -> bool:
    return bool(PLACEHOLDER_RE.match((title or "").strip()))


def _split_examples(text: str) -> List[str]:
    s = (text or "").strip()
    if not s:
        return []
    # Normalize separators.
    s = s.replace("；", ";")
    parts = [p.strip() for p in re.split(r";+", s) if p.strip()]
    if len(parts) <= 1:
        parts = [p.strip() for p in re.split(r"[，、]+", s) if p.strip()]
    # Trim trailing punctuation/spaces.
    out: List[str] = []
    for p in parts:
        p = p.strip().strip("。．.，,；;：: ")
        if p:
            out.append(p)
    return out


def parse_placeholder(title: str) -> Optional[Dict[str, Any]]:
    t = (title or "").strip()
    m = PLACEHOLDER_RE.match(t)
    if not m:
        return None

    count = int(m.group(1))
    kind = m.group(2)
    rest = t[m.end() :].strip()

    examples: List[str] = []
    if "例如" in rest:
        after = rest.split("例如", 1)[1]
        after = after.lstrip("：:，, \t-—")
        examples = _split_examples(after)

    return {"count": count, "kind": kind, "examples": examples, "raw": t}


def node(title: str, children: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    n: Dict[str, Any] = {"title": title}
    if children:
        n["children"] = children
    return n


# Path-based replacements. Keys are the parent node path (titles), excluding the placeholder node itself.
REPLACEMENTS: Dict[Tuple[str, ...], List[Dict[str, Any]]] = {
    # 语篇主题 - 初中
    ("知识点标签", "语篇主题", "初中", "人与自我", "个人情况"): [
        node("个人信息"),
        node("个人经历"),
        node("外貌与性格"),
        node("兴趣与爱好"),
        node("家庭情况"),
        node("学习与成长"),
        node("目标与理想"),
        node("情绪与感受"),
        node("国籍与语言"),
        node("联系方式"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "个人兴趣"): [
        node("游戏"),
        node("爱好"),
        node("音乐"),
        node("运动"),
        node("阅读"),
        node("电影"),
        node("旅行"),
        node("网络与科技"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "家庭、朋友与周围的人"): [
        node("家人和亲人"),
        node("朋友"),
        node("同学与邻里"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "居住环境"): [
        node("房屋与住所"),
        node("社区与邻里"),
        node("城市与乡村"),
        node("环境与设施"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "日常活动"): [
        node("家庭生活"),
        node("周末活动"),
        node("休闲娱乐"),
        node("家务与生活习惯"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "节假日活动"): [
        node("假日活动"),
        node("庆祝活动"),
        node("旅行与出游"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "学校"): [
        node("学校设施"),
        node("学习人员"),
        node("学习科目"),
        node("课程安排"),
        node("校规校纪"),
        node("校园文化"),
        node("考试与评价"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "学校活动"): [
        node("社团/俱乐部"),
        node("考试/竞赛"),
        node("运动会"),
        node("志愿服务/社会实践"),
        node("校园节日与活动"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "购物"): [
        node("商品"),
        node("货币及理财"),
        node("价格与折扣"),
        node("购物场所"),
        node("线上购物"),
        node("退换货与售后"),
        node("消费习惯"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "饮食"): [
        node("食物"),
        node("饮料"),
        node("用餐场景"),
        node("点餐与菜单"),
        node("健康饮食"),
        node("餐桌礼仪"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "健康"): [
        node("健康饮食"),
        node("身体部位"),
        node("疾病与症状"),
        node("看病与就医"),
        node("运动与健身"),
        node("作息与习惯"),
        node("心理健康"),
        node("预防与卫生"),
        node("健康建议"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "安全与救护"): [
        node("事故"),
        node("安全守则"),
        node("急救常识"),
        node("防灾避险"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "语言"): [
        node("学习体验"),
        node("学习策略"),
        node("学习习惯"),
        node("学习资源与工具"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自我", "方法与哲理"): [
        node("方法/策略"),
        node("哲理感悟"),
        node("价值观与人生启示"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "人际交往"): [
        node("友谊"),
        node("家庭关系"),
        node("师生关系"),
        node("同学与邻里"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "文学"): [
        node("人物传记"),
        node("寓言故事"),
        node("童话故事"),
        node("短篇小说"),
        node("诗歌"),
        node("戏剧作品"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "艺术"): [
        node("电影与戏剧"),
        node("音乐与舞蹈"),
        node("绘画与雕塑"),
        node("摄影与影像"),
        node("建筑与设计"),
        node("传统艺术"),
        node("艺术展览"),
        node("审美与评价"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "体育"): [
        node("锻炼/健身（个人）"),
        node("竞技/比赛"),
        node("体育项目"),
        node("体育精神与团队合作"),
        node("运动健康与安全"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "历史"): [
        node("中国历史"),
        node("世界历史"),
        node("历史人物"),
        node("历史事件与影响"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "社会"): [
        node("公共秩序"),
        node("政治/政策"),
        node("法律与规则"),
        node("权利与义务"),
        node("公共服务"),
        node("公益与志愿服务"),
        node("社会问题与现象"),
        node("经济与生活"),
        node("网络与安全"),
        node("社会热点与观点表达"),
        node("社会责任与公民意识"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "文化"): [
        node("中华文化"),
        node("外国文化"),
        node("文化差异"),
        node("文化交流"),
        node("礼仪与习俗"),
        node("传统与现代"),
        node("文化遗产"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "节日"): [
        node("传统节日"),
        node("外来节日"),
        node("节日习俗与活动"),
        node("节日意义与文化"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "著名人物"): [
        node("政治家"),
        node("科学家"),
        node("文学家"),
        node("艺术家"),
        node("运动员"),
        node("发明家"),
        node("社会活动家"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "通讯与媒体"): [
        node("通讯工具"),
        node("通讯技术"),
        node("传统媒体"),
        node("新媒体与社交网络"),
        node("媒体内容与广告"),
        node("媒体素养与信息甄别"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "旅游"): [
        node("旅游"),
        node("城市与景点"),
        node("旅行计划"),
        node("旅行体验与感受"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "交通"): [
        node("交通/运输"),
        node("交通规则"),
        node("交通工具"),
        node("出行方式与选择"),
        node("交通安全"),
        node("交通问题与环保"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "科普知识与现代技术"): [
        node("科普知识"),
        node("科学技术"),
        node("互联网与信息技术"),
        node("人工智能与机器人"),
        node("发明与创新"),
        node("航天与探索"),
        node("生物科技与医学"),
        node("环保科技"),
        node("科技与生活影响"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "时代变迁"): [
        node("叙事忆旧"),
        node("家乡变化"),
        node("城市发展"),
        node("科技进步与生活变化"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与社会", "世界"): [
        node("国家与民族"),
        node("国籍与人民"),
        node("国际组织"),
        node("国际交流与合作"),
        node("世界地理与文化"),
        node("全球问题"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自然", "自然"): [
        node("自然景观"),
        node("自然遗产"),
        node("地理与地貌"),
        node("动植物与生态"),
        node("自然资源"),
        node("环境保护"),
        node("自然灾害"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自然", "天气"): [
        node("描绘天气"),
        node("天气预报"),
        node("天气与活动"),
    ],
    ("知识点标签", "语篇主题", "初中", "人与自然", "动物与植物"): [
        node("濒危生物"),
        node("宠物"),
        node("野生动物"),
        node("植物与花卉"),
        node("生态保护"),
        node("动植物特征与习性"),
    ],
    # 语篇主题 - 高中
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "个人情况"): [
        node("个人信息"),
        node("个人经历"),
        node("目标与理想"),
        node("自我认知与成长"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "外表与形象"): [
        node("外貌描述"),
        node("衣着与风格"),
        node("自我形象"),
        node("他人评价"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "兴趣与爱好"): [
        node("阅读"),
        node("运动"),
        node("音乐"),
        node("艺术"),
        node("科技与网络"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "家庭、朋友与周围的人"): [
        node("家庭关系"),
        node("友谊与同伴"),
        node("沟通与相处"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "居住环境"): [
        node("家庭与社区"),
        node("城市与乡村"),
        node("居住与环境问题"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "日常活动"): [
        node("学习与作业"),
        node("家务与生活习惯"),
        node("休闲娱乐"),
        node("社交活动"),
        node("时间管理"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "学校生活"): [
        node("学校设施"),
        node("学科与课程"),
        node("师生关系"),
        node("同学关系"),
        node("校园活动"),
        node("考试与评价"),
        node("社团与实践"),
        node("学习压力"),
        node("校园规则"),
        node("升学与规划"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "节假日活动"): [
        node("庆祝活动"),
        node("旅行出游"),
        node("文化体验"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "生活态度"): [
        node("积极乐观"),
        node("自律与坚持"),
        node("价值观与人生观"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "购物"): [
        node("商品与品牌"),
        node("价格与折扣"),
        node("线上购物"),
        node("消费与理财"),
        node("退换货与售后"),
        node("购物体验与评价"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "语言学习"): [
        node("学习方法"),
        node("学习资源"),
        node("听说读写能力"),
        node("考试与备考"),
        node("跨文化交流"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "饮食"): [
        node("饮食习惯"),
        node("健康饮食"),
        node("点餐与餐桌礼仪"),
        node("食品安全"),
        node("特色美食"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "生活与学习", "健康"): [
        node("身体部位"),
        node("疾病与症状"),
        node("就医与用药"),
        node("运动健身"),
        node("心理健康"),
        node("作息与睡眠"),
        node("健康饮食"),
        node("传染病预防"),
        node("安全与急救"),
        node("健康建议"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "做人与做事", "计划与愿望"): [
        node("个人计划"),
        node("未来愿望"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "做人与做事", "工作与职业"): [
        node("职业选择"),
        node("工作技能"),
        node("职场体验"),
        node("职业规划"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "做人与做事", "精神与品格"): [
        node("诚实守信"),
        node("责任担当"),
        node("坚持与毅力"),
        node("勇气与自信"),
        node("合作与团队"),
        node("尊重与包容"),
        node("创新与探索"),
        node("乐于助人"),
        node("自律与反思"),
        node("领导力"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自我", "做人与做事", "情感与情绪"): [
        node("情绪表达"),
        node("情绪管理"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自然", "自然生态", "天气与气候"): [
        node("天气现象"),
        node("气候变化"),
        node("极端天气"),
        node("天气预报与影响"),
        node("低碳与环保行动"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自然", "自然生态", "地理"): [
        node("地形地貌"),
        node("资源分布"),
        node("人地关系"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自然", "自然生态", "自然"): [
        node("自然景观"),
        node("自然资源"),
        node("生态系统"),
        node("环境问题"),
        node("环境保护"),
        node("自然灾害"),
        node("人与自然和谐"),
    ],
    ("知识点标签", "语篇主题", "高中", "人与自然", "自然生态", "户外探险"): [
        node("旅行准备"),
        node("户外活动"),
        node("安全与急救"),
        node("挑战与体验"),
    ],
    # 情景交际用语 - 小学
    ("知识点标签", "情景交际用语", "小学", "社会交往"): [
        node("问候"),
        node("介绍"),
        node("告别"),
        node("感谢"),
        node("道歉"),
        node("祝贺"),
        node("邀请与回应"),
        node("请求与帮助"),
        node("建议与提醒"),
        node("赞同与反对"),
        node("表达喜好"),
        node("询问与回答"),
        node("安慰与鼓励"),
        node("投诉与解释"),
    ],
    ("知识点标签", "情景交际用语", "小学", "个人情况"): [
        node("姓名"),
        node("年龄"),
        node("性别"),
        node("国籍与语言"),
        node("家庭成员"),
        node("外貌描述"),
        node("性格品质"),
        node("兴趣爱好"),
        node("生日"),
        node("联系方式"),
    ],
    ("知识点标签", "情景交际用语", "小学", "场所场景"): [
        node("看病"),
        node("问路"),
        node("购物"),
        node("点餐"),
        node("乘车出行"),
        node("在学校/课堂"),
    ],
    ("知识点标签", "情景交际用语", "小学", "日常生活"): [
        node("颜色"),
        node("数量"),
        node("尺寸与形状"),
        node("位置与方向"),
        node("天气"),
        node("食物与饮料"),
        node("服装与饰品"),
        node("家庭"),
        node("学校"),
        node("交通工具"),
        node("购物与价格"),
        node("动物"),
        node("植物"),
        node("身体部位"),
        node("健康与疾病"),
        node("节日与活动"),
        node("兴趣与运动"),
        node("家务与习惯"),
        node("物品与用品"),
        node("职业"),
        node("城市与乡村"),
    ],
    # 语篇 - 初中
    ("知识点标签", "语篇", "初中", "语篇类型"): [
        node("记叙文"),
        node("说明文"),
        node("议论文"),
        node("应用文"),
        node("新闻报道"),
        node("广告/海报"),
        node("书信/邮件"),
        node("日记/通知"),
    ],
    ("知识点标签", "语篇", "初中", "阅读技能"): [
        node("细节理解"),
        node("主旨大意"),
        node("推理判断"),
        node("词义猜测"),
        node("观点态度"),
        node("篇章结构"),
        node("信息匹配/归纳概括"),
    ],
    # 语用 - 初中
    ("知识点标签", "语用", "初中", "情景交际"): [
        node("社会交往"),
        node("态度"),
        node("情感"),
        node("请求与建议"),
        node("赞同与反对"),
        node("推测与判断"),
        node("评价与评论"),
        node("说明与解释"),
        node("道歉与感谢"),
        node("祝愿与祝贺"),
    ],
    # 语法 - 小学
    ("知识点标签", "语法", "小学", "名词"): [
        node("名词的数"),
        node("名词所有格"),
        node("可数与不可数名词"),
        node("专有名词与普通名词"),
        node("名词的用法"),
    ],
    ("知识点标签", "语法", "小学", "冠词"): [
        node("不定冠词（a, an）"),
        node("定冠词（the）"),
        node("零冠词"),
    ],
    ("知识点标签", "语法", "小学", "代词"): [
        node("人称代词"),
        node("物主代词"),
        node("指示代词"),
        node("疑问代词"),
        node("反身代词"),
        node("不定代词"),
        node("代词的用法"),
    ],
    ("知识点标签", "语法", "小学", "数词"): [
        node("基数词"),
        node("序数词"),
        node("分数与百分数"),
    ],
    ("知识点标签", "语法", "小学", "形容词"): [
        node("形容词原级"),
        node("形容词比较级与最高级"),
        node("形容词的用法与顺序"),
    ],
    ("知识点标签", "语法", "小学", "副词"): [
        node("副词原级"),
        node("副词比较级与最高级"),
        node("频度副词"),
        node("副词的位置与用法"),
    ],
    ("知识点标签", "语法", "小学", "介词"): [
        node("时间介词"),
        node("地点/方位介词"),
        node("方式介词"),
        node("原因介词"),
        node("伴随介词（with）"),
        node("常见介词短语"),
        node("介词用法与搭配"),
        node("易混介词辨析"),
    ],
    ("知识点标签", "语法", "小学", "连词"): [
        node("并列连词"),
        node("转折连词"),
        node("选择连词"),
        node("因果连词"),
        node("条件/时间连词"),
    ],
    ("知识点标签", "语法", "小学", "动词"): [
        node("实义动词"),
        node("系动词"),
        node("助动词"),
        node("情态动词"),
        node("动词形式变化"),
    ],
    ("知识点标签", "语法", "小学", "时态"): [
        node("一般现在时"),
        node("现在进行时"),
        node("一般过去时"),
        node("过去进行时"),
        node("一般将来时"),
        node("现在完成时"),
    ],
    ("知识点标签", "语法", "小学", "一般疑问句"): [
        node("be 动词引导的一般疑问句及其回答"),
        node("助动词引导的一般疑问句及其回答"),
        node("情态动词引导的一般疑问句及其回答"),
    ],
    ("知识点标签", "语法", "小学", "特殊疑问句"): [
        node("What 引导的特殊疑问句及其回答"),
        node("When 引导的特殊疑问句及其回答"),
        node("Where 引导的特殊疑问句及其回答"),
        node("Who 引导的特殊疑问句及其回答"),
        node("Whose 引导的特殊疑问句及其回答"),
        node("Which 引导的特殊疑问句及其回答"),
        node("Why 引导的特殊疑问句及其回答"),
        node("How 引导的特殊疑问句及其回答"),
        node("How old 引导的特殊疑问句及其回答"),
        node("How many 引导的特殊疑问句及其回答"),
        node("How much 引导的特殊疑问句及其回答"),
        node("How long 引导的特殊疑问句及其回答"),
        node("How far 引导的特殊疑问句及其回答"),
        node("How often 引导的特殊疑问句及其回答"),
        node("How soon 引导的特殊疑问句及其回答"),
        node("How deep 引导的特殊疑问句及其回答"),
        node("How high 引导的特殊疑问句及其回答"),
        node("How heavy 引导的特殊疑问句及其回答"),
        node("How large 引导的特殊疑问句及其回答"),
        node("How tall 引导的特殊疑问句及其回答"),
        node("How wide 引导的特殊疑问句及其回答"),
        node("How fast 引导的特殊疑问句及其回答"),
        node("What time 引导的特殊疑问句及其回答"),
    ],
    ("知识点标签", "语法", "小学", "there be 句型"): [
        node("there is + 单数名词"),
        node("there are + 复数名词"),
        node("there was / there were"),
        node("there will be"),
        node("there is/are going to be"),
        node("there has/have been"),
        node("there used to be"),
    ],
    ("知识点标签", "语法", "小学", "句子的应用"): [
        node("主谓一致"),
        node("单复数句子转换"),
        node("肯定句与否定句转换"),
        node("陈述句与疑问句转换"),
        node("同义句转换"),
        node("句子排序与连句成段"),
    ],
    # 词汇
    ("知识点标签", "词汇", "小学", "词汇辨析"): [
        node("名词辨析"),
        node("动词辨析"),
        node("形容词辨析"),
        node("副词辨析"),
        node("介词辨析"),
        node("代词辨析"),
        node("连词辨析"),
        node("短语辨析"),
    ],
    ("知识点标签", "词汇", "小学", "其他词汇知识"): [
        node("同义词"),
        node("反义词"),
        node("一词多义"),
        node("同音/形近词"),
        node("词义归类"),
    ],
    ("知识点标签", "词汇", "小学", "知识/固定搭配"): [
        node("名词词组"),
        node("动词短语"),
        node("介词短语"),
        node("形容词短语"),
        node("常用固定搭配"),
    ],
    ("知识点标签", "词汇", "初中", "词汇辨析"): [
        node("名词辨析"),
        node("代词辨析"),
        node("动词辨析"),
        node("形容词辨析"),
        node("副词辨析"),
        node("介词辨析"),
        node("连词辨析"),
        node("冠词辨析"),
        node("短语辨析"),
    ],
    ("知识点标签", "词汇", "初中", "短语"): [
        node("动词短语"),
        node("介词短语"),
        node("名词短语"),
        node("形容词短语"),
        node("固定搭配"),
    ],
    ("知识点标签", "词汇", "初中", "构词法"): [
        node("派生"),
        node("转化"),
        node("合成"),
        node("缩略"),
    ],
    # 语音
    ("知识点标签", "语音", "小学", "发音"): [
        node("字母的发音"),
        node("字母组合的发音"),
        node("元音发音"),
        node("辅音发音"),
        node("重音与节奏"),
        node("连读与停顿"),
    ],
    ("知识点标签", "语音", "初中", "基本读音"): [
        node("字母"),
        node("元音字母的发音"),
        node("辅音字母的发音"),
        node("字母组合的发音"),
        node("国际音标"),
        node("常见发音规则"),
        node("易错发音辨析"),
    ],
    ("知识点标签", "语音", "初中", "语音与节奏"): [
        node("升调"),
        node("降调"),
        node("重音"),
        node("连读"),
    ],
}


def merge_children(primary: List[Dict[str, Any]], secondary: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Dedupe by title (trimmed). Preserve order: primary first, then secondary."""
    seen = set()
    out: List[Dict[str, Any]] = []

    def add_many(items: List[Dict[str, Any]]):
        for it in items:
            title = (it.get("title") or "").strip()
            if not title:
                continue
            if title in seen:
                continue
            seen.add(title)
            out.append(it)

    add_many(primary)
    add_many(secondary)
    return out


class Stats:
    def __init__(self) -> None:
        self.placeholders_found = 0
        self.placeholders_replaced = 0
        self.placeholders_removed = 0


def transform(node_obj: Dict[str, Any], path: List[str], stats: Stats) -> Dict[str, Any]:
    title = (node_obj.get("title") or "").strip()
    next_path = path + [title]

    children = node_obj.get("children") or []
    if not isinstance(children, list) or not children:
        node_obj.pop("children", None)
        return node_obj

    kept: List[Dict[str, Any]] = []
    placeholder_nodes: List[Dict[str, Any]] = []

    for ch in children:
        if not isinstance(ch, dict):
            continue
        ch_title = (ch.get("title") or "").strip()
        if is_placeholder_title(ch_title):
            stats.placeholders_found += 1
            placeholder_nodes.append(ch)
            continue
        kept.append(transform(ch, next_path, stats))

    replacements: List[Dict[str, Any]] = []
    if placeholder_nodes:
        parent_key = tuple(next_path)
        if parent_key in REPLACEMENTS:
            replacements = REPLACEMENTS[parent_key]
            stats.placeholders_replaced += len(placeholder_nodes)
        else:
            # If we don't have a curated list, fall back to parsed examples (if any).
            example_titles: List[str] = []
            for ph in placeholder_nodes:
                parsed = parse_placeholder((ph.get("title") or "").strip()) or {}
                example_titles.extend(parsed.get("examples") or [])
            example_titles = [t for t in example_titles if t]
            if example_titles:
                replacements = [node(t) for t in example_titles]
                stats.placeholders_replaced += len(placeholder_nodes)
            else:
                stats.placeholders_removed += len(placeholder_nodes)

    merged = merge_children(replacements, kept)
    if merged:
        node_obj["children"] = merged
    else:
        node_obj.pop("children", None)
    return node_obj


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else (root / "题型知识点标签.json")
    target = target.resolve()

    data = json.loads(target.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        print("Expected top-level JSON array", file=sys.stderr)
        return 2

    stats = Stats()
    out = [transform(n, [], stats) for n in data if isinstance(n, dict)]

    # Write in-place with a trailing newline, keep 2-space indent to match repo style.
    target.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        f"placeholders found={stats.placeholders_found} replaced={stats.placeholders_replaced} removed={stats.placeholders_removed}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

