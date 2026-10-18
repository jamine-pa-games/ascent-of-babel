/* Pure card rules, shared by the game and regression tests. */
(function (root) {
  'use strict';
  const rules = {
    normalize(raw, keys, earned = []) {
      const valid = new Set(keys);
      const got = [...new Set([...(Array.isArray(raw?.got) ? raw.got : []), ...earned])].filter(k => valid.has(k));
      return { got, placed: [...got] };
    },
    complete(cards, keys) {
      return keys.length === 24 && new Set(keys).size === 24 && keys.every(k => cards.got.includes(k) && cards.placed.includes(k));
    },
    canCall(cards, keys, odin) { return !!odin && this.complete(cards, keys); }
  };
  if (typeof module !== 'undefined') module.exports = rules;
  else root.WheelState = rules;
})(typeof window !== 'undefined' ? window : this);
