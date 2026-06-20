require('./jv-env.cjs')
const {PrismaClient}=require('@prisma/client')
const p=new PrismaClient()
;(async()=>{
  const mayGiat=await p.category.findUnique({where:{slug:'may-giat'}})
  const dieuHoa=await p.category.findUnique({where:{slug:'dieu-hoa'}})
  let f=0
  if(mayGiat){
    const r=await p.product.updateMany({where:{name:{startsWith:'Máy giặt'},categoryId:{not:mayGiat.id}},data:{categoryId:mayGiat.id}})
    console.log('Máy giặt fixed:',r.count); f+=r.count
  }
  if(dieuHoa){
    const r=await p.product.updateMany({where:{name:{startsWith:'Điều hòa'},categoryId:{not:dieuHoa.id}},data:{categoryId:dieuHoa.id}})
    console.log('Điều hòa fixed:',r.count); f+=r.count
  }
  console.log('--- final counts ---')
  for(const m of ['product','productImage','category','brand']) console.log(m, await p[m].count())
  const drafts=await p.product.count({where:{status:'DRAFT'}})
  console.log('products DRAFT:',drafts)
  await p.$disconnect()
})().catch(e=>{console.error(e.message);process.exit(1)})
