export type LearningSpace = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  href: string | null;
  available: boolean;
  pinned?: boolean;
};
// A space is an area of activity; courses/units stay within their own catalogs.
// Unavailable areas have no URL. Adding courses never adds a navigation item.
export const learningSpaces: LearningSpace[] = [
  {
    id: "math",
    title: "数学书房",
    description: "翻开课本，摆一摆、画一画，把关系想明白。",
    keywords: ["数学", "数学课", "课本", "math", "侦探", "思维"],
    href: "/subjects/math",
    available: true,
    pinned: true,
  },
  {
    id: "explore",
    title: "探索与创造",
    description: "留住一个为什么，试一试，让自己的想法慢慢长出来。",
    keywords: ["探索", "问题", "创造", "作品", "explore"],
    href: "/explore",
    available: true,
    pinned: true,
  },
  {
    id: "english",
    title: "英语天地",
    description: "单词、故事和表达，正在准备搬进家园。",
    keywords: ["英语", "单词", "english", "word"],
    href: null,
    available: false,
  },
  {
    id: "growth",
    title: "成长家园",
    description: "学习回忆与成长陪伴，待后续接入。",
    keywords: ["成长", "蛋仔", "积分"],
    href: null,
    available: false,
  },
];
export const pinnedSpaces = (spaces = learningSpaces) =>
  spaces.filter((s) => s.available && s.href && s.pinned).slice(0, 4);
export function findSpaces(query: string, spaces = learningSpaces) {
  const q = query.trim().toLocaleLowerCase();
  return q
    ? spaces.filter((s) =>
        [s.title, ...s.keywords].some((v) => v.toLocaleLowerCase().includes(q)),
      )
    : [];
}
