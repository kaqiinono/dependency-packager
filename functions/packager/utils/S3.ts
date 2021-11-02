import {fs} from "mz";
import { join } from "path";

class S3 {
  putObject(params: any, callback: (e: any) => void): void {
    fs.writeFileSync(join('/tmp','putObject.json'), JSON.stringify(params))
  };

  saveResult(params: any): void {
    fs.writeFileSync(join('/tmp','saveResult.json'), JSON.stringify(params))
  }
}

export default S3;