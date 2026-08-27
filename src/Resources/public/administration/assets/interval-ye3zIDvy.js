const e={interval:"hour",format:"Y-m-d H:00:00"},a={interval:"day",format:"Y-m-d"},o={interval:"month",format:"Y-m"},i=24*60*60*1e3;function s(r,n){const t=(n.getTime()-r.getTime())/i;return t<1?e:t<183?a:o}function m(r,n,t){return r.interval==="hour"?n:t}export{a as D,o as M,m as h,s as i};
//# sourceMappingURL=interval-ye3zIDvy.js.map
