from typing import Optional

from pydantic import BaseModel, Field


class ThreadNarrative(BaseModel):
    """Thread 长文脉络 — LLM 归并后的逻辑流"""
    total_tweets: int = 0
    narrative_flow: str = ""  # LLM 归并后的逻辑流（起承转合）
    key_points: list[str] = Field(default_factory=list)


class CommunitySentiment(BaseModel):
    """社区评论情绪与分析"""
    overall_tone: str = "neutral"  # 赞同 / 质疑 / 中立
    top_endorsements: list[str] = Field(default_factory=list)  # 有深度的补充或赞同
    top_corrections: list[str] = Field(default_factory=list)  # 高价值的纠错或反驳
    toxicity_level: str = "low"  # low / medium / high


class TweetStats(BaseModel):
    views: int = 0
    likes: int = 0
    reposts: int = 0
    bookmarks: int = 0


class ExternalLink(BaseModel):
    url: str = ""
    title: str = ""
    description: str = ""


class RawScrapeResult(BaseModel):
    """Agent Scraper 的原始输出——非结构化文本 + 媒体引用"""
    main_tweet_text: str = ""
    thread_texts: list[str] = Field(default_factory=list)
    reply_texts: list[str] = Field(default_factory=list)
    quote_retweet_texts: list[str] = Field(default_factory=list)
    media_urls: list[str] = Field(default_factory=list)
    screenshot_paths: list[str] = Field(default_factory=list)
    author_handle: str = ""
    author_name: str = ""
    error: Optional[str] = None


class TwitterContentModel(BaseModel):
    """Twitter 分析器的最终输出——结构化的推文知识模型

    最大程度复用现有 ContentModel 的概念框架，同时扩展 Twitter 特有维度。
    """
    # --- 基本元信息 ---
    title: str = ""  # 推文/Thread 标题
    author: str = ""  # 作者显示名称
    handle: str = ""  # @username
    summary: str = ""  # 一句话核心价值
    url: str = ""  # 原始推文 URL

    # --- 指标 ---
    stats: TweetStats = Field(default_factory=TweetStats)

    # --- Twitter 特有内容 ---
    main_tweet_text: str = ""
    thread_context: ThreadNarrative = Field(default_factory=ThreadNarrative)
    community_sentiment: CommunitySentiment = Field(default_factory=CommunitySentiment)
    external_links: list[ExternalLink] = Field(default_factory=list)

    # --- 多媒体素材 ---
    media_urls: list[str] = Field(default_factory=list)  # 推文自带的图片/视频 URL
    screenshot_paths: list[str] = Field(default_factory=list)  # 本地已下载的截图/长截图路径

    # --- 技术分类 (复用现有枚举) ---
    tech_domain: Optional[str] = None

    # --- 原始抓取错误 ---
    scrape_error: Optional[str] = None
