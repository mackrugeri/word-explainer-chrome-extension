import {getDocument,GlobalWorkerOptions} from './vendor/pdfjs/pdf.mjs';
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
const input=document.getElementById('pdf-file'),pages=document.getElementById('pdf-pages'),status=document.getElementById('pdf-status');
let generation=0,task=null;
input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  const current=++generation;if(task){await task.destroy().catch(()=>{});task=null;}pages.replaceChildren();
  if(file.size>50*1024*1024){status.textContent='Choose a PDF smaller than 50 MB.';return;}
  status.textContent='Opening '+file.name+'…';let readable=0;
  try{
    const data=new Uint8Array(await file.arrayBuffer());if(current!==generation)return;
    task=getDocument({data,isEvalSupported:false,useWasm:false,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href});
    const pdf=await task.promise;if(current!==generation)return;
    const count=Math.min(pdf.numPages,300);document.title=file.name+' · PDF Text Reader';
    for(let number=1;number<=count;number++){
      const page=await pdf.getPage(number);const content=await page.getTextContent();if(current!==generation)return;
      const text=content.items.filter(item=>typeof item.str==='string').map(item=>item.str+(item.hasEOL?'\n':' ')).join('').replace(/[ \t]+\n/g,'\n').trim();
      const section=document.createElement('section');section.className='pdf-page';section.setAttribute('aria-label','PDF page '+number);
      const title=document.createElement('h2');title.textContent=file.name+' · Page '+number;section.appendChild(title);
      const body=document.createElement(text?'pre':'p');body.textContent=text||'No selectable text on this page. Scanned images require OCR, which is not included.';if(!text)body.className='empty';else readable++;
      section.appendChild(body);pages.appendChild(section);page.cleanup();status.textContent=`Reading page ${number} of ${count}…`;
    }
    status.textContent=readable?`${file.name} · ${count} of ${pdf.numPages} pages loaded. Select text and use the shortcut. Extracted formatting and reading order may differ from the original PDF.`:'This PDF has no readable text. Image-only PDFs require OCR.';
  }catch(error){if(current!==generation)return;status.textContent=error.name==='PasswordException'?'This PDF needs a password. Choose an unlocked copy.':'Could not read this PDF. It may be damaged, unsupported, or require a password.';}
});
