// Веса и пороги подбора. Сумма максимальных баллов = 100.
export const MATCHING_CONFIG = {
  weights: {
    niche: 40, // × совпавшие ниши / ниши в заявке
    ageOverlap: 10,
    gender: 10,
    budgetInside: 20, // минимальная цена внутри [budget_min, budget_max]
    budgetNear: 10, // ниже budget_min или выше budget_max не больше чем на budgetTolerance
    almaty: 10, // × almaty_share_pct / 100
    erHigh: 10,
    erMid: 5,
  },
  /** Допуск сверх budget_max: и для фильтра, и для «почти в бюджете». */
  budgetTolerance: 0.2,
  erHighFrom: 5,
  erMidFrom: 2,
  /** Блогер без публикаций дольше этого срока не попадает в подбор. */
  maxDaysSinceLastPost: 30,
  topN: 10,
  /**
   * Блогеры, которых клиент указал в «Блогеры, которые вам нравятся», ставятся в начало подборки,
   * если проходят обязательные фильтры. Балл «Подходит на N%» при этом не меняется.
   */
  likedLabel: "Вы отметили этого блогера",
} as const;
