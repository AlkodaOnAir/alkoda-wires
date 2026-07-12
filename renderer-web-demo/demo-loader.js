function _notifyParentWhenReady(){
  const startedAt=Date.now();
  const maxWaitMs=15000;
  const notify=()=>{
    document.body.dataset.demoReady="1";
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:"wires-demo-ready"},"*");
    }
  };
  const check=()=>{
    const canvasRoot=document.getElementById("canvas-root");
    const nodes=[...document.querySelectorAll("#nodes-layer .node")];
    const cables=[...document.querySelectorAll("#cables-svg .cable-visual")];
    const images=[...document.querySelectorAll("#nodes-layer .node img")];
    const imagesReady=images.every(img=>img.complete&&img.naturalWidth>0);
    if(canvasRoot&&nodes.length>0&&cables.length>0&&imagesReady){
      requestAnimationFrame(()=>requestAnimationFrame(notify));
      return;
    }
    if(Date.now()-startedAt>maxWaitMs){
      notify();
      return;
    }
    setTimeout(check,120);
  };
  requestAnimationFrame(()=>requestAnimationFrame(check));
}
function _showStartupScreen(){
  const e=document.getElementById("startup-screen");
  e&&e.classList.add("hidden");
  loadState(window.DEMO_PROJECT_DATA);
  window.electronAPI&&window.electronAPI.setProjectOpen(!0);
  _notifyParentWhenReady();
}
const _realSetLang=setLang;
setLang=function(e){_realSetLang("en")};
const LICENSE={init:async()=>({isPro:!0,hasKey:!0,isExpired:!1}),initUI:()=>{},isPro:()=>!0,gate:(e,t)=>t(),showGate:()=>{},showPaywall:()=>{},getStatus:()=>({isPro:!0,hasKey:!0,isExpired:!1})};
