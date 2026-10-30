// A bounded, local parser for common selectable math and LaTeX; never evaluates input.
(() => {
  const names='alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega'.split(' ');
  const lower=[...'αβγδεζηθικλμνξοπρστυφχψω'],upper=[...'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'];
  const greek={};names.forEach((name,i)=>{greek[lower[i]]=name;greek[upper[i]]='capital '+name;});
  Object.assign(greek,{'ς':'sigma','ϵ':'epsilon','ϑ':'theta','ϕ':'phi','ϱ':'rho','ϖ':'pi'});
  const commands=Object.fromEntries(names.map(name=>[name,name]));
  for(const name of names)commands[name[0].toUpperCase()+name.slice(1)]='capital '+name;
  Object.assign(commands,{varepsilon:'epsilon',vartheta:'theta',varphi:'phi',varrho:'rho',varpi:'pi',varsigma:'sigma',infty:'infinity',partial:'partial',nabla:'nabla',ell:'ell',hbar:'h bar',emptyset:'empty set',forall:'for all',exists:'there exists'});
  const functions={sin:'sine',cos:'cosine',tan:'tangent',cot:'cotangent',sec:'secant',csc:'cosecant',arcsin:'arc sine',arccos:'arc cosine',arctan:'arc tangent',sinh:'hyperbolic sine',cosh:'hyperbolic cosine',tanh:'hyperbolic tangent',log:'log',ln:'natural log',exp:'exponential',min:'minimum',max:'maximum',lim:'limit',det:'determinant'};
  const operators={'+':'plus','-':'minus','=':'equals','<':'less than','>':'greater than','≤':'less than or equal to','≥':'greater than or equal to','≠':'not equal to','≈':'approximately equal to','±':'plus or minus','∓':'minus or plus','∝':'proportional to','→':'approaches','↔':'if and only if','∈':'is an element of','∉':'is not an element of','⊂':'is a subset of','⊆':'is a subset of or equal to','∪':'union','∩':'intersection','∧':'and','∨':'or',',':'comma',';':'semicolon',':':'colon','*':'times'};
  const operatorCommands={times:'*',cdot:'*',div:'/',le:'≤',leq:'≤',ge:'≥',geq:'≥',ne:'≠',neq:'≠',approx:'≈',pm:'±',mp:'∓',propto:'∝',to:'→',rightarrow:'→',leftrightarrow:'↔',in:'∈',notin:'∉',subset:'⊂',subseteq:'⊆',cup:'∪',cap:'∩',land:'∧',lor:'∨',colon:':',equiv:'≡'};
  operators['≡']='is equivalent to';
  const formats=new Set(['left','right','displaystyle','textstyle','scriptstyle','limits','nolimits','quad','qquad']);
  const supers=Object.fromEntries([...'⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱ'].map((c,i)=>[c,[...'0123456789+-()ni'][i]]));
  const subs=Object.fromEntries([...'₀₁₂₃₄₅₆₇₈₉₊₋₍₎ₙᵢ'].map((c,i)=>[c,[...'0123456789+-()ni'][i]]));
  const fail=message=>{throw new Error(message);};
  function tokenize(value){
    let source=value.trim();
    if(source.startsWith('$$')&&source.endsWith('$$'))source=source.slice(2,-2);
    else if(source.startsWith('$')&&source.endsWith('$'))source=source.slice(1,-1);
    else if((source.startsWith('\\(')&&source.endsWith('\\)'))||(source.startsWith('\\[')&&source.endsWith('\\]')))source=source.slice(2,-2);
    source=source.replace(/<->/g,'↔').replace(/->/g,'→').replace(/<=/g,'≤').replace(/>=/g,'≥').replace(/!=/g,'≠').replace(/==/g,'=');
    source=source.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ⁿⁱ]+/gu,text=>'^{'+[...text].map(c=>supers[c]).join('')+'}')
      .replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₍₎ₙᵢ]+/gu,text=>'_{'+[...text].map(c=>subs[c]).join('')+'}')
      .replace(/[−–]/g,'-').replace(/[×·⋅]/g,'*').replace(/÷/g,'/').replace(/½/g,'\\frac{1}{2}').replace(/¼/g,'\\frac{1}{4}').replace(/¾/g,'\\frac{3}{4}');
    const tokens=[];let i=0;
    while(i<source.length){
      if(/[\s\u200B\uFEFF]/u.test(source[i])){i++;continue;}
      const rest=source.slice(i);let match;
      if(source[i]==='\\'){
        match=rest.match(/^\\([A-Za-z]+)/);
        if(match){i+=match[0].length;const name=match[1];if(formats.has(name))continue;
          if(Object.hasOwn(commands,name))tokens.push({type:'atom',text:commands[name]});
          else if(Object.hasOwn(functions,name))tokens.push({type:'function',text:functions[name]});
          else if(Object.hasOwn(operatorCommands,name))tokens.push({type:'op',text:operatorCommands[name]});
          else if(['frac','dfrac','tfrac','sqrt','sum','prod','int','oint','text','mathrm','mathbf','mathit','operatorname','vec','hat','bar','dot','ddot','overline'].includes(name))tokens.push({type:name,text:name});
          else fail('Unsupported LaTeX command: '+name+'. Use common math notation or plain selectable text.');
          continue;
        }
        const escaped=source[i+1];if([',',';','!',' '].includes(escaped)){i+=2;continue;}
        if(['{','}','%','_'].includes(escaped)){tokens.push({type:'atom',text:({'{':'open brace','}':'close brace','%':'percent','_':'underscore'})[escaped]});i+=2;continue;}
        fail('Unsupported or incomplete LaTeX escape.');
      }
      if((match=rest.match(/^(?:\d+(?:\.\d+)?|\.\d+)/))){tokens.push({type:'atom',text:match[0]});i+=match[0].length;continue;}
      if((match=rest.match(/^[A-Za-z]+/))){const word=match[0];tokens.push({type:Object.hasOwn(functions,word)?'function':'atom',text:functions[word]||(names.includes(word.toLowerCase())?word.toLowerCase():word.length<=3?[...word].join(' '):word)});i+=word.length;continue;}
      const char=source[i++];
      if(greek[char])tokens.push({type:'atom',text:greek[char]});
      else if(char==='∞')tokens.push({type:'atom',text:'infinity'});
      else if(['∑','∏','∫','∮','√'].includes(char))tokens.push({type:({'∑':'sum','∏':'prod','∫':'int','∮':'oint','√':'sqrt'})[char],text:char});
      else if(['∂','∇','∅'].includes(char))tokens.push({type:'atom',text:({'∂':'partial','∇':'nabla','∅':'empty set'})[char]});
      else if('{}()[]^_'.includes(char))tokens.push({type:char,text:char});
      else if(char==='/'||Object.hasOwn(operators,char))tokens.push({type:'op',text:char});
      else if(['%','!','°',"'",'′','″'].includes(char))tokens.push({type:'postfix',text:({'%':'percent','!':'factorial','°':'degrees',"'":'prime','′':'prime','″':'double prime'})[char]});
      else fail('Unsupported mathematical character. Try plain text or basic LaTeX.');
      if(tokens.length>1600)fail('The equation is too complex to read safely. Select a smaller part.');
    }
    if(tokens.length>1600)fail('The equation is too complex to read safely. Select a smaller part.');
    return tokens;
  }
  function toSpeech(input){
    try{
      if(typeof input!=='string'||!input.trim())fail('Select an equation or Greek symbol first.');
      if(input.length>4000)fail('Select up to 4,000 characters for equation pronunciation.');
      if(!/[\\\dα-ωΑ-Ωϵϑϕϱϖ∞∂∇∑∏∫∮√+\-=*/^_<>≤≥≠≈±∓∝→↔∈∉⊂⊆∪∩∧∨%!°⁰-⁹₀-₉]/u.test(input)&&!names.includes(input.trim().toLowerCase())&&!/^[A-Za-z]$/.test(input.trim()))fail('No supported equation or Greek symbol found. Use Listen for ordinary text.');
      const tokens=tokenize(input);let at=0,depth=0;
      const peek=()=>tokens[at];const take=()=>tokens[at++];
      function sequence(end){
        if(++depth>24)fail('The equation is nested too deeply. Select a smaller part.');
        const nodes=[];let needsValue=true;
        while(at<tokens.length&&peek().type!==end){
          const token=peek();
          if(['}',')',']'].includes(token.type))fail('The equation has mismatched brackets.');
          if(token.type==='op'){
            if(needsValue){if(['-','+','±'].includes(token.text)){take();const value=scripted();nodes.push({text:({'-':'negative','+':'positive','±':'plus or minus'})[token.text]+' '+value.text});needsValue=false;continue;}fail('An operator is missing a value.');}
            take();if(token.text==='/'){
              const numerator=nodes.pop();const denominator=scripted();nodes.push({text:'fraction '+numerator.text+' over '+denominator.text+' end fraction'});needsValue=false;
            }else{nodes.push({text:operators[token.text],operator:true});needsValue=true;}
          }else{nodes.push(scripted());needsValue=false;}
        }
        if(!nodes.length||needsValue)fail('The equation is incomplete.');
        if(end){if(peek()?.type!==end)fail('The equation has unclosed brackets.');take();}
        depth--;return nodes.map(node=>node.text).join(' ');
      }
      function requiredGroup(){if(peek()?.type!=='{')fail('Use braces around LaTeX fraction parts and grouped expressions.');take();return sequence('}');}
      function argument(){
        if(!peek())fail('A power, subscript, or root is missing its argument.');
        if(peek().type==='{'){take();return sequence('}');}
        if(peek().type==='op'&&['-','+'].includes(peek().text)){const sign=take().text;return(sign==='-'?'negative ':'positive ')+atom().text;}
        return atom().text;
      }
      function atom(){
        const token=take();if(!token)fail('The equation is missing a value.');
        if(token.type==='atom'||token.type==='function')return{text:token.text,kind:token.type};
        if(token.type==='{')return{text:sequence('}')};
        if(token.type==='('||token.type==='['){const close=token.type==='('?')':']';return{text:(close===')'?'open parenthesis ':'open bracket ')+sequence(close)+(close===')'?' close parenthesis':' close bracket')};}
        if(['frac','dfrac','tfrac'].includes(token.type)){const top=requiredGroup(),bottom=requiredGroup();return{text:'fraction '+top+' over '+bottom+' end fraction'};}
        if(token.type==='sqrt'){
          let index='';if(peek()?.type==='['){take();index=sequence(']');}
          const value=argument();return{text:(index?'root index '+index+' of ':'square root of ')+value+' end root'};
        }
        if(['sum','prod','int','oint'].includes(token.type))return{text:({sum:'sum',prod:'product',int:'integral',oint:'closed integral'})[token.type],kind:'limits'};
        if(['text','mathrm','mathbf','mathit','operatorname'].includes(token.type))return{text:requiredGroup()};
        if(['vec','hat','bar','dot','ddot','overline'].includes(token.type)){const value=argument();return{text:({vec:'vector ',hat:'hat over ',bar:'bar over ',dot:'dot over ',ddot:'double dot over ',overline:'bar over '})[token.type]+value};}
        fail('Unsupported or misplaced mathematical notation.');
      }
      function scripted(){
        const base=atom();let sub=null,power=null;
        while(peek()&&['^','_'].includes(peek().type)){
          const type=take().type;if(type==='^'){if(power!==null)fail('A power is repeated without grouping.');power=argument();}
          else{if(sub!==null)fail('A subscript is repeated without grouping.');sub=argument();}
        }
        if(base.kind==='limits'){
          if(sub!==null)base.text+=' from '+sub;if(power!==null)base.text+=' to '+power;
          if(peek()&&peek().type!=='op'&&!['}',')',']'].includes(peek().type))base.text+=' of';
        }else{
          if(sub!==null)base.text+=(base.text==='log'?' base ':' subscript ')+sub+(sub.includes(' ')||power!==null?' end subscript':'');
          if(power!==null)base.text+=power==='2'?' squared':power==='3'?' cubed':' to the power of '+power+' end power';
        }
        while(peek()?.type==='postfix')base.text+=' '+take().text;
        return base;
      }
      const text=sequence().replace(/\s+/g,' ').trim();if(at!==tokens.length||text.length>14000)fail('The equation is too complex. Select a smaller part.');
      return{ok:true,text};
    }catch(error){return{ok:false,error:error.message||'This equation could not be read.'};}
  }
  globalThis.WordEquationSpeech={toSpeech};
})();
