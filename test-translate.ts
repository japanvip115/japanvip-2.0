/**
 * Test: Claude API dịch tiếng Nhật → tiếng Việt
 * Chạy: ANTHROPIC_API_KEY=sk-... npx ts-node test-translate.ts
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SAMPLES = [
  {
    label: "Tủ lạnh Panasonic",
    jp: `パナソニック 冷蔵庫 NR-F608HPX-W
容量: 608L（冷蔵室430L / 冷凍室178L）
色: オフホワイト
主な特徴: ナノイーX搭載、はやうま冷凍、自動製氷
エネルギー消費効率: 年間電気代 約17,810円（525kWh）
サイズ: 幅685×奥行695×高さ1833mm
定価: 348,000円（税込）`,
  },
  {
    label: "Máy giặt Hitachi",
    jp: `日立 ドラム式洗濯乾燥機 BD-SX120JL
洗濯・乾燥容量: 洗濯12kg / 乾燥6kg
特徴: 液体洗剤・柔軟剤自動投入、AIお洗濯、ナイアガラ洗浄
騒音レベル: 洗濯時32dB（静音設計）
年間電気代目安: 約12,400円
価格: 289,000円`,
  },
  {
    label: "Nồi cơm điện Zojirushi",
    jp: `象印 炎舞炊き NW-FB10
容量: 1.0L（5.5合）
特徴: 鉄製内釜「豪炎かまど釜」、圧力IH炊飯、旨み成分を引き出す高温炊き
消費電力: 炊飯時1170W / 保温時17W
付属品: 計量カップ、しゃもじ、しゃもじスタンド
参考価格: 62,800円（税込）`,
  },
];

async function translateProduct(label: string, japaneseText: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📦 ${label}`);
  console.log(`${"=".repeat(60)}`);
  console.log("🇯🇵 Tiếng Nhật:\n", japaneseText);

  const stream = await client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `Dịch mô tả sản phẩm gia dụng Nhật Bản sau sang tiếng Việt tự nhiên, phù hợp cho website bán hàng Việt Nam. Giữ nguyên tên thương hiệu, model số. Đơn vị tiền tệ đổi sang VNĐ (tỷ giá 170 VNĐ/JPY).

${japaneseText}`,
      },
    ],
  });

  const response = await stream.finalMessage();
  const translated = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  console.log("\n🇻🇳 Tiếng Việt:\n", translated);
  return translated;
}

async function main() {
  console.log("🚀 Test Claude API: Dịch Nhật → Việt cho JapanVip\n");

  for (const sample of SAMPLES) {
    await translateProduct(sample.label, sample.jp);
  }

  console.log("\n✅ Done! Đánh giá chất lượng dịch và quyết định tích hợp.");
}

main().catch(console.error);
