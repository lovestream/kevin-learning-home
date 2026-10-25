import {fileURLToPath} from 'node:url';
import {deliver} from './mac-delivery.mjs';
try {
  console.log(JSON.stringify(deliver(fileURLToPath(new URL('../../',import.meta.url)))));
} catch {
  console.error('MAC_DELIVERY_REFUSED: 请检查本机所有权、已有用户修改和固定目录；未复制私钥。');
  process.exitCode=1;
}
