(async()=>{
  const status=document.getElementById("status"),link=document.getElementById("download");let url;
  try{
    const id=new URL(location.href).searchParams.get("report");
    if(!/^[a-zA-Z0-9-]{8,100}$/.test(id||""))throw new Error("Open Review and choose Download PDF again.");
    const key="reviewExport:"+id,report=(await chrome.storage.session.get(key))[key];
    if(!report||Date.now()-report.generatedAt>3600000)throw new Error("This report expired. Open Review and download it again.");
    await document.fonts.ready;
    const blob=await WordReviewPDF.generate(report);url=URL.createObjectURL(blob);
    link.href=url;link.download=WordReviewPDF.filename(report.site,report.generatedAt);link.hidden=false;
    status.textContent="Your PDF is ready. If the download did not start, click Download PDF.";
    link.click();
  }catch(error){status.textContent=error.message||"The PDF could not be created. Return to Review and retry.";}
  window.addEventListener("unload",()=>{if(url)URL.revokeObjectURL(url);});
})();