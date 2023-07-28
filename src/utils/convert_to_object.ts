export function convertToObject(tab: string | Array<string>, _obj?: {}) {
  if (!Array.isArray(tab)) tab = [tab];
  const obj: Record<string, Array<{}>> = _obj || {};
  tab.forEach((el) => {
    obj[el] = [];
  });

  return obj;
}
