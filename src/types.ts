export interface NewsItem {
  contId: number;
  nodeId: number;
  name: string;
  summary: string;
  pubTime: string;
  pubTimeLong: number;
  pic: string;
  appHeadPic: string;
  link: string;
  userInfo?: {
    name: string;
    pic: string;
  };
  nodeInfo?: {
    name: string;
  };
}

export interface NewsListResponse {
  code: number;
  data: {
    pageInfo: {
      list: NewsItem[];
      pageNum: number;
      hasNext: boolean;
      total: number;
    };
  };
}

export interface NewsDetail {
  contId: number;
  nodeId: number;
  name: string;
  content: string;
  summary: string;
  contType?: number;
  forwardType?: number;
  pubTime: string;
  publishTime?: string;
  pubTimeLong?: number;
  updateTime?: string;
  headPic: string;
  smallPic?: string;
  bigPic?: string;
  nodeInfo?: {
    nodeId?: number;
    pic?: string;
    tonePic?: string;
    logoPic?: string;
    name?: string;
    urlName?: string;
    description?: string;
    nodeType?: number;
    nickName?: string;
    forwardType?: number;
    isParticular?: boolean;
  };
  textImageList?: TextImageListType[];
  atlasList?: TextImageListType[][];
  videoList?: unknown[];
  audioList?: unknown[];
  quoteList?: unknown[];
  authorList?: AuthorListType[];
  topicList?: TopicListType[];
  relateConts?: unknown[];
  shareInfo?: ShareInfoType;
  link?: string;
}

export interface TextImageListType {
  url: string;
  width?: number;
  height?: number;
  desc?: string;
}

export interface TwitterType {
  link?: string;
  id?: string;
}

export interface ContactInfoType {
  mail?: string;
  twitter?: TwitterType;
  faceBook?: string | null;
  linkedin?: string | null;
  sinaWeibo?: string | null;
  weChat?: string | null;
  google?: string | null;
}

export interface AuthorListType {
  userId?: number;
  userType?: number;
  authorType?: number;
  pic: string;
  name: string;
  position?: string;
  desc?: string;
  shareUrl?: string;
  contactInfo?: ContactInfoType;
}

export interface TopicListType {
  topicId: number;
  name: string;
  isHot?: boolean;
  bgImageUrl?: string;
  des?: string;
  firstChar?: string;
}

export interface ShareInfoType {
  name?: string;
  summary?: string;
  shareUrl?: string;
  sharePic?: string;
}

export interface Bookmark {
  news: NewsItem;
  category: string;
  CollectedAt: number;
}

export interface Sentence {
  id: string;
  contId: number;
  text: string;
  newsName?: string;
  category?: string;
  thought?: string;
  start?: number;
  length?: number;
  createdAt: number;
}

export interface NewsDetailResponse {
  pageProps: {
    contId: string;
    detailData: {
      code: number;
      data: NewsDetail;
    };
  };
}

/** 接口 getWebAllNodes 返回的节点项 */
export interface WebNode {
  nodeId: number;
  pic?: string;
  tonePic?: string;
  logoPic?: string;
  name: string;
  urlName: string;
  description: string;
  nodeType: number;
  nickName?: string;
  forwardType?: number;
  isParticular?: boolean;
}

/** 前端使用的分类（用于列表展示与路由） */
export interface Category {
  id: string;
  title: string;
  description: string;
  pic?: string;
  tonePic?: string;
}

/** 搜索接口 /search/news 返回的列表项 */
export interface SearchResultItem {
  contId: number;
  cardMode?: string;
  name: string;
  pubTime?: string;
  pubTimeLong?: number;
  summary?: string;
  pic?: string;
  appHeadPic?: string;
  nodeInfo?: { nodeId: number; name: string; [key: string]: unknown };
  [key: string]: unknown;
}

/** 生词本单词 */
export interface VocabWord {
  id: string;
  word: string;
  phonetic?: string;
  translations: string[];
  addedAt: number;
}

/** 搜索接口响应 */
export interface SearchResponse {
  code: number;
  data: {
    list: SearchResultItem[];
    pageNum: number;
    prevPageNum: number;
    nextPageNum: number;
    hasNext: boolean;
    pageSize: number;
    total: number;
    pages: number;
  };
}

export type HomeFeedSectionLayout = "hero" | "list";

export interface HomeFeedArticle {
  contId: number;
  nodeId: number;
  name: string;
  summary: string;
  pubTime: string;
  pubTimeLong: number;
  pic: string;
  appHeadPic: string;
  link: string;
  nodeInfo?: {
    nodeId?: number;
    name: string;
  };
  userInfo?: {
    name: string;
    pic: string;
  };
  cardMode?: string;
  forwardType?: number;
  contType?: number;
}

export interface HomeFeedSection {
  title: string;
  layout: HomeFeedSectionLayout;
  cardMode: string;
  items: HomeFeedArticle[];
  nodeInfo?: {
    nodeId?: number;
    name?: string;
  };
}

export interface HomeFeedRemoteSection {
  cardMode?: string;
  name?: string;
  nodeInfo?: {
    nodeId?: number;
    name?: string;
  };
  childList?: Array<Record<string, unknown>>;
}

export interface HomeFeedResponse {
  pageProps?: {
    data?: {
      pageInfo?: {
        list?: HomeFeedRemoteSection[];
      };
    };
  };
}
