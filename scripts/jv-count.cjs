require('./jv-env.cjs')
const {PrismaClient}=require('@prisma/client')
const p=new PrismaClient()
;(async()=>{
  for(const m of ['product','productImage','category','brand','auction','productAttribute']){
    try{console.log(m, await p[m].count())}catch(e){console.log(m,'ERR',e.message)}
  }
  await p.$disconnect()
})().catch(e=>{console.error(e.message);process.exit(1)})
