// Broad notation recognition, not an equation parser: complex formulas are sent
// to ChatGPT as selected, rather than restricted to locally pronounceable syntax.
(() => {
  function isMath(text){
    if(typeof text!=='string'||!text.trim()||text.length>8000)return false;
    return /[\p{Sm}\u2100-\u214F\u{1D400}-\u{1D7FF}]/u.test(text)||/\\[A-Za-z]{2,}\b/u.test(text)||
      /[α-ωΑ-Ωϵϑϕϱϖ∂∇∑∏∫∮√∞≤≥≠≈±∓∝∈∉⊂⊆∪∩∧∨⁰-⁹₀-₉]/u.test(text)||
      /\\(?:frac|dfrac|tfrac|sqrt|sum|prod|int|oint|begin|alpha|beta|gamma|delta|theta|omega|sigma|pi|mathbb|mathbf|mathcal|operatorname|partial|nabla|lim)\b/u.test(text)||
      /[A-Za-z\d)\]}]\s*(?:=|\^|_|≤|≥|<|>|\+|[×÷⋅])\s*[A-Za-z\d\\({[α-ωΑ-Ω]/u.test(text)||
      /(?:[A-Za-z\d)\]}]\s*[-*/]\s*[A-Za-z\d\\({[])|(?:\b(?:sin|cos|tan|log|ln|exp|lim|max|min|det|softmax|argmax)\s*\()/u.test(text)||
      /^[A-Za-z]\s*[([][^\n]+[)\]]$/u.test(text.trim());
  }
  globalThis.WordMathSelection={isMath};
})();
