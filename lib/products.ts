
export type Product = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  emoji: string;
  category: string;
  description: string;
  downloadName: string;
};

export const products: Product[] = [
  {
    id: "prompt-pack",
    title: "AI商业提示词包",
    subtitle: "适合客服、销售、运营、短视频脚本",
    price: 49,
    emoji: "🧠",
    category: "提示词",
    description: "一套面向普通人的 AI 商业提示词模板，覆盖客服回复、朋友圈文案、商品卖点提炼、短视频脚本、AI绘图提示词等场景。",
    downloadName: "prompt-pack-demo.zip"
  },
  {
    id: "agent-template",
    title: "智能客服 Agent 模板",
    subtitle: "适合本地商家与线上客服自动化",
    price: 99,
    emoji: "🤖",
    category: "智能体",
    description: "包含智能客服知识库结构、问答流程、用户意图分类、转人工话术、售前售后场景模板。适合作为 AI 客服方案的第一块积木。",
    downloadName: "agent-template-demo.zip"
  },
  {
    id: "wallpaper-pack",
    title: "高级商业壁纸素材包",
    subtitle: "适合自媒体封面、海报、课程配图",
    price: 29,
    emoji: "🎨",
    category: "素材",
    description: "一套用于演示的虚拟壁纸素材包商品。你后续可以换成自己的作品、封面图和真实下载文件。",
    downloadName: "wallpaper-pack-demo.zip"
  }
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}
