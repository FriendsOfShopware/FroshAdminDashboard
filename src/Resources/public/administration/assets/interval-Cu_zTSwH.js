const e={interval:"hour",format:"Y-m-d H:00:00"},o={interval:"day",format:"Y-m-d"},i={interval:"month",format:"Y-m"},a=24*60*60*1e3;function m(r,n){const t=(n.getTime()-r.getTime())/a;return t<1?e:t<183?o:i}function s(r,n,t){return r.interval==="hour"?n:t}export{s as h,m as i};
//# sourceMappingURL=interval-Cu_zTSwH.js.map
