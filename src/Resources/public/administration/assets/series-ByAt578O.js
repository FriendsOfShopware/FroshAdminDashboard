function a(t){const r=/^\d{4}-\d{2}$/.test(t)?`${t}-01`:t,e=Date.parse(r.replace(" ","T"));return Number.isNaN(e)?Date.parse(r):e}function n(t,r){return t.map(e=>({x:a(e.key),y:r(e)})).sort((e,s)=>e.x-s.x)}export{n as b,a as p};
//# sourceMappingURL=series-ByAt578O.js.map
