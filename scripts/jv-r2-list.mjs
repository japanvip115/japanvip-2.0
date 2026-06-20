import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'; import { resolve, dirname } from 'path'; import { fileURLToPath } from 'url'
const __d=dirname(fileURLToPath(import.meta.url))
const env=Object.fromEntries(readFileSync(resolve(__d,'..','apps/web/.env.local'),'utf8').split('\n').filter(l=>l.includes('=')&&!l.trimStart().startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const s3=new S3Client({region:'auto',endpoint:`https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:env.R2_ACCESS_KEY_ID,secretAccessKey:env.R2_SECRET_ACCESS_KEY}})
for(const prefix of ['category-icons/','categories/','brands/']){
  const r=await s3.send(new ListObjectsV2Command({Bucket:env.R2_BUCKET_NAME,Prefix:prefix}))
  console.log(`\n[${prefix}] ${r.KeyCount||0} files`)
  ;(r.Contents||[]).forEach(o=>console.log('  '+env.R2_PUBLIC_URL+'/'+o.Key))
}
