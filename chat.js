export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(500).json({error:'OPENAI_API_KEY is not configured'});
  try{
    const body=req.body||{};
    const message=String(body.message||'').trim();
    const history=Array.isArray(body.history)?body.history.slice(-8):[];
    if(!message) return res.status(400).json({error:'Missing message'});
    const prompt=`你是“牟之记忆法”的英语学习教练。用户会像聊天一样问英语单词/词组，也可能只发一个词。请用简洁、自然、适合中国大学生英语学习者的方式回答。\n\n如果用户的问题明显是在询问一个英语单词或词组，请额外输出一个严格的 JSON 块，格式：<WORD>{"word":"...","pronunciation":"...","meaning":"...","example":"...","translation":"..."}</WORD>。meaning 用中文；example 必须是自然的英文例句；translation 是中文翻译。不要在 JSON 内加入 Markdown。\n\n如果不是词汇问题，就正常回答，不输出 WORD 块。\n\n用户最新问题：${message}`;
    const input=[...history.filter(x=>x.role==='user'||x.role==='assistant').map(x=>({role:x.role,content:[{type:'input_text',text:String(x.content||x.text||'')}]})),{role:'user',content:[{type:'input_text',text:prompt}]}];
    const model=process.env.OPENAI_MODEL||'gpt-5.6-luna';
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model,input,max_output_tokens:600})});
    const data=await r.json();
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message||'OpenAI request failed'});
    const text=data.output_text||'';
    const m=text.match(/<WORD>([\s\S]*?)<\/WORD>/);
    let word=null,reply=text.replace(/<WORD>[\s\S]*?<\/WORD>/,'').trim();
    if(m){try{word=JSON.parse(m[1])}catch(e){}}
    return res.status(200).json({reply,word});
  }catch(e){return res.status(500).json({error:e.message||'Server error'})}
}
