const e={interval:"hour",format:"Y-m-d H:00:00"},o={interval:"day",format:"Y-m-d"},a={interval:"month",format:"Y-m"},i=24*60*60*1e3;function m(r,n){const t=(n.getTime()-r.getTime())/i;return t<1?e:t<183?o:a}function s(r,n,t){return r.interval==="hour"?n:t}export{a as M,s as h,m as i};
//# sourceMappingURL=interval-DtKyyaa4.js.map
