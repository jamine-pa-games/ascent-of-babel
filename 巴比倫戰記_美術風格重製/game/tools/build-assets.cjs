const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/X/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const original = path.resolve(root, '../原始素材/巴比倫戰記_美術與設定');
const art = path.join(root, 'art');
const png = path.join(root, 'production-png');
const atlasDir = path.join(root, 'atlases');
for (const p of [art,png,atlasDir]) fs.mkdirSync(p,{recursive:true});
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
async function main(){
  const sources = walk(original).filter(p=>/\.(png|jpg)$/i.test(p) && !path.basename(p).startsWith('00_'));
  const sizes={};
  for(const p of sources){
    const key=path.basename(p,path.extname(p)); const m=await sharp(p).metadata();
    sizes[key]={width:m.width,height:m.height};
    const out=path.join(art,key+(key.startsWith('sc_')?'.jpg':'.webp'));
    if(!fs.existsSync(out)) await sharp(p)[key.startsWith('sc_')?'jpeg':'webp']({quality:90}).toFile(out);
  }
  const manifestPath=path.join(__dirname,'atlas-manifest.json');
  const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):[];
  const extra=path.join(__dirname,'extra-atlas.json');if(fs.existsSync(extra))manifest.push(...JSON.parse(fs.readFileSync(extra,'utf8')));
  const report=[];
  for(const job of manifest){
    const saved=path.join(atlasDir,job.id+'.png');
    if(!fs.existsSync(saved)) fs.copyFileSync(job.path,saved);
    const m=await sharp(saved).metadata();
    const cellW=Math.floor(m.width/job.cols),cellH=Math.floor(m.height/job.rows);
    for(let i=0;i<job.keys.length;i++){
      const key=job.keys[i]; if(!key)continue;
      // Latest user artpack explicitly protects the jelly mascot and requires Q companions.
      // Keep supplied Q companions until a matching-proportion repaint is approved.
      if(key.startsWith('worn_') || key.startsWith('hum_')) {
        const source=sources.find(p=>path.basename(p,path.extname(p))===key);
        if(!source)throw Error('Missing protected original: '+key);
        fs.copyFileSync(source,path.join(png,key+'.png'));
        await sharp(source).webp({lossless:true,effort:5}).toFile(path.join(art,key+'.webp'));
        report.push({key,status:'preserved-original',reason:key.startsWith('worn_')?'mascot-identity-fixed':'Q-proportions-retained'});
        continue;
      }
      const output=path.join(art,key+(key.startsWith('sc_')?'.jpg':'.webp'));
      const done=path.join(png,key+'.png');
      if(fs.existsSync(done)){report.push({key,atlas:job.id,status:'generated'});continue;}
      const tile={left:(i%job.cols)*cellW,top:Math.floor(i/job.cols)*cellH,width:cellW,height:cellH};
      const crop=await sharp(saved).extract(tile).png().toBuffer();
      const s=sizes[key]||{width:512,height:512};
      if(key.startsWith('sc_')){
        await sharp(crop).resize(s.width,s.height,{fit:'cover'}).png().toFile(done);
        await sharp(done).jpeg({quality:88,mozjpeg:true}).toFile(output);
      }else if(job.id==='terrain'){
        await sharp(crop).removeAlpha().resize(s.width,s.height,{fit:'fill'}).png().toFile(done);
        await sharp(done).webp({quality:90}).toFile(output);
      }else{
        const stats=await sharp(crop).stats();
        if(stats.isOpaque)throw Error('Missing transparent alpha: '+key);
        const margin=key.startsWith('hum_')?0.04:0.055;
        const w=Math.floor(s.width*(1-2*margin)),h=Math.floor(s.height*(1-2*margin));
        const fitted=await sharp(crop).trim({threshold:12}).resize(w,h,{fit:'inside'}).png().toBuffer();
        const fm=await sharp(fitted).metadata();
        await sharp({create:{width:s.width,height:s.height,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
          .composite([{input:fitted,left:Math.floor((s.width-fm.width)/2),top:s.height-fm.height-Math.ceil(s.height*margin)}]).png().toFile(done);
        await sharp(done).webp({quality:92,alphaQuality:100,effort:5}).toFile(output);
      }
      report.push({key,atlas:job.id,status:'generated',width:s.width,height:s.height});
    }
  }
  const covered=new Set(report.map(r=>r.key));
  const remaining=Object.keys(sizes).filter(k=>!covered.has(k));
  const generated=report.filter(a=>a.status==='generated').length;
  const preserved=report.filter(a=>a.status==='preserved-original').length;
  fs.writeFileSync(path.join(root,'asset-report.json'),JSON.stringify({generated,preserved,remaining,assets:report},null,2));
  console.log(JSON.stringify({generated,preserved,remaining}));
}
main().catch(e=>{console.error(e);process.exit(1)});
