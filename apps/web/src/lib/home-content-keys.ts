export const HOME_CONTENT_KEYS = [
  'home_hero_title',
  'home_hero_accent',
  'home_hero_desc',
  'home_bfj_title',
  'home_bfj_desc',
  'home_products_title',
  'home_auctions_title',
  'home_why_title',
  'home_why_desc',
  'home_why_feat1_title', 'home_why_feat1_desc',
  'home_why_feat2_title', 'home_why_feat2_desc',
  'home_why_feat3_title', 'home_why_feat3_desc',
  'home_cta_title',
  'home_cta_desc',
  'home_cta_btn1',
  'home_cta_btn2',
  'home_stat1_num', 'home_stat1_suffix', 'home_stat1_label',
  'home_stat2_num', 'home_stat2_suffix', 'home_stat2_label',
  'home_stat3_num', 'home_stat3_suffix', 'home_stat3_label',
  'home_stat4_num', 'home_stat4_suffix', 'home_stat4_label',
] as const

export type HomeContentKey = typeof HOME_CONTENT_KEYS[number]
