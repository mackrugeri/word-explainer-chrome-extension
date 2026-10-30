// Local canvas rendering preserves the browser's Unicode shaping, including Urdu.
// PDF pages embed those rendered images; no report content is sent to a server.
(() => {
  const W=595.28,H=841.89,M=44,TOP=98,BOTTOM=H-52;
  const encoder=new TextEncoder();
  function pdf(images) {
    const parts=[],offsets=[0];let length=0;
    const add=value=>{const bytes=typeof value==="string"?encoder.encode(value):value;parts.push(bytes);length+=bytes.length;};
    const object=(id,body)=>{offsets[id]=length;add(`${id} 0 obj\n`);body();add("\nendobj\n");};
    add("%PDF-1.4\n% Word Explainer review\n");
    object(1,()=>add("<< /Type /Catalog /Pages 2 0 R >>"));
    object(2,()=>add(`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(" ")}] >>`));
    images.forEach((image,i)=>{
      const page=3+i*3,picture=page+1,content=page+2;
      object(page,()=>add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im ${picture} 0 R >> >> /Contents ${content} 0 R >>`));
      object(picture,()=>{add(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);add(image.bytes);add("\nendstream");});
      const command=`q ${W} 0 0 ${H} 0 0 cm /Im Do Q\n`;
      object(content,()=>add(`<< /Length ${encoder.encode(command).length} >>\nstream\n${command}endstream`));
    });
    const xref=length;add(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
    for(const offset of offsets.slice(1))add(`${String(offset).padStart(10,"0")} 00000 n \n`);
    add(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts,{type:"application/pdf"});
  }
  const text=value=>String(value||"").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,"");
  function wrap(ctx,value,width) {
    const lines=[];
    for(const paragraph of text(value).split(/\r?\n/)){
      let line="";
      for(const word of paragraph.split(/\s+/).filter(Boolean)){
        if(line&&ctx.measureText(line+" "+word).width>width){lines.push(line);line="";}
        if(ctx.measureText(word).width>width){
          const chars=typeof Intl.Segmenter==="function"?[...new Intl.Segmenter(undefined,{granularity:"grapheme"}).segment(word)].map(s=>s.segment):Array.from(word);
          for(const char of chars){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line="";}line+=char;}
        }else line=line?line+" "+word:word;
      }
      lines.push(line);
    }
    return lines;
  }
  async function generate(report,makeCanvas=()=>document.createElement("canvas")) {
    if(!Array.isArray(report.items)||!report.items.length)throw new Error("There are no saved summaries to download.");
    const canvas=makeCanvas();canvas.width=Math.ceil(W*2);canvas.height=Math.ceil(H*2);
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("PDF rendering is unavailable in this browser.");
    const font=(size,bold=false)=>`${bold?"600":"400"} ${size}px Arial, "Geeza Pro", sans-serif`;
    const blocks=[];
    report.items.forEach((item,index)=>{
      blocks.push({value:`${index+1}. ${text(item.text)}`,size:13,bold:true,gap:8,keep:45});
      for(const note of item.notes||[]){
        const label=note.action==="translate"?`Translation - ${text(note.language)}`:`${note.provider==="gemini"?"Gemini":"ChatGPT"} explanation`;
        blocks.push({value:label,size:9,bold:true,color:"#16654f",gap:4});
        blocks.push({value:note.summary,size:11,gap:8});
        if(note.sourceUrl)blocks.push({value:`Source: ${text(note.sourceUrl)}`,size:8,color:"#61756f",gap:3});
        if(Number.isFinite(note.updatedAt))blocks.push({value:`Saved: ${new Date(note.updatedAt).toLocaleString()}`,size:8,color:"#61756f",gap:9});
      }
      blocks.push({value:"",size:5,gap:7});
    });
    const pages=[[]];let y=TOP;
    for(const block of blocks){
      ctx.font=font(block.size,block.bold);const lines=wrap(ctx,block.value,W-2*M),height=block.size*1.55;
      if(block.keep&&y+height+block.keep>BOTTOM){pages.push([]);y=TOP;}
      for(const line of lines){
        if(y+height>BOTTOM){pages.push([]);y=TOP;}
        pages.at(-1).push({...block,value:line,y});y+=height;
      }
      y+=block.gap;
    }
    const images=[];
    for(let i=0;i<pages.length;i++){
      ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle="#ffffff";ctx.fillRect(0,0,W,H);
      ctx.direction="ltr";ctx.textAlign="left";ctx.textBaseline="top";
      ctx.fillStyle="#16654f";ctx.font=font(10,true);ctx.fillText("WORD EXPLAINER / REVIEW",M,28);
      ctx.fillStyle="#19332e";ctx.font=font(21,true);ctx.fillText("Your saved summaries",M,45);
      ctx.fillStyle="#61756f";ctx.font=font(9);ctx.fillText(`${new URL(report.site).hostname} - ${report.items.length} concepts`,M,74);
      for(const line of pages[i]){
        const rtl=/[\u0590-\u08ff]/.test(line.value);ctx.direction=rtl?"rtl":"ltr";ctx.textAlign=rtl?"right":"left";
        ctx.font=font(line.size,line.bold);ctx.fillStyle=line.color||"#19332e";ctx.fillText(line.value,rtl?W-M:M,line.y);
      }
      ctx.direction="ltr";ctx.textAlign="left";ctx.fillStyle="#61756f";ctx.font=font(8);
      ctx.fillText(`Exported ${new Date(report.generatedAt).toLocaleDateString()} - Saved review excerpts`,M,H-32);
      ctx.textAlign="right";ctx.fillText(`${i+1} / ${pages.length}`,W-M,H-32);
      const binary=atob(canvas.toDataURL("image/jpeg",0.94).split(",")[1]);
      images.push({width:canvas.width,height:canvas.height,bytes:Uint8Array.from(binary,char=>char.charCodeAt(0))});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    return pdf(images);
  }
  function filename(site,date=Date.now()) {
    const host=new URL(site).hostname.replace(/[^a-zA-Z0-9.-]/g,"_").slice(0,100);
    return `word-explainer-${host}-${new Date(date).toISOString().slice(0,10)}.pdf`;
  }
  globalThis.WordReviewPDF={generate,pdf,wrap,filename};
})();
