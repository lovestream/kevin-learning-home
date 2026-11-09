import { parentPort,workerData } from "node:worker_threads";
import sharp from "sharp";
sharp.cache(false);sharp.concurrency(1);
try {
  const input=Buffer.from(workerData),image=sharp(input,{limitInputPixels:4_194_304,failOn:"warning",pages:1});
  const meta=await image.metadata();
  if(!["png","jpeg"].includes(meta.format??"")||(meta.pages??1)!==1||!meta.width||!meta.height||meta.width>4096||meta.height>4096)throw Error("IMAGE_FORMAT");
  // Rotation applied before metadata is stripped; no EXIF/GPS/ICC is published.
  const bytes=await image.rotate().png().toBuffer();
  const thumb=await sharp(bytes).resize(320,320,{fit:"inside",withoutEnlargement:true}).png().toBuffer();
  const output=await sharp(bytes).metadata();
  parentPort!.postMessage({bytes,thumb,width:output.width,height:output.height});
}catch{parentPort!.postMessage({error:"IMAGE_INVALID"});}
