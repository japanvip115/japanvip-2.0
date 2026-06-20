// Load env from apps/web/.env.local into process.env
const fs=require('fs'), path=require('path')
const env=fs.readFileSync(path.join(__dirname,'..','apps','web','.env.local'),'utf8')
for(const line of env.split('\n')){
  const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if(m){let v=m[2].trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[m[1]]=v}
}
module.exports={}
