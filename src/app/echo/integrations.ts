export const Gather: Record<string, any> = {
  createLink: async (inputs: any) => {
    const link = `https://gather.link/${inputs.teamName}`;
    return { link };
  },
};
export const CookieMap: Record<string, any> = {
  findNearestCookieBucksCafe: async (inputs: any) => {
    return "https://maps.app.goo.gl/tEHSMB1Kk2pCNizz6";
  },
};
export const DB: Record<string, any> = {};
