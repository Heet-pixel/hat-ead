/* =========================================================
   NATURA — app.js  (v3)
   ========================================================= */
'use strict';

/* ── HELPERS ─────────────────────────────────────────── */
function hexRgb(hex){
  const h=hex.replace('#','');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function shade(hex,amt){
  const [r,g,b]=hexRgb(hex);
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v+amt))).toString(16).padStart(2,'0')).join('');
}

/* ── GLB PARSER ──────────────────────────────────────── */
function b64ToBuffer(b64){
  const bin=atob(b64);
  const buf=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i);
  return buf.buffer;
}

function parseGLB(buffer){
  const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546C67) throw new Error('Not GLB');
  const c0len=view.getUint32(12,true);
  const jsonStr=new TextDecoder().decode(new Uint8Array(buffer,20,c0len));
  const gltf=JSON.parse(jsonStr);
  const binOff=20+c0len;
  const c1len=view.getUint32(binOff,true);
  const bin=new Uint8Array(buffer,binOff+8,c1len);
  return {gltf,bin};
}

/* ── THREE.JS SCENE ──────────────────────────────────── */
const canvas=document.getElementById('glCanvas');

const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.9;
renderer.physicallyCorrectLights=true;

const scene=new THREE.Scene();
scene.background=null;

const camera=new THREE.PerspectiveCamera(38,window.innerWidth/window.innerHeight,0.1,100);
camera.position.set(0,0.3,7);

/* lights */
scene.add(new THREE.AmbientLight(0xffeedd,0.65));

const keyL=new THREE.DirectionalLight(0xfff8e8,3.8);
keyL.position.set(3,7,5);
keyL.castShadow=true;
keyL.shadow.mapSize.set(2048,2048);
keyL.shadow.camera.near=0.5;
keyL.shadow.camera.far=30;
keyL.shadow.bias=-0.0005;
scene.add(keyL);

const fillL=new THREE.DirectionalLight(0xd4eeff,1.3);
fillL.position.set(-5,2,3);
scene.add(fillL);

const rimL=new THREE.DirectionalLight(0xffe8b0,1.8);
rimL.position.set(0,-1,-5);
scene.add(rimL);

const ptL=new THREE.PointLight(0xffffff,1.2,25);
ptL.position.set(0,7,1);
scene.add(ptL);

const btL=new THREE.PointLight(0x3d8c6a,0.6,15);
btL.position.set(0,-4,2);
scene.add(btL);

/* shadow + reflection planes */
const sMesh=new THREE.Mesh(
  new THREE.PlaneGeometry(9,9),
  new THREE.MeshBasicMaterial({color:0x0a1a10,transparent:true,opacity:0.25,depthWrite:false})
);
sMesh.rotation.x=-Math.PI/2; sMesh.position.y=-1.75; scene.add(sMesh);

const rMesh=new THREE.Mesh(
  new THREE.PlaneGeometry(6,6),
  new THREE.MeshBasicMaterial({color:0x3d8c6a,transparent:true,opacity:0.07,depthWrite:false})
);
rMesh.rotation.x=-Math.PI/2; rMesh.position.y=-1.73; scene.add(rMesh);

/* product group */
const prodGrp=new THREE.Group();
scene.add(prodGrp);

/* ── BUILD FROM GLB ──────────────────────────────────── */
function buildFromGLB(gltf,bin){
  const bvs=gltf.bufferViews||[];
  const accs=gltf.accessors||[];
  const mats=gltf.materials||[];
  const meshDefs=gltf.meshes||[];
  const nodes=gltf.nodes||[];
  const TS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};

  function getAcc(i){
    const a=accs[i],bv=bvs[a.bufferView];
    const bo=(bv.byteOffset||0)+(a.byteOffset||0);
    const n=a.count*TS[a.type];
    if(a.componentType===5126) return new Float32Array(bin.buffer,bin.byteOffset+bo,n);
    if(a.componentType===5125) return new Uint32Array(bin.buffer,bin.byteOffset+bo,n);
    if(a.componentType===5123) return new Uint16Array(bin.buffer,bin.byteOffset+bo,n);
    return new Float32Array(bin.buffer,bin.byteOffset+bo,n);
  }

  function makeMat(mi){
    if(mi===undefined||!mats[mi])
      return new THREE.MeshStandardMaterial({color:0x9ecf8a,metalness:0.1,roughness:0.4,envMapIntensity:2});
    const m=mats[mi],pbr=m.pbrMetallicRoughness||{};
    const bc=pbr.baseColorFactor||[1,1,1,1];
    const mat=new THREE.MeshStandardMaterial({
      color:new THREE.Color(bc[0],bc[1],bc[2]),
      metalness:pbr.metallicFactor!==undefined?pbr.metallicFactor:0.1,
      roughness:pbr.roughnessFactor!==undefined?pbr.roughnessFactor:0.5,
      transparent:m.alphaMode==='BLEND',
      opacity:m.alphaMode==='BLEND'?bc[3]:1,
      side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide,
      envMapIntensity:pbr.metallicFactor>0.5?3.0:2.0,
    });
    return mat;
  }

  function procNode(n){
    const obj=new THREE.Group();
    if(n.matrix){obj.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));}
    else{
      if(n.translation) obj.position.fromArray(n.translation);
      if(n.rotation)    obj.quaternion.fromArray(n.rotation);
      if(n.scale)       obj.scale.fromArray(n.scale);
    }
    if(n.mesh!==undefined){
      meshDefs[n.mesh].primitives.forEach(prim=>{
        const geo=new THREE.BufferGeometry();
        const pos=getAcc(prim.attributes.POSITION);
        geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));
        if(prim.attributes.NORMAL!==undefined){
          const nd=getAcc(prim.attributes.NORMAL);
          geo.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(nd),3));
        }
        if(prim.attributes.TEXCOORD_0!==undefined){
          const ud=getAcc(prim.attributes.TEXCOORD_0);
          geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(ud),2));
        }
        if(prim.indices!==undefined){
          const id=getAcc(prim.indices);
          const i32=new Uint32Array(id.length);
          for(let k=0;k<id.length;k++) i32[k]=id[k];
          geo.setIndex(new THREE.BufferAttribute(i32,1));
        }
        if(!prim.attributes.NORMAL) geo.computeVertexNormals();
        geo.computeBoundingSphere();
        const mesh=new THREE.Mesh(geo,makeMat(prim.material));
        mesh.castShadow=true; mesh.receiveShadow=true;
        obj.add(mesh);
      });
    }
    if(n.children) n.children.forEach(ci=>obj.add(procNode(nodes[ci])));
    return obj;
  }

  const sNodes=(gltf.scenes&&gltf.scenes[gltf.scene||0]&&gltf.scenes[gltf.scene||0].nodes)||nodes.map((_,i)=>i);
  sNodes.forEach(ni=>prodGrp.add(procNode(nodes[ni])));
  centerAndScale(prodGrp,3.2);
}

/* ── FALLBACK JAR ────────────────────────────────────── */
function buildFallback(){
  function cyl(rt,rb,h,s,mat){return new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s),mat);}
  function mat(c,m=0,r=0.4,t=false,o=1){
    return new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r,transparent:t,opacity:o,envMapIntensity:2.2});
  }
  const body=cyl(1.15,1.22,1.6,80,mat(0x8ab89a,0.05,0.25,true,0.92)); body.position.y=0.8; body.castShadow=true;
  const shldr=cyl(1.15,1.15,0.18,80,mat(0x7aaa8a,0.06,0.28)); shldr.position.y=1.69; shldr.castShadow=true;
  const lid=cyl(1.28,1.28,0.46,80,mat(0xc9a84c,0.85,0.15)); lid.position.y=1.69+0.18+0.23; lid.castShadow=true;
  const lidT=cyl(1.22,1.22,0.08,80,mat(0xe8d49e,0.92,0.1)); lidT.position.y=1.69+0.18+0.46+0.04;
  const emb=cyl(0.2,0.2,0.03,32,mat(0x1a3d2b,0.4,0.3)); emb.position.y=1.69+0.18+0.46+0.08+0.015;
  const cream=cyl(0.95,0.95,0.04,80,mat(0xf2e9d0,0,0.65)); cream.position.y=1.69+0.18-0.02;
  [body,shldr,lid,lidT,emb,cream].forEach(m=>prodGrp.add(m));
  centerAndScale(prodGrp,3.2);
}

function centerAndScale(grp,fitSize){
  const box=new THREE.Box3().setFromObject(grp);
  const cen=box.getCenter(new THREE.Vector3());
  const siz=box.getSize(new THREE.Vector3());
  const sc=fitSize/Math.max(siz.x,siz.y,siz.z);
  grp.position.sub(cen.multiplyScalar(sc));
  grp.scale.setScalar(sc);
  grp.position.y+=0.15;
}

/* ── INIT SCENE ──────────────────────────────────────── */
(function initScene(){
  try{
    const {gltf,bin}=parseGLB(b64ToBuffer(window.GLB_B64||''));
    buildFromGLB(gltf,bin);
    console.log('GLB loaded ✓');
  }catch(e){
    console.warn('Using fallback jar:',e.message);
    buildFallback();
  }
})();

/* ── RENDER LOOP ─────────────────────────────────────── */
let targetP=0, curP=0, floatT=0;
const showcase=document.getElementById('showcase');

window.addEventListener('scroll',function(){
  const rect=showcase.getBoundingClientRect();
  const total=showcase.offsetHeight-window.innerHeight;
  targetP=Math.max(0,Math.min(1,-rect.top/total));
},{passive:true});

const barFill=document.getElementById('barFill');
const ringFl=document.getElementById('ringFl');
const degLbl=document.getElementById('degLbl');
const panels=document.querySelectorAll('.sc-panel');
const CIRC=175.93;

(function loop(){
  requestAnimationFrame(loop);
  curP+=(targetP-curP)*0.10;
  floatT+=0.012;
  prodGrp.rotation.y=curP*Math.PI*2;
  /* subtle vertical float */
  prodGrp.position.y=0.15+Math.sin(floatT)*0.06;
  /* UI */
  barFill.style.width=(curP*100)+'%';
  ringFl.style.strokeDashoffset=CIRC*(1-curP);
  degLbl.textContent=Math.round(curP*360)+'°';
  /* panels */
  const stage=Math.min(3,Math.floor(curP*4));
  panels.forEach(function(p,i){ p.classList.toggle('on',i===stage); });
  /* shadow pulse */
  const pulse=1+Math.sin(curP*Math.PI*2)*0.04;
  sMesh.scale.set(pulse,1,pulse);
  renderer.render(scene,camera);
})();

/* ── RESIZE ──────────────────────────────────────────── */
window.addEventListener('resize',function(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
});

/* ── NAVBAR ──────────────────────────────────────────── */
var navEl=document.getElementById('navEl');
window.addEventListener('scroll',function(){
  navEl.classList.toggle('sc',window.scrollY>60);
},{passive:true});
var hamBtn=document.getElementById('hamBtn');
var navLinks=document.getElementById('navLinks');
hamBtn.addEventListener('click',function(){ navLinks.classList.toggle('open'); });
document.addEventListener('click',function(e){
  if(!navEl.contains(e.target)) navLinks.classList.remove('open');
});

/* ── HERO PARTICLES ──────────────────────────────────── */
(function spawnPts(){
  var c=document.getElementById('heroPts');
  for(var i=0;i<28;i++){
    var pt=document.createElement('div');
    pt.className='pt';
    var sz=Math.random()*3+1.5;
    pt.style.cssText='width:'+sz+'px;height:'+sz+'px;left:'+
      (Math.random()*100)+'%;bottom:-6px;animation-duration:'+
      (Math.random()*12+8)+'s;animation-delay:'+
      (Math.random()*10)+'s;';
    c.appendChild(pt);
  }
})();

/* ── SHOWCASE WISHLIST ───────────────────────────────── */
var scWishBtn=document.getElementById('scWishBtn');
var scWished=false;
scWishBtn.addEventListener('click',function(){
  scWished=!scWished;
  scWishBtn.textContent=scWished?'❤️ Wishlisted':'🤍 Wishlist';
  scWishBtn.classList.toggle('on',scWished);
});

/* ── CART / TOAST ────────────────────────────────────── */
var cartN=0;
var cartBadgeEl=document.getElementById('cartBadge');
var toastEl=document.getElementById('toastEl');
var toastMsgEl=document.getElementById('toastMsg');

function addCart(name){
  cartN++;
  cartBadgeEl.textContent=cartN;
  cartBadgeEl.classList.add('v');
  toastMsgEl.textContent='"'+name+'" added to cart!';
  toastEl.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer=setTimeout(function(){ toastEl.classList.remove('show'); },2800);
}
window.addCart=addCart;

/* ── PRODUCT DATA ────────────────────────────────────── */
var PRODS=[
  /* FACE */
  {id:1,cat:'face',name:'Aloe Vera Face Cream',tag:'Best Seller',tagCls:'',
   desc:'72-hour hydration with pure aloe vera & vitamin E. Weightless gel-cream for all skin types.',
   price:'₹599',orig:'₹899',rating:4.9,rev:2841,
   shape:'jar',jarBody:'#8ab89a',jarLid:'#c9a84c',lbl:'NATURA'},
  {id:2,cat:'face',name:'Rose Glow Serum',tag:'New',tagCls:'new-tag',
   desc:'Rose water + niacinamide brightening serum. Visibly evens skin tone in 4 weeks.',
   price:'₹849',orig:'₹1199',rating:4.8,rev:1423,
   shape:'bottle',col:'#f5c0c8',col2:'#e89aab'},
  {id:3,cat:'face',name:'Overnight Repair Mask',tag:'',tagCls:'',
   desc:'Shea butter + green tea night mask. Wake up to firmer, plumper, more radiant skin.',
   price:'₹749',orig:'₹999',rating:4.7,rev:987,
   shape:'jar',jarBody:'#2d6a4f',jarLid:'#c9a84c',lbl:'MASK'},
  {id:4,cat:'face',name:'SPF 50 Sunscreen Gel',tag:'',tagCls:'',
   desc:'Lightweight SPF 50+ PA++++. No white cast, no grease, no clogged pores.',
   price:'₹449',orig:'₹599',rating:4.8,rev:3891,
   shape:'tube',col:'#f8f0d8',col2:'#c9a84c'},

  /* BODY */
  {id:5,cat:'body',name:'Botanical Body Wash',tag:'Trending',tagCls:'trend',
   desc:'Coconut milk & lavender body wash. Sulphate-free, lathers richly, leaves skin silky.',
   price:'₹399',orig:'₹549',rating:4.8,rev:3241,
   shape:'bottle',col:'#b2d8c5',col2:'#3d8c6a'},
  {id:6,cat:'body',name:'Shea Body Butter',tag:'',tagCls:'',
   desc:'Unrefined shea + sweet almond oil whipped body butter. 24h moisture from first use.',
   price:'₹649',orig:'₹849',rating:4.6,rev:1102,
   shape:'jar',jarBody:'#e8d49e',jarLid:'#c9a84c',lbl:'SHEA'},
  {id:7,cat:'body',name:'Rose Petal Scrub',tag:'',tagCls:'',
   desc:'Brown sugar + rose petal exfoliant. Buffs away dullness revealing glowing new skin.',
   price:'₹499',orig:'₹699',rating:4.7,rev:876,
   shape:'jar',jarBody:'#f5c0c8',jarLid:'#e8d49e',lbl:'SCRUB'},
  {id:8,cat:'body',name:'Neem & Turmeric Soap',tag:'',tagCls:'',
   desc:'Cold-pressed neem & turmeric bar soap. Anti-bacterial, anti-acne, 100% natural.',
   price:'₹149',orig:'₹199',rating:4.7,rev:4218,
   shape:'bar',col:'#e8d49e',col2:'#c9a84c'},

  /* LIPS */
  {id:9,cat:'lips',name:'Honey Lip Balm',tag:'Fan Fave',tagCls:'',
   desc:'Raw honey + beeswax lip balm. Repairs dry, chapped lips overnight. 5 natural shades.',
   price:'₹199',orig:'₹299',rating:4.9,rev:5432,
   shape:'balm',col:'#f5c0c8',col2:'#e89aab'},
  {id:10,cat:'lips',name:'Berry Tinted Lip Oil',tag:'',tagCls:'',
   desc:'Jojoba oil + vitamin E tinted lip oil. A sheer wash of colour with major shine.',
   price:'₹279',orig:'₹399',rating:4.8,rev:2109,
   shape:'balm',col:'#c9506a',col2:'#a03050'},

  /* HAIR */
  {id:11,cat:'hair',name:'Amla Growth Serum',tag:'New',tagCls:'new-tag',
   desc:'Amla oil + bhringraj scalp serum. Clinically reduces hair fall in 8 weeks.',
   price:'₹699',orig:'₹999',rating:4.6,rev:1324,
   shape:'bottle',col:'#2d6a4f',col2:'#1a3d2b'},
  {id:12,cat:'hair',name:'Coconut Hair Mask',tag:'',tagCls:'',
   desc:'Deep conditioning coconut + hibiscus mask. Detangles, strengthens, adds serious shine.',
   price:'₹549',orig:'₹749',rating:4.8,rev:2087,
   shape:'jar',jarBody:'#f5f1e8',jarLid:'#c9a84c',lbl:'HAIR'},
];

/* ── BUILD PRODUCT HTML SHAPE ────────────────────────── */
function buildShape(p){
  if(p.shape==='jar'){
    var lb=p.jarLid, db=shade(p.jarLid,-28), lt=shade(p.jarLid,18);
    var bb=p.jarBody, bd=shade(p.jarBody,-18), blt=shade(p.jarBody,15);
    return '<div class="shape-jar">'
      +'<div class="jar-lid" style="background:linear-gradient(160deg,'+lt+','+lb+','+db+')"></div>'
      +'<div class="jar-body" style="background:linear-gradient(130deg,'+blt+','+bb+' 40%,'+bd+')">'
      +'<div class="jar-shine"></div>'
      +'<div class="jar-lbl">'+p.lbl+'</div>'
      +'</div>'
      +'<div class="jar-shadow"></div></div>';
  }
  if(p.shape==='tube'){
    
    return '<div class="shape-tube">'
      +'<div class="tube-cap" style="background:linear-gradient(120deg,'+shade(p.col2,14)+','+p.col2+')"></div>'
      +'<div class="tube-body" style="background:linear-gradient(100deg,'+shade(p.col,16)+','+p.col+' 40%,'+shade(p.col,-14)+')">'
      +'<div class="tube-lbl">NATURA</div></div>'
      +'<div class="tube-shadow"></div></div>';
  }
  if(p.shape==='bottle'){
    return '<div class="shape-bottle">'
      +'<div class="bottle-cap" style="background:linear-gradient(120deg,'+shade(p.col2,16)+','+p.col2+')"></div>'
      +'<div class="bottle-neck" style="background:linear-gradient(100deg,'+shade(p.col,10)+','+p.col+')"></div>'
      +'<div class="bottle-body" style="background:linear-gradient(120deg,'+shade(p.col,18)+','+p.col+' 35%,'+shade(p.col,-20)+')">'
      +'<div class="bottle-lbl">NATURA</div></div>'
      +'<div class="bottle-shadow"></div></div>';
  }
  if(p.shape==='bar'){
    return '<div class="shape-bar">'
      +'<div class="bar-body" style="background:linear-gradient(135deg,'+shade(p.col,16)+','+p.col+','+shade(p.col,-16)+')">'
      +'<div class="bar-lbl">NATURA</div></div>'
      +'<div class="bar-shadow"></div></div>';
  }
  if(p.shape==='balm'){
    return '<div class="shape-balm">'
      +'<div class="balm-tip" style="background:'+p.col+'"></div>'
      +'<div class="balm-body" style="background:linear-gradient(160deg,'+shade(p.col2,20)+','+p.col2+','+shade(p.col2,-16)+')">'
      +'<div class="balm-lbl">NATURA</div></div>'
      +'<div class="balm-shadow"></div></div>';
  }
  return '<div style="font-size:3.5rem">🌿</div>';
}

/* ── RENDER PRODUCTS ─────────────────────────────────── */
var wishSet={};
function renderProds(filter){
  filter=filter||'all';
  var grid=document.getElementById('pgrid');
  grid.innerHTML='';
  var list=filter==='all'?PRODS:PRODS.filter(function(x){return x.cat===filter;});
  list.forEach(function(p,idx){
    var liked=!!wishSet[p.id];
    var card=document.createElement('div');
    card.className='pcard rv d'+(idx%4+1);
    var badgeHtml=p.tag
      ?'<div class="p-badge '+p.tagCls+'">'+p.tag+'</div>':'' ;
    var starsHtml='<span class="p-stars">'
      +(p.rating>=4.9?'★★★★★':p.rating>=4.7?'★★★★½':'★★★★☆')+'</span>';
    card.innerHTML=
      '<div class="pcard-img '+p.cat+'">'
       +badgeHtml
       +'<button class="p-wish" data-id="'+p.id+'">'+(liked?'❤️':'🤍')+'</button>'
       +'<div class="pv-wrap">'+buildShape(p)+'</div>'
      +'</div>'
      +'<div class="pcard-body">'
       +'<div class="p-cat">'+p.cat+'</div>'
       +'<div class="p-name">'+p.name+'</div>'
       +'<div class="p-desc">'+p.desc+'</div>'
       +'<div class="p-rating">'+starsHtml+'<span class="p-rn">'+p.rating+' ('+p.rev.toLocaleString()+')</span></div>'
       +'<div class="p-footer">'
        +'<div class="p-price">'
         +'<span class="p-cur">'+p.price+'</span>'
         +'<span class="p-orig">'+p.orig+'</span>'
        +'</div>'
        +'<button class="p-add" data-name="'+p.name+'">🛒 Add to Cart</button>'
       +'</div>'
      +'</div>';

    /* wishlist */
    card.querySelector('.p-wish').addEventListener('click',function(){
      var id=this.getAttribute('data-id');
      wishSet[id]=!wishSet[id];
      this.textContent=wishSet[id]?'❤️':'🤍';
    });
    /* add to cart */
    card.querySelector('.p-add').addEventListener('click',function(){
      addCart(this.getAttribute('data-name'));
      var btn=this;
      btn.textContent='✅ Added!';
      setTimeout(function(){ btn.textContent='🛒 Add to Cart'; },1900);
    });
    grid.appendChild(card);
  });
  revealObserve();
}

/* ── FILTER TABS ─────────────────────────────────────── */
document.querySelectorAll('.ftab').forEach(function(tab){
  tab.addEventListener('click',function(){
    document.querySelectorAll('.ftab').forEach(function(t){ t.classList.remove('on'); });
    this.classList.add('on');
    renderProds(this.getAttribute('data-f'));
  });
});

/* ── SCROLL REVEAL ───────────────────────────────────── */
function revealObserve(){
  var els=document.querySelectorAll('.rv:not(.in)');
  if(!els.length) return;
  var obs=new IntersectionObserver(function(ents){
    ents.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }
    });
  },{threshold:0.1});
  els.forEach(function(el){ obs.observe(el); });
}
window.addEventListener('scroll',revealObserve,{passive:true});

/* ── INIT ────────────────────────────────────────────── */
renderProds('all');
revealObserve();
